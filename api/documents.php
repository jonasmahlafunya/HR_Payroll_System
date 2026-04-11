<?php
/**
 * Nexa HR & Payroll — Document Management API (PDO)
 * POST   /api/documents.php              — Upload document
 * GET    /api/documents.php?action=list  — List documents
 * GET    /api/documents.php?action=download&id=X — Download file (streams binary, no JSON header)
 * DELETE /api/documents.php?id=X (or GET ?action=delete) — Delete document
 *
 * FIXED: Content-Type: application/json is no longer set globally at the top level.
 *        It is only added for JSON-returning routes; the download route sends its own
 *        binary Content-Type so the two headers no longer conflict.
 */
require_once __DIR__ . '/config.php';

set_cors_headers();

try {
    $pdo = get_db_connection();
    ensure_all_tables($pdo);
    $session = validate_session($pdo);
} catch (Throwable $e) {
    header('Content-Type: application/json');
    json_response(['error' => 'System error.'], 500);
}

// Basic auth check — download route will handle its own 401
if (!$session) {
    header('Content-Type: application/json');
    json_response(['error' => 'Unauthorized.'], 401);
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper for human readable bytes
function format_bytes(int $bytes): string
{
    if ($bytes >= 1048576)
        return number_format($bytes / 1048576, 1) . ' MB';
    if ($bytes >= 1024)
        return number_format($bytes / 1024, 1) . ' KB';
    return $bytes . ' B';
}

// ─────────────────────────────────────────────────────────────
// LIST DOCUMENTS
// ─────────────────────────────────────────────────────────────
if ($action === 'list' || ($method === 'GET' && !$action)) {
    header('Content-Type: application/json; charset=utf-8');
    $empId = $_GET['employee_id'] ?? null;
    $sql = "SELECT id, employee_id, category, filename, file_size, mime_type, uploaded_by, uploaded_at FROM documents";
    $params = [];

    if ($empId) {
        $sql .= " WHERE employee_id = ?";
        $params[] = $empId;
    }
    $sql .= " ORDER BY uploaded_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $docs = [];
    while ($row = $stmt->fetch()) {
        $row['file_size_human'] = format_bytes((int) $row['file_size']);
        $docs[] = $row;
    }
    json_response(['documents' => $docs]);
}

// ─────────────────────────────────────────────────────────────
// DOWNLOAD
// ─────────────────────────────────────────────────────────────
if ($action === 'download') {
    $id = intval($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT * FROM documents WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();

    if (!$doc) {
        json_response(['error' => 'Document not found.'], 404);
    }

    $filepath = UPLOAD_PATH . $doc['stored_name'];
    if (!file_exists($filepath)) {
        json_response(['error' => 'File not found on disk.'], 404);
    }

    // Security: only serve files from the upload directory
    $realPath = realpath($filepath);
    $realUpload = realpath(UPLOAD_PATH);
    if ($realPath === false || $realUpload === false || strpos($realPath, $realUpload) !== 0) {
        json_response(['error' => 'Access denied.'], 403);
    }

    header('Content-Type: ' . ($doc['mime_type'] ?: 'application/octet-stream'));
    // FIXED: use basename() to prevent path traversal in Content-Disposition filename
    header('Content-Disposition: attachment; filename="' . addslashes(basename($doc['filename'])) . '"');
    header('Content-Length: ' . filesize($filepath));
    header('Cache-Control: no-cache');

    if (ob_get_level())
        ob_end_clean();
    flush();
    readfile($filepath);
    exit;
}

// ─────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────
if ($method === 'POST') {
    validate_csrf_token();

    if (empty($_FILES['file'])) {
        json_response(['error' => 'No file uploaded.'], 400);
    }

    $file = $_FILES['file'];
    $empId = $_POST['employee_id'] ?? null;
    $category = strip_tags($_POST['category'] ?? 'General');

    if ($file['error'] !== UPLOAD_ERR_OK) {
        json_response(['error' => 'Upload error code: ' . $file['error']], 400);
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        json_response(['error' => 'File exceeds maximum size of ' . format_bytes(MAX_FILE_SIZE) . '.'], 400);
    }

    $origName = basename($file['name']);
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXT)) {
        json_response(['error' => "File type .$ext is not allowed."], 400);
    }

    // Verify MIME type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
    ];
    if (!in_array($mimeType, $allowedMimes)) {
        json_response(['error' => "Invalid file type: $mimeType"], 400);
    }

    if (!is_dir(UPLOAD_PATH))
        mkdir(UPLOAD_PATH, 0750, true);

    // Hardening: .htaccess in uploads to block scripts
    $htAccess = UPLOAD_PATH . '/.htaccess';
    if (!file_exists($htAccess)) {
        file_put_contents($htAccess, "Options -ExecCGI -Indexes\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps .cgi .pl .py .asp .aspx .shtml\n<Files *>\n    SetHandler default-handler\n</Files>");
    }

    $storedName = bin2hex(random_bytes(16)) . '.' . $ext;
    $destPath = UPLOAD_PATH . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        json_response(['error' => 'Failed to save file.'], 500);
    }

    $stmt = $pdo->prepare("INSERT INTO documents (employee_id, category, filename, stored_name, file_size, mime_type, uploaded_by)
                           VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $empId ?: null,
        $category,
        $origName,
        $storedName,
        $file['size'],
        $mimeType,
        $session['username'] ?? 'system'
    ]);
    $docId = $pdo->lastInsertId();

    audit_log($pdo, $session['username'] ?? 'system', 'DOCUMENT_UPLOAD', 'Documents', [
        'filename' => $origName,
        'category' => $category,
        'employee_id' => $empId
    ]);

    json_response([
        'status' => 'uploaded',
        'id' => $docId,
        'filename' => $origName,
        'category' => $category
    ]);
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────
if ($method === 'DELETE' || $action === 'delete') {
    validate_csrf_token();

    if (!in_array($session['role'] ?? '', ['Super Administrator', 'HR Administrator'])) {
        json_response(['error' => 'Insufficient permissions.'], 403);
    }

    $id = intval($_GET['id'] ?? $_POST['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT * FROM documents WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();

    if (!$doc) {
        json_response(['error' => 'Document not found.'], 404);
    }

    $filepath = UPLOAD_PATH . $doc['stored_name'];
    if (file_exists($filepath))
        @unlink($filepath);

    $stmt = $pdo->prepare("DELETE FROM documents WHERE id = ?");
    $stmt->execute([$id]);

    audit_log($pdo, $session['username'], 'DOCUMENT_DELETE', 'Documents', [
        'filename' => $doc['filename'],
        'id' => $id
    ]);

    json_response(['status' => 'deleted', 'id' => $id]);
}

json_response(['error' => 'Invalid request.'], 400);
