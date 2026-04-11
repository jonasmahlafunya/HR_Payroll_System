<?php
/**
 * Nexa HR & Payroll — Payslip PDF/HTML Generator
 * GET /api/payslip_pdf.php?employee_id=X,Y&run_id=Y&format=html|pdf
 *
 * FIXED: Removed MySQLi API calls (real_escape_string, close()).
 *        Uses PDO exclusively. Expanded payslip to show all earning/deduction lines.
 */
// Load Composer autoloader (provides Dompdf and other vendor packages)
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

require_once __DIR__ . '/config.php';
set_cors_headers();

try {
    $pdo = get_db_connection();
    ensure_all_tables($pdo);
} catch (Throwable $e) {
    http_response_code(503);
    exit('Database unavailable.');
}

$session = validate_session($pdo);
if (!$session && !validate_api_key()) {
    http_response_code(401);
    exit('Unauthorized.');
}

// ── Parameters ─────────────────────────────────────────────────
$rawIds = trim($_GET['employee_id'] ?? '');
$empIds = array_filter(array_map('intval', explode(',', $rawIds)));
// FIXED: no more $pdo->real_escape_string() — use PDO prepared statements for all queries
$runId  = trim($_GET['run_id'] ?? '');
$format = in_array($_GET['format'] ?? '', ['pdf', 'html']) ? $_GET['format'] : 'html';

if (empty($empIds) || !$runId) {
    http_response_code(400);
    exit('Missing or invalid employee_id / run_id parameters.');
}

// Sanitise runId for use in file names only (never interpolated into SQL)
$safeRunIdFileName = preg_replace('/[^A-Za-z0-9_\-]/', '', $runId);

// ── Load state blob (PDO prepared statement) ──────────────────
try {
    $stmt = $pdo->prepare("SELECT data_blob FROM system_storage WHERE key_name = ?");
    $stmt->execute(['hrpms_main_state']);
    $row = $stmt->fetch();
} catch (Throwable $e) {
    debug_log("payslip_pdf: DB query failed: " . $e->getMessage());
    http_response_code(503);
    exit('Database error loading state.');
}

if (!$row || empty($row['data_blob'])) {
    http_response_code(404);
    exit('System data not found. Please sync the application first.');
}

$db = json_decode($row['data_blob'], true);
if (!is_array($db)) {
    http_response_code(500);
    exit('System data is corrupted.');
}

