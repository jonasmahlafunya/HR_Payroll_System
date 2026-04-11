<?php
require_once __DIR__ . '/api/config.php';

header('Content-Type: text/plain; charset=utf-8');

$to = 'info@nexasystems.co.za'; // Sending to itself for testing
$subject = 'Nexa Payroll - Email Test ' . date('Y-m-d H:i:s');
$html = '<h2>Test Email</h2><p>If you receive this, the email system is working.</p>';

$fromEmail = env('SMTP_FROM_EMAIL', 'info@nexasystems.co.za');
$fromName = env('SMTP_FROM_NAME', 'Nexa HR & Payroll');

echo "Testing Email System...\n";
echo "Host: " . env('SMTP_HOST') . "\n";
echo "Port: " . env('SMTP_PORT') . "\n";
echo "User: " . env('SMTP_USER') . "\n";   
echo "---------------------------------\n";

list($sent, $error) = nexa_send_email($to, $subject, $html, $fromEmail, $fromName);

if ($sent) {
    echo "✅ SUCCESS: Email was sent to $to\n";
    echo "Check the app.log file or the inbox for confirmation.\n";
} else {
    echo "❌ FAILED: Could not send email.\n";
    echo "Error details: $error\n";
}

echo "---------------------------------\n";
echo "Log Contents (Last 5 lines):\n";
if (file_exists(__DIR__ . '/logs/app.log')) {
    $logs = file(__DIR__ . '/logs/app.log');
    $lastLines = array_slice($logs, -5);
    foreach ($lastLines as $line) {
        echo trim($line) . "\n";
    }
}
