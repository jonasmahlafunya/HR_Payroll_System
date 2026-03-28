<?php
/**
 * Nexa HR & Payroll — 2FA Database Migration (PDO)
 */
require_once __DIR__ . '/config.php';

// Security: restrict to CLI, Dev, or valid API_KEY bypass
$providedKey = $_GET['key'] ?? '';
$isCLI = (php_sapi_name() === 'cli');
$isDev = (defined('APP_ENV') && APP_ENV === 'development');
$isAuth = (defined('API_KEY') && !empty($providedKey) && $providedKey === API_KEY);

if (!$isCLI && !$isDev && !$isAuth) {
    header('HTTP/1.1 403 Forbidden');
    die('Migration blocked: Production GUI access restricted. Use CLI or provide ?key=YOUR_API_KEY');
}

try {
    $pdo = get_db_connection();
    echo "Starting migration...\n";

    // 1. Check for password vs password_hash (to find a reliable anchor)
    $stmt = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'");
    $hasHashCol = $stmt->fetch();
    $anchor = $hasHashCol ? 'password_hash' : 'password';

    // 2. Add two_factor_secret to users
    $stmt = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'two_factor_secret'");
    if (!$stmt->fetch()) {
        echo "Adding two_factor_secret to users table...\n";
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `two_factor_secret` VARCHAR(32) DEFAULT NULL AFTER `$anchor`");
    }

    // 2. Check/Add two_factor_enabled to users
    $stmt = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'two_factor_enabled'");
    if (!$stmt->fetch()) {
        echo "Adding two_factor_enabled to users table...\n";
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `two_factor_enabled` TINYINT(1) DEFAULT 0 AFTER `two_factor_secret`");
    }

    // 3. Check/Add employee_id to auth_sessions
    $stmt = $pdo->query("SHOW COLUMNS FROM `auth_sessions` LIKE 'employee_id'");
    if (!$stmt->fetch()) {
        echo "Adding employee_id to auth_sessions table...\n";
        $pdo->exec("ALTER TABLE `auth_sessions` ADD COLUMN `employee_id` INT DEFAULT NULL AFTER `role`");
    }

    echo "Migration completed successfully.\n";

} catch (Throwable $e) {
    echo "Migration Error: " . $e->getMessage() . "\n";
}
