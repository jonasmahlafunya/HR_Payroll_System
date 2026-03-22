<?php
/**
 * Nexa HR & Payroll — Email Dispatcher
 * POST /api/email.php
 * Body: { to, subject, body_html, body_text, attachments? }
 *
 * Auth: Accepts any of:
 *   1. Valid X-Auth-Token session
 *   2. Valid X-API-Key header
 *   3. Same-origin browser request (Referer/Origin matches server host)
 *   4. API_SECRET_KEY not configured (dev / shared-hosting mode)
 *
 * SMTP priority:
 *   1. Configured SMTP (from .env SMTP_HOST / SMTP_USER / SMTP_PASS)
 *   2. Gmail SMTP fallback (same credentials as mail.php)
 *   3. Native PHP mail() last resort
 */
header('Content-Type: application/json');
require_once 'config.php';

set_cors_headers();

$conn = get_db_connection();

// ── Same-origin check ─────────────────────────────────────────────────────
// The app uses local JS-only auth — no server session token is ever issued.
// Requests coming from the same host (Referer / Origin) are trusted.
function is_same_origin(): bool {
    $serverHost = $_SERVER['HTTP_HOST'] ?? '';

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST) ?? '';
        if ($originHost && $originHost === $serverHost) return true;
        if (APP_URL) {
            $appHost = parse_url(APP_URL, PHP_URL_HOST) ?? '';
            if ($appHost && $appHost === $originHost) return true;
        }
    }

    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($referer) {
        $refHost = parse_url($referer, PHP_URL_HOST) ?? '';
        if ($refHost && $refHost === $serverHost) return true;
    }

    // Always allow localhost / 127.0.0.1 (dev)
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    if (in_array($remote, ['127.0.0.1', '::1', 'localhost'], true)) return true;

    return false;
}

$session = validate_session($conn);
if (!$session && !validate_api_key() && !is_same_origin()) {
    json_response(['error' => 'Unauthorized.'], 401);
}

$input = json_decode(file_get_contents('php://input'), true);
$to    = filter_var($input['to'] ?? '', FILTER_VALIDATE_EMAIL);

if (!$to) json_response(['error' => 'Invalid or missing recipient email.'], 400);

$subject     = strip_tags($input['subject']   ?? 'Nexa HR Notification');
$body_html   = $input['body_html']             ?? '';
$body_text   = $input['body_text']             ?? strip_tags($body_html);
$attachments = $input['attachments']           ?? []; // [{filename, content_base64, mime_type}]

// ── Load Gmail / SMTP credentials ─────────────────────────────────────────
// Priority: .env SMTP_PASS → mail.php hardcoded Gmail
define('GMAIL_FALLBACK_USER', 'deepquesa@gmail.com');
define('GMAIL_FALLBACK_NAME', 'Nexa HR & Payroll');
define('GMAIL_FALLBACK_PASS', 'jyjr ouev vzne ejhu'); // 16-char App Password

function load_gmail_app_password(): string {
    foreach ([dirname(__DIR__) . '/.env', __DIR__ . '/.env'] as $path) {
        if (!file_exists($path)) continue;
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if (!$line || $line[0] === '#' || strpos($line, '=') === false) continue;
            [$k, $v] = explode('=', $line, 2);
            if (trim($k) === 'SMTP_PASS' && trim($v) !== '') return trim($v);
        }
        break;
    }
    return '';
}

$sent  = false;
$error = '';

// ── 1. Try configured SMTP (from config.php constants) ────────────────────
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    [$sent, $error] = send_smtp($to, $subject, $body_html, $body_text, $attachments);
}

// ── 2. Try Gmail SMTP fallback (same account used by mail.php) ────────────
if (!$sent) {
    $gmailPass = str_replace(' ', '', load_gmail_app_password() ?: GMAIL_FALLBACK_PASS);
    if ($gmailPass) {
        [$sent, $error] = send_gmail_smtp($to, $subject, $body_html, $body_text, $gmailPass, $attachments);
    }
}

// ── 3. Native PHP mail() last resort ──────────────────────────────────────
if (!$sent) {
    [$sent, $error] = send_native_mail($to, $subject, $body_html, $body_text);
}

