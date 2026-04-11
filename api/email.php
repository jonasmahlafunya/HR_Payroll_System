<?php
/**
 * Nexa HR & Payroll — Email Dispatcher (Shared Utility)
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
$attachments = $input['attachments'] ?? [];

$fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexahr.com';
$fromName = SMTP_FROM_NAME ?: 'Nexa HR & Payroll';

[$sent, $error] = nexa_send_email($to, $subject, $body_html, $fromEmail, $fromName, $attachments);

if ($sent) {
    $u = (is_array($session) && !empty($session['username'])) ? $session['username'] : 'system';
    audit_log($pdo, $u, 'EMAIL_SENT', 'Email', [
        'to' => $to,
        'subject' => $subject
    ]);
    json_response(['status' => 'sent', 'to' => $to]);
} else {
    $u = (is_array($session) && !empty($session['username'])) ? $session['username'] : 'system';
    audit_log($pdo, $u, 'EMAIL_FAILED', 'Email', [
        'to' => $to,
        'error' => $error
    ]);
    json_response(['status' => 'error', 'message' => "Email failed: $error"], 400);
}