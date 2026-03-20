<?php
/**
 * Nexa HR & Payroll — Authentication Endpoint
 * POST /api/auth.php?action=login   { username, password }
 * POST /api/auth.php?action=logout  (requires X-Auth-Token header)
 * GET  /api/auth.php?action=verify  (requires X-Auth-Token header)
 */
header('Content-Type: application/json');
require_once 'config.php';

set_cors_headers();

$conn   = get_db_connection();
init_tables($conn);

$action = $_GET['action'] ?? $_POST['action'] ?? 'login';

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input    = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if (!$username || !$password) {
        json_response(['error' => 'Username and password are required.'], 400);
    }

    // Rate limiting — max 10 attempts per IP per 15 minutes
    $ip      = $conn->real_escape_string($_SERVER['REMOTE_ADDR'] ?? '');
    $window  = date('Y-m-d H:i:00', strtotime('-15 minutes'));
    $attempts = $conn->query(
        "SELECT COUNT(*) AS cnt FROM audit_log
         WHERE action = 'LOGIN_FAIL' AND ip_address = '$ip'
         AND timestamp > '$window'"
    );
    if ($attempts && ($row = $attempts->fetch_assoc()) && $row['cnt'] >= 10) {
        json_response(['error' => 'Too many failed attempts. Please wait 15 minutes.'], 429);
    }

    // Load DB state to find the user (stored in the JSON blob)
    $result  = $conn->query("SELECT data_blob FROM system_storage WHERE key_name='hrpms_main_state'");
    $dbState = null;
    if ($result && $row = $result->fetch_assoc()) {
        $dbState = json_decode($row['data_blob'], true);
    }

    // Find user in the DB state
    $users   = $dbState['users'] ?? [];
    $user    = null;
    foreach ($users as $u) {
        if (($u['username'] ?? '') === $username) { $user = $u; break; }
    }

    if (!$user) {
        audit_log($conn, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'User not found']);
        json_response(['error' => 'Invalid username or password.'], 401);
    }

    // Password verification: support both bcrypt and plain-text legacy passwords
    $passwordOk = false;
    if (isset($user['password_hash']) && strpos((string)$user['password_hash'], '$2') === 0) {
        // bcrypt
        $passwordOk = password_verify($password, $user['password_hash']);
    } else {
        // Legacy plain-text — verify and migrate to bcrypt
        $storedPlain = $user['password'] ?? $user['password_hash'] ?? '';
        $passwordOk  = ($password === $storedPlain);
        if ($passwordOk) {
            // Migrate password to bcrypt in the stored state
            foreach ($dbState['users'] as &$u) {
                if ($u['username'] === $username) {
                    $u['password_hash'] = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                    unset($u['password']); // Remove plain-text
                }
            }
            unset($u);
            // Save migrated state back
            $blob = $conn->real_escape_string(json_encode($dbState));
            $conn->query("INSERT INTO system_storage (key_name, data_blob) VALUES ('hrpms_main_state', '$blob')
                          ON DUPLICATE KEY UPDATE data_blob = '$blob'");
        }
    }

    if (!$passwordOk) {
        audit_log($conn, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'Wrong password']);
        json_response(['error' => 'Invalid username or password.'], 401);
    }

    // Generate secure session token
    $token     = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
    $safeTok   = $conn->real_escape_string($token);
    $safeUser  = $conn->real_escape_string($username);
    $safeRole  = $conn->real_escape_string($user['role'] ?? 'Employee');
    $safeIp    = $conn->real_escape_string($ip);
    $safeUa    = $conn->real_escape_string(substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255));

    $conn->query("INSERT INTO auth_sessions (token, username, role, ip_address, user_agent, expires_at)
                  VALUES ('$safeTok', '$safeUser', '$safeRole', '$safeIp', '$safeUa', '$expiresAt')");

    // Clean up expired sessions
    $conn->query("DELETE FROM auth_sessions WHERE expires_at < NOW()");

    audit_log($conn, $username, 'LOGIN_SUCCESS', 'Auth', ['role' => $user['role']]);

    // Return user data (never return passwords)
    $safeUserData = $user;
    unset($safeUserData['password'], $safeUserData['password_hash']);

    json_response([
        'status'     => 'success',
        'token'      => $token,
        'expiresAt'  => $expiresAt,
        'user'       => $safeUserData
    ]);
}

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────
if ($action === 'logout') {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if ($token) {
        $safe = $conn->real_escape_string($token);
        $conn->query("DELETE FROM auth_sessions WHERE token = '$safe'");
    }
    json_response(['status' => 'logged_out']);
}

// ─────────────────────────────────────────────────────────────
// VERIFY TOKEN
// ─────────────────────────────────────────────────────────────
if ($action === 'verify') {
    $session = validate_session($conn);
    if ($session) {
        // Extend session
        $safe  = $conn->real_escape_string($_SERVER['HTTP_X_AUTH_TOKEN'] ?? '');
        $expAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
        $conn->query("UPDATE auth_sessions SET expires_at = '$expAt' WHERE token = '$safe'");
        json_response(['valid' => true, 'user' => $session]);
    } else {
        json_response(['valid' => false], 401);
    }
}

// ─────────────────────────────────────────────────────────────
// HASH UTILITY (admin only, for migrating passwords)
// ─────────────────────────────────────────────────────────────
if ($action === 'hash_password' && APP_ENV === 'development') {
    $input    = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';
    json_response(['hash' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12])]);
}

json_response(['error' => 'Invalid action.'], 400);
