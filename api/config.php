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

    $stmt = $pdo->prepare("
        SELECT s.username, s.role, s.employee_id, u.name, u.email 
        FROM auth_sessions s 
        LEFT JOIN users u ON s.username = u.username 
        WHERE s.token = ? AND s.expires_at > NOW()
    ");
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

// ─────────────────────────────────────────────────────────────
// Ensure all required tables exist (idempotent — safe to call every request)
// NOTE: init_tables() was removed; use ensure_all_tables() everywhere.
// ─────────────────────────────────────────────────────────────
function ensure_all_tables($pdo): void
{
    static $checked = false;
    if ($checked)
        return;
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

    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id`             INT AUTO_INCREMENT PRIMARY KEY,
        `username`       VARCHAR(100) NOT NULL UNIQUE,
        `password`       VARCHAR(255) DEFAULT NULL,
        `password_hash`  VARCHAR(255) DEFAULT NULL,
        `name`           VARCHAR(200),
        `email`          VARCHAR(200),
        `role`           VARCHAR(100) DEFAULT 'Employee',
        `status`         VARCHAR(20) DEFAULT 'Active',
        `employee_id`    INT DEFAULT NULL,
        `two_factor_secret` VARCHAR(32) DEFAULT NULL,
        `two_factor_enabled` TINYINT(1) DEFAULT 0,
        `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `companies` (
        `id`                  INT AUTO_INCREMENT PRIMARY KEY,
        `name`                VARCHAR(255) NOT NULL UNIQUE,
        `registration_number` VARCHAR(50),
        `tax_reference`       VARCHAR(50),
        `vat_number`          VARCHAR(50),
        `uif_number`          VARCHAR(50),
        `sdl_number`          VARCHAR(50),
        `email`               VARCHAR(255),
        `contact_phone`       VARCHAR(50),
        `address`             TEXT,
        `status`              VARCHAR(50) DEFAULT 'Active',
        `created_at`          DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_comp_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `leave_accrual_log` (
        `id`                  INT AUTO_INCREMENT PRIMARY KEY,
        `run_month`           VARCHAR(7) NOT NULL UNIQUE,
        `employees_processed` INT NOT NULL DEFAULT 0,
        `created_at`          DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_run_month (run_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Add missing columns to users table safely
    $cols = [];
    $res = $pdo->query("SHOW COLUMNS FROM `users`");
    if ($res) {
        while ($r = $res->fetch())
            $cols[$r['Field']] = true;
    }

    if (!isset($cols['password_hash']))
        @$pdo->exec("ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) DEFAULT NULL AFTER `password`");

    // Always ensure role column is large enough (fix truncation error)
    @$pdo->exec("ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(100) DEFAULT 'Employee'");

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

/**
 * Shared Email Dispatcher
 * Priority: 1. SMTP  2. PHP mail() fallback
 * @param array $attachments Array of ['filename', 'content_base64', 'mime_type']
 */
function nexa_send_email(string $to, string $subject, string $html, string $fromEmail, string $fromName, array $attachments = []): array
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return [false, "Invalid recipient email address: $to"];
    }

    $smtpHost = SMTP_HOST;
    $smtpUser = SMTP_USER;
    $smtpPass = SMTP_PASS;

    // Method 1: SMTP
    if ($smtpHost && $smtpUser && $smtpPass) {
        [$sent, $err] = nexa_smtp_send($to, $subject, $html, $fromEmail, $fromName, $attachments);
        if ($sent) {
            debug_log("EMAIL OK (SMTP) to=$to subj=$subject");
            return [true, ''];
        }
        debug_log("EMAIL SMTP FAIL to=$to err=$err — trying mail() fallback");
    }

    // Method 2: PHP mail() fallback (with attachment support via MIME multipart)
    if (function_exists('mail')) {
        $boundary = '=_Nexa_' . bin2hex(random_bytes(8));

        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>\r\n";
        $headers .= "Reply-To: {$fromEmail}\r\n";
        $headers .= "X-Mailer: Nexa-HR/1.0\r\n";

        if (empty($attachments)) {
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $message = $html;
        } else {
            $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

            $message = "--$boundary\r\n";
            $message .= "Content-Type: text/html; charset=UTF-8\r\n";
            $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $message .= chunk_split(base64_encode($html)) . "\r\n\r\n";

            foreach ($attachments as $att) {
                $filename = $att['filename'] ?? 'attachment.txt';
                $mime = $att['mime_type'] ?? 'application/octet-stream';
                $content = $att['content_base64'] ?? '';

                $message .= "--$boundary\r\n";
                $message .= "Content-Type: $mime; name=\"$filename\"\r\n";
                $message .= "Content-Transfer-Encoding: base64\r\n";
                $message .= "Content-Disposition: attachment; filename=\"$filename\"\r\n\r\n";
                $message .= chunk_split($content) . "\r\n";
            }
            $message .= "--$boundary--\r\n";
        }

        $sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $message, $headers);
        if ($sent) {
            debug_log("EMAIL OK (mail()) to=$to subj=$subject");
            return [true, ''];
        }
        $mailErr = error_get_last()['message'] ?? 'mail() returned false';
        debug_log("EMAIL mail() FAIL to=$to err=$mailErr");
        return [false, "SMTP failed; mail() also failed: $mailErr"];
    }

    return [false, 'No email method available (SMTP not configured, mail() not available)'];
}

/** SMTP helper */
function nexa_smtp_send(string $to, string $subject, string $html, string $fromEmail, string $fromName, array $attachments = []): array
{
    $host = SMTP_HOST;
    $port = (int) SMTP_PORT;
    $user = SMTP_USER;
    $pass = SMTP_PASS;

    try {
        $proto = ($port === 465) ? 'ssl' : 'tcp';
        $socket = @stream_socket_client("$proto://$host:$port", $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
        if (!$socket)
            return [false, "Connection: $errstr ($errno)"];

        stream_set_timeout($socket, 15);
        if (!smtp_code_ok(smtp_read($socket), 220)) {
            @fclose($socket);
            return [false, "Bad greeting"];
        }

        smtp_write_read($socket, 'EHLO ' . (gethostname() ?: 'nexa.local'));

        if ($port === 587) {
            if (!smtp_code_ok(smtp_write_read($socket, 'STARTTLS'), 220)) {
                @fclose($socket);
                return [false, "STARTTLS failed"];
            }
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                @fclose($socket);
                return [false, 'TLS failed'];
            }
            smtp_write_read($socket, 'EHLO ' . (gethostname() ?: 'nexa.local'));
        }

        if (!smtp_code_ok(smtp_write_read($socket, 'AUTH LOGIN'), 334)) {
            @fclose($socket);
            return [false, "AUTH Login rejected"];
        }
        if (!smtp_code_ok(smtp_write_read($socket, base64_encode($user)), 334)) {
            @fclose($socket);
            return [false, "User rejected"];
        }
        $passResp = smtp_write_read($socket, base64_encode($pass));
        if (!smtp_code_ok($passResp, 235)) {
            @fclose($socket);
            return [false, "Password rejected" . (strpos($passResp, '535') !== false ? ' (App Password required)' : '')];
        }

        smtp_write_read($socket, "MAIL FROM:<$fromEmail>");
        smtp_write_read($socket, "RCPT TO:<$to>");
        if (!smtp_code_ok(smtp_write_read($socket, 'DATA'), 354)) {
            @fclose($socket);
            return [false, "DATA rejected"];
        }

        $boundary = '=_Nexa_' . bin2hex(random_bytes(8));
        $msg = "Date: " . date('r') . "\r\n";
        $msg .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
        $msg .= "Reply-To: $fromEmail\r\n";
        $msg .= "To: $to\r\n";
        $msg .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $msg .= "MIME-Version: 1.0\r\n";
        $msg .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
        $msg .= "Message-ID: <" . bin2hex(random_bytes(12)) . "@nexasystems.co.za>\r\n\r\n";

        $msg .= "--$boundary\r\n";
        $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $msg .= chunk_split(base64_encode($html)) . "\r\n\r\n";

        foreach ($attachments as $att) {
            $fn = $att['filename'] ?? 'file.dat';
            $mt = $att['mime_type'] ?? 'application/octet-stream';
            $cnt = $att['content_base64'] ?? '';
            $msg .= "--$boundary\r\n";
            $msg .= "Content-Type: $mt; name=\"$fn\"\r\n";
            $msg .= "Content-Transfer-Encoding: base64\r\n";
            $msg .= "Content-Disposition: attachment; filename=\"$fn\"\r\n\r\n";
            $msg .= chunk_split($cnt) . "\r\n";
        }
        $msg .= "--$boundary--\r\n.\r\n";

        fwrite($socket, $msg);
        $resp = smtp_read($socket);
        smtp_write_read($socket, 'QUIT');
        @fclose($socket);

        return smtp_code_ok($resp, 250) ? [true, ''] : [false, "Send failed: $resp"];
    } catch (Throwable $e) {
        return [false, $e->getMessage()];
    }
}

function smtp_write_read($socket, string $cmd): string
{
    fwrite($socket, "$cmd\r\n");
    return smtp_read($socket);
}
function smtp_read($socket): string
{
    $resp = '';
    while (!feof($socket)) {
        $line = fgets($socket, 1024);
        if ($line === false)
            break;
        $resp .= $line;
        if (strlen($line) < 4 || $line[3] === ' ')
            break;
    }
    return trim($resp);
}
function smtp_code_ok(string $resp, int $expected): bool
{
    return (int) substr(trim($resp), 0, 3) === $expected;
}
