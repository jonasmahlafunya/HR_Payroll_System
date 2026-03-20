<?php
/**
 * Nexa HR & Payroll - Payroll Approval Email
 * POST /api/mail.php
 *
 * ╔══════════════════════════════════════════════════════════╗
 * ║  SETUP: Fill in your Gmail App Password on line below.  ║
 * ║  Get one at: myaccount.google.com/apppasswords          ║
 * ║  (Must have 2-Step Verification enabled on Gmail)       ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── YOUR GMAIL CREDENTIALS — edit these two lines ─────────────────────────────
define('GMAIL_USER', 'deepquesa@gmail.com');
define('GMAIL_PASS', jyjr ouev vzne ejhu); // <-- replace with your 16-char App Password
define('GMAIL_NAME', 'Nexa HR');
// ─────────────────────────────────────────────────────────────────────────────

// Capture ALL output - PHP warnings/notices must never break JSON
ob_start();

// Always respond with JSON
header('Content-Type: application/json');

// CORS headers
$allowedOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token, X-API-Key');
header('Access-Control-Allow-Credentials: true');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(204);
    exit;
}

// Safe JSON exit - discards any stray PHP output
function mail_finish($payload, $code) {
    $stray = ob_get_clean();
    if ($stray !== false && $stray !== '') {
        $payload['_php_output'] = substr($stray, 0, 500);
    }
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

// Try to load SMTP_PASS from .env as override (optional - works without it)
function try_load_env_pass() {
    $locations = array(
        dirname(dirname(__FILE__)) . '/.env',
        dirname(__FILE__) . '/.env',
    );
    foreach ($locations as $path) {
        if (!file_exists($path)) continue;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) continue;
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            if (strpos($line, '=') === false) continue;
            $parts = explode('=', $line, 2);
            $key   = trim($parts[0]);
            $val   = trim($parts[1]);
            if ($key === 'SMTP_PASS' && $val !== '') return $val;
            if ($key === 'SMTP_USER' && $val !== '') {
                // also capture user override - stored but we don't override const
            }
        }
        break;
    }
    return '';
}

// Determine final password (env overrides hardcoded if set)
$envPass = try_load_env_pass();
$smtpPass = ($envPass !== '') ? $envPass : GMAIL_PASS;

// Only POST beyond this point
if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    mail_finish(array('error' => 'Only POST requests are accepted.'), 405);
}

// Parse JSON body
$raw  = file_get_contents('php://input');
if (!$raw) $raw = '{}';
$body = json_decode($raw, true);
if (!is_array($body)) {
    mail_finish(array('error' => 'Invalid JSON body.'), 400);
}

// Validate recipient
$to = isset($body['companyEmail']) ? trim($body['companyEmail']) : '';
if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    mail_finish(array(
        'error' => 'No valid recipient email. Please edit the company record and add an email address first.'
    ), 400);
}

// Sanitise inputs
$companyName = isset($body['companyName']) ? strip_tags(trim($body['companyName'])) : 'Your Company';
$period      = isset($body['period'])      ? strip_tags(trim($body['period']))      : '';
$totalNet    = isset($body['totalNet'])    ? strip_tags(trim($body['totalNet']))    : 'R 0.00';
$notes       = isset($body['notes'])       ? strip_tags(trim($body['notes']))       : '';

// Check password is configured
if ($smtpPass === 'YOUR_APP_PASSWORD_HERE' || $smtpPass === '') {
    mail_finish(array(
        'error' => 'Gmail App Password not configured. Open api/mail.php and replace YOUR_APP_PASSWORD_HERE on line 14 with your actual Gmail App Password. Get one at: myaccount.google.com/apppasswords (requires 2-Step Verification to be enabled).'
    ), 500);
}

// Build email
$subject = 'Payroll Approval Required - ' . $companyName . ' (' . $period . ')';

$notesHtml = '';
if ($notes !== '') {
    $notesHtml = '<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;margin:20px 0;font-size:14px;color:#713f12;">'
               . '<strong>Notes from Payroll Admin:</strong><br>'
               . htmlspecialchars($notes, ENT_QUOTES, 'UTF-8')
               . '</div>';
}

$cn = htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8');
$pe = htmlspecialchars($period,      ENT_QUOTES, 'UTF-8');
$tn = htmlspecialchars($totalNet,    ENT_QUOTES, 'UTF-8');

$htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>'
. '<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">'
. '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px;">'
. '<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">'
// Header
. '<tr><td style="background:#4f46e5;padding:28px 32px;">'
. '<div style="font-size:20px;font-weight:800;color:#fff;">Payroll Approval Required</div>'
. '<div style="color:rgba(255,255,255,0.82);font-size:14px;margin-top:5px;">' . $cn . ' &mdash; ' . $pe . '</div>'
. '</td></tr>'
// Body
. '<tr><td style="padding:30px 32px;">'
. '<p style="font-size:15px;color:#1e293b;margin:0 0 12px;">Hello,</p>'
. '<p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">The payroll for <strong>' . $cn . '</strong> for the period <strong>' . $pe . '</strong> has been calculated and is ready for your review and approval.</p>'
. '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">'
. '<tr><td style="padding:20px 24px;">'
. '<table width="100%" cellpadding="0" cellspacing="0">'
. '<tr><td style="font-size:14px;color:#475569;padding:5px 0;">Company</td><td style="font-size:14px;font-weight:600;color:#1e293b;padding:5px 0;text-align:right;">' . $cn . '</td></tr>'
. '<tr><td style="font-size:14px;color:#475569;padding:5px 0;">Period</td><td style="font-size:14px;font-weight:600;color:#1e293b;padding:5px 0;text-align:right;">' . $pe . '</td></tr>'
. '<tr><td style="font-size:15px;color:#0f172a;padding:12px 0 5px;border-top:1px solid #e2e8f0;">Total Net Pay</td>'
. '<td style="font-size:24px;font-weight:800;color:#059669;padding:12px 0 5px;border-top:1px solid #e2e8f0;text-align:right;">' . $tn . '</td></tr>'
. '</table></td></tr></table>'
. $notesHtml
. '<p style="font-size:14px;color:#475569;line-height:1.7;margin:20px 0 8px;">Please log in to <strong>Nexa HR &amp; Payroll</strong> to review and finalize this payroll run.</p>'
. '</td></tr>'
// Footer
. '<tr><td style="background:#f8fafc;padding:14px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">Nexa HR &amp; Payroll &bull; Automated notification.</td></tr>'
. '</table></td></tr></table></body></html>';

$textBody  = 'Payroll Approval Required - ' . $companyName . ' (' . $period . ')' . "\n\n";
$textBody .= 'Total Net Pay: ' . $totalNet . "\n";
if ($notes !== '') $textBody .= "\nNotes: " . $notes . "\n";
$textBody .= "\nLog in to Nexa HR & Payroll to review and finalize this payroll run.\n";

// ── Attempt Gmail SMTP ────────────────────────────────────────────────────────
$smtpResult = send_gmail_smtp($to, $subject, $htmlBody, $textBody, $smtpPass);

if ($smtpResult === true) {
    mail_finish(array('status' => 'success', 'to' => $to, 'method' => 'smtp'), 200);
}

// SMTP failed - return the error
mail_finish(array(
    'error'      => $smtpResult,
    'hint'       => 'If this says authentication failed, make sure you are using a Gmail APP PASSWORD (16 chars), not your regular Gmail password. Get one at myaccount.google.com/apppasswords'
), 500);

// ═════════════════════════════════════════════════════════════════════════════
// Gmail SMTP sender - PHP 5.6 compatible, pure sockets
// Returns true on success, or an error string on failure.
// ═════════════════════════════════════════════════════════════════════════════
function send_gmail_smtp($to, $subject, $html, $text, $password) {
    $host = 'smtp.gmail.com';
    $port = 587;
    $user = GMAIL_USER;
    $from = GMAIL_USER;
    $name = GMAIL_NAME;

    // Open TCP connection
    $errno  = 0;
    $errstr = '';
    $socket = @fsockopen('tcp://' . $host, $port, $errno, $errstr, 20);
    if (!$socket) {
        return 'Cannot connect to smtp.gmail.com:587 - ' . $errstr . ' (error ' . $errno . '). '
             . 'Your hosting provider may block outbound SMTP. '
             . 'Try enabling it in your InfinityFree control panel under "Email" settings.';
    }

    stream_set_timeout($socket, 20);

    // Read greeting
    $resp = smtp_get($socket);
    if (substr($resp, 0, 3) !== '220') {
        fclose($socket);
        return 'Bad SMTP greeting: ' . $resp;
    }

    // EHLO
    smtp_put($socket, 'EHLO localhost');

    // STARTTLS
    $r = smtp_put($socket, 'STARTTLS');
    if (substr($r, 0, 3) !== '220') {
        fclose($socket);
        return 'STARTTLS not accepted: ' . $r . '. Gmail requires STARTTLS on port 587.';
    }

    // Upgrade connection to TLS
    $crypto = STREAM_CRYPTO_METHOD_TLS_CLIENT;
    // Use TLS 1.2 if available (PHP >= 5.6)
    if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
        $crypto = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
    }
    $upgraded = @stream_socket_enable_crypto($socket, true, $crypto);
    if (!$upgraded) {
        // Try any TLS as fallback
        $upgraded = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if (!$upgraded) {
            fclose($socket);
            return 'TLS handshake failed. Make sure the OpenSSL PHP extension is enabled on your server (check phpinfo.php).';
        }
    }

    // Re-EHLO after TLS
    smtp_put($socket, 'EHLO localhost');

    // AUTH LOGIN
    smtp_put($socket, 'AUTH LOGIN');
    smtp_put($socket, base64_encode($user));
    $authResp = smtp_put($socket, base64_encode($password));

    if (substr($authResp, 0, 3) !== '235') {
        fclose($socket);
        return 'Gmail authentication failed: ' . trim($authResp) . '. '
             . 'You must use a Gmail APP PASSWORD, not your regular Gmail password. '
             . 'Steps: (1) Enable 2-Step Verification on your Google account. '
             . '(2) Go to myaccount.google.com/apppasswords. '
             . '(3) Create a password for "Mail". '
             . '(4) Copy the 16-character code and paste it into line 14 of api/mail.php.';
    }

    // MAIL FROM
    smtp_put($socket, 'MAIL FROM:<' . $from . '>');

    // RCPT TO
    $rcpt = smtp_put($socket, 'RCPT TO:<' . $to . '>');
    if (substr($rcpt, 0, 3) !== '250') {
        fclose($socket);
        return 'Recipient rejected by Gmail: ' . $rcpt;
    }

    // DATA
    smtp_put($socket, 'DATA');

    // Build MIME message
    $boundary = 'NexaBoundary' . md5(uniqid('', true));
    $encFrom  = '=?UTF-8?B?' . base64_encode($name) . '?=';
    $encSubj  = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $message  = 'Date: ' . date('r') . "\r\n";
    $message .= 'From: ' . $encFrom . ' <' . $from . ">\r\n";
    $message .= 'To: ' . $to . "\r\n";
    $message .= 'Reply-To: ' . $from . "\r\n";
    $message .= 'Subject: ' . $encSubj . "\r\n";
    $message .= 'MIME-Version: 1.0' . "\r\n";
    $message .= 'Content-Type: multipart/alternative; boundary="' . $boundary . '"' . "\r\n";
    $message .= 'X-Mailer: NexaHR-Payroll' . "\r\n\r\n";

    // Plain text part
    $message .= '--' . $boundary . "\r\n";
    $message .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
    $message .= 'Content-Transfer-Encoding: base64' . "\r\n\r\n";
    $message .= chunk_split(base64_encode($text)) . "\r\n";

    // HTML part
    $message .= '--' . $boundary . "\r\n";
    $message .= 'Content-Type: text/html; charset=UTF-8' . "\r\n";
    $message .= 'Content-Transfer-Encoding: base64' . "\r\n\r\n";
    $message .= chunk_split(base64_encode($html)) . "\r\n";

    // End boundary + DATA terminator
    $message .= '--' . $boundary . "--\r\n\r\n.\r\n";

    fwrite($socket, $message);
    $sendResp = smtp_get($socket);
    smtp_put($socket, 'QUIT');
    @fclose($socket);

    if (substr($sendResp, 0, 3) !== '250') {
        return 'Gmail rejected the message after DATA: ' . $sendResp;
    }

    return true;
}

// Write one SMTP command and read the response
function smtp_put($socket, $cmd) {
    fwrite($socket, $cmd . "\r\n");
    return smtp_get($socket);
}

// Read a full SMTP response (handles multi-line responses like EHLO)
function smtp_get($socket) {
    $response = '';
    while (!feof($socket)) {
        $line = fgets($socket, 1024);
        if ($line === false) break;
        $response .= $line;
        // A line with a space at position 3 is the last line of the response
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    return $response;
}