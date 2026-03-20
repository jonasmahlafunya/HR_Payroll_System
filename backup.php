<?php
/**
 * Nexa HR & Payroll — Database Backup
 * GET /api/backup.php           — Download backup (admin only)
 * GET /api/backup.php?type=auto — Silent background backup (cron/API key)
 * GET /api/backup.php?action=list — List available backups
 */
require_once 'config.php';

set_cors_headers();

$conn    = get_db_connection();
$session = validate_session($conn);
$isAuto  = ($_GET['type'] ?? '') === 'auto';
$isList  = ($_GET['action'] ?? '') === 'list';

// Auth: require session OR API key
if (!$session && !validate_api_key()) {
    header('Content-Type: application/json');
    json_response(['error' => 'Unauthorized.'], 401);
}

// Restrict manual downloads to Super Admin
if (!$isAuto && $session && ($session['role'] ?? '') !== 'Super Admin') {
    header('Content-Type: application/json');
    json_response(['error' => 'Super Admin role required for backups.'], 403);
}

// Backup storage directory
$backupDir = dirname(__DIR__) . '/backups/';
if (!is_dir($backupDir)) mkdir($backupDir, 0750, true);

// ── List available backups ────────────────────────────────────
if ($isList) {
    header('Content-Type: application/json');
    $files = glob($backupDir . '*.sql.gz') ?: [];
    $list  = [];
    foreach ($files as $f) {
        $list[] = [
            'filename' => basename($f),
            'size'     => filesize($f),
            'created'  => date('c', filemtime($f))
        ];
    }
    usort($list, fn($a, $b) => $b['created'] <=> $a['created']);
    json_response(['backups' => $list]);
}

// ── Generate backup ───────────────────────────────────────────
$filename = 'nexa_backup_' . date('Y-m-d_H-i-s') . '.sql';
$filepath = $backupDir . $filename;

$sql  = "-- Nexa HR & Payroll Backup\n";
$sql .= "-- Generated: " . date('c') . "\n";
$sql .= "-- Database: " . DB_NAME . "\n\n";
$sql .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

// Backup system_storage (the main data blob)
$tables = ['system_storage', 'auth_sessions', 'audit_log', 'documents', 'leave_accrual_log'];

foreach ($tables as $table) {
    // Get CREATE TABLE
    $create = $conn->query("SHOW CREATE TABLE `$table`");
    if (!$create) continue;
    $row = $create->fetch_row();
    $sql .= "DROP TABLE IF EXISTS `$table`;\n";
    $sql .= $row[1] . ";\n\n";

    // Get data
    $rows = $conn->query("SELECT * FROM `$table`");
    if (!$rows || $rows->num_rows === 0) continue;

    while ($dataRow = $rows->fetch_assoc()) {
        $cols = '`' . implode('`, `', array_keys($dataRow)) . '`';
        $vals = implode(', ', array_map(function($v) use ($conn) {
            return is_null($v) ? 'NULL' : "'" . $conn->real_escape_string($v) . "'";
        }, $dataRow));
        $sql .= "INSERT INTO `$table` ($cols) VALUES ($vals);\n";
    }
    $sql .= "\n";
}

$sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";

// Compress and save
file_put_contents($filepath, $sql);
if (function_exists('gzopen')) {
    $gz = gzopen($filepath . '.gz', 'w9');
    gzwrite($gz, $sql);
    gzclose($gz);
    unlink($filepath);
    $filepath .= '.gz';
    $filename  .= '.gz';
}

// Cleanup old backups (keep last N days)
$retain = BACKUP_RETAIN * 86400;
foreach (glob($backupDir . '*.sql*') ?: [] as $old) {
    if (filemtime($old) < time() - $retain) @unlink($old);
}

audit_log($conn, $session['username'] ?? 'cron', 'BACKUP_CREATED', 'System', [
    'filename' => $filename,
    'size'     => file_exists($filepath) ? filesize($filepath) : 0
]);

// ── Auto mode: save silently ──────────────────────────────────
if ($isAuto) {
    header('Content-Type: application/json');
    json_response([
        'status'   => 'success',
        'filename' => $filename,
        'size'     => file_exists($filepath) ? filesize($filepath) : 0
    ]);
}

// ── Manual mode: stream download ─────────────────────────────
if (file_exists($filepath)) {
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($filepath));
    header('Cache-Control: no-cache, must-revalidate');
    readfile($filepath);
    exit;
}

header('Content-Type: application/json');
json_response(['error' => 'Backup file could not be created.'], 500);
