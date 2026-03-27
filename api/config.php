<?php
/**
 * Nexa HR & Payroll — Secure Configuration
 * Reads credentials from .env file (outside webroot when possible).
 */
// ── Self-guard: block direct HTTP requests to this file ──────
// This fires regardless of whether .htaccess is working on the host.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'config.php'
    && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Forbidden']);
    exit;
}
// ── Load .env file ────────────────────────────────────────────
function load_env(string $path): void {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        [$key, $val] = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val, " \t\n\r\0\x0B\"'"); // Strip quotes too
        
        // Populate both to be safe
        putenv("$key=$val");
        $_ENV[$key] = $val;
        $_SERVER[$key] = $val;
    }
}
// Try .env one directory above webroot first (more secure), then same dir
load_env(dirname(__DIR__, 2) . '/.env');
load_env(dirname(__DIR__) . '/.env');
load_env(__DIR__ . '/.env');

// ── Helper ────────────────────────────────────────────────────
function env(string $key, $default = null) {
    // Check $_ENV or $_SERVER first, then getenv()
    $val = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    return ($val !== false && $val !== null) ? $val : $default;
}
// ── Database config ───────────────────────────────────────────
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_USER', env('DB_USER', 'nexasyst_thabo'));
define('DB_PASS', env('DB_PASS', ''));           // No default — must be in .env
define('DB_NAME', env('DB_NAME', 'nexasyst_Payroll'));
// ── Security config ───────────────────────────────────────────
define('API_SECRET_KEY',  env('API_SECRET_KEY', ''));
define('JWT_SECRET',      env('JWT_SECRET', ''));
define('SESSION_LIFETIME', (int)env('SESSION_LIFETIME', 3600));
// ── Email config ──────────────────────────────────────────────
define('SMTP_HOST',       env('SMTP_HOST', 'smtp.gmail.com'));
define('SMTP_PORT',       (int)env('SMTP_PORT', 587));
define('SMTP_USER',       env('SMTP_USER', ''));
define('SMTP_PASS',       env('SMTP_PASS', ''));
define('SMTP_FROM_NAME',  env('SMTP_FROM_NAME', 'Nexa HR & Payroll'));
define('SMTP_FROM_EMAIL', env('SMTP_FROM_EMAIL', ''));
// ── Storage config ────────────────────────────────────────────
define('UPLOAD_PATH',     env('UPLOAD_PATH', dirname(__DIR__) . '/uploads/'));
define('MAX_FILE_SIZE',   (int)env('MAX_FILE_SIZE', 10485760)); // 10MB
define('ALLOWED_EXT',     explode(',', env('ALLOWED_EXTENSIONS', 'pdf,docx,xlsx,jpg,jpeg,png')));
// ── App config ────────────────────────────────────────────────
define('APP_ENV',         env('APP_ENV', 'production'));
define('APP_URL',         env('APP_URL', ''));
define('BACKUP_RETAIN',   (int)env('BACKUP_RETENTION_DAYS', 30));
// ── Database connection factory ───────────────────────────────
function get_db_connection(): mysqli {
    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(503);
        die(json_encode([
            'status' => 'db_unavailable',
            'error' => 'Database connection failed.',
            'message' => $conn->connect_error,
            'host' => DB_HOST,
            'user' => DB_USER
        ]));
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}
// ── Init system tables ────────────────────────────────────────
function init_tables(mysqli $conn): void {
    $prevErr = error_reporting(0);
    // Main blob storage (for localStorage sync)
    $conn->query("CREATE TABLE IF NOT EXISTS `system_storage` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `key_name`   VARCHAR(50) NOT NULL UNIQUE,
        `data_blob`  LONGTEXT NOT NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    // Auth sessions table
    $conn->query("CREATE TABLE IF NOT EXISTS `auth_sessions` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `token`      VARCHAR(128) NOT NULL UNIQUE,
        `username`   VARCHAR(100) NOT NULL,
        `role`       VARCHAR(50)  NOT NULL,
        `ip_address` VARCHAR(45),
        `user_agent` VARCHAR(255),
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `expires_at` TIMESTAMP NOT NULL,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    // Append-only audit log table
    $conn->query("CREATE TABLE IF NOT EXISTS `audit_log` (
        `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
        `timestamp`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `username`   VARCHAR(100) NOT NULL,
        `action`     VARCHAR(200) NOT NULL,
        `module`     VARCHAR(80),
        `details`    JSON,
        `ip_address` VARCHAR(45),
        `user_agent` VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    // Document storage table
    $conn->query("CREATE TABLE IF NOT EXISTS `documents` (
        `id`          INT AUTO_INCREMENT PRIMARY KEY,
        `employee_id` VARCHAR(20),
        `category`    VARCHAR(80) NOT NULL,
        `filename`    VARCHAR(255) NOT NULL,
        `stored_name` VARCHAR(255) NOT NULL,
        `file_size`   INT NOT NULL,
        `mime_type`   VARCHAR(100),
        `uploaded_by` VARCHAR(100),
        `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    // Leave accrual tracking
    $conn->query("CREATE TABLE IF NOT EXISTS `leave_accrual_log` (
        `id`           INT AUTO_INCREMENT PRIMARY KEY,
        `run_month`    VARCHAR(7) NOT NULL UNIQUE,
        `employees_processed` INT DEFAULT 0,
        `ran_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    error_reporting($prevErr);
}
// ── CORS helper ───────────────────────────────────────────────
function set_cors_headers(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = APP_URL ?: '*';
    header("Access-Control-Allow-Origin: $allowed");
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key, X-Auth-Token');
    header('Access-Control-Allow-Credentials: true');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
// ── Validate API key ──────────────────────────────────────────
function validate_api_key(): bool {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? '';
    if (!API_SECRET_KEY) return true; // No key configured — skip (dev mode)
    return hash_equals(API_SECRET_KEY, $key);
}
// ── Validate auth session token ───────────────────────────────
function validate_session(mysqli $conn): ?array {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    
    // Fallback for some Apache environments where custom headers are stripped
    if (!$token) {
        $token = $_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    }

    if (!$token && function_exists('getallheaders')) {
        $all = getallheaders();
        foreach ($all as $k => $v) {
            if (strtolower($k) === 'x-auth-token') {
                $token = $v;
                break;
            }
        }
    }

    if (!$token) return null;
    $safe  = $conn->real_escape_string($token);
    $result = @$conn->query(
        "SELECT username, role FROM auth_sessions
         WHERE token = '$safe' AND expires_at > NOW()"
    );
    if ($result && $row = $result->fetch_assoc()) return $row;
    return null;
}
// ── Write to audit log ────────────────────────────────────────
function audit_log(mysqli $conn, string $username, string $action,
                   string $module, array $details = []): void {
    $u  = $conn->real_escape_string($username);
    $a  = $conn->real_escape_string($action);
    $m  = $conn->real_escape_string($module);
    $d  = $conn->real_escape_string(json_encode($details));
    $ip = $conn->real_escape_string($_SERVER['REMOTE_ADDR'] ?? '');
    $ua = $conn->real_escape_string(substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255));
    $conn->query(
        "INSERT INTO audit_log (username, action, module, details, ip_address, user_agent)
         VALUES ('$u', '$a', '$m', '$d', '$ip', '$ua')"
    );
}
// ── JSON response helper ──────────────────────────────────────
function json_response(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
// ── Error handler ─────────────────────────────────────────────
set_error_handler(function(int $errno, string $errstr, string $errfile, int $errline) {
    if (!(error_reporting() & $errno)) return false;
    if (APP_ENV !== 'development') {
        json_response([
            'error' => 'An internal error occurred.',
            'message' => $errstr,
            'file' => basename($errfile),
            'line' => $errline
        ], 500);
    }
    return false;
});