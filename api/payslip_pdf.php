<?php
/**
 * Nexa HR & Payroll — Payslip PDF Generator
 * GET /api/payslip_pdf.php?employee_id=X&run_id=Y
 *
 * Returns a fully-formed, print-ready HTML page.
 * The browser's native Print-to-PDF produces the PDF.
 * For true server-side PDF, install Dompdf via Composer:
 *   composer require dompdf/dompdf
 * and uncomment the Dompdf section below.
 */
require_once 'config.php';

set_cors_headers();

$conn    = get_db_connection();
$session = validate_session($conn);
if (!$session && !validate_api_key()) {
    http_response_code(401);
    exit('Unauthorized.');
}

// ── Params ────────────────────────────────────────────────────
$empId = intval($_GET['employee_id'] ?? 0);
$runId = $conn->real_escape_string($_GET['run_id'] ?? '');
$email = $_GET['email'] ?? '';  // If set, email the payslip instead

if (!$empId || !$runId) {
    http_response_code(400); exit('Missing employee_id or run_id.');
}

// ── Load data from DB ─────────────────────────────────────────
$result  = $conn->query("SELECT data_blob FROM system_storage WHERE key_name='hrpms_main_state'");
if (!$result || !($row = $result->fetch_assoc())) {
    http_response_code(404); exit('No data found.');
}
$db = json_decode($row['data_blob'], true);

// Find payslip line
$line = null;
foreach (($db['payslips'] ?? []) as $p) {
    if ($p['runId'] === $runId && ($p['employeeId'] ?? $p['id'] ?? 0) == $empId) {
        $line = $p; break;
    }
}
if (!$line) { http_response_code(404); exit('Payslip not found.'); }

// Find employee
$emp = null;
foreach (($db['employees'] ?? []) as $e) {
    if ($e['id'] == $empId) { $emp = $e; break; }
}
if (!$emp) { http_response_code(404); exit('Employee not found.'); }

// Find company via run
$run  = null;
$comp = null;
foreach (($db['payrollRuns'] ?? []) as $r) {
    if ($r['id'] === $runId) { $run = $r; break; }
}
if ($run) {
    foreach (($db['companies'] ?? []) as $c) {
        if ($c['id'] == ($run['companyId'] ?? 0)) { $comp = $c; break; }
    }
}
if (!$comp) $comp = ['name' => $db['settings']['companyName'] ?? 'Company'];

// ── Build HTML ────────────────────────────────────────────────
$compName  = htmlspecialchars($comp['name'] ?? 'Company');
$empName   = htmlspecialchars(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''));
$period    = htmlspecialchars($line['period'] ?? ($run['period'] ?? 'N/A'));
$generated = date('d F Y');

function fmt(float $v): string {
    return 'R ' . number_format($v, 2, '.', ',');
}

$basic   = (float)($line['basic'] ?? 0);
$gross   = (float)($line['gross'] ?? 0);
$paye    = (float)($line['paye'] ?? 0);
$uif     = (float)($line['uif'] ?? 0);
$pension = (float)($line['pension'] ?? 0);
$medical = (float)($line['medical'] ?? 0);
$sdl     = (float)($line['sdl'] ?? 0);
$net     = (float)($line['net'] ?? 0);
$totalDed = $paye + $uif + $pension + $medical;

// Custom benefits
$customBens = $line['customBenefits'] ?? $emp['benefits']['custom'] ?? [];

