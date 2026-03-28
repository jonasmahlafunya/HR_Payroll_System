<?php
/**
 * Nexa HR & Payroll — UIF Declaration Export
 * Generates the official DoEL UI-19 .uif fixed-width file.
 *
 * GET /api/uif_export.php?period=March+2026&company_id=1
 *
 * Format spec: DoEL U-Filing bulk submission format
 * Reference: https://www.ufiling.co.za/uif/
 */
require_once 'config.php';

set_cors_headers();

$conn    = get_db_connection();
$session = validate_session($conn);
if (!$session && !validate_api_key()) {
    header('Content-Type: application/json');
    json_response(['error' => 'Unauthorized.'], 401);
}

$period    = $_GET['period']     ?? '';
$companyId = intval($_GET['company_id'] ?? 0);

if (!$period || !$companyId) {
    header('Content-Type: application/json');
    json_response(['error' => 'period and company_id are required.'], 400);
}

// Load state
$result = $conn->query("SELECT data_blob FROM system_storage WHERE key_name='hrpms_main_state'");
if (!$result || !($row = $result->fetch_assoc())) {
    header('Content-Type: application/json');
    json_response(['error' => 'No data found.'], 404);
}
$db = json_decode($row['data_blob'], true);

// Find company
$company = null;
foreach ($db['companies'] as $c) {
    if ($c['id'] == $companyId) { $company = $c; break; }
}
if (!$company) {
    header('Content-Type: application/json');
    json_response(['error' => "Company $companyId not found."], 404);
}

// Find payroll run for this period/company
$run = null;
foreach ($db['payrollRuns'] ?? [] as $r) {
    if ($r['companyId'] == $companyId && $r['period'] === $period && $r['status'] === 'Finalized') {
        $run = $r; break;
    }
}
if (!$run) {
    header('Content-Type: application/json');
    json_response(['error' => "No finalized payroll run found for $period."], 404);
}

// Find payslips for this run
$payslips = array_filter($db['payslips'] ?? [], fn($p) => $p['runId'] === $run['id']);

// ── Fixed-width formatting helpers ───────────────────────────
function pad_right(string $val, int $len): string {
    return substr(str_pad($val, $len), 0, $len);
}
function pad_left(string $val, int $len, string $char = '0'): string {
    return substr(str_pad($val, $len, $char, STR_PAD_LEFT), 0, $len);
}
function format_amount(float $amount): string {
    // Amounts in cents, 11 digits, zero-padded
    return pad_left((string)round($amount * 100), 11);
}
function format_id(string $id): string {
    $clean = preg_replace('/\s/', '', $id);
    return pad_right($clean, 13);
}

// ── UI-19 / U-Filing format ───────────────────────────────────
// Record types:
//   100 = Employer Header
//   200 = Employee Declaration
//   900 = Trailer (totals)

$uifCeiling = 17712.00; // Monthly UIF remuneration ceiling 2025
$dateStr    = date('Ymd'); // YYYYMMDD
$monthStr   = date('Ym', strtotime('01 ' . $period)); // YYYYMM

$uifNumber     = preg_replace('/[^0-9]/', '', $company['uifNumber'] ?? '0');
$uifNumber     = pad_left($uifNumber, 10);
$companyName   = pad_right(strtoupper($company['name']), 40);
$sdlNumber     = pad_right($company['sdlNumber'] ?? '', 10);

$lines = [];

// ── Header Record (100) ───────────────────────────────────────
$header  = '100';
$header .= $uifNumber;       // 10: UIF employer reference
$header .= $companyName;     // 40: Employer name
$header .= $sdlNumber;       // 10: SDL number
$header .= $monthStr;        // 6:  Declaration period YYYYMM
$header .= $dateStr;         // 8:  Submission date
$header .= pad_left((string)count($payslips), 5); // 5: Employee count
$lines[] = $header;

// ── Employee Records (200) ────────────────────────────────────
$totalUIF = 0;
$empLines = 0;

foreach ($payslips as $slip) {
    $emp = null;
    foreach ($db['employees'] as $e) {
        if ($e['id'] == ($slip['employeeId'] ?? $slip['id'] ?? 0)) { $emp = $e; break; }
    }
    if (!$emp) continue;

    $gross       = floatval($slip['gross'] ?? 0);
    $uifable     = min($gross, $uifCeiling);
    $empUIF      = round($uifable * 0.01, 2);
    $emplrUIF    = $empUIF;
    $totalContrib = $empUIF + $emplrUIF;
    $totalUIF   += $totalContrib;

    $idNum   = format_id($emp['idNumber'] ?? '');
    $surname = pad_right(strtoupper($emp['lastName'] ?? ''), 30);
    $fname   = pad_right(strtoupper($emp['firstName'] ?? ''), 20);
    $uifRef  = pad_right(preg_replace('/[^0-9]/', '', $emp['uifNumber'] ?? ''), 12);

    $record  = '200';
    $record .= $idNum;                       // 13: SA ID
    $record .= $uifRef;                      // 12: UIF employee reference
    $record .= $surname;                     // 30: Surname
    $record .= $fname;                       // 20: First name
    $record .= format_amount($uifable);      // 11: UIF-able remuneration (cents)
    $record .= format_amount($empUIF);       // 11: Employee contribution (cents)
    $record .= format_amount($emplrUIF);     // 11: Employer contribution (cents)
    $record .= format_amount($totalContrib); // 11: Total contributions (cents)
    $record .= pad_right($emp['email'] ?? '', 50); // 50: Email (optional)
    $lines[] = $record;
    $empLines++;
}

// ── Trailer Record (900) ──────────────────────────────────────
$trailer  = '900';
$trailer .= pad_left((string)$empLines, 7);  // 7:  Total employee records
$trailer .= format_amount($totalUIF);         // 11: Total contributions (cents)
$trailer .= $dateStr;                         // 8:  File creation date
$lines[]  = $trailer;

// ── Output ────────────────────────────────────────────────────
$content  = implode("\r\n", $lines) . "\r\n";
$filename = 'UI19_' . $company['name'] . '_' . $period . '.uif';
$filename = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $filename);

audit_log($conn, $session['username'] ?? 'system', 'UIF_EXPORT', 'TaxCompliance', [
    'period' => $period, 'company_id' => $companyId, 'employee_count' => $empLines
]);

header('Content-Type: text/plain; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($content));
header('Cache-Control: no-cache');
ob_clean(); flush();
echo $content;
$conn->close();
