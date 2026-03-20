<?php
/**
 * Nexa HR & Payroll — IRP5 / EMP501 XML Export
 * SARS e@syFile Employer XML format for eFiling submission.
 *
 * GET /api/irp5_xml.php?tax_year=2025&company_id=1&type=irp5
 * GET /api/irp5_xml.php?tax_year=2025&company_id=1&type=emp501
 *
 * Spec: SARS PAYE BRS (Business Requirement Specification)
 *       Annual employer reconciliation XML format
 */
require_once 'config.php';

set_cors_headers();

$conn    = get_db_connection();
$session = validate_session($conn);
if (!$session && !validate_api_key()) {
    header('Content-Type: application/json');
    json_response(['error' => 'Unauthorized.'], 401);
}

$taxYear   = intval($_GET['tax_year'] ?? date('Y'));
$companyId = intval($_GET['company_id'] ?? 0);
$type      = $_GET['type'] ?? 'irp5'; // irp5 | emp501

if (!$taxYear || !$companyId) {
    header('Content-Type: application/json');
    json_response(['error' => 'tax_year and company_id are required.'], 400);
}

// Load data
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
    json_response(['error' => "Company not found."], 404);
}

// Aggregate payslips for the tax year (March to February)
$yearStart = ($taxYear - 1) . '-03-01';
$yearEnd   = $taxYear . '-02-28';

// Get all runs for this company in this tax year
$runs = array_filter($db['payrollRuns'] ?? [], function($r) use ($companyId, $taxYear) {
    if ($r['companyId'] != $companyId) return false;
    if ($r['status'] !== 'Finalized') return false;
    return true;
});

// Aggregate per employee
$empTotals = [];
foreach ($db['payslips'] ?? [] as $slip) {
    $runId = $slip['runId'];
    // Find matching run
    $matchRun = null;
    foreach ($runs as $r) {
        if ($r['id'] === $runId) { $matchRun = $r; break; }
    }
    if (!$matchRun) continue;

    $empId = $slip['employeeId'] ?? $slip['id'] ?? 0;
    if (!isset($empTotals[$empId])) {
        $empTotals[$empId] = ['gross' => 0, 'paye' => 0, 'uif' => 0, 'pension' => 0, 'medical' => 0, 'net' => 0, 'sdl' => 0];
    }
    $empTotals[$empId]['gross']   += floatval($slip['gross']   ?? 0);
    $empTotals[$empId]['paye']    += floatval($slip['paye']    ?? 0);
    $empTotals[$empId]['uif']     += floatval($slip['uif']     ?? 0);
    $empTotals[$empId]['pension'] += floatval($slip['pension'] ?? 0);
    $empTotals[$empId]['medical'] += floatval($slip['medical'] ?? 0);
    $empTotals[$empId]['net']     += floatval($slip['net']     ?? 0);
    $empTotals[$empId]['sdl']     += floatval($slip['sdl']     ?? 0);
}

function xml_val(float $v): string { return number_format($v, 2, '.', ''); }
function xml_str(string $v): string { return htmlspecialchars(trim($v), ENT_XML1, 'UTF-8'); }
function xml_date(string $d): string { return preg_replace('/[^0-9\-]/', '', $d); }

$now      = date('c');
$taxYearStr = ($taxYear - 1) . '/' . $taxYear;

