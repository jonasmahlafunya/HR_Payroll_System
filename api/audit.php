<?php
/**
 * Nexa HR & Payroll — Audit Log API (Admin Only)
 */
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
set_cors_headers();

try {
    $pdo = get_db_connection();
    $session = validate_session($pdo);
} catch (Throwable $e) {
    json_response(['error' => 'System error.'], 500);
}

if (!$session || !in_array($session['role'], ['Super Administrator', 'HR Administrator', 'Payroll Administrator'])) {
    json_response(['error' => 'Forbidden. Admin access required.'], 403);
}

$action = $_GET['action'] ?? 'list';

if ($action === 'list') {
    $limit = intval($_GET['limit'] ?? 100);
    $offset = intval($_GET['offset'] ?? 0);

    // Using positional parameters for limit/offset is tricky in some PDO configs, but here we cast to int
    $stmt = $pdo->prepare("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT :limit OFFSET :offset");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $logs = [];
    while ($row = $stmt->fetch()) {
        $row['details'] = json_decode($row['details'], true);
        $logs[] = $row;
    }

    $total = $pdo->query("SELECT COUNT(*) FROM audit_log")->fetchColumn();

    json_response([
        'status' => 'success',
        'logs' => $logs,
        'total' => intval($total)
    ]);
}

if ($action === 'alerts') {
    // Basic anomaly detection: >5 failed logins from same IP in 1 hour
    $window = date('Y-m-d H:i:s', time() - 3600);
    $stmt = $pdo->prepare("SELECT ip_address, COUNT(*) as fail_count 
                           FROM audit_log 
                           WHERE action = 'LOGIN_FAIL' AND timestamp > ?
                           GROUP BY ip_address 
                           HAVING fail_count >= 5");
    $stmt->execute([$window]);

    $alerts = [];
    while ($row = $stmt->fetch()) {
        $alerts[] = [
            'type' => 'BRUTE_FORCE_ATTEMPT',
            'ip' => $row['ip_address'],
            'count' => $row['fail_count'],
            'severity' => 'high'
        ];
    }

    json_response(['status' => 'success', 'alerts' => $alerts]);
}

json_response(['error' => 'Invalid action.'], 400);
