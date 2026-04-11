<?php
/**
 * Nexa HR & Payroll — Data Sync Endpoint
 *
 * POST /api/sync.php  — Save full app-state blob (session required)
 * GET  /api/sync.php  — Load blob (session required)
 *
 * Security: validated via httpOnly session cookie — no CSRF needed for this
 * same-origin blob endpoint.  Passwords in the users array are NEVER used to
 * overwrite existing bcrypt hashes in the DB.
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json');
set_cors_headers();

try {
    $pdo = get_db_connection();
    ensure_all_tables($pdo);
} catch (Throwable $t) {
    json_response(['status' => 'db_unavailable', 'error' => 'Database unavailable.'], 503);
}

$session = validate_session($pdo);
if (!$session) {
    json_response(['status' => 'db_unavailable', 'error' => 'No active session.'], 401);
}

$BLOB_KEY = 'hrpms_main_state';

// POST — Save
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    if (!$raw)
        json_response(['error' => 'Empty body.'], 400);

    $decoded = json_decode($raw, true);
    if (!is_array($decoded))
        json_response(['error' => 'Invalid JSON.'], 400);

    try {
        $pdo->beginTransaction();

        // 1. Upsert the whole state blob
        $pdo->prepare(
            "INSERT INTO `system_storage` (`key_name`, `data_blob`)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE `data_blob` = ?"
        )->execute([$BLOB_KEY, $raw, $raw]);

        // 2. Mirror users to relational table — never overwrite existing password hashes
        $users = $decoded['users'] ?? [];
        if (is_array($users) && !empty($users)) {

            // Detect which password column exists
            $colCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'");
            $hashCol = $colCheck && $colCheck->fetch() ? 'password_hash' : 'password';

            // Load existing hashes so we can skip overwrite
            $existingHashes = [];
            foreach ($pdo->query("SELECT username, `$hashCol` AS h FROM `users`")->fetchAll() as $r) {
                $existingHashes[$r['username']] = $r['h'];
            }

            $checkStmt = $pdo->prepare("SELECT id FROM `users` WHERE username = ? LIMIT 1");

            foreach ($users as $u) {
                $uUser = substr(trim($u['username'] ?? ''), 0, 100);
                if (!$uUser)
                    continue;

                $uRole = substr($u['role'] ?? 'Employee', 0, 100);
                $uName = substr($u['name'] ?? $uUser, 0, 200);
                $uEmail = substr($u['email'] ?? '', 0, 200);
                $uStatus = in_array($u['status'] ?? '', ['Active', 'Inactive', 'Suspended'])
                    ? $u['status'] : 'Active';

                $checkStmt->execute([$uUser]);
                $exists = $checkStmt->fetch();
                $checkStmt->closeCursor();
                if ($exists) {
                    // Exists — only update safe fields
                    $pdo->prepare(
                        "UPDATE `users` SET name=?, email=?, role=?, status=? WHERE username=?"
                    )->execute([$uName, $uEmail, $uRole, $uStatus, $uUser]);
                } else {
                    // New user — hash password before inserting
                    $rawPw = $u['password'] ?? $u['password_hash'] ?? '';
                    $isBcrypt = strpos((string) $rawPw, '$2') === 0;
                    $hash = $isBcrypt ? $rawPw
                        : password_hash($rawPw ?: bin2hex(random_bytes(16)), PASSWORD_BCRYPT, ['cost' => 12]);
                    try {
                        $pdo->prepare(
                            "INSERT IGNORE INTO `users` (username, `$hashCol`, name, email, role, status, created_at)
                             VALUES (?,?,?,?,?,?,NOW())"
                        )->execute([$uUser, $hash, $uName, $uEmail, $uRole, $uStatus]);
                    } catch (Throwable $ie) {
                        debug_log("Sync: insert user $uUser failed: " . $ie->getMessage());
                    }
                }
            }
        }

        // 3. Mirror companies to relational table
        $companies = $decoded['companies'] ?? [];
        if (is_array($companies) && !empty($companies)) {
            $checkCompStmt = $pdo->prepare("SELECT id FROM `companies` WHERE name = ? LIMIT 1");

            foreach ($companies as $c) {
                $cName = substr(trim($c['name'] ?? ''), 0, 255);
                if (!$cName)
                    continue; // Name is required

                $cReg = substr(trim($c['registrationNumber'] ?? ''), 0, 50);
                $cTax = substr(trim($c['taxReference'] ?? ''), 0, 50);
                $cVat = substr(trim($c['vatNumber'] ?? ''), 0, 50);
                $cUif = substr(trim($c['uifNumber'] ?? ''), 0, 50);
                $cSdl = substr(trim($c['sdlNumber'] ?? ''), 0, 50);
                $cEmail = substr(trim($c['email'] ?? ''), 0, 255);
                $cPhone = substr(trim($c['contact'] ?? ''), 0, 50);
                $cAddress = trim($c['address'] ?? '');
                $cStatus = substr(trim($c['status'] ?? 'Active'), 0, 50);

                $checkCompStmt->execute([$cName]);
                $cExists = $checkCompStmt->fetch();
                $checkCompStmt->closeCursor();

                if ($cExists) {
                    $pdo->prepare(
                        "UPDATE `companies` 
                         SET registration_number=?, tax_reference=?, vat_number=?, uif_number=?, sdl_number=?, email=?, contact_phone=?, address=?, status=? 
                         WHERE name=?"
                    )->execute([$cReg, $cTax, $cVat, $cUif, $cSdl, $cEmail, $cPhone, $cAddress, $cStatus, $cName]);
                } else {
                    $pdo->prepare(
                        "INSERT INTO `companies` 
                         (name, registration_number, tax_reference, vat_number, uif_number, sdl_number, email, contact_phone, address, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                    )->execute([$cName, $cReg, $cTax, $cVat, $cUif, $cSdl, $cEmail, $cPhone, $cAddress, $cStatus]);
                }
            }
        }

        $pdo->commit();
        json_response(['status' => 'success']);

    } catch (Throwable $e) {
        if (isset($pdo) && $pdo->inTransaction())
            $pdo->rollBack();
        $msg = $e->getMessage();
        debug_log("Sync POST error: " . $msg . " in " . $e->getFile() . ":" . $e->getLine());
        debug_log("Stack trace: " . $e->getTraceAsString());
        json_response(['error' => 'Sync failed.', 'detail' => $msg], 500);
    }
}

// GET — Load
try {
    $stmt = $pdo->prepare("SELECT `data_blob` FROM `system_storage` WHERE `key_name` = ? LIMIT 1");
    $stmt->execute([$BLOB_KEY]);
    $row = $stmt->fetch();
    if (!$row)
        json_response(['status' => 'empty']);
    echo $row['data_blob'];
    exit;
} catch (Throwable $e) {
    debug_log("Sync GET error: " . $e->getMessage());
    json_response(['status' => 'db_unavailable'], 503);
}
