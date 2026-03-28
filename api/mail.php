<?php
/**
 * Nexa HR & Payroll — Payroll Approval Email
 * POST /api/mail.php
 *
 * Body fields:
 *   companyEmail   string  — recipient
 *   companyName    string
 *   period         string
 *   totalNet       string  — formatted currency string
 *   totalGross     string
 *   totalPAYE      string
 *   notes          string  (optional)
 *   employees      array   — [{employeeName, gross, paye, uif, pension, medical, net}]
 *   runId          string  — payroll run ID
 *   approvalToken  string  — secure token for approve.php
 *   approvalUrl    string  — full URL to approve.php
 */

// ── Gmail credentials ─────────────────────────────────────────────────────────
define('GMAIL_USER', 'deepquesa@gmail.com');
define('GMAIL_PASS', 'jyjr ouev vzne ejhu'); // 16-char App Password
define('GMAIL_NAME', 'Nexa HR');
// ─────────────────────────────────────────────────────────────────────────────

ob_start();
header('Content-Type: application/json');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token, X-API-Key');
header('Access-Control-Allow-Credentials: true');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    ob_end_clean();
    http_response_code(204);
    exit;
}

function mail_finish(array $payload, int $code): void {
    $stray = ob_get_clean();
    if ($stray) $payload['_php_output'] = substr($stray, 0, 500);
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

// Load SMTP_PASS from .env if present
function load_env_pass(): string {
    foreach ([dirname(__DIR__) . '/.env', __DIR__ . '/.env'] as $path) {
        if (!file_exists($path)) continue;
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if (!$line || $line[0] === '#' || strpos($line, '=') === false) continue;
            [$k, $v] = explode('=', $line, 2);
            if (trim($k) === 'SMTP_PASS' && trim($v)) return trim($v);
        }
        break;
    }
    return '';
}

$envPass  = load_env_pass();
$smtpPass = str_replace(' ', '', $envPass ?: GMAIL_PASS);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    mail_finish(['error' => 'POST only.'], 405);
}

$raw  = file_get_contents('php://input') ?: '{}';
$body = json_decode($raw, true);
if (!is_array($body)) mail_finish(['error' => 'Invalid JSON body.'], 400);

// Validate recipient
$to = filter_var(trim($body['companyEmail'] ?? ''), FILTER_VALIDATE_EMAIL);
if (!$to) mail_finish(['error' => 'No valid recipient email. Please add an email address to the company record first.'], 400);

// Sanitise inputs
$companyName  = strip_tags(trim($body['companyName']  ?? 'Your Company'));
$period       = strip_tags(trim($body['period']       ?? ''));
$totalNet     = strip_tags(trim($body['totalNet']     ?? 'R 0.00'));
$totalGross   = strip_tags(trim($body['totalGross']   ?? 'R 0.00'));
$totalPAYE    = strip_tags(trim($body['totalPAYE']    ?? 'R 0.00'));
$totalUIF     = strip_tags(trim($body['totalUIF']     ?? 'R 0.00'));
$totalPension = strip_tags(trim($body['totalPension'] ?? 'R 0.00'));
$totalSDL     = strip_tags(trim($body['totalSDL']     ?? 'R 0.00'));
$notes        = strip_tags(trim($body['notes']        ?? ''));
$approvalUrl  = trim($body['approvalUrl']             ?? '');
$employees    = $body['employees'] ?? [];

if (!$smtpPass) {
    mail_finish(['error' => 'Gmail App Password not configured in api/mail.php or .env.'], 500);
}

// ── Build HTML email ──────────────────────────────────────────────────────────
$cn  = htmlspecialchars($companyName);
$pe  = htmlspecialchars($period);
$tn  = htmlspecialchars($totalNet);
$tg  = htmlspecialchars($totalGross);
$tp  = htmlspecialchars($totalPAYE);