// ── EMP501 — Employer Reconciliation ─────────────────────────
if ($type === 'emp501') {
    $totalGross = array_sum(array_column($empTotals, 'gross'));
    $totalPAYE  = array_sum(array_column($empTotals, 'paye'));
    $totalUIF   = array_sum(array_column($empTotals, 'uif'));
    $totalSDL   = array_sum(array_column($empTotals, 'sdl'));
    $empCount   = count($empTotals);

    $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<EMP501 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' . "\n";
    $xml .= '  xsi:noNamespaceSchemaLocation="EMP501_v2_0.xsd">' . "\n";
    $xml .= '  <Header>' . "\n";
    $xml .= '    <TaxYear>' . $taxYearStr . '</TaxYear>' . "\n";
    $xml .= '    <SubmissionDate>' . date('Y-m-d') . '</SubmissionDate>' . "\n";
    $xml .= '    <Software>NexaHR-Payroll-v2</Software>' . "\n";
    $xml .= '  </Header>' . "\n";
    $xml .= '  <EmployerDetails>' . "\n";
    $xml .= '    <TradingName>' . xml_str($company['name']) . '</TradingName>' . "\n";
    $xml .= '    <PAYERef>' . xml_str($company['taxReference'] ?? '') . '</PAYERef>' . "\n";
    $xml .= '    <UIFRef>'  . xml_str($company['uifNumber'] ?? '')    . '</UIFRef>' . "\n";
    $xml .= '    <SDLRef>'  . xml_str($company['sdlNumber'] ?? '')    . '</SDLRef>' . "\n";
    $xml .= '    <Address>' . xml_str($company['address'] ?? '')      . '</Address>' . "\n";
    $xml .= '  </EmployerDetails>' . "\n";
    $xml .= '  <Reconciliation>' . "\n";
    $xml .= '    <TotalEmployees>'      . $empCount                       . '</TotalEmployees>' . "\n";
    $xml .= '    <TotalGrossRemuneration>' . xml_val($totalGross)         . '</TotalGrossRemuneration>' . "\n";
    $xml .= '    <TotalPAYEDeducted>'   . xml_val($totalPAYE)            . '</TotalPAYEDeducted>' . "\n";
    $xml .= '    <TotalUIF>'            . xml_val($totalUIF * 2)         . '</TotalUIF>' . "\n";
    $xml .= '    <TotalSDL>'            . xml_val($totalSDL)             . '</TotalSDL>' . "\n";
    $xml .= '    <TotalLiability>'      . xml_val($totalPAYE + $totalUIF * 2 + $totalSDL) . '</TotalLiability>' . "\n";
    $xml .= '  </Reconciliation>' . "\n";
    $xml .= '</EMP501>' . "\n";

    $filename = 'EMP501_' . $company['name'] . '_TaxYear' . $taxYear . '.xml';
    $filename = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $filename);

    audit_log($conn, $session['username'], 'EMP501_EXPORT', 'TaxCompliance', [
        'tax_year' => $taxYear, 'company_id' => $companyId
    ]);

    header('Content-Type: application/xml; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    ob_clean(); flush();
    echo $xml;
    $conn->close();
    exit;
}

// ── IRP5 — Individual Tax Certificates ───────────────────────
$xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
$xml .= '<IRP5Certificates xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' . "\n";
$xml .= '  <SubmissionInfo>' . "\n";
$xml .= '    <TaxYear>' . $taxYearStr . '</TaxYear>' . "\n";
$xml .= '    <DateCreated>' . date('Y-m-d') . '</DateCreated>' . "\n";
$xml .= '    <CreatedBy>NexaHR-Payroll-v2</CreatedBy>' . "\n";
$xml .= '  </SubmissionInfo>' . "\n";
$xml .= '  <Employer>' . "\n";
$xml .= '    <Name>'    . xml_str($company['name'])           . '</Name>' . "\n";
$xml .= '    <PAYERef>' . xml_str($company['taxReference'] ?? '') . '</PAYERef>' . "\n";
$xml .= '    <UIFRef>'  . xml_str($company['uifNumber'] ?? '')    . '</UIFRef>' . "\n";
$xml .= '  </Employer>' . "\n";
$xml .= '  <Certificates>' . "\n";

