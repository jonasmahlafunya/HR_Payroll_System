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
    if (@$conn->query($sql)) {
        
        // Transparently sync JSON users from the frontend UI into the live Relational MySQL Table
        $syncErrors = [];
        if (isset($decoded['data']['users']) && is_array($decoded['data']['users'])) {
            foreach ($decoded['data']['users'] as $u) {
                try {
                    $uName = $conn->real_escape_string($u['username'] ?? '');
                    if (!$uName) continue;
                    
                    $uPass = $conn->real_escape_string($u['password'] ?? 'Changeme123!');
                    
                    // Map the frontend role ID if it doesn't gracefully match PaySpace standard exact strings
                    $rawRole = $u['role'] ?? null;
                    if (!$rawRole && isset($u['roleId'])) {
                        $roleMap = [1 => 'Super Administrator', 2 => 'HR Administrator', 3 => 'Payroll Administrator', 4 => 'Employee', 5 => 'Manager'];
                        $rawRole = $roleMap[$u['roleId']] ?? 'Employee';
                    }
                    $uRole = $conn->real_escape_string($rawRole ?? 'Employee');
                    
                    $uNameFull = $conn->real_escape_string($u['name'] ?? '');
                    $uEmail = $conn->real_escape_string($u['email'] ?? '');
                    $uStatus = $conn->real_escape_string($u['status'] ?? 'Active');
                    
                    // We ignore the frontend 'id' entirely and let the database handle it via AUTO_INCREMENT.
                    // We use 'username' (which is UNIQUE) as the master key for syncing.
                    $insertSql = "INSERT INTO users (username, password, role, name, email, status) 
                                  VALUES ('$uName', '$uPass', '$uRole', '$uNameFull', '$uEmail', '$uStatus') 
                                  ON DUPLICATE KEY UPDATE 
                                    role   = VALUES(role), 
                                    name   = VALUES(name), 
                                    email  = VALUES(email), 
                                    status = VALUES(status)";
                    
                    if (!$conn->query($insertSql)) {
                        throw new Exception($conn->error);
                    }
                } catch (Exception $e) {
                    $syncErrors[] = "User [$uName]: " . $e->getMessage();
                }
            }
        }
        
        if (!empty($syncErrors)) {
            file_put_contents(__DIR__ . '/sync_error.log', date('Y-m-d H:i:s') . " - Sync Issues: " . implode(' | ', $syncErrors) . PHP_EOL, FILE_APPEND);
        }
        
        $conn->close();
        ob_end_clean();
        json_response([
            'status' => 'success', 
            'message' => empty($syncErrors) ? 'Data persisted securely.' : 'Data saved to blob, but relational sync had issues. Check sync_error.log.'
        ]);
    } else {
        $conn->close();
        ob_end_clean();
        json_response(['error' => 'DB write error: ' . $conn->error], 500);
    }
}
// ── GET: Load ─────────────────────────────────────────────────────────────────
$result = @$conn->query("SELECT `data_blob` FROM `system_storage` WHERE `key_name` = '$key' LIMIT 1");
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