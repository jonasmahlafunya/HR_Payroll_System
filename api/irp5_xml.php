<?php
/**
 * Nexa HR & Payroll — IRP5 / EMP501 XML Export (PDO)
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

$taxYear = intval($_GET['tax_year'] ?? date('Y'));
$companyId = intval($_GET['company_id'] ?? 0);
$type = $_GET['type'] ?? 'irp5';

if (!$taxYear || !$companyId) {
    json_response(['error' => 'tax_year and company_id are required.'], 400);
}

// Load data
$stmt = $pdo->prepare("SELECT data_blob FROM system_storage WHERE key_name = ?");
$stmt->execute(['hrpms_main_state']);
$row = $stmt->fetch();

if (!$row) {
    json_response(['error' => 'No data found.'], 404);
}
$db = json_decode($row['data_blob'], true);

// Find company
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

// Aggregation logic remains same (from blob)
$empTotals = [];
$runs = array_filter($db['payrollRuns'] ?? [], function ($r) use ($companyId) {
    return $r['companyId'] == $companyId && $r['status'] === 'Finalized';
});

foreach ($db['payslips'] ?? [] as $slip) {
    $runId = $slip['runId'] ?? null;
    $matchRun = null;
    foreach ($runs as $r) {
        if ($r['id'] === $runId) {
            $matchRun = $r;
            break;
        }
    }
    if (!$matchRun)
        continue;

    $empId = $slip['employeeId'] ?? $slip['id'] ?? 0;
    if (!isset($empTotals[$empId])) {
        $empTotals[$empId] = ['gross' => 0, 'paye' => 0, 'uif' => 0, 'pension' => 0, 'medical' => 0, 'sdl' => 0];
    }
    $empTotals[$empId]['gross'] += floatval($slip['gross'] ?? 0);
    $empTotals[$empId]['paye'] += floatval($slip['paye'] ?? 0);
    $empTotals[$empId]['uif'] += floatval($slip['uif'] ?? 0);
    $empTotals[$empId]['pension'] += floatval($slip['pension'] ?? 0);
    $empTotals[$empId]['medical'] += floatval($slip['medical'] ?? 0);
    $empTotals[$empId]['sdl'] += floatval($slip['sdl'] ?? 0);
}

function xml_val(float $v): string
{
    return number_format($v, 2, '.', '');
}
function xml_str(string $v): string
{
    return htmlspecialchars(trim($v), ENT_XML1, 'UTF-8');
}
function xml_date(?string $d): string
{
    return $d ? preg_replace('/[^0-9\-]/', '', $d) : '';
}

$taxYearStr = ($taxYear - 1) . '/' . $taxYear;
$xml = '';

if ($type === 'emp501') {
    $totalGross = array_sum(array_column($empTotals, 'gross'));
    $totalPAYE = array_sum(array_column($empTotals, 'paye'));
    $totalUIF = array_sum(array_column($empTotals, 'uif'));
    $totalSDL = array_sum(array_column($empTotals, 'sdl'));

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<EMP501 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="EMP501_v2_0.xsd">' . "\n";
    $xml .= '  <Header><TaxYear>' . $taxYearStr . '</TaxYear><SubmissionDate>' . date('Y-m-d') . '</SubmissionDate><Software>NexaHR-v2</Software></Header>' . "\n";
    $xml .= '  <EmployerDetails>' . "\n";
    $xml .= '    <TradingName>' . xml_str($company['name']) . '</TradingName>' . "\n";
    $xml .= '    <PAYERef>' . xml_str($company['taxReference'] ?? '') . '</PAYERef>' . "\n";
    $xml .= '    <UIFRef>' . xml_str($company['uifNumber'] ?? '') . '</UIFRef>' . "\n";
    $xml .= '    <SDLRef>' . xml_str($company['sdlNumber'] ?? '') . '</SDLRef>' . "\n";
    $xml .= '  </EmployerDetails>' . "\n";
    $xml .= '  <Reconciliation>' . "\n";
    $xml .= '    <TotalEmployees>' . count($empTotals) . '</TotalEmployees>' . "\n";
    $xml .= '    <TotalGrossRemuneration>' . xml_val($totalGross) . '</TotalGrossRemuneration>' . "\n";
    $xml .= '    <TotalPAYEDeducted>' . xml_val($totalPAYE) . '</TotalPAYEDeducted>' . "\n";
    $xml .= '    <TotalUIF>' . xml_val($totalUIF * 2) . '</TotalUIF>' . "\n";
    $xml .= '    <TotalSDL>' . xml_val($totalSDL) . '</TotalSDL>' . "\n";
    $xml .= '  </Reconciliation>' . "\n";
    $xml .= '</EMP501>' . "\n";
} else {
    // IRP5
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<IRP5Certificates>' . "\n";
    $xml .= '  <Employer><Name>' . xml_str($company['name']) . '</Name><PAYERef>' . xml_str($company['taxReference'] ?? '') . '</PAYERef></Employer>' . "\n";
    $xml .= '  <Certificates>' . "\n";
    $idx = 1;
    foreach ($empTotals as $empId => $totals) {
        $emp = null;
        foreach ($db['employees'] ?? [] as $e) {
            if ($e['id'] == $empId) {
                $emp = $e;
                break;
            }
        }
        if (!$emp)
            continue;

        $xml .= '    <Certificate>' . "\n";
        $xml .= '      <CertNumber>IRP5-' . $taxYear . '-' . str_pad($idx++, 4, '0', STR_PAD_LEFT) . '</CertNumber>' . "\n";
        $xml .= '      <Employee>' . "\n";
        $xml .= '        <Surname>' . xml_str($emp['lastName'] ?? '') . '</Surname>' . "\n";
        $xml .= '        <FirstNames>' . xml_str($emp['firstName'] ?? '') . '</FirstNames>' . "\n";
        $xml .= '        <IDNumber>' . xml_str(preg_replace('/\s/', '', $emp['idNumber'] ?? '')) . '</IDNumber>' . "\n";
        $xml .= '      </Employee>' . "\n";
        $xml .= '      <IncomeAndDeductions>' . "\n";
        $xml .= '        <TotalIncome>' . xml_val($totals['gross']) . '</TotalIncome>' . "\n";
        $xml .= '        <TaxDeducted>' . xml_val($totals['paye']) . '</TaxDeducted>' . "\n";
        $xml .= '      </IncomeAndDeductions>' . "\n";
        $xml .= '    </Certificate>' . "\n";
    }
    $xml .= '  </Certificates></IRP5Certificates>' . "\n";
}

$filename = ($type === 'emp501' ? 'EMP501_' : 'IRP5_') . $company['name'] . '_' . $taxYear . '.xml';
$filename = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $filename);

audit_log($pdo, $session['username'] ?? 'system', strtoupper($type) . '_EXPORT', 'TaxCompliance', ['tax_year' => $taxYear, 'company_id' => $companyId]);

header('Content-Type: application/xml; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
if (ob_get_level())
    ob_end_clean();
echo $xml;
exit;