$certNum = 1;
foreach ($empTotals as $empId => $totals) {
    $emp = null;
    foreach ($db['employees'] as $e) {
        if ($e['id'] == $empId) { $emp = $e; break; }
    }
    if (!$emp) continue;

    $certType  = $totals['paye'] > 0 ? 'IRP5' : 'IT3a';
    $certRef   = 'IRP5-' . $taxYear . '-' . str_pad($certNum, 4, '0', STR_PAD_LEFT);
    $isActive  = ($emp['status'] ?? '') === 'Active';

    $xml .= '    <Certificate>' . "\n";
    $xml .= '      <CertNumber>'    . xml_str($certRef)                         . '</CertNumber>' . "\n";
    $xml .= '      <Type>'          . $certType                                 . '</Type>' . "\n";
    $xml .= '      <Employee>' . "\n";
    $xml .= '        <Surname>'     . xml_str($emp['lastName'] ?? '')            . '</Surname>' . "\n";
    $xml .= '        <FirstNames>'  . xml_str($emp['firstName'] ?? '')           . '</FirstNames>' . "\n";
    $xml .= '        <IDNumber>'    . xml_str(preg_replace('/\s/','',$emp['idNumber'] ?? '')) . '</IDNumber>' . "\n";
    $xml .= '        <TaxNumber>'   . xml_str($emp['taxNumber'] ?? '')           . '</TaxNumber>' . "\n";
    $xml .= '        <DateOfBirth>' . xml_date($emp['dateOfBirth'] ?? '')        . '</DateOfBirth>' . "\n";
    $xml .= '        <Gender>'      . xml_str($emp['gender'] ?? '')              . '</Gender>' . "\n";
    $xml .= '        <Address>'     . xml_str($emp['address'] ?? '')             . '</Address>' . "\n";
    $xml .= '        <Email>'       . xml_str($emp['email'] ?? '')               . '</Email>' . "\n";
    $xml .= '      </Employee>' . "\n";
    $xml .= '      <Employment>' . "\n";
    $xml .= '        <StartDate>'   . xml_date($emp['hireDate'] ?? '')            . '</StartDate>' . "\n";
    $xml .= '        <EndDate>'     . (!$isActive ? xml_date($emp['terminationDate'] ?? '') : '') . '</EndDate>' . "\n";
    $xml .= '        <NatureOfPerson>A</NatureOfPerson>' . "\n"; // A = Employee
    $xml .= '      </Employment>' . "\n";
    $xml .= '      <IncomeAndDeductions>' . "\n";
    // SARS income codes
    $xml .= '        <Income3601>'  . xml_val($emp['basicSalary'] ?? $totals['gross'] * 0.9) . '</Income3601>' . "\n"; // Salary
    $xml .= '        <Income3701>'  . xml_val($totals['gross'] - ($emp['basicSalary'] ?? $totals['gross'] * 0.9)) . '</Income3701>' . "\n"; // Allowances
    $xml .= '        <TotalIncome>' . xml_val($totals['gross'])                 . '</TotalIncome>' . "\n";
    $xml .= '        <Deduction4001>' . xml_val($totals['pension'])             . '</Deduction4001>' . "\n"; // Retirement
    $xml .= '        <Deduction4005>' . xml_val($totals['medical'])             . '</Deduction4005>' . "\n"; // Medical
    $xml .= '        <Deduction4102>' . xml_val($totals['paye'])                . '</Deduction4102>' . "\n"; // PAYE
    $xml .= '        <Deduction4141>' . xml_val($totals['uif'])                 . '</Deduction4141>' . "\n"; // UIF employee
    $xml .= '        <TaxableIncome>' . xml_val($totals['gross'] - $totals['pension']) . '</TaxableIncome>' . "\n";
    $xml .= '        <TaxDeducted>'   . xml_val($totals['paye'])                . '</TaxDeducted>' . "\n";
    $xml .= '      </IncomeAndDeductions>' . "\n";
    $xml .= '    </Certificate>' . "\n";
    $certNum++;
}

$xml .= '  </Certificates>' . "\n";
$xml .= '</IRP5Certificates>' . "\n";

$filename = 'IRP5_' . $company['name'] . '_TaxYear' . $taxYear . '.xml';
$filename = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $filename);

audit_log($conn, $session['username'], 'IRP5_EXPORT', 'TaxCompliance', [
    'tax_year' => $taxYear, 'company_id' => $companyId, 'certificates' => $certNum - 1
]);

header('Content-Type: application/xml; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
ob_clean(); flush();
echo $xml;
$conn->close();
