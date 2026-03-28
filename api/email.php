<?php
/**
 * Nexa HR & Payroll — Email Dispatcher (PDO)
 */
header('Content-Type: application/json');
require_once 'config.php';

set_cors_headers();

try {
    $pdo = get_db_connection();
    $session = validate_session($pdo);
} catch (Throwable $e) {
    json_response(['error' => 'System error.'], 500);
}

// Auth: session OR API key
if (!$session && !validate_api_key()) {
    // If no session/key, check CSRF token as a secondary trust indicator for same-origin
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !validate_csrf_token()) {
        json_response(['error' => 'Unauthorized.'], 401);
    }
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input)
    json_response(['error' => 'Invalid JSON input.'], 400);

$to = filter_var($input['to'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$to)
    json_response(['error' => 'Invalid recipient email.'], 400);

$subject = strip_tags($input['subject'] ?? 'Nexa HR Notification');
$body_html = $input['body_html'] ?? '';
$body_text = $input['body_text'] ?? strip_tags($body_html);
$attachments = $input['attachments'] ?? [];

$sent = false;
$error = '';

// ─────────────────────────────────────────────────────────────
// SMTP DISPATCH (Refactored)
// ─────────────────────────────────────────────────────────────
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    [$sent, $error] = send_smtp($to, $subject, $body_html, $body_text, $attachments);
} else {
    // Fallback to native mail()
    $fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexahr.com';
    $fromName = SMTP_FROM_NAME ?: 'Nexa HR & Payroll';
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>\r\n";
    $headers .= "X-Mailer: Nexa-HR\r\n";
    $sent = @mail($to, $subject, $body_html, $headers);
    if (!$sent)
        $error = "PHP mail() fallback failed.";
}

if ($sent) {
    audit_log($pdo, $session['username'] ?? 'system', 'EMAIL_SENT', 'Email', [
        'to' => $to,
        'subject' => $subject
    ]);
    json_response(['status' => 'sent', 'to' => $to]);
} else {
    audit_log($pdo, $session['username'] ?? 'system', 'EMAIL_FAILED', 'Email', [
        'to' => $to,
        'error' => $error
    ]);
    json_response(['error' => "Email failed: $error"], 500);
}

// ─────────────────────────────────────────────────────────────────────────────
function send_smtp(string $to, string $subject, string $html, string $text, array $attachments = []): array
{
    try {
        $host = SMTP_HOST;
        $port = SMTP_PORT;

        $socket = @fsockopen("tcp://$host", $port, $errno, $errstr, 10);
        if (!$socket)
            return [false, "Connection: $errstr ($errno)"];

        $read = fgets($socket, 512);
        if (substr($read, 0, 3) !== '220') {
            @fclose($socket);
            return [false, "Greeting: $read"];
        }

        smtp_write($socket, 'EHLO ' . (gethostname() ?: 'localhost'));

        if ($port == 587) {
            smtp_write($socket, 'STARTTLS');
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                @fclose($socket);
                return [false, "TLS Error"];
            }
            smtp_write($socket, 'EHLO ' . (gethostname() ?: 'localhost'));
        }

        smtp_write($socket, 'AUTH LOGIN');
        smtp_write($socket, base64_encode(SMTP_USER));
        smtp_write($socket, base64_encode(SMTP_PASS));

        smtp_write($socket, 'MAIL FROM:<' . SMTP_FROM_EMAIL . '>');
        smtp_write($socket, "RCPT TO:<$to>");
        smtp_write($socket, 'DATA');

        $boundary = '----=_Part_' . uniqid();
        $date = date('r');
        $fromName = SMTP_FROM_NAME;
        $fromEmail = SMTP_FROM_EMAIL;

        $msg = "Date: $date\r\n";
        $msg .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
        $msg .= "To: $to\r\n";
        $msg .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $msg .= "MIME-Version: 1.0\r\n";

        if (!empty($attachments)) {
            $msg .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n\r\n";
            $msg .= "--$boundary\r\n";
        }

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

        if (!empty($attachments))
            $msg .= "--$boundary--\r\n";
        $msg .= "\r\n.\r\n";

        fwrite($socket, $msg);
        $resp = fgets($socket, 512);

        smtp_write($socket, 'QUIT');
        @fclose($socket);

        return (substr($resp, 0, 3) === '250') ? [true, ''] : [false, "SMTP: $resp"];
    } catch (Throwable $e) {
        return [false, $e->getMessage()];
    }
}

function smtp_write($socket, string $cmd): string
{
    fwrite($socket, "{$cmd}\r\n");
    $resp = '';
    while (!feof($socket)) {
        $line = fgets($socket, 512);
        if ($line === false)
            break;
        $resp .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ')
            break;
    }
    return $resp;
}