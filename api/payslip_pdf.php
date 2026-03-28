<?php
/**
 * Nexa HR & Payroll — Payslip PDF Generator
 * GET /api/payslip_pdf.php?employee_id=X&run_id=Y&format=pdf
 */
require_once 'config.php';
set_cors_headers();

$conn = get_db_connection();
$session = validate_session($conn);
if (!$session && !validate_api_key()) {
    http_response_code(401);
    exit('Unauthorized.');
}

// ── Params ────────────────────────────────────────────────────
$empIds = explode(',', $_GET['employee_id'] ?? '');
$runId  = $conn->real_escape_string($_GET['run_id'] ?? '');
$format = $_GET['format'] ?? 'html'; // 'html' or 'pdf'

if (empty($empIds) || !$runId) {
    http_response_code(400); exit('Missing employee_id or run_id.');
}

// ── Load state ───────────────────────────────────────────────
$result = $conn->query("SELECT data_blob FROM system_storage WHERE key_name='hrpms_main_state'");
$db = ($result && ($row = $result->fetch_assoc())) ? json_decode($row['data_blob'], true) : [];
if (empty($db)) { http_response_code(404); exit('System data not found.'); }

class PayslipRenderer {
    public static function render(array $db, int $empId, string $runId): string {
        $line = null;
        foreach (($db['payslips'] ?? []) as $p) {
            if ($p['runId'] === $runId && ($p['employeeId'] ?? $p['id'] ?? 0) == $empId) {
                $line = $p; break;
            }
        }
        if (!$line) return "<!-- Payslip not found for Emp $empId -->";

        $emp = null;
        foreach (($db['employees'] ?? []) as $e) {
            if ($e['id'] == $empId) { $emp = $e; break; }
        }
        if (!$emp) return "<!-- Employee not found $empId -->";

        $run = null;
        foreach (($db['payrollRuns'] ?? []) as $r) {
            if ($r['id'] === $runId) { $run = $r; break; }
        }
        
        $comp = null;
        if ($run) {
            foreach (($db['companies'] ?? []) as $c) {
                if ($c['id'] == ($run['companyId'] ?? 0)) { $comp = $c; break; }
            }
        }
        if (!$comp) $comp = ['name' => $db['settings']['companyName'] ?? 'Company'];

        // Figures
        $basic = floatval($line['basic'] ?? 0);
        $gross = floatval($line['gross'] ?? 0);
        $paye  = floatval($line['paye'] ?? 0);
        $uif   = floatval($line['uif'] ?? 0);
        $net   = floatval($line['net'] ?? 0);
        $period = $line['period'] ?? ($run['period'] ?? 'N/A');

        ob_start();
        ?>
        <div class="payslip-container" style="page-break-after: always; font-family: sans-serif; padding: 40px; color: #1e293b;">
            <div style="display: flex; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                   <h2 style="margin: 0; color: #4f46e5;"><?= htmlspecialchars($comp['name']) ?></h2>
                   <div style="font-size: 12px; color: #64748b;">Reg: <?= htmlspecialchars($comp['registrationNumber'] ?? 'N/A') ?></div>
                </div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 24px;">PAYSLIP</h1>
                    <div style="font-weight: bold;"><?= htmlspecialchars($period) ?></div>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr;">
                <div>
                    <strong>Employee:</strong> <?= htmlspecialchars($emp['firstName'] . ' ' . $emp['lastName']) ?><br>
                    <strong>ID:</strong> <?= htmlspecialchars($emp['idNumber'] ?? '—') ?><br>
                    <strong>Employee No:</strong> <?= htmlspecialchars($emp['employeeNumber'] ?? $emp['id']) ?>
                </div>
                <div style="text-align: right;">
                    <strong>Position:</strong> <?= htmlspecialchars($emp['position'] ?? '—') ?><br>
                    <strong>Bank:</strong> <?= htmlspecialchars($emp['bankName'] ?? '—') ?><br>
                    <strong>Account:</strong> ****<?= substr($emp['accountNumber'] ?? '0000', -4) ?>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                        <th style="padding: 10px 0;">Description</th>
                        <th style="text-align: right; padding: 10px 0;">Earnings</th>
                        <th style="text-align: right; padding: 10px 0;">Deductions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px 0;">Basic Salary</td>
                        <td style="text-align: right;">R <?= number_format($basic, 2) ?></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;">PAYE Tax</td>
                        <td></td>
                        <td style="text-align: right; color: #dc2626;">R <?= number_format($paye, 2) ?></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;">UIF (Employee)</td>
                        <td></td>
                        <td style="text-align: right; color: #dc2626;">R <?= number_format($uif, 2) ?></td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #e2e8f0; font-weight: bold;">
                        <td style="padding: 10px 0;">Totals</td>
                        <td style="text-align: right;">R <?= number_format($gross, 2) ?></td>
                        <td style="text-align: right;">R <?= number_format($paye + $uif, 2) ?></td>
                    </tr>
                </tfoot>
            </table>

            <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 12px; text-align: right;">
                <div style="font-size: 14px; opacity: 0.8;">NET PAY TO ACCOUNT</div>
                <div style="font-size: 32px; font-weight: 800;">R <?= number_format($net, 2) ?></div>
            </div>

            <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                This payslip is generated electronically by Nexa HR & Payroll. Ref: <?= htmlspecialchars($runId) ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

$html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payslips</title></head><body>';
foreach ($empIds as $id) {
    if (!$id) continue;
    $html .= PayslipRenderer::render($db, intval($id), $runId);
}
$html .= '</body></html>';

if ($format === 'pdf') {
    // Check for DomPDF
    if (class_exists('Dompdf\Dompdf')) {
        $dompdf = new Dompdf\Dompdf(['isRemoteEnabled' => true]);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        $dompdf->stream("payslips_{$runId}.pdf", ["Attachment" => true]);
        exit;
    } else {
        // Fallback: Send HTML but with a header suggesting it's for printing
        header('Content-Type: text/html');
        echo "<!-- Dompdf not found. Defaulting to HTML Print View -->";
        echo $html;
        echo "<script>window.onload = function() { window.print(); }</script>";
        exit;
    }
}

echo $html;
$conn->close();
