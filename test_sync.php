<?php
require 'api/config.php';
$pdo = get_db_connection();
ensure_all_tables($pdo);

$raw = json_encode(['companies' => [['id' => 1, 'name' => 'Acme Corp']]]);
$BLOB_KEY = 'hrpms_main_state';

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        "INSERT INTO `system_storage` (`key_name`, `data_blob`)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE `data_blob` = ?"
    );
    $stmt->execute([$BLOB_KEY, $raw, $raw]);
    $pdo->commit();
    echo "SUCCESS\n";
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