// Approve button block
$approveBlock = '';
if ($approvalUrl) {
    $safeUrl = htmlspecialchars($approvalUrl, ENT_QUOTES);
    $approveBlock = '
      <tr><td style="padding:24px 32px 0;text-align:center;">
        <a href="' . $safeUrl . '" style="display:inline-block;background:#059669;color:#ffffff;
           font-size:16px;font-weight:700;padding:14px 40px;border-radius:8px;
           text-decoration:none;letter-spacing:0.3px;">
          ✓ &nbsp; Approve Payroll
        </a>
        <p style="font-size:11px;color:#94a3b8;margin-top:10px;">
          Click the button above to approve. This link is unique and secure.
        </p>
      </td></tr>';
}

// Notes block
$notesBlock = '';
if ($notes) {
    $notesBlock = '
      <tr><td style="padding:0 32px;">
        <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;
             padding:14px 18px;font-size:13px;color:#713f12;">
          <strong>Notes from Payroll Admin:</strong><br>' . nl2br(htmlspecialchars($notes)) . '
        </div>
      </td></tr>';
}

// Employee table
$empRows = '';
if (!empty($employees)) {
    foreach ($employees as $emp) {
        $name    = htmlspecialchars($emp['employeeName'] ?? $emp['name'] ?? '—');
        $gross   = 'R ' . number_format((float)($emp['gross']   ?? 0), 2, '.', ',');
        $paye    = 'R ' . number_format((float)($emp['paye']    ?? 0), 2, '.', ',');
        $uif     = 'R ' . number_format((float)($emp['uif']     ?? 0), 2, '.', ',');
        $pension = 'R ' . number_format((float)($emp['pension'] ?? 0), 2, '.', ',');
        $medical = 'R ' . number_format((float)($emp['medical'] ?? 0), 2, '.', ',');
        $net     = 'R ' . number_format((float)($emp['net']     ?? 0), 2, '.', ',');

        $empRows .= "
          <tr style='border-bottom:1px solid #f1f5f9;'>
            <td style='padding:8px 10px;font-size:12px;color:#1e293b;font-weight:500;'>{$name}</td>
            <td style='padding:8px 10px;font-size:12px;color:#1e293b;text-align:right;'>{$gross}</td>
            <td style='padding:8px 10px;font-size:12px;color:#dc2626;text-align:right;'>{$paye}</td>
            <td style='padding:8px 10px;font-size:12px;color:#dc2626;text-align:right;'>{$uif}</td>
            <td style='padding:8px 10px;font-size:12px;color:#dc2626;text-align:right;'>{$pension}</td>
            <td style='padding:8px 10px;font-size:12px;color:#dc2626;text-align:right;'>{$medical}</td>
            <td style='padding:8px 10px;font-size:12px;color:#059669;text-align:right;font-weight:700;'>{$net}</td>
          </tr>";
    }
}

$empTableBlock = '';
if ($empRows) {
    $empTableBlock = '
      <tr><td style="padding:20px 32px 0;">
        <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:10px;
             text-transform:uppercase;letter-spacing:0.5px;">Employee Breakdown</div>
        <div style="overflow-x:auto;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 10px;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Employee</th>
              <th style="padding:8px 10px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Gross</th>
              <th style="padding:8px 10px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">PAYE</th>
              <th style="padding:8px 10px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">UIF</th>
              <th style="padding:8px 10px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Pension</th>
              <th style="padding:8px 10px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Medical</th>
              <th style="padding:8px 10px;font-size:11px;color:#059669;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Net Pay</th>
            </tr>
          </thead>
          <tbody>' . $empRows . '</tbody>
        </table>
        </div>
      </td></tr>';
}

