<?php
/**
 * Nexa HR & Payroll — Data Sync Endpoint
 */

require_once __DIR__ . '/config.php';

// Capture output to prevent breaking JSON
ob_start();
header('Content-Type: application/json');
set_cors_headers();

$conn = get_db_connection();
init_tables($conn);

$key = 'hrpms_main_state';

// ── POST: Save ────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');

    if (!$raw || $raw === '') {
        ob_end_clean();
        json_response(['error' => 'Empty body received.'], 400);
    }

    // Validate it's parseable JSON before storing
    $decoded = @json_decode($raw, true);
    if (!is_array($decoded)) {
        ob_end_clean();
        json_response(['error' => 'Body is not valid JSON.'], 400);
    }

    $blob = $conn->real_escape_string($raw);
    $sql  = "INSERT INTO `system_storage` (`key_name`, `data_blob`)
             VALUES ('$key', '$blob')
             ON DUPLICATE KEY UPDATE `data_blob` = '$blob'";

    if ($conn->query($sql)) {
        require_once __DIR__ . '/sync_relational.php';
        sync_relational_data($conn, $decoded);

        $conn->close();
        ob_end_clean();
        json_response(['status' => 'success', 'message' => 'Data persisted to MySQL (Blob + Relational).']);
    } else {
        $conn->close();
        ob_end_clean();
        json_response(['error' => 'DB write error: ' . $conn->error], 500);
    }
}

// ── GET: Load ─────────────────────────────────────────────────────────────────
$result = $conn->query("SELECT `data_blob` FROM `system_storage` WHERE `key_name` = '$key' LIMIT 1");

if (!$result || $result->num_rows === 0) {
    $conn->close();
    ob_end_clean();
    json_response(['status' => 'empty', 'message' => 'No server data found yet.']);
}

$row = $result->fetch_assoc();
$conn->close();

// Stream the blob directly (it's already a JSON string)
$stray = ob_get_clean();
http_response_code(200);
header('Content-Type: application/json');
// Prepend any stray PHP output as a JSON comment (won't break parsers that skip whitespace,
// but we try hard to have none)
if ($stray !== '' && $stray !== false) {
    // Can't safely inject it — log to error_log instead
    error_log('[sync.php stray output] ' . $stray);
}
echo $row['data_blob'];
exit;