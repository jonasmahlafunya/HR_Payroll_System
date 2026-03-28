<?php
/**
 * Nexa HR & Payroll — UIF Declaration Export (PDO)
 */
require_once 'config.php';

set_cors_headers();

try {
    $pdo = get_db_connection();
    $session = validate_session($pdo);
} catch (Throwable $e) {
    json_response(['error' => 'System error.'], 500);
}

if (!$session && !validate_api_key()) {
    json_response(['error' => 'Unauthorized.'], 401);
}

$period = $_GET['period'] ?? '';
$companyId = intval($_GET['company_id'] ?? 0);

if (!$period || !$companyId) {
    json_response(['error' => 'period and company_id are required.'], 400);
}

$stmt = $pdo->prepare("SELECT data_blob FROM system_storage WHERE key_name = ?");
$stmt->execute(['hrpms_main_state']);
$row = $stmt->fetch();

if (!$row) {
    json_response(['error' => 'No data found.'], 404);
}
$db = json_decode($row['data_blob'], true);

$company = null;
foreach ($db['companies'] ?? [] as $c) {
    if ($c['id'] == $companyId) {
        $company = $c;
        break;
    }
}
if (!$company) {
    json_response(['error' => "Company not found."], 404);
}

$run = null;
foreach ($db['payrollRuns'] ?? [] as $r) {
    if ($r['companyId'] == $companyId && $r['period'] === $period && $r['status'] === 'Finalized') {
        $run = $r;
        break;
    }
}
if (!$run) {
    json_response(['error' => "No finalized payroll run found for $period."], 404);
}

$payslips = array_filter($db['payslips'] ?? [], fn($p) => $p['runId'] === $run['id']);

function pad_right(string $val, int $len): string
{
    return substr(str_pad($val, $len), 0, $len);
}
function pad_left(string $val, int $len, string $char = '0'): string
{
    return substr(str_pad($val, $len, $char, STR_PAD_LEFT), 0, $len);
}
function format_amount(float $amount): string
{
    return pad_left((string) round($amount * 100), 11);
}

$uifCeiling = 17712.00;
$dateStr = date('Ymd');
$monthStr = date('Ym', strtotime('01 ' . $period));

$uifNumber = preg_replace('/[^0-9]/', '', $company['uifNumber'] ?? '0');
$uifNumber = pad_left($uifNumber, 10);
$companyName = pad_right(strtoupper($company['name']), 40);
$sdlNumber = pad_right($company['sdlNumber'] ?? '', 10);

$lines = [];
// Header Record (100)
$lines[] = '100' . $uifNumber . $companyName . $sdlNumber . $monthStr . $dateStr . pad_left((string) count($payslips), 5);

$totalUIF = 0;
$empLines = 0;
foreach ($payslips as $slip) {
    $emp = null;
    foreach ($db['employees'] ?? [] as $e) {
        if ($e['id'] == ($slip['employeeId'] ?? $slip['id'] ?? 0)) {
            $emp = $e;
            break;
        }
    }
    if (!$emp)
        continue;

    $gross = floatval($slip['gross'] ?? 0);
    $uifable = min($gross, $uifCeiling);
    $empUIF = round($uifable * 0.01, 2);
    $totalContrib = $empUIF * 2;
    $totalUIF += $totalContrib;

    $record = '200';
    $record .= pad_right(preg_replace('/\s/', '', $emp['idNumber'] ?? ''), 13);
    $record .= pad_right(preg_replace('/[^0-9]/', '', $emp['uifNumber'] ?? ''), 12);
    $record .= pad_right(strtoupper($emp['lastName'] ?? ''), 30);
    $record .= pad_right(strtoupper($emp['firstName'] ?? ''), 20);
    $record .= format_amount($uifable);
    $record .= format_amount($empUIF);
    $record .= format_amount($empUIF);
    $record .= format_amount($totalContrib);
    $record .= pad_right($emp['email'] ?? '', 50);
    $lines[] = $record;
    $empLines++;
}

// Trailer Record (900)
$lines[] = '900' . pad_left((string) $empLines, 7) . format_amount($totalUIF) . $dateStr;

$content = implode("\r\n", $lines) . "\r\n";
$filename = 'UI19_' . $company['name'] . '_' . preg_replace('/[^A-Za-z0-9]/', '_', $period) . '.uif';

audit_log($pdo, $session['username'] ?? 'system', 'UIF_EXPORT', 'TaxCompliance', ['period' => $period, 'company_id' => $companyId]);

header('Content-Type: text/plain; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
if (ob_get_level())
    ob_end_clean();
echo $content;
exit;