$subject  = "Payroll Approval Required — {$companyName} ({$period})";
$htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 12px;">
<table width="640" cellpadding="0" cellspacing="0"
       style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:#4f46e5;padding:28px 32px;">
    <div style="font-size:22px;font-weight:800;color:#fff;">Payroll Approval Required</div>
    <div style="color:rgba(255,255,255,0.82);font-size:14px;margin-top:5px;">' . $cn . ' &mdash; ' . $pe . '</div>
  </td></tr>

  <!-- Approve button -->
  ' . $approveBlock . '

  <!-- Summary -->
  <tr><td style="padding:24px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Company</td>
            <td style="font-size:13px;font-weight:600;color:#1e293b;padding:5px 0;text-align:right;">' . $cn . '</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Pay Period</td>
            <td style="font-size:13px;font-weight:600;color:#1e293b;padding:5px 0;text-align:right;">' . $pe . '</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Total Employees</td>
            <td style="font-size:13px;font-weight:600;color:#1e293b;padding:5px 0;text-align:right;">' . count($employees) . '</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Total Gross Pay</td>
            <td style="font-size:13px;font-weight:600;color:#1e293b;padding:5px 0;text-align:right;">' . $tg . '</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Total PAYE</td>
            <td style="font-size:13px;font-weight:600;color:#dc2626;padding:5px 0;text-align:right;">' . $tp . '</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Total UIF</td>
            <td style="font-size:13px;font-weight:600;color:#dc2626;padding:5px 0;text-align:right;">' . htmlspecialchars($totalUIF) . '</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Total Pension</td>
            <td style="font-size:13px;font-weight:600;color:#dc2626;padding:5px 0;text-align:right;">' . htmlspecialchars($totalPension) . '</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:5px 0;">Total SDL</td>
            <td style="font-size:13px;font-weight:600;color:#dc2626;padding:5px 0;text-align:right;">' . htmlspecialchars($totalSDL) . '</td>
          </tr>
          <tr style="border-top:2px solid #e2e8f0;">
            <td style="font-size:16px;font-weight:700;color:#0f172a;padding:12px 0 5px;">Total Net Pay</td>
            <td style="font-size:26px;font-weight:800;color:#059669;padding:12px 0 5px;text-align:right;">' . $tn . '</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Notes -->
  ' . $notesBlock . '

  <!-- Body text -->
  <tr><td style="padding:20px 32px;">
    <p style="font-size:14px;color:#475569;line-height:1.7;margin:0;">
      A detailed payroll breakdown for <strong>' . $cn . '</strong> is attached to this email as a PDF.
      Please review the summary above and the attached breakdown before clicking <strong>Approve Payroll</strong>.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:14px 32px;text-align:center;
       font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
    Nexa HR &amp; Payroll &bull; Automated notification. Do not reply to this email.
  </td></tr>
</table>
</td></tr>
</table>
</body></html>';

$textBody  = "PAYROLL APPROVAL REQUIRED\n";
$textBody .= str_repeat('=', 40) . "\n";
$textBody .= "Company : {$companyName}\n";
$textBody .= "Period  : {$period}\n";
$textBody .= "Gross   : {$totalGross}\n";
$textBody .= "PAYE    : {$totalPAYE}\n";
$textBody .= "Net Pay : {$totalNet}\n\n";
$textBody .= "A detailed breakdown is attached as a PDF.\n\n";

if ($notes) $textBody .= "Notes: {$notes}\n\n";
if ($approvalUrl) $textBody .= "APPROVE PAYROLL:\n{$approvalUrl}\n";

$pdfBase64 = $body['pdfBase64'] ?? null;

// Send
$result = send_gmail_smtp($to, $subject, $htmlBody, $textBody, $smtpPass, $pdfBase64);

if ($result === true) {
    mail_finish(['status' => 'success', 'to' => $to], 200);
}

mail_finish([
    'error' => $result,
    'hint'  => 'Use a Gmail APP PASSWORD (16 chars). Get one at myaccount.google.com/apppasswords'
], 500);

