<?php
/**
 * Nexa HR & Payroll — One-time Database Setup Script
 *
 * Run ONCE after deployment:
 *   php api/setup.php
 *   OR visit: https://yourdomain.co.za/api/setup.php?key=YOUR_API_KEY
 *
 * DELETE or restrict this file after running.
 */
require_once __DIR__ . '/config.php';

$isCLI  = php_sapi_name() === 'cli';
$apiKey = $_GET['key'] ?? '';
$isAuth = defined('API_KEY') && !empty($apiKey) && $apiKey === API_KEY;

if (!$isCLI && !$isAuth) {
    http_response_code(403);
    die("Access denied. Run via CLI or pass ?key=YOUR_API_KEY");
}

if (!$isCLI) { header('Content-Type: text/plain'); }

function say(string $msg): void {
    echo $msg . "\n";
    flush();
}

try {
    $pdo = get_db_connection();
    say("✓ Database connection established");

    ensure_all_tables($pdo);
    say("✓ All tables created / verified");

    // Verify critical tables exist
    $tables = ['system_storage','auth_sessions','auth_otp','audit_log','documents','users'];
    foreach ($tables as $t) {
        $res = $pdo->query("SHOW TABLES LIKE '$t'");
        say(($res->fetch() ? "✓" : "✗") . " Table: $t");
    }

    say("\n✓ Setup complete. You can delete api/setup.php now.");

} catch (Throwable $e) {
    say("✗ Error: " . $e->getMessage());
    exit(1);
}
