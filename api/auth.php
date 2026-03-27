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
    // Temporarily disabled 15-minute brute force lockout to allow unrestrained password debugging
    /*
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
    */
    // The following lines are part of a different rate limiting implementation, also commented out as per instruction.
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $attemptsRes = @$conn->query("SELECT attempt_count, last_attempt FROM login_attempts WHERE ip_address = '$ip'");
    /* Temporarily disabled 15-minute brute force lockout to allow unrestrained password debugging
    if ($attemptsRes && $r = $attemptsRes->fetch_assoc()) {
        if ($r['attempt_count'] > 5 && strtotime($r['last_attempt']) > time() - 900) {
            json_response(['error' => 'Too many failed attempts. Please wait 15 minutes.'], 429);
        }
    }
    */ // Query relational database for user natively (detached queries prevent MySQL collation conflicts)
    $safeUsername = $conn->real_escape_string($username);
    $result = @$conn->query("SELECT * FROM users WHERE username = '$safeUsername'");
    $user = null;
    
    if ($result && $row = $result->fetch_assoc()) {
        $user = $row;
        
        // Fetch role permissions independently to avoid JOIN crashes
        $safeRole = $conn->real_escape_string($user['role'] ?? '');
        $roleResult = @$conn->query("SELECT permissions FROM roles WHERE name = '$safeRole'");
        $rolePerms = ($roleResult && $rRow = $roleResult->fetch_assoc()) ? $rRow['permissions'] : null;
        
        // Use user-specific permissions if defined, otherwise fallback to the role's permissions
        $rawPerms = !empty($user['permissions']) ? $user['permissions'] : $rolePerms;
        
        if (!empty($rawPerms) && is_string($rawPerms)) {
            $decoded = json_decode($rawPerms, true);
            $user['permissions'] = is_array($decoded) ? $decoded : array_map('trim', explode(',', $rawPerms));
        } else {
            $user['permissions'] = [];
        }
        
        // Fallback mapping for industry-standard PaySpace roles in case the roles table is empty
        if (empty($user['permissions'])) {
            $r = $user['role'] ?? '';
            if (in_array($r, ['Super Administrator', 'Super Admin', 'Administrator', 'Company Administrator'])) {
                $user['permissions'] = ['all'];
            } elseif (in_array($r, ['HR Administrator', 'HR Manager'])) {
                $user['permissions'] = ['employees.view', 'employees.edit', 'reports.view'];
            } elseif (in_array($r, ['Payroll Administrator', 'Payroll Officer'])) {
                $user['permissions'] = ['employees.view', 'payroll.process', 'payroll.view', 'tax.view', 'reports.view'];
            } else {
                $user['permissions'] = ['self.view']; // Default to ESS for Manager and Employee
            }
        }
    }

    if (!$user) {
        $dbError = $conn->error;
        audit_log($conn, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'User not found']);
        json_response([
            'error' => 'Diagnostic 401: User not found in database.', 
            'typed_username' => $username, 
            'db_error' => $dbError
        ], 401);
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
            // Migrate password to bcrypt in the relational table
            $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $safeHash = $conn->real_escape_string($newHash);
            @$conn->query("UPDATE users SET password_hash = '$safeHash' WHERE username = '$safeUsername'");
            $user['password_hash'] = $newHash;
            unset($user['password']);
        }
    }

    if (!$passwordOk) {
        audit_log($conn, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'Wrong password']);
        json_response([
            'error' => 'Diagnostic 401: Invalid password.', 
            'typed_username' => $username, 
            'expected_plaintext_matching' => $storedPlain
        ], 401);
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
    if (!$token && function_exists('getallheaders')) {
        $all = getallheaders();
        foreach ($all as $k => $v) {
            if (strtolower($k) === 'x-auth-token') { $token = $v; break; }
        }
    }
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
