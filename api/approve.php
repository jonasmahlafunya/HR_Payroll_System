<?php
/**
 * Nexa HR & Payroll — Payroll Approval Endpoint
 * GET /api/approve.php?token=XXX&run_id=YYY
 *
 * Called when the client clicks the "Approve Payroll" button in the email.
 * Validates token, updates payroll run status to "Approved" in the DB.
 */
require_once 'config.php';

$token = trim($_GET['token'] ?? '');
$runId = trim($_GET['run_id'] ?? '');

if (!$token || !$runId) {
    render_page('error', 'Invalid Link', 'This approval link is missing required parameters. Please contact your payroll administrator.');
}

$conn = get_db_connection();
init_tables($conn);

// Load state blob
$result = $conn->query("SELECT data_blob FROM system_storage WHERE key_name='hrpms_main_state'");
if (!$result || !($row = $result->fetch_assoc())) {
    render_page('error', 'No Data Found', 'System data could not be loaded. Please contact your payroll administrator.');
}

$db = json_decode($row['data_blob'], true);
if (!is_array($db)) {
    render_page('error', 'Data Error', 'System data is corrupted. Please contact your payroll administrator.');
}

$runs       = $db['payrollRuns'] ?? [];
$targetIdx  = -1;
$targetRun  = null;

foreach ($runs as $i => $run) {
    if ((string)$run['id'] === (string)$runId) {
        $targetIdx = $i;
        $targetRun = $run;
        break;
    }
}

if ($targetIdx === -1) {
    render_page('error', 'Payroll Not Found', 'The payroll run could not be found. It may have been deleted or the link is incorrect.');
}

// Verify token matches
$storedToken = $targetRun['approvalToken'] ?? '';
if (!$storedToken || !hash_equals($storedToken, $token)) {
    render_page('error', 'Invalid Token', 'This approval link is invalid or has expired. Please contact your payroll administrator.');
}

// Already approved?
if (in_array($targetRun['status'] ?? '', ['Approved', 'Finalized', 'Paid'])) {
    render_page('already', 'Already Approved',
        $targetRun['company']  ?? 'Unknown Company',
        $targetRun['period']   ?? '',
        $targetRun['approvedAt'] ?? ''
    );
}

// Update status
$db['payrollRuns'][$targetIdx]['status']     = 'Approved';
$db['payrollRuns'][$targetIdx]['approvedAt'] = date('c');
$db['payrollRuns'][$targetIdx]['approvedBy'] = 'Email Approval';

// Save back to DB
$blob = $conn->real_escape_string(json_encode($db));
$ok = $conn->query(
    "INSERT INTO system_storage (key_name, data_blob)
     VALUES ('hrpms_main_state', '$blob')
     ON DUPLICATE KEY UPDATE data_blob = '$blob'"
);

if (!$ok) {
    render_page('error', 'Save Failed', 'Could not save approval. DB error: ' . $conn->error);
}

// Audit log
audit_log($conn, 'email_approval', 'PAYROLL_APPROVED', 'Payroll', [
    'run_id'  => $runId,
    'company' => $targetRun['company'] ?? '',
    'period'  => $targetRun['period']  ?? ''
]);

$conn->close();

render_page('success', 'Payroll Approved!',
    $targetRun['company'] ?? 'Unknown Company',
    $targetRun['period']  ?? ''
);

// ─────────────────────────────────────────────────────────────────────────────
function render_page(string $type, string $title, string $company = '', string $period = '', string $timestamp = ''): void {
    $colors = [
        'success' => ['bg' => '#059669', 'light' => '#d1fae5', 'text' => '#065f46'],
        'already' => ['bg' => '#0284c7', 'light' => '#dbeafe', 'text' => '#1e3a5f'],
        'error'   => ['bg' => '#dc2626', 'light' => '#fee2e2', 'text' => '#991b1b'],
    ];
    $c = $colors[$type] ?? $colors['error'];

    $icons   = ['success' => '✓', 'already' => 'ℹ', 'error' => '✕'];
    $icon    = $icons[$type] ?? '✕';

    $message = '';
    $detail  = '';
    if ($type === 'success') {
        $message = "The payroll for <strong>" . htmlspecialchars($company) . "</strong> ("
                 . htmlspecialchars($period) . ") has been successfully <strong>approved</strong>.";
        $detail  = "The payroll officer has been notified and will proceed with generating the bank payment file.";
    } elseif ($type === 'already') {
        $message = "The payroll for <strong>" . htmlspecialchars($company) . "</strong> ("
                 . htmlspecialchars($period) . ") was already approved.";
        $detail  = $timestamp ? "Approved on: " . htmlspecialchars($timestamp) : "No further action is required.";
    } else {
        $message = htmlspecialchars($company); // re-used as error message
        $detail  = "Please contact your payroll administrator for assistance.";
    }
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($title) ?> — Nexa HR &amp; Payroll</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f1f5f9;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    background: #fff;
    border-radius: 16px;
    padding: 48px 40px;
    max-width: 520px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0,0,0,0.10);
  }
  .icon-circle {
    width: 72px; height: 72px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; font-weight: 700;
    margin: 0 auto 24px;
  }
  h1 { font-size: 1.5rem; color: #0f172a; margin-bottom: 12px; }
  .message { font-size: 1rem; color: #334155; line-height: 1.6; margin-bottom: 10px; }
  .detail  { font-size: 0.88rem; color: #64748b; line-height: 1.5; margin-top: 8px; }
  .footer  { margin-top: 32px; font-size: 0.78rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
</style>
</head>
<body>
<div class="card">
  <div class="icon-circle" style="background:<?= $c['bg'] ?>;color:#fff;"><?= $icon ?></div>
  <h1><?= htmlspecialchars($title) ?></h1>
  <p class="message"><?= $message ?></p>
  <p class="detail"><?= $detail ?></p>
  <div class="footer">Nexa HR &amp; Payroll &bull; Automated Approval System</div>
</div>
</body>
</html>
    <?php
    exit;
}