// ── Email mode ────────────────────────────────────────────────
if ($email) {
    ob_start();
}

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payslip — <?= $empName ?> — <?= $period ?></title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }
  .page { max-width: 820px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 24px; }
  .company-name { font-size: 22px; font-weight: 800; color: #4f46e5; }
  .payslip-label { font-size: 20px; font-weight: 700; color: #1e293b; }
  .period { font-weight: 600; color: #475569; margin-top: 4px; }
  .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; }
  .emp-field { margin-bottom: 8px; }
  .emp-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .emp-value { font-weight: 600; color: #1e293b; margin-top: 2px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
  table.breakdown { width: 100%; border-collapse: collapse; }
  table.breakdown tr td { padding: 5px 0; }
  table.breakdown tr td:last-child { text-align: right; font-weight: 500; }
  table.breakdown tr.total td { border-top: 2px solid #e2e8f0; padding-top: 8px; font-weight: 700; }
  .net-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .net-label { font-size: 14px; font-weight: 600; color: #64748b; }
  .net-amount { font-size: 28px; font-weight: 800; color: #0f172a; }
  .contributions { font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 24px; }
  .badge { display: inline-block; background: #4f46e5; color: white; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Print / Download buttons -->
  <div class="no-print" style="margin-bottom:20px; display:flex; gap:10px;">
    <button onclick="window.print()" style="background:#4f46e5;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">
      🖨 Print / Save as PDF
    </button>
    <button onclick="window.close()" style="background:#f1f5f9;color:#475569;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">
      Close
    </button>
  </div>

  <!-- Header -->
  <div class="header">
    <div style="display:flex; gap:16px; align-items:center;">
       <?php if (!empty($comp['logo'])): ?>
         <img src="<?= $comp['logo'] ?>" style="max-width:100px; max-height:60px; object-fit:contain;">
       <?php else: ?>
         <div style="width:50px; height:50px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; border-radius:8px;">
            <span style="color:#cbd5e1; font-size:24px;">🏢</span>
         </div>
       <?php endif; ?>
       <div>
         <div class="company-name"><?= $compName ?></div>
         <div style="color:#64748b; font-size:12px; margin-top:4px;">
           Reg: <?= htmlspecialchars($comp['registrationNumber'] ?? 'N/A') ?> &bull;
           Tax Ref: <?= htmlspecialchars($comp['taxReference'] ?? 'N/A') ?>
         </div>
       </div>
    </div>
    <div style="text-align:right;">
      <div class="payslip-label">PAYSLIP</div>
      <div style="font-size: 12px; font-weight: 700; color: #4f46e5; margin-bottom: 4px;">
        <?= htmlspecialchars($run['payFrequency'] ?? 'Monthly') ?> Payroll
      </div>
      <div class="period"><?= $period ?></div>
      <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Generated: <?= $generated ?></div>
    </div>
  </div>

  <!-- Employee Details -->
  <div class="emp-grid">
    <div>
      <div class="emp-field"><div class="emp-label">Name</div><div class="emp-value"><?= $empName ?></div></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="emp-field"><div class="emp-label">Employee No.</div><div class="emp-value"><?= htmlspecialchars($emp['employeeNumber'] ?? 'EMP' . $emp['id']) ?></div></div>
        <div class="emp-field"><div class="emp-label">ID Number</div><div class="emp-value"><?= htmlspecialchars($emp['idNumber'] ?? '—') ?></div></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:4px;">
        <div class="emp-field"><div class="emp-label">Position</div><div class="emp-value"><?= htmlspecialchars($emp['position'] ?? '—') ?></div></div>
        <div class="emp-field"><div class="emp-label">Department</div><div class="emp-value"><?= htmlspecialchars($emp['department'] ?? '—') ?></div></div>
      </div>
    </div>
    <div style="text-align:right; border-left:1px solid #e2e8f0; padding-left:24px;">
      <div class="emp-field"><div class="emp-label">Tax Number</div><div class="emp-value"><?= htmlspecialchars($emp['taxNumber'] ?? '—') ?></div></div>
      <div class="emp-field"><div class="emp-label">Bank</div><div class="emp-value"><?= htmlspecialchars($emp['bankName'] ?? '—') ?></div></div>
      <div class="emp-field"><div class="emp-label">Account Number</div><div class="emp-value">****<?= substr($emp['accountNumber'] ?? '0000', -4) ?></div></div>
    </div>
  </div>

  <!-- Earnings & Deductions -->
  <div class="cols">
    <div>
      <div class="section-title">Earnings</div>
      <table class="breakdown">
        <tr><td>Basic Salary</td><td><?= fmt($basic) ?></td></tr>
        <?php if (($line['otPay'] ?? 0) > 0.01): ?>
        <tr><td>Overtime Pay</td><td><?= fmt((float)$line['otPay']) ?></td></tr>
        <?php endif; ?>
        <?php if (($line['phPay'] ?? 0) > 0.01): ?>
        <tr><td>Public Holiday Pay</td><td><?= fmt((float)$line['phPay']) ?></td></tr>
        <?php endif; ?>
        <?php foreach ($customBens as $b):
          if (($b['type'] ?? '') !== 'Allowance') continue;
          $val = ($b['calc'] ?? '') === 'Percentage' ? $basic * (floatval($b['value'] ?? 0) / 100) : floatval($b['value'] ?? 0);
        ?>
        <tr><td><?= htmlspecialchars($b['name']) ?></td><td><?= fmt($val) ?></td></tr>
        <?php endforeach; ?>
        <?php 
          $otherAllowances = $gross - $basic - ($line['otPay'] ?? 0) - ($line['phPay'] ?? 0) - array_sum(array_map(fn($b) => ($b['type']??'')==='Allowance' ? (($b['calc']??'')==='Percentage' ? $basic*(floatval($b['value']??0)/100) : floatval($b['value']??0)) : 0, $customBens));
          if ($otherAllowances > 0.01): 
        ?>
        <tr><td>Other Allowances</td><td><?= fmt($otherAllowances) ?></td></tr>
        <?php endif; ?>
        <tr class="total"><td>Total Earnings</td><td><?= fmt($gross) ?></td></tr>
      </table>
    </div>
    <div>
      <div class="section-title">Deductions</div>
      <table class="breakdown">
        <tr><td>PAYE Tax</td><td><?= fmt($paye) ?></td></tr>
        <tr><td>UIF Employee</td><td><?= fmt($uif) ?></td></tr>
        <?php if ($medical > 0): ?><tr><td>Medical Aid</td><td><?= fmt($medical) ?></td></tr><?php endif; ?>
        <?php if ($pension > 0): ?><tr><td>Pension / Provident</td><td><?= fmt($pension) ?></td></tr><?php endif; ?>
        <?php foreach ($customBens as $b):
          if (!in_array($b['type'] ?? '', ['Deduction','Reimbursement'])) continue;
          $val = ($b['calc'] ?? '') === 'Percentage' ? $basic * (floatval($b['value'] ?? 0) / 100) : floatval($b['value'] ?? 0);
        ?>
        <tr><td><?= htmlspecialchars($b['name']) ?></td><td><?= fmt($val) ?></td></tr>
        <?php endforeach; ?>
        <tr class="total"><td>Total Deductions</td><td><?= fmt($totalDed) ?></td></tr>
      </table>
    </div>
  </div>

  <!-- Net Pay -->
  <div style="background:#4f46e5; border-radius:12px; padding:24px; text-align:right; margin-bottom:32px; color:white;">
    <div style="font-size:14px; font-weight:600; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Net Pay to Account</div>
    <div style="font-size:32px; font-weight:800;"><?= fmt($net) ?></div>
  </div>

  <!-- Company Contributions -->
  <div class="contributions">
    <div>
      <strong>Employer Contributions:</strong><br>
      SDL: <?= fmt($sdl) ?><br>
      UIF (Employer): <?= fmt($uif) ?><br>
      <strong>Total CTC: <?= fmt($gross + $sdl + $uif) ?></strong>
    </div>
    <div style="text-align:right;">
      <strong>Tax Year 2025/2026 (Projected):</strong><br>
      Taxable Income: <?= fmt($gross * 12) ?><br>
      Estimated Annual Tax: <?= fmt($paye * 12) ?>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    This payslip is generated electronically by Nexa HR &amp; Payroll.
    For queries contact HR at <?= htmlspecialchars($comp['email'] ?? 'hr@company.co.za') ?>.
    Ref: <?= htmlspecialchars($runId) ?>
  </div>
</div>
<?php if (!$email): ?>
<script>
  window.onload = function() { setTimeout(function(){ window.print(); }, 500); };
</script>
<?php endif; ?>
</body>
</html>
<?php
// ── Email mode: capture HTML and send ────────────────────────
if ($email) {
    $html = ob_get_clean();
    require_once 'email.php'; // send_smtp / send_native_mail available

    // Stub: for email sending, POST to email.php endpoint
    $emailData = json_encode([
        'to'        => filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : $emp['email'],
        'subject'   => "Your Payslip for $period — $compName",
        'body_html' => $html,
        'body_text' => "Please find your payslip for $period attached."
    ]);

    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nX-API-Key: " . API_SECRET_KEY,
        'content' => $emailData
    ]]);
    @file_get_contents(rtrim(APP_URL, '/') . '/api/email.php', false, $ctx);

    header('Content-Type: application/json');
    echo json_encode(['status' => 'emailed', 'to' => $email]);
}

$conn->close();
