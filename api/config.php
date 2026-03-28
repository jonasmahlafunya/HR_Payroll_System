<?php
/**
 * Nexa HR & Payroll — Secure Production Configuration (PDO)
 */

@ini_set('display_errors', '0');
@error_reporting(E_ALL);
@ini_set('log_errors', '1');

// 0. Path Constants
define('APP_ROOT', dirname(__DIR__));
define('LOG_PATH', APP_ROOT . '/logs/app.log');

// Ensure log directory exists (ideally outside public root, but relative to APP_ROOT for portability)
if (!is_dir(dirname(LOG_PATH))) {
    @mkdir(dirname(LOG_PATH), 0755, true);
}

// 1. Load Environment
function load_env($path)
{
    if (!file_exists($path))
        return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#')
            continue;
        if (strpos($line, '=') === false)
            continue;
        list($key, $val) = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val, " \t\n\r\0\x0B\"'");
        putenv("$key=$val");
        $_ENV[$key] = $val;
        $_SERVER[$key] = $val;
    }
}
load_env(APP_ROOT . '/.env');

function env($key, $default = null)
{
    $val = $_ENV[$key] ?? $_SERVER[$key] ?? null;
    if ($val === null)
        $val = getenv($key);
    return ($val !== false && $val !== null) ? $val : $default;
}

// 2. Define Constants
define('APP_ENV', env('APP_ENV', 'production'));
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_USER', env('DB_USER', ''));
define('DB_PASS', env('DB_PASS', ''));
define('DB_NAME', env('DB_NAME', ''));
define('SESSION_LIFETIME', (int) env('SESSION_LIFETIME', 3600));
define('COOKIE_NAME', env('COOKIE_NAME', 'nexa_session'));
define('API_KEY', env('API_KEY', ''));
define('APP_SECRET', env('APP_SECRET', ''));

// 3. Document & Upload Settings
define('UPLOAD_PATH', APP_ROOT . '/uploads/');
define('MAX_FILE_SIZE', (int) env('MAX_FILE_SIZE', 5242880)); // 5MB default
define('ALLOWED_EXT', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']);

// 4. Backup Settings
define('BACKUP_RETAIN', (int) env('BACKUP_RETAIN', 30)); // 30 days default

// 5. SMTP Settings
define('SMTP_HOST', env('SMTP_HOST', ''));
define('SMTP_PORT', (int) env('SMTP_PORT', 587));
define('SMTP_USER', env('SMTP_USER', ''));
define('SMTP_PASS', env('SMTP_PASS', ''));
define('SMTP_FROM_EMAIL', env('SMTP_FROM_EMAIL', ''));
define('SMTP_FROM_NAME', env('SMTP_FROM_NAME', 'Nexa HR & Payroll'));

// 6. Core Helpers
if (!function_exists('json_response')) {
    function json_response($data, $code = 200)
    {
        if (!headers_sent()) {
            http_response_code($code);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }
        echo json_encode($data);
        exit;
    }
}

function debug_log($msg)
{
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents(LOG_PATH, "[$timestamp] $msg" . PHP_EOL, FILE_APPEND);
}

// 4. Global Handlers (Structured Exceptions)
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno))
        return false;
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

set_exception_handler(function ($e) {
    debug_log("EXC: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    $msg = (APP_ENV === 'development') ? $e->getMessage() : 'An internal error occurred. Please try again later.';
    json_response([
        'status' => 'error',
        'error' => 'Internal Server Error',
        'message' => $msg
    ], 500);
});

// 5. Database Connection (PDO Singleton)
function get_db_connection()
{
    static $pdo = null;
    if ($pdo !== null)
        return $pdo;

    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        debug_log("DB Connection Failed: " . $e->getMessage());
        json_response(['status' => 'db_unavailable', 'error' => 'Database connection failed.'], 503);
    }
}

// 6. CSRF Protection
function generate_csrf_token()
{
    if (session_status() === PHP_SESSION_NONE)
        session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validate_csrf_token($token = null)
{
    if (session_status() === PHP_SESSION_NONE)
        session_start();
    $token = $token ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        json_response(['error' => 'Invalid CSRF token.'], 403);
    }
    return true;
}

