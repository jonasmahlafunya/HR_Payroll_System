<?php
/**
 * Nexa HR & Payroll — Email Dispatcher
 * POST /api/email.php
 * Body: { to, subject, body_html, body_text, attachments? }
 * Requires: X-Auth-Token header
 */
header('Content-Type: application/json');
require_once 'config.php';

set_cors_headers();

$conn    = get_db_connection();
$session = validate_session($conn);
if (!$session && !validate_api_key()) {
    json_response(['error' => 'Unauthorized.'], 401);
}

$input = json_decode(file_get_contents('php://input'), true);
$to    = filter_var($input['to'] ?? '', FILTER_VALIDATE_EMAIL);

if (!$to) json_response(['error' => 'Invalid or missing recipient email.'], 400);

$subject   = strip_tags($input['subject'] ?? 'Nexa HR Notification');
$body_html = $input['body_html'] ?? '';
$body_text = $input['body_text'] ?? strip_tags($body_html);
$attachments = $input['attachments'] ?? []; // [{filename, content_base64, mime_type}]

// Try SMTP first, fall back to PHP mail()
$sent = false;
$error = '';

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    [$sent, $error] = send_smtp($to, $subject, $body_html, $body_text, $attachments);
}

if (!$sent) {
    // Fallback: native PHP mail()
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

// ─────────────────────────────────────────────────────────────
// SMTP SENDER (socket-based — no Composer needed)
// ─────────────────────────────────────────────────────────────
function send_smtp(string $to, string $subject, string $html,
                   string $text, array $attachments = []): array {
    try {
        $host = SMTP_HOST;
        $port = SMTP_PORT;

        // Connect
        $errno = 0; $errstr = '';
        $socket = fsockopen("tcp://$host", $port, $errno, $errstr, 10);
        if (!$socket) return [false, "Connection failed: $errstr ($errno)"];

        $read = fgets($socket, 512);
        if (substr($read, 0, 3) !== '220') return [false, "SMTP greeting failed: $read"];

        // EHLO
        smtp_cmd($socket, 'EHLO ' . (gethostname() ?: 'localhost'));

        // STARTTLS for port 587
        if ($port == 587) {
            smtp_cmd($socket, 'STARTTLS');
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            smtp_cmd($socket, 'EHLO ' . (gethostname() ?: 'localhost'));
        }

        // AUTH LOGIN
        smtp_cmd($socket, 'AUTH LOGIN');
        smtp_cmd($socket, base64_encode(SMTP_USER));
        smtp_cmd($socket, base64_encode(SMTP_PASS));

        // Envelope
        smtp_cmd($socket, 'MAIL FROM:<' . SMTP_FROM_EMAIL . '>');
        smtp_cmd($socket, "RCPT TO:<$to>");
        smtp_cmd($socket, 'DATA');

        // Build MIME message
        $boundary = '----=_Part_' . uniqid();
        $date     = date('r');
        $fromName = SMTP_FROM_NAME;
        $fromEmail= SMTP_FROM_EMAIL;

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

        smtp_cmd($socket, 'QUIT');
        fclose($socket);

        if (substr($response, 0, 3) !== '250') return [false, "Send failed: $response"];
        return [true, ''];
    } catch (Exception $e) {
        return [false, $e->getMessage()];
    }
}

function smtp_cmd($socket, string $cmd): string {
    fwrite($socket, "$cmd\r\n");
    return fgets($socket, 512);
}

// ─────────────────────────────────────────────────────────────
// NATIVE MAIL FALLBACK
// ─────────────────────────────────────────────────────────────
function send_native_mail(string $to, string $subject,
                          string $html, string $text): array {
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . SMTP_FROM_NAME . " <" . (SMTP_FROM_EMAIL ?: 'deepquesa@gmail.com') . ">\r\n";
    $headers .= "X-Mailer: Nexa HR & Payroll\r\n";

    $sent = @mail($to, $subject, $html, $headers);
    return [$sent, $sent ? '' : 'PHP mail() failed — check server mail configuration'];
}
