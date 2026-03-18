<?php
// Database configuration for infinityfree.com
define('DB_HOST', 'sql303.infinityfree.com');
define('DB_USER', 'if0_41384788');
define('DB_PASS', 'CLhT8a7Crx5bH7s');
define('DB_NAME', 'if0_41384788_nexa_hrpayroll');

function get_db_connection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die(json_encode(['error' => 'Connection failed: ' . $conn->connect_error]));
    }
    return $conn;
}

// Ensure the storage table exists
function init_storage_table($conn) {
    $sql = "CREATE TABLE IF NOT EXISTS `system_storage` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `key_name` varchar(50) NOT NULL UNIQUE,
        `data_blob` LONGTEXT NOT NULL,
        `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $conn->query($sql);
}
?>