// 7. Session & Access Management
function validate_session($pdo)
{
    $token = $_COOKIE[COOKIE_NAME] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if (!$token)
        return null;

    $stmt = $pdo->prepare("SELECT username, role, employee_id FROM auth_sessions WHERE token = ? AND expires_at > NOW()");
    $stmt->execute([$token]);
    $session = $stmt->fetch();

    if ($session) {
        if (isset($_COOKIE[COOKIE_NAME]))
            set_session_cookie($token);
        return $session;
    }
    return null;
}

function set_session_cookie($token)
{
    $expires = time() + SESSION_LIFETIME;
    $secure = (($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['SERVER_PORT'] ?? '') == 443);

    setcookie(COOKIE_NAME, $token, [
        'expires' => $expires,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
}

function destroy_session_cookie()
{
    setcookie(COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
}

function audit_log($pdo, $username, $action, $module, $details = [])
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
    $d = json_encode($details);

    $stmt = $pdo->prepare("INSERT INTO audit_log (username, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$username, $action, $module, $d, $ip, $ua]);
}

function validate_api_key()
{
    $key = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? '';
    $master = env('API_KEY');
    return ($master && $key === $master);
}

function set_cors_headers()
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed_origins = [env('ALLOWED_ORIGIN', '*')]; // Could be refined

    if (in_array('*', $allowed_origins) || in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
        header('Access-Control-Allow-Credentials: true');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key, X-Auth-Token, X-CSRF-Token');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// 8. Initialization (Helper for table creation)
function init_tables($pdo)
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS `system_storage` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `key_name`   VARCHAR(50) NOT NULL UNIQUE,
        `data_blob`  LONGTEXT NOT NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `auth_sessions` (
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
}
// ─────────────────────────────────────────────────────────────
// Ensure all required tables exist (idempotent — safe to call every request)
// ─────────────────────────────────────────────────────────────
function ensure_all_tables($pdo): void
{
    static $checked = false;
    if ($checked) return;
    $checked = true;

    $pdo->exec("CREATE TABLE IF NOT EXISTS `system_storage` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `key_name`   VARCHAR(50) NOT NULL UNIQUE,
        `data_blob`  LONGTEXT NOT NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `auth_sessions` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `auth_otp` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `username`   VARCHAR(100) NOT NULL UNIQUE,
        `code_hash`  VARCHAR(255) NOT NULL,
        `expires_at` DATETIME NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_user (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `audit_log` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `username`   VARCHAR(100) NOT NULL,
        `action`     VARCHAR(100) NOT NULL,
        `module`     VARCHAR(100) NOT NULL DEFAULT 'System',
        `details`    TEXT,
        `ip_address` VARCHAR(45),
        `user_agent` VARCHAR(255),
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_user (username),
        INDEX idx_audit_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `documents` (
        `id`          INT AUTO_INCREMENT PRIMARY KEY,
        `employee_id` INT DEFAULT NULL,
        `category`    VARCHAR(100) DEFAULT 'General',
        `filename`    VARCHAR(255) NOT NULL,
        `stored_name` VARCHAR(255) NOT NULL,
        `file_size`   INT NOT NULL DEFAULT 0,
        `mime_type`   VARCHAR(100),
        `uploaded_by` VARCHAR(100),
        `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_doc_emp (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Add missing columns to users table safely
    $cols = [];
    $res = $pdo->query("SHOW COLUMNS FROM `users`");
    if ($res) { while ($r = $res->fetch()) $cols[$r['Field']] = true; }

    if (!isset($cols['password_hash']))
        @$pdo->exec("ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) DEFAULT NULL AFTER `password`");
    if (!isset($cols['two_factor_secret']))
        @$pdo->exec("ALTER TABLE `users` ADD COLUMN `two_factor_secret` VARCHAR(32) DEFAULT NULL");
    if (!isset($cols['two_factor_enabled']))
        @$pdo->exec("ALTER TABLE `users` ADD COLUMN `two_factor_enabled` TINYINT(1) DEFAULT 0");
    if (!isset($cols['employee_id']))
        @$pdo->exec("ALTER TABLE `users` ADD COLUMN `employee_id` INT DEFAULT NULL");
    if (!isset($cols['status']))
        @$pdo->exec("ALTER TABLE `users` ADD COLUMN `status` VARCHAR(20) DEFAULT 'Active'");
    if (!isset($cols['created_at']))
        @$pdo->exec("ALTER TABLE `users` ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP");
}
