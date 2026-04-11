<?php
/**
 * Nexa HR & Payroll — Database Backup (PDO)
 */
require_once 'config.php';

set_cors_headers();

try {
    $pdo = get_db_connection();
    $session = validate_session($pdo);
} catch (Throwable $e) {
    json_response(['error' => 'System error.'], 500);
}

$isAuto = ($_GET['type'] ?? '') === 'auto';
$isList = ($_GET['action'] ?? '') === 'list';

// Auth: require valid session OR API key
if (!$session && !validate_api_key()) {
    json_response(['error' => 'Unauthorized.'], 401);
}

// Restrict manual downloads to Super Admin or similar privileged role
if (!$isAuto && $session && !in_array($session['role'], ['Super Admin', 'HR Manager', 'Super Administrator', 'HR Administrator'])) {
    json_response(['error' => 'Insufficient permissions for backups.'], 403);
}

// Backup storage directory
$backupDir = dirname(__DIR__) . '/backups/';
if (!is_dir($backupDir))
    @mkdir($backupDir, 0750, true);

// ── List available backups ────────────────────────────────────
if ($isList) {
    $files = glob($backupDir . '*.sql.gz') ?: [];
    $list = [];
    foreach ($files as $f) {
        $list[] = [
            'filename' => basename($f),
            'size' => filesize($f),
            'created' => date('c', filemtime($f))
        ];
    }
    usort($list, fn($a, $b) => $b['created'] <=> $a['created']);
    json_response(['backups' => $list]);
}

// ── Generate backup ───────────────────────────────────────────
$filename = 'nexa_backup_' . date('Y-m-d_H-i-s') . '.sql';
$filepath = $backupDir . $filename;

$sql = "-- Nexa HR & Payroll Backup\n";
$sql .= "-- Generated: " . date('c') . "\n";
$sql .= "-- Database: " . DB_NAME . "\n\n";
$sql .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

// Tables to backup.
// NOTE: auth_sessions is intentionally excluded — it contains live session tokens
//       that would be a security risk in a plaintext backup file.
$tables = ['system_storage', 'users', 'companies', 'documents', 'audit_log'];

foreach ($tables as $table) {
    try {
        // Get CREATE TABLE
        $stmt = $pdo->query("SHOW CREATE TABLE `$table`");
        $row = $stmt->fetch(PDO::FETCH_NUM);
        if (!$row)
            continue;

        $sql .= "DROP TABLE IF EXISTS `$table`;\n";
        $sql .= $row[1] . ";\n\n";

        // Get data
        $stmt = $pdo->query("SELECT * FROM `$table`");
        while ($dataRow = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $cols = '`' . implode('`, `', array_keys($dataRow)) . '`';
            $vals = implode(', ', array_map(function ($v) use ($pdo) {
                return ($v === null) ? 'NULL' : $pdo->quote($v);
            }, $dataRow));
            $sql .= "INSERT INTO `$table` ($cols) VALUES ($vals);\n";
        }
        $sql .= "\n";
    } catch (Throwable $e) {
        debug_log("Backup skipped table $table: " . $e->getMessage());
    }
}

$sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";

// Compress and save
if (function_exists('gzencode')) {
    $compressed = gzencode($sql, 9);
    $filepath .= '.gz';
    $filename .= '.gz';
    file_put_contents($filepath, $compressed);
} else {
    file_put_contents($filepath, $sql);
}

// Cleanup old backups
$retainSeconds = BACKUP_RETAIN * 86400;
foreach (glob($backupDir . '*.sql*') ?: [] as $old) {
    if (filemtime($old) < (time() - $retainSeconds))
        @unlink($old);
}

audit_log($pdo, $session['username'] ?? 'system_auto', 'BACKUP_CREATED', 'System', [
    'filename' => $filename,
    'size' => file_exists($filepath) ? filesize($filepath) : 0
]);

// ── Auto mode: save return JSON ────────────────────────────────
if ($isAuto) {
    json_response([
        'status' => 'success',
        'filename' => $filename,
        'size' => file_exists($filepath) ? filesize($filepath) : 0
    ]);
}

// ── Manual mode: download ─────────────────────────────
if (file_exists($filepath)) {
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($filepath));
    header('Cache-Control: no-cache, must-revalidate');
    readfile($filepath);
    exit;
}

json_response(['error' => 'Backup file could not be created.'], 500);
