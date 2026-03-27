<?php
/**
 * Nexa HR & Payroll — Document Management API
 * POST   /api/documents.php              — Upload document
 * GET    /api/documents.php?action=list  — List documents
 * GET    /api/documents.php?action=download&id=X — Download file
 * DELETE /api/documents.php?id=X        — Delete document
 */
header('Content-Type: application/json');
require_once 'config.php';

set_cors_headers();

$conn    = get_db_connection();
$session = validate_session($conn);
if (!$session && !validate_api_key()) {
    json_response(['error' => 'Unauthorized.'], 401);
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ─────────────────────────────────────────────────────────────
// LIST DOCUMENTS
// ─────────────────────────────────────────────────────────────
if ($action === 'list' || ($method === 'GET' && !$action)) {
    $empId  = $_GET['employee_id'] ?? null;
    $where  = $empId ? "WHERE employee_id = '" . $conn->real_escape_string($empId) . "'" : '';
    $result = $conn->query("SELECT id, employee_id, category, filename, file_size, mime_type, uploaded_by, uploaded_at FROM documents $where ORDER BY uploaded_at DESC");

    $docs = [];
    while ($row = $result->fetch_assoc()) {
        $row['file_size_human'] = format_bytes((int)$row['file_size']);
        $docs[] = $row;
    }
    json_response(['documents' => $docs]);
}

// ─────────────────────────────────────────────────────────────
// DOWNLOAD
// ─────────────────────────────────────────────────────────────
if ($action === 'download') {
    $id     = intval($_GET['id'] ?? 0);
    $result = $conn->query("SELECT * FROM documents WHERE id = $id");
    if (!$result || !($doc = $result->fetch_assoc())) {
        json_response(['error' => 'Document not found.'], 404);
    }

    $filepath = UPLOAD_PATH . $doc['stored_name'];
    if (!file_exists($filepath)) {
        json_response(['error' => 'File not found on disk.'], 404);
    }

    // Security: only serve files from the upload directory
    $realPath   = realpath($filepath);
    $realUpload = realpath(UPLOAD_PATH);
    if (strpos((string)$realPath, (string)$realUpload) !== 0) {
        json_response(['error' => 'Access denied.'], 403);
    }

    header('Content-Type: ' . ($doc['mime_type'] ?: 'application/octet-stream'));
    header('Content-Disposition: attachment; filename="' . addslashes($doc['filename']) . '"');
    header('Content-Length: ' . filesize($filepath));
    header('Cache-Control: no-cache');
    // Remove JSON content-type before sending file
    ob_clean();
    flush();
    readfile($filepath);
    exit;
}

// ─────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────
if ($method === 'POST') {
    if (empty($_FILES['file'])) {
        json_response(['error' => 'No file uploaded.'], 400);
    }

    $file     = $_FILES['file'];
    $empId    = $_POST['employee_id'] ?? null;
    $category = strip_tags($_POST['category'] ?? 'General');

    // Validate file size
    if ($file['size'] > MAX_FILE_SIZE) {
        json_response(['error' => 'File exceeds maximum size of ' . format_bytes(MAX_FILE_SIZE) . '.'], 400);
    }

    // Validate file type by extension AND MIME type
    $origName  = basename($file['name']);
    $ext       = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXT)) {
        json_response(['error' => "File type .$ext is not allowed."], 400);
    }

    // Verify MIME type (don't trust browser-provided type)
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg', 'image/png'
    ];
    if (!in_array($mimeType, $allowedMimes)) {
        json_response(['error' => "Invalid file type: $mimeType"], 400);
    }

    // Ensure upload directory exists and is protected
    if (!is_dir(UPLOAD_PATH)) mkdir(UPLOAD_PATH, 0750, true);

    // Create .htaccess in uploads to block PHP execution
    $htAccess = UPLOAD_PATH . '.htaccess';
    if (!file_exists($htAccess)) {
        file_put_contents($htAccess, "Options -ExecCGI\nAddHandler cgi-script .php .php3 .php4 .phtml\nRemoveHandler .php .phtml\n<Files *.php>\n    Order allow,deny\n    Deny from all\n</Files>");
    }

    // Generate safe stored filename (never use original name on disk)
    $storedName = bin2hex(random_bytes(16)) . '.' . $ext;
    $destPath   = UPLOAD_PATH . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        json_response(['error' => 'Failed to save file. Check server permissions.'], 500);
    }

    // Store metadata in DB
    $safeOrig  = $conn->real_escape_string($origName);
    $safeStore = $conn->real_escape_string($storedName);
    $safeCat   = $conn->real_escape_string($category);
    $safeEmpId = $empId ? "'" . $conn->real_escape_string($empId) . "'" : 'NULL';
    $safeMime  = $conn->real_escape_string($mimeType);
    $safeUser  = $conn->real_escape_string($session['username'] ?? 'system');
    $size      = intval($file['size']);

    $conn->query("INSERT INTO documents (employee_id, category, filename, stored_name, file_size, mime_type, uploaded_by)
                  VALUES ($safeEmpId, '$safeCat', '$safeOrig', '$safeStore', $size, '$safeMime', '$safeUser')");
    $docId = $conn->insert_id;

    audit_log($conn, $session['username'] ?? 'system', 'DOCUMENT_UPLOAD', 'Documents', [
        'filename' => $origName, 'category' => $category, 'employee_id' => $empId
    ]);

    json_response([
        'status'   => 'uploaded',
        'id'       => $docId,
        'filename' => $origName,
        'size'     => format_bytes($size),
        'category' => $category
    ]);
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────
if ($method === 'DELETE' || $action === 'delete') {
    // Only Super Admin and HR Manager can delete
    if (!in_array($session['role'] ?? '', ['Super Admin', 'HR Manager'])) {
        json_response(['error' => 'Insufficient permissions.'], 403);
    }

    $id     = intval($_GET['id'] ?? 0);
    $result = $conn->query("SELECT * FROM documents WHERE id = $id");
    if (!$result || !($doc = $result->fetch_assoc())) {
        json_response(['error' => 'Document not found.'], 404);
    }

    $filepath = UPLOAD_PATH . $doc['stored_name'];
    if (file_exists($filepath)) unlink($filepath);

    $conn->query("DELETE FROM documents WHERE id = $id");

    audit_log($conn, $session['username'], 'DOCUMENT_DELETE', 'Documents', [
        'filename' => $doc['filename'], 'id' => $id
    ]);

    json_response(['status' => 'deleted', 'id' => $id]);
}

$conn->close();

function format_bytes(int $bytes): string {
    if ($bytes >= 1048576) return number_format($bytes / 1048576, 1) . ' MB';
    if ($bytes >= 1024)    return number_format($bytes / 1024, 1) . ' KB';
    return $bytes . ' B';
}
