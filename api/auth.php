<?php
/**
 * Nexa HR & Payroll — Authentication Endpoint
 */
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

// Log every incoming request for ultimate routing audit
$reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
$reqUri    = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
$reqOrigin = $_SERVER['HTTP_ORIGIN'] ?? 'NO_ORIGIN';
debug_log(">>> REQUEST [$reqMethod]: $reqUri | Origin: $reqOrigin");

set_cors_headers();

try {
    $conn = get_db_connection();
    init_tables($conn);
} catch (Throwable $t) {
    json_response([
        'error' => 'Initialization Error',
        'message' => $t->getMessage()
    ], 500);
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'login';

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
if ($action === 'login' && $reqMethod === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        debug_log("Login attempt: $username");

        if (!$username || !$password) {
            json_response(['error' => 'Username and password are required.'], 400);
        }

        $safeUsername = $conn->real_escape_string($username);
        $result = $conn->query("SELECT * FROM users WHERE username = '$safeUsername'");
        $user = ($result) ? $result->fetch_assoc() : null;

        if (!$user) {
            audit_log($conn, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'User not found']);
            json_response(['error' => 'Invalid credentials.'], 401);
        }

        // Password verification (Bcrypt or Plain)
        $passwordOk = false;
        if (isset($user['password_hash']) && strpos((string)$user['password_hash'], '$2') === 0) {
            $passwordOk = password_verify($password, $user['password_hash']);
        } else {
            $storedPlain = $user['password'] ?? $user['password_hash'] ?? '';
            $passwordOk  = ($password === $storedPlain);
            if ($passwordOk) {
                // Migrate to hash
                $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                $safeHash = $conn->real_escape_string($newHash);
                $conn->query("UPDATE users SET password_hash = '$safeHash' WHERE username = '$safeUsername'");
            }
        }

        if (!$passwordOk) {
            audit_log($conn, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'Wrong password']);
            json_response(['error' => 'Invalid credentials.'], 401);
        }

        if (!empty($user['two_factor_enabled'])) {
            json_response(['status' => '2fa_required']);
        }

        // Generate token and store session
        if (function_exists('random_bytes')) {
            $token = bin2hex(random_bytes(32));
        } else {
            $token = bin2hex(openssl_random_pseudo_bytes(32));
        }
        
        $safeTok   = $conn->real_escape_string($token);
        $roleVal   = $user['role'] ?? 'Employee';
        $safeRole  = $conn->real_escape_string($roleVal);
        $safeEmpId = (int)($user['employee_id'] ?? 0);
        $ip        = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $ua        = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
        $safeUa    = $conn->real_escape_string($ua);

        $sql = "INSERT INTO auth_sessions (token, username, role, employee_id, ip_address, user_agent, expires_at)
                VALUES ('$safeTok', '$safeUsername', '$safeRole', '$safeEmpId', '$ip', '$safeUa', DATE_ADD(NOW(), INTERVAL " . (int)SESSION_LIFETIME . " SECOND))";
        
        if (!$conn->query($sql)) {
            json_response(['error' => 'Session Storage Failure', 'mysql' => $conn->error], 500);
        }
        
        $conn->commit();
        set_session_cookie($token);

        $safeUserData = $user;
        unset($safeUserData['password'], $safeUserData['password_hash'], $safeUserData['two_factor_secret']);

        audit_log($conn, $username, 'LOGIN_SUCCESS', 'Auth', ['role' => $user['role']]);

        json_response([
            'status' => 'success',
            'token'  => $token,
            'user'   => $safeUserData
        ]);
    } catch (Throwable $e) {
        json_response(['error' => 'Login Logic Failure', 'message' => $e->getMessage()], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// VERIFY TOKEN
// ─────────────────────────────────────────────────────────────
if ($action === 'verify') {
    try {
        $session = validate_session($conn);
        if ($session) {
            json_response(['valid' => true, 'user' => $session]);
        } else {
            $token = $_COOKIE[COOKIE_NAME] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? $_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'] ?? '';
            $safe  = $conn->real_escape_string($token);
            $rawCheck = $conn->query("SELECT *, NOW() as db_now FROM auth_sessions WHERE token = '$safe'")->fetch_assoc();
            $countCheck = $conn->query("SELECT COUNT(*) as total FROM auth_sessions")->fetch_assoc();
            $dummyCheck = $conn->query("SELECT id FROM auth_sessions WHERE token = 'DUMMY_TOKEN'")->fetch_assoc();
            
            // Get last 10 lines of debug.log
            $logPath = __DIR__ . '/debug.log';
            $debugLog = file_exists($logPath) ? explode(PHP_EOL, file_get_contents($logPath)) : [];
            $debugLogSub = array_slice($debugLog, -15);
            
            json_response([
                'valid' => false,
                'diag' => [
                    'db' => DB_NAME,
                    'token_found' => !empty($token),
                    'db_match' => !empty($rawCheck),
                    'dummy' => !empty($dummyCheck),
                    'total_sessions' => $countCheck['total'] ?? 0,
                    'php_now' => date('Y-m-d H:i:s'),
                    'logs' => $debugLogSub
                ]
            ], 401);
        }
    } catch (Throwable $e) {
        json_response(['error' => 'Internal Server Error', 'message' => $e->getMessage()], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────
if ($action === 'logout') {
    $token = $_COOKIE[COOKIE_NAME] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if ($token) {
        $safe = $conn->real_escape_string($token);
        $conn->query("DELETE FROM auth_sessions WHERE token = '$safe'");
        $conn->commit();
    }
    destroy_session_cookie();
    json_response(['status' => 'logged_out']);
}

json_response(['error' => 'Invalid action.'], 400);
