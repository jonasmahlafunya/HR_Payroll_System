<?php
/**
 * Nexa HR & Payroll — Data Sync Endpoint
 * POST /api/sync.php  → save state blob to MySQL
 * GET  /api/sync.php  → load state blob from MySQL
 *
 * Always returns valid JSON even if the DB is unavailable.
 */

// ── 1. Capture ALL output so PHP warnings/notices never break JSON ───────────
ob_start();

// ── 2. Guaranteed JSON content-type ─────────────────────────────────────────
header('Content-Type: application/json');

// ── 3. CORS ──────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token, X-API-Key');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(204);
    exit;
}

// ── 4. JSON finish helper ────────────────────────────────────────────────────
function finish(array $payload, int $code = 200): void {
    $stray = ob_get_clean();
    http_response_code($code);
    header('Content-Type: application/json');
    if ($stray !== '' && $stray !== false) {
        $payload['_debug'] = $stray; // surface PHP warnings without breaking parsing
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ── 5. Load .env (search up two levels) ─────────────────────────────────────
function load_env_sync(): void {
    $paths = [
        dirname(__DIR__, 2) . '/.env',
        dirname(__DIR__)    . '/.env',
        __DIR__             . '/.env',
    ];
    foreach ($paths as $p) {
        if (!file_exists($p)) continue;
        foreach (file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k); $v = trim($v);
            if (!array_key_exists($k, $_ENV)) { putenv("$k=$v"); $_ENV[$k] = $v; }
        }
        break;
    }
}
load_env_sync();

function senv(string $key, string $default = ''): string {
    $v = getenv($key);
    return ($v !== false && $v !== '') ? $v : $default;
}

// ── 6. DB connection (non-fatal) ─────────────────────────────────────────────
function get_conn(): ?mysqli {
    $host = senv('DB_HOST', 'sql303.infinityfree.com');
    $user = senv('DB_USER', 'if0_41384788');
    $pass = senv('DB_PASS', '');
    $name = senv('DB_NAME', 'if0_41384788_nexa_hrpayroll');

    if ($pass === '') return null; // DB not configured yet

    mysqli_report(MYSQLI_REPORT_OFF); // disable exceptions so we can check manually
    $conn = @new mysqli($host, $user, $pass, $name);
    if ($conn->connect_errno) return null;
    $conn->set_charset('utf8mb4');
    return $conn;
}

// ── 7. Ensure storage table exists ───────────────────────────────────────────
function ensure_table(mysqli $conn): void {
    $conn->query("CREATE TABLE IF NOT EXISTS `system_storage` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `key_name`   VARCHAR(50) NOT NULL UNIQUE,
        `data_blob`  LONGTEXT NOT NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

// ── 8. Auth check (session token OR no token in dev mode) ────────────────────
function is_authorised(?mysqli $conn): bool {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';

    // No DB = dev mode, allow through
    if (!$conn) return true;

    // No token = also allow (dev / initial load before login)
    if ($token === '') return true;

    $safe   = $conn->real_escape_string($token);
    $result = $conn->query(
        "SELECT id FROM auth_sessions WHERE token='$safe' AND expires_at > NOW() LIMIT 1"
    );
    return ($result && $result->num_rows > 0);
}

// ── 9. Main logic ────────────────────────────────────────────────────────────
$conn = get_conn();

// If we cannot reach the DB at all, respond gracefully instead of crashing
if ($conn === null) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Save requested but DB unavailable — tell the client, don't crash
        finish([
            'status'  => 'db_unavailable',
            'message' => 'Database not reachable. Data saved to localStorage only. Check DB_PASS in .env.'
        ], 200); // 200 so the client doesn't throw
    } else {
        // Load requested — return empty so the client falls back to localStorage
        finish([
            'status'  => 'empty',
            'message' => 'Database not reachable. Using localStorage data.'
        ], 200);
    }
}

// Auth
if (!is_authorised($conn)) {
    finish(['error' => 'Unauthorized. Please log in.'], 401);
}

ensure_table($conn);

$key = 'hrpms_main_state';

// ── POST: Save ────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');

    if (!$raw || $raw === '') {
        finish(['error' => 'Empty body received.'], 400);
    }

    // Validate it's parseable JSON before storing
    $decoded = @json_decode($raw, true);
    if (!is_array($decoded)) {
        finish(['error' => 'Body is not valid JSON.'], 400);
    }

    $blob = $conn->real_escape_string($raw);
    $sql  = "INSERT INTO `system_storage` (`key_name`, `data_blob`)
             VALUES ('$key', '$blob')
             ON DUPLICATE KEY UPDATE `data_blob` = '$blob'";

    if ($conn->query($sql)) {
        $conn->close();
        finish(['status' => 'success', 'message' => 'Data persisted to MySQL.']);
    } else {
        $conn->close();
        finish(['error' => 'DB write error: ' . $conn->error], 500);
    }
}

// ── GET: Load ─────────────────────────────────────────────────────────────────
$result = $conn->query("SELECT `data_blob` FROM `system_storage` WHERE `key_name` = '$key' LIMIT 1");

if (!$result || $result->num_rows === 0) {
    $conn->close();
    finish(['status' => 'empty', 'message' => 'No server data found yet.']);
}

$row = $result->fetch_assoc();
$conn->close();

// Stream the blob directly (it's already a JSON string)
$stray = ob_get_clean();
http_response_code(200);
header('Content-Type: application/json');
// Prepend any stray PHP output as a JSON comment (won't break parsers that skip whitespace,
// but we try hard to have none)
if ($stray !== '' && $stray !== false) {
    // Can't safely inject it — log to error_log instead
    error_log('[sync.php stray output] ' . $stray);
}
echo $row['data_blob'];
exit;