<?php
/**
 * Nexa HR & Payroll — 2FA Database Migration
 */
require_once __DIR__ . '/config.php';

if (php_sapi_name() !== 'cli' && APP_ENV !== 'development') {
    die('Migration must be run from CLI or in development mode.');
}

$conn = get_db_connection();

echo "Checking Users table for 2FA columns...\n";

// Add two_factor_secret
$checkSecret = $conn->query("SHOW COLUMNS FROM `users` LIKE 'two_factor_secret'");
if ($checkSecret->num_rows === 0) {
    echo "Adding two_factor_secret column...\n";
    $conn->query("ALTER TABLE `users` ADD COLUMN `two_factor_secret` VARCHAR(32) DEFAULT NULL AFTER `password_hash`") or die($conn->error);
}

// Add two_factor_enabled
$checkEnabled = $conn->query("SHOW COLUMNS FROM `users` LIKE 'two_factor_enabled'");
if ($checkEnabled->num_rows === 0) {
    echo "Adding two_factor_enabled column...\n";
    $conn->query("ALTER TABLE `users` ADD COLUMN `two_factor_enabled` TINYINT(1) DEFAULT 0 AFTER `two_factor_secret`") or die($conn->error);
}

// Add index
$conn->query("ALTER TABLE `auth_sessions` ADD COLUMN `employee_id` INT DEFAULT NULL AFTER `role`") or die($conn->error);

echo "Migration completed successfully.\n";
$conn->close();