// ─────────────────────────────────────────────────────────────────────────────
function send_gmail_smtp(string $to, string $subject, string $html, string $text, string $password, ?string $pdfBase64 = null): mixed {
    $host   = 'smtp.gmail.com';
    $port   = 587;
    $user   = GMAIL_USER;
    $from   = GMAIL_USER;
    $name   = GMAIL_NAME;

    $errno  = 0; $errstr = '';
    $socket = @fsockopen("tcp://{$host}", $port, $errno, $errstr, 20);
    if (!$socket) {
        return "Cannot connect to smtp.gmail.com:587 — {$errstr} ({$errno}). "
             . "Your host may block outbound SMTP.";
    }
    stream_set_timeout($socket, 20);

    $r = smtp_get($socket);
    if (substr($r, 0, 3) !== '220') { fclose($socket); return "Bad SMTP greeting: {$r}"; }

    smtp_put($socket, 'EHLO localhost');
    $r = smtp_put($socket, 'STARTTLS');
    if (substr($r, 0, 3) !== '220') { fclose($socket); return "STARTTLS rejected: {$r}"; }

    $crypto = defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')
            ? STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT
            : STREAM_CRYPTO_METHOD_TLS_CLIENT;

    if (!@stream_socket_enable_crypto($socket, true, $crypto)) {
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($socket); return 'TLS handshake failed. Ensure OpenSSL is enabled on your server.';
        }
    }

    $r = smtp_put($socket, 'EHLO localhost');
    smtp_put($socket, 'AUTH LOGIN');
    smtp_put($socket, base64_encode($user));
    $auth = smtp_put($socket, base64_encode($password));

    if (substr($auth, 0, 3) !== '235') {
        fclose($socket);
        return 'Gmail authentication failed: ' . trim($auth) . '. '
             . 'Ensure you are using a Gmail APP PASSWORD (not your regular password). '
             . 'Get one at myaccount.google.com/apppasswords';
    }

    smtp_put($socket, "MAIL FROM:<{$from}>");
    $rcpt = smtp_put($socket, "RCPT TO:<{$to}>");
    if (substr($rcpt, 0, 3) !== '250') { fclose($socket); return "Recipient rejected: {$rcpt}"; }

    smtp_put($socket, 'DATA');

    $mixedBoundary = 'MixedBoundary' . md5(uniqid('', true));
    $altBoundary   = 'AltBoundary'   . md5(uniqid('', true));
    
    $encFrom  = '=?UTF-8?B?' . base64_encode($name) . '?=';
    $encSubj  = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $headers  = "Date: " . date('r') . "\r\n";
    $headers .= "From: {$encFrom} <{$from}>\r\n";
    $headers .= "To: {$to}\r\n";
    $headers .= "Subject: {$encSubj}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"{$mixedBoundary}\"\r\n";
    $headers .= "X-Mailer: NexaHR-Payroll\r\n\r\n";

    $body  = "--{$mixedBoundary}\r\n";
    $body .= "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"\r\n\r\n";

    // Alternative: Text
    $body .= "--{$altBoundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($text)) . "\r\n";

    // Alternative: HTML
    $body .= "--{$altBoundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($html)) . "\r\n";
    $body .= "--{$altBoundary}--\r\n";

    // Attachment: PDF
    if ($pdfBase64) {
        $body .= "--{$mixedBoundary}\r\n";
        $body .= "Content-Type: application/pdf; name=\"Payroll_Breakdown_" . date('Y_m') . ".pdf\"\r\n";
        $body .= "Content-Description: Payroll breakdown report\r\n";
        $body .= "Content-Disposition: attachment; filename=\"Payroll_Breakdown_" . date('Y_m') . ".pdf\"; size=" . strlen($pdfBase64) . ";\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= $pdfBase64 . "\r\n";
    }

    $body .= "--{$mixedBoundary}--\r\n.\r\n";

    fwrite($socket, $headers . $body);
    $send = smtp_get($socket);
    smtp_put($socket, 'QUIT');
    @fclose($socket);

    return substr($send, 0, 3) === '250' ? true : "Send failed: {$send}";
}

function smtp_put($socket, string $cmd): string {
    fwrite($socket, "{$cmd}\r\n");
    return smtp_get($socket);
}

function smtp_get($socket): string {
    $resp = '';
    while (!feof($socket)) {
        $line = fgets($socket, 1024);
        if ($line === false) break;
        $resp .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    return $resp;
}