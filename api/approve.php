<?php
/**
 * Nexa HR & Payroll — Payroll Approval Endpoint (PDO)
 * GET /api/approve.php?token=XXX&run_id=YYY
 */
require_once 'config.php';

$token = trim($_GET['token'] ?? '');
$runId = trim($_GET['run_id'] ?? '');

if (!$token || !$runId) {
    render_page('error', 'Invalid Link', 'This approval link is missing required parameters.');
}

try {
    $pdo = get_db_connection();
} catch (Throwable $t) {
    render_page('error', 'Database Error', 'Could not connect to the database.');
}

// Load state blob
$stmt = $pdo->prepare("SELECT data_blob FROM system_storage WHERE key_name = ?");
$stmt->execute(['hrpms_main_state']);
$row = $stmt->fetch();

if (!$row) {
    render_page('error', 'No Data Found', 'System data could not be loaded.');
}

$db = json_decode($row['data_blob'], true);
if (!is_array($db)) {
    render_page('error', 'Data Error', 'System data is corrupted.');
}

$runs = $db['payrollRuns'] ?? [];
$targetIdx = -1;
$targetRun = null;

foreach ($runs as $i => $run) {
    if ((string) $run['id'] === (string) $runId) {
        $targetIdx = $i;
        $targetRun = $run;
        break;
    }
}

if ($targetIdx === -1) {
    render_page('error', 'Payroll Not Found', 'The payroll run could not be found.');
}

// Verify token matches
$storedToken = $targetRun['approvalToken'] ?? '';
if (!$storedToken || !hash_equals($storedToken, $token)) {
    render_page('error', 'Invalid Token', 'This approval link is invalid or has expired.');
}

// Already approved?
if (in_array($targetRun['status'] ?? '', ['Approved', 'Finalized', 'Paid'])) {
    render_page(
        'already',
        'Already Approved',
        $targetRun['company'] ?? 'Unknown Company',
        $targetRun['period'] ?? '',
        $targetRun['approvedAt'] ?? ''
    );
}

// ─────────────────────────────────────────────────────────────
// UPDATE STATE
// ─────────────────────────────────────────────────────────────
try {
    $pdo->beginTransaction();

    $db['payrollRuns'][$targetIdx]['status'] = 'Approved';
    $db['payrollRuns'][$targetIdx]['approvedAt'] = date('c');
    $db['payrollRuns'][$targetIdx]['approvedBy'] = 'Email Approval';

    $newBlob = json_encode($db);
    $stmt = $pdo->prepare("INSERT INTO system_storage (key_name, data_blob)
                           VALUES (?, ?)
                           ON DUPLICATE KEY UPDATE data_blob = VALUES(data_blob)");
    $stmt->execute(['hrpms_main_state', $newBlob]);

    audit_log($pdo, 'email_approval', 'PAYROLL_APPROVED', 'Payroll', [
        'run_id' => $runId,
        'company' => $targetRun['company'] ?? '',
        'period' => $targetRun['period'] ?? ''
    ]);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    render_page('error', 'Save Failed', 'Could not save approval.');
}

render_page(
    'success',
    'Payroll Approved!',
    $targetRun['company'] ?? 'Unknown Company',
    $targetRun['period'] ?? ''
);

// ─────────────────────────────────────────────────────────────────────────────
function render_page(string $type, string $title, string $company = '', string $period = '', string $timestamp = ''): void
{
    $colors = [
        'success' => ['bg' => '#059669', 'text' => '#065f46'],
        'already' => ['bg' => '#0284c7', 'text' => '#1e3a5f'],
        'error' => ['bg' => '#dc2626', 'text' => '#991b1b'],
    ];
    $c = $colors[$type] ?? $colors['error'];
    $icon = ['success' => '✓', 'already' => 'ℹ', 'error' => '✕'][$type] ?? '✕';

    $message = '';
    $detail = '';
    if ($type === 'success') {
        $message = "The payroll for <strong>" . htmlspecialchars($company) . "</strong> (" . htmlspecialchars($period) . ") has been approved.";
        $detail = "The payroll officer has been notified.";
    } elseif ($type === 'already') {
        $message = "The payroll for <strong>" . htmlspecialchars($company) . "</strong> (" . htmlspecialchars($period) . ") was already approved.";
        $detail = $timestamp ? "Approved on: " . htmlspecialchars($timestamp) : "";
    } else {
        $message = htmlspecialchars($company);
        $detail = "Please contact your payroll administrator.";
    }
    ?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= htmlspecialchars($title) ?> — Nexa HR &amp; Payroll</title>
        <style>
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background: #f8fafc;
                color: #1e293b;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .card {
                background: #fff;
                border-radius: 20px;
                padding: 40px;
                max-width: 480px;
                width: 100%;
                text-align: center;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            }

            .icon {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background:
                    <?= $c['bg'] ?>
                ;
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                margin: 0 auto 20px;
            }

            h1 {
                font-size: 1.5rem;
                font-weight: 800;
                margin-bottom: 12px;
            }

            .message {
                font-size: 1rem;
                line-height: 1.6;
                margin-bottom: 8px;
            }

            .detail {
                color: #64748b;
                font-size: 0.875rem;
            }

            .footer {
                margin-top: 32px;
                padding-top: 20px;
                border-top: 1px solid #f1f5f9;
                color: #94a3b8;
                font-size: 0.75rem;
            }
        </style>
    </head>

    <body>
        <div class="card">
            <div class="icon"><?= $icon ?></div>
            <h1><?= htmlspecialchars($title) ?></h1>
            <p class="message"><?= $message ?></p>
            <p class="detail"><?= $detail ?></p>
            <div class="footer">Nexa HR &amp; Payroll</div>
        </div>
    </body>

    </html>
    <?php
    exit;
}