// ─────────────────────────────────────────────────────────────────────────────
class PayslipRenderer
{
    /**
     * Render a full payslip for one employee within a payroll run.
     * Includes all earning and deduction line items.
     */
    public static function render(array $db, int $empId, string $runId): string
    {
        // Find payslip line
        $line = null;
        foreach (($db['payslips'] ?? []) as $p) {
            if ($p['runId'] === $runId && ((int)($p['employeeId'] ?? 0)) === $empId) {
                $line = $p;
                break;
            }
        }
        if (!$line) {
            return "<!-- Payslip not found for Employee ID {$empId} in run {$runId} -->";
        }

        // Find employee
        $emp = null;
        foreach (($db['employees'] ?? []) as $e) {
            if ((int)$e['id'] === $empId) { $emp = $e; break; }
        }
        if (!$emp) {
            return "<!-- Employee {$empId} not found in system data -->";
        }

        // Find payroll run
        $run = null;
        foreach (($db['payrollRuns'] ?? []) as $r) {
            if ($r['id'] === $runId) { $run = $r; break; }
        }

        // Find company
        $comp = null;
        if ($run) {
            foreach (($db['companies'] ?? []) as $c) {
                if ((int)($c['id'] ?? 0) === (int)($run['companyId'] ?? 0)) {
                    $comp = $c;
                    break;
                }
            }
        }
        if (!$comp) {
            $comp = ['name' => $db['settings']['companyName'] ?? 'Company'];
        }

        // ── Financial figures ──────────────────────────────────
        $basic      = floatval($line['basic']           ?? 0);
        $gross      = floatval($line['gross']           ?? 0);
        $paye       = floatval($line['paye']            ?? 0);
        $uif        = floatval($line['uif']             ?? 0);
        $net        = floatval($line['net']             ?? 0);
        $bonus      = floatval($line['bonus']           ?? 0);
        $otPay      = floatval($line['otPay']           ?? 0);
        $phPay      = floatval($line['phPay']           ?? 0);
        $medical    = floatval($line['medical']         ?? 0);
        $pension    = floatval($line['pension']         ?? 0);
        $garnishee  = floatval($line['garnishee']       ?? 0);
        $otherDed   = floatval($line['otherDeductions'] ?? 0);
        $period     = htmlspecialchars($line['period'] ?? ($run['period'] ?? 'N/A'), ENT_QUOTES, 'UTF-8');

        // Custom benefits (allowances & deductions)
        $customBenefits = $line['customBenefits'] ?? [];
        $allowanceLines = array_filter($customBenefits, fn($b) => ($b['type'] ?? '') === 'Allowance');
        $deductionLines = array_filter($customBenefits, fn($b) => in_array($b['type'] ?? '', ['Deduction', 'Reimbursement']));

        // ── Earnings section rows ──────────────────────────────
        $earningRows = '';

        $earningRows .= self::row('Basic Salary', $basic, 'earning');
        if ($bonus > 0)  $earningRows .= self::row('Bonus',                      $bonus, 'earning');
        if ($otPay > 0)  $earningRows .= self::row('Overtime Pay',               $otPay, 'earning');
        if ($phPay > 0)  $earningRows .= self::row('Public Holiday Pay',         $phPay, 'earning');
        foreach ($allowanceLines as $b) {
            $val = self::calcBenefitValue($b, $basic);
            if ($val > 0) $earningRows .= self::row(htmlspecialchars($b['name'] ?? 'Allowance', ENT_QUOTES), $val, 'earning');
        }

        // ── Deductions section rows ────────────────────────────
        $deductionRows = '';
        $deductionRows .= self::row('PAYE Tax',         $paye,      'deduction');
        $deductionRows .= self::row('UIF (Employee)',   $uif,       'deduction');
        if ($medical   > 0) $deductionRows .= self::row('Medical Aid',        $medical,   'deduction');
        if ($pension   > 0) $deductionRows .= self::row('Pension / Provident', $pension,  'deduction');
        if ($garnishee > 0) $deductionRows .= self::row('Garnishee Order',    $garnishee, 'deduction');
        foreach ($deductionLines as $b) {
            $val = self::calcBenefitValue($b, $basic);
            if ($val > 0) $deductionRows .= self::row(htmlspecialchars($b['name'] ?? 'Deduction', ENT_QUOTES), $val, 'deduction');
        }

        $totalDeductions = $paye + $uif + $medical + $pension + $garnishee + $otherDed;

        // Employee name / details (htmlspecialchars everything)
        $empName       = htmlspecialchars(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''), ENT_QUOTES, 'UTF-8');
        $empId_str     = htmlspecialchars($emp['idNumber'] ?? '—', ENT_QUOTES, 'UTF-8');
        $empNo         = htmlspecialchars($emp['employeeNumber'] ?? (string)$emp['id'], ENT_QUOTES, 'UTF-8');
        $empPos        = htmlspecialchars($emp['position'] ?? '—', ENT_QUOTES, 'UTF-8');
        $empBank       = htmlspecialchars($emp['bankName'] ?? '—', ENT_QUOTES, 'UTF-8');
        $empAcc        = htmlspecialchars(substr($emp['accountNumber'] ?? '0000', -4), ENT_QUOTES, 'UTF-8');
        $compName      = htmlspecialchars($comp['name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $compReg       = htmlspecialchars($comp['registrationNumber'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $compTax       = htmlspecialchars($comp['taxReference'] ?? '—', ENT_QUOTES, 'UTF-8');
        $runIdSafe     = htmlspecialchars($runId, ENT_QUOTES, 'UTF-8');

        ob_start();
        ?>
        <div class="payslip-container" style="page-break-after:always;font-family:'Segoe UI',Arial,sans-serif;
             padding:40px;color:#1e293b;max-width:800px;margin:0 auto;">

            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;
                        border-bottom:3px solid #0B1D3A;padding-bottom:20px;margin-bottom:24px;">
                <div>
                    <h2 style="margin:0;color:#0B1D3A;font-size:1.4rem;"><?= $compName ?></h2>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">
                        Reg: <?= $compReg ?> &bull; Tax Ref: <?= $compTax ?>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#F59E0B;
                                text-transform:uppercase;margin-bottom:4px;">PAYSLIP</div>
                    <div style="font-size:1.1rem;font-weight:800;color:#0B1D3A;"><?= $period ?></div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Ref: <?= $runIdSafe ?></div>
                </div>
            </div>

            <!-- Employee Details -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;
                        background:#f8fafc;padding:16px 20px;border-radius:8px;margin-bottom:24px;
                        border:1px solid #e2e8f0;">
                <div>
                    <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Employee</div>
                    <div style="font-weight:700;font-size:1rem;"><?= $empName ?></div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;"><?= $empPos ?></div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:11px;color:#64748b;">
                        <strong>ID Number:</strong> <?= $empId_str ?><br>
                        <strong>Employee No:</strong> <?= $empNo ?>
                    </div>
                </div>
                <div>
                    <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Bank Details</div>
                    <div style="font-size:12px;color:#334155;">
                        <?= $empBank ?> &bull; Account: ****<?= $empAcc ?>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:2px;">Pay Date</div>
                    <div style="font-size:12px;color:#334155;"><?= htmlspecialchars($run['runDate'] ?? date('Y-m-d'), ENT_QUOTES) ?></div>
                </div>
            </div>

            <!-- Earnings & Deductions Table -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
                <thead>
                    <tr style="background:#0B1D3A;color:white;">
                        <th style="padding:10px 12px;text-align:left;border-radius:6px 0 0 0;">Description</th>
                        <th style="padding:10px 12px;text-align:right;color:#86efac;">Earnings (R)</th>
                        <th style="padding:10px 12px;text-align:right;border-radius:0 6px 0 0;color:#fca5a5;">Deductions (R)</th>
                    </tr>
                </thead>
                <tbody>
                    <?= $earningRows ?>
                    <?= $deductionRows ?>
                </tbody>
                <tfoot>
                    <tr style="background:#f1f5f9;font-weight:700;border-top:2px solid #0B1D3A;">
                        <td style="padding:12px;">TOTALS</td>
                        <td style="padding:12px;text-align:right;color:#16a34a;">
                            R <?= number_format($gross, 2) ?>
                        </td>
                        <td style="padding:12px;text-align:right;color:#dc2626;">
                            R <?= number_format($totalDeductions, 2) ?>
                        </td>
                    </tr>
                </tfoot>
            </table>

            <!-- Net Pay Banner -->
            <div style="background:#0B1D3A;color:white;padding:20px 28px;border-radius:12px;
                        display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div>
                    <div style="font-size:11px;opacity:0.6;text-transform:uppercase;letter-spacing:1px;">
                        Net Pay to Bank Account
                    </div>
                    <div style="font-size:11px;opacity:0.5;margin-top:2px;">
                        <?= $empBank ?> ****<?= $empAcc ?>
                    </div>
                </div>
                <div style="font-size:2rem;font-weight:900;color:#F59E0B;">
                    R <?= number_format($net, 2) ?>
                </div>
            </div>

            <!-- Employer Contributions Note -->
            <?php
            $sdl = floatval($line['sdl'] ?? 0);
            if ($sdl > 0): ?>
            <div style="font-size:11px;color:#64748b;background:#f8fafc;padding:12px 16px;
                        border-radius:6px;border:1px solid #e2e8f0;margin-bottom:16px;">
                <strong>Employer Contributions (not deducted from your salary):</strong>
                UIF (Employer): R <?= number_format($uif, 2) ?> &bull;
                SDL: R <?= number_format($sdl, 2) ?>
            </div>
            <?php endif; ?>

            <!-- Footer -->
            <div style="margin-top:20px;text-align:center;font-size:10px;color:#94a3b8;
                        border-top:1px solid #e2e8f0;padding-top:16px;">
                This payslip is generated electronically by Nexa HR &amp; Payroll and is valid without a signature.
                &bull; Confidential &bull; <?= date('Y') ?> &copy; Nexa Systems
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /** Render a single earnings or deductions table row */
    private static function row(string $label, float $amount, string $type): string
    {
        if ($type === 'earning') {
            return "<tr style='border-bottom:1px solid #f1f5f9;'>
                <td style='padding:8px 12px;'>{$label}</td>
                <td style='padding:8px 12px;text-align:right;color:#16a34a;'>R " . number_format($amount, 2) . "</td>
                <td style='padding:8px 12px;'>&nbsp;</td>
            </tr>";
        }
        return "<tr style='border-bottom:1px solid #f1f5f9;'>
            <td style='padding:8px 12px;'>{$label}</td>
            <td style='padding:8px 12px;'>&nbsp;</td>
            <td style='padding:8px 12px;text-align:right;color:#dc2626;'>R " . number_format($amount, 2) . "</td>
        </tr>";
    }

    /** Calculate a benefit's rand value based on its configuration */
    private static function calcBenefitValue(array $b, float $basic): float
    {
        $calc = $b['calc'] ?? $b['calculation'] ?? 'Fixed';
        $val  = floatval($b['value'] ?? 0);
        return ($calc === 'Percentage') ? ($basic * $val / 100) : $val;
    }
}

// ── Render all requested employee payslips ────────────────────
$html  = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">';
$html .= '<meta name="viewport" content="width=device-width,initial-scale=1">';
$html .= '<title>Payslips — Nexa HR &amp; Payroll</title>';
$html .= '<style>
    @media print { .payslip-container { page-break-after: always; } body { margin: 0; } }
    body { margin: 0; padding: 20px; background: #f0f4f8; }
    .payslip-container { margin-bottom: 32px; background: white;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 12px; }
</style></head><body>';

foreach ($empIds as $id) {
    $html .= PayslipRenderer::render($db, $id, $runId);
}
$html .= '</body></html>';

// ── Output ─────────────────────────────────────────────────────
if ($format === 'pdf') {
    if (class_exists('Dompdf\Dompdf')) {
        $dompdf = new \Dompdf\Dompdf(['isRemoteEnabled' => true]);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        $dompdf->stream("payslips_{$safeRunIdFileName}.pdf", ['Attachment' => true]);
        exit;
    }
    // Fallback — serve HTML with print trigger when DomPDF is unavailable
    header('Content-Type: text/html; charset=UTF-8');
    echo "<!-- DomPDF not found. Serving HTML print view -->";
    echo $html;
    echo "<script>window.onload = function() { window.print(); };</script>";
    exit;
}

// Default: HTML output
header('Content-Type: text/html; charset=UTF-8');
echo $html;
// FIXED: $pdo is a PDO object — PDO has no close() method; connection released when $pdo goes out of scope