if ($sent) {
    audit_log($conn, $session['username'] ?? 'system', 'EMAIL_SENT', 'Email', [
        'to' => $to, 'subject' => $subject
    ]);
    json_response(['status' => 'sent', 'to' => $to]);
} else {
    audit_log($conn, $session['username'] ?? 'system', 'EMAIL_FAILED', 'Email', [
        'to' => $to, 'error' => $error
    ]);
    json_response(['error' => "Email failed: $error"], 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gmail SMTP sender — mirrors the logic in mail.php
// ─────────────────────────────────────────────────────────────────────────────
function send_gmail_smtp(
    string $to,
    string $subject,
    string $html,
    string $text,
    string $password,
    array  $attachments = []
): array {
    $host = 'smtp.gmail.com';
    $port = 587;
    $user = GMAIL_FALLBACK_USER;
    $from = GMAIL_FALLBACK_USER;
    $name = GMAIL_FALLBACK_NAME;

    $errno = 0; $errstr = '';
    $socket = @fsockopen("tcp://{$host}", $port, $errno, $errstr, 20);
    if (!$socket) {
        return [false, "Cannot connect to smtp.gmail.com:587 — {$errstr} ({$errno})."];
    }
    stream_set_timeout($socket, 20);

    $r = smtp_read($socket);
    if (substr($r, 0, 3) !== '220') { fclose($socket); return [false, "Bad SMTP greeting: {$r}"]; }

    smtp_write($socket, 'EHLO localhost');
    $r = smtp_write($socket, 'STARTTLS');
    if (substr($r, 0, 3) !== '220') { fclose($socket); return [false, "STARTTLS rejected: {$r}"]; }

    $crypto = defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')
        ? STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT
        : STREAM_CRYPTO_METHOD_TLS_CLIENT;

    if (!@stream_socket_enable_crypto($socket, true, $crypto)) {
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($socket);
            return [false, 'TLS handshake failed.'];
        }
    }

    smtp_write($socket, 'EHLO localhost');
    smtp_write($socket, 'AUTH LOGIN');
    smtp_write($socket, base64_encode($user));
    $auth = smtp_write($socket, base64_encode($password));

    if (substr($auth, 0, 3) !== '235') {
        fclose($socket);
        return [false, 'Gmail authentication failed: ' . trim($auth)
            . '. Use a Gmail APP PASSWORD (myaccount.google.com/apppasswords).'];
    }

    smtp_write($socket, "MAIL FROM:<{$from}>");
    $rcpt = smtp_write($socket, "RCPT TO:<{$to}>");
    if (substr($rcpt, 0, 3) !== '250') {
        fclose($socket);
        return [false, "Recipient rejected: {$rcpt}"];
    }

    smtp_write($socket, 'DATA');

    $mixBoundary = 'MixedBnd_'  . md5(uniqid('', true));
    $altBoundary = 'AltBnd_'    . md5(uniqid('', true));

    $encFrom = '=?UTF-8?B?' . base64_encode($name)    . '?=';
    $encSubj = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $headers  = "Date: "         . date('r')     . "\r\n";
    $headers .= "From: {$encFrom} <{$from}>\r\n";
    $headers .= "To: {$to}\r\n";
    $headers .= "Subject: {$encSubj}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"{$mixBoundary}\"\r\n";
    $headers .= "X-Mailer: NexaHR-Payroll\r\n\r\n";

    $body  = "--{$mixBoundary}\r\n";
    $body .= "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"\r\n\r\n";

    // Plain text part
    $body .= "--{$altBoundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($text)) . "\r\n";

    // HTML part
    $body .= "--{$altBoundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($html)) . "\r\n";
    $body .= "--{$altBoundary}--\r\n";

    // Attachments [{filename, content_base64, mime_type}]
    foreach ($attachments as $att) {
        $fname  = $att['filename']      ?? 'attachment';
        $mime   = $att['mime_type']     ?? 'application/octet-stream';
        $b64    = $att['content_base64']?? '';
        $body .= "--{$mixBoundary}\r\n";
        $body .= "Content-Type: {$mime}; name=\"{$fname}\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= "Content-Disposition: attachment; filename=\"{$fname}\"\r\n\r\n";
        $body .= $b64 . "\r\n";
    }

    $body .= "--{$mixBoundary}--\r\n.\r\n";

    fwrite($socket, $headers . $body);
    $send = smtp_read($socket);
    smtp_write($socket, 'QUIT');
    @fclose($socket);

    return substr($send, 0, 3) === '250' ? [true, ''] : [false, "Send failed: {$send}"];
}

// ─────────────────────────────────────────────────────────────────────────────
// Configured SMTP sender (for non-Gmail providers)
// ─────────────────────────────────────────────────────────────────────────────
function send_smtp(
    string $to,
    string $subject,
    string $html,
    string $text,
    array  $attachments = []
): array {
    try {
        $host = SMTP_HOST;
        $port = SMTP_PORT;

        $errno = 0; $errstr = '';
        $socket = @fsockopen("tcp://$host", $port, $errno, $errstr, 10);
        if (!$socket) return [false, "Connection failed: $errstr ($errno)"];

        $read = fgets($socket, 512);
        if (substr($read, 0, 3) !== '220') return [false, "SMTP greeting failed: $read"];

        smtp_write($socket, 'EHLO ' . (gethostname() ?: 'localhost'));

        if ($port == 587) {
            smtp_write($socket, 'STARTTLS');
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            smtp_write($socket, 'EHLO ' . (gethostname() ?: 'localhost'));
        }

        smtp_write($socket, 'AUTH LOGIN');
        smtp_write($socket, base64_encode(SMTP_USER));
        smtp_write($socket, base64_encode(SMTP_PASS));

        smtp_write($socket, 'MAIL FROM:<' . SMTP_FROM_EMAIL . '>');
        smtp_write($socket, "RCPT TO:<$to>");
        smtp_write($socket, 'DATA');

        $boundary = '----=_Part_' . uniqid();
        $date     = date('r');
        $fromName  = SMTP_FROM_NAME;
        $fromEmail = SMTP_FROM_EMAIL;

        $msg  = "Date: $date\r\n";
        $msg .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
        $msg .= "To: $to\r\n";
        $msg .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $msg .= "MIME-Version: 1.0\r\n";

        if (!empty($attachments)) {
            $msg .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n\r\n";
            $msg .= "--$boundary\r\n";
            $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
            $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $msg .= chunk_split(base64_encode($html)) . "\r\n";
            foreach ($attachments as $att) {
                $msg .= "--$boundary\r\n";
                $msg .= "Content-Type: {$att['mime_type']}; name=\"{$att['filename']}\"\r\n";
                $msg .= "Content-Transfer-Encoding: base64\r\n";
                $msg .= "Content-Disposition: attachment; filename=\"{$att['filename']}\"\r\n\r\n";
                $msg .= chunk_split($att['content_base64']) . "\r\n";
            }
            $msg .= "--$boundary--\r\n";
        } else {
            $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
            $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $msg .= chunk_split(base64_encode($html)) . "\r\n";
        }

        $msg .= "\r\n.\r\n";
        fwrite($socket, $msg);
        $response = fgets($socket, 512);

        smtp_write($socket, 'QUIT');
        fclose($socket);

        if (substr($response, 0, 3) !== '250') return [false, "Send failed: $response"];
        return [true, ''];
    } catch (Exception $e) {
        return [false, $e->getMessage()];
    }
}

// ── Native PHP mail() last-resort ─────────────────────────────────────────
function send_native_mail(string $to, string $subject, string $html, string $text): array {
    $fromEmail = SMTP_FROM_EMAIL ?: GMAIL_FALLBACK_USER;
    $fromName  = SMTP_FROM_NAME  ?: GMAIL_FALLBACK_NAME;
    $headers   = "MIME-Version: 1.0\r\n";
    $headers  .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers  .= "From: {$fromName} <{$fromEmail}>\r\n";
    $headers  .= "X-Mailer: Nexa HR & Payroll\r\n";
    $sent      = @mail($to, $subject, $html, $headers);
    return [$sent, $sent ? '' : 'PHP mail() failed — check server mail configuration'];
}

// ── SMTP helpers ──────────────────────────────────────────────────────────
function smtp_write($socket, string $cmd): string {
    fwrite($socket, "{$cmd}\r\n");
    return smtp_read($socket);
}

function smtp_read($socket): string {
    $resp = '';
    while (!feof($socket)) {
        $line = fgets($socket, 1024);
        if ($line === false) break;
        $resp .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    return $resp;
}