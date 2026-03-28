<?php
/**
 * Nexa HR & Payroll — Audit Log API (Admin Only)
 */
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
set_cors_headers();

$conn = get_db_connection();
$session = validate_session($conn);

if (!$session || !in_array($session['role'], ['Super Administrator', 'Administrator'])) {
    http_response_code(403);
    json_response(['error' => 'Forbidden. Admin access required.'], 403);
}

$action = $_GET['action'] ?? 'list';

if ($action === 'list') {
    $limit  = intval($_GET['limit'] ?? 100);
    $offset = intval($_GET['offset'] ?? 0);
    
    $result = $conn->query("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $limit OFFSET $offset");
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $row['details'] = json_decode($row['details'], true);
        $logs[] = $row;
    }
    
    $total = $conn->query("SELECT COUNT(*) FROM audit_log")->fetch_row()[0];
    
    json_response([
        'status' => 'success',
        'logs' => $logs,
        'total' => intval($total)
    ]);
}

if ($action === 'alerts') {
    // Basic anomaly detection: >5 failed logins from same IP in 1 hour
    $window = date('Y-m-d H:i:s', time() - 3600);
    $sql = "SELECT ip_address, COUNT(*) as fail_count 
            FROM audit_log 
            WHERE action = 'LOGIN_FAIL' AND timestamp > '$window'
            GROUP BY ip_address 
            HAVING fail_count >= 5";
    
    $result = $conn->query($sql);
    $alerts = [];
    while ($row = $result->fetch_assoc()) {
        $alerts[] = [
            'type' => 'BRUTE_FORCE_ATTEMPT',
            'ip' => $row['ip_address'],
            'count' => $row['fail_count'],
            'severity' => 'high'
        ];
    }
    
    json_navigation_response(['status' => 'success', 'alerts' => $alerts]);
}

json_response(['error' => 'Invalid action.'], 400);
