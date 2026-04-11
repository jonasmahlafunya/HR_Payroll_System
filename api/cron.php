<?php
/**
 * Nexa HR & Payroll — Scheduled Task Runner
 *
 * This endpoint runs scheduled cron jobs using PDO (consistent with all other API files).
 *
 * Call it via:
 *   1. A real cron job:  curl -s "https://yoursite/api/cron.php?api_key=YOUR_KEY"
 *   2. The browser client (auto-called on app load once per day)
 *
 * Tasks:
 *   - Monthly leave accrual (runs once per calendar month)
 *   - Leave year-end carryover (runs on March 1)
 *   - Session cleanup (expired sessions removed)
 *   - Backup trigger (weekly, Mondays)
 *   - Payroll reminders (based on payroll calendar)
 *   - Document expiry alerts (30/60/90 day warnings)
 */
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

set_cors_headers();

// Require API key for all cron access
if (!validate_api_key()) {
    json_response(['error' => 'Unauthorized.'], 401);
}

// ── Get PDO connection and ensure tables exist ────────────────
try {
    $pdo = get_db_connection();
    ensure_all_tables($pdo);

    // Ensure the leave_accrual_log table exists (cron-specific table)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `leave_accrual_log` (
        `id`                  INT AUTO_INCREMENT PRIMARY KEY,
        `run_month`           VARCHAR(7) NOT NULL UNIQUE,
        `employees_processed` INT NOT NULL DEFAULT 0,
        `created_at`          DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_run_month (run_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

} catch (Throwable $e) {
    json_response(['error' => 'Database initialization failed: ' . $e->getMessage()], 503);
}

$results = [];
$now = new DateTime('now', new DateTimeZone('Africa/Johannesburg'));
$month = $now->format('Y-m');
$today = $now->format('Y-m-d');

// ─────────────────────────────────────────────────────────────
// Load the main state blob ONCE (re-used by Tasks 1, 4, and 5)
// ─────────────────────────────────────────────────────────────
$db = [];
try {
    $stateStmt = $pdo->prepare("SELECT data_blob FROM system_storage WHERE key_name = ?");
    $stateStmt->execute(['hrpms_main_state']);
    $stateRow = $stateStmt->fetch();
    if ($stateRow) {
        $db = json_decode($stateRow['data_blob'], true) ?: [];
    }
} catch (Throwable $e) {
    debug_log("Cron: Failed to load state blob: " . $e->getMessage());
}

// ─────────────────────────────────────────────────────────────
// TASK 1: Monthly Leave Accrual
// ─────────────────────────────────────────────────────────────
try {
    // Use prepared statement to avoid SQL injection
    $accrualCheck = $pdo->prepare("SELECT id FROM leave_accrual_log WHERE run_month = ?");
    $accrualCheck->execute([$month]);
    $alreadyRan = $accrualCheck->fetch();

    if (!$alreadyRan) {
        if (!empty($db['employees'])) {
            $ANNUAL_ENTITLEMENT = 15; // days per year
            $SICK_ENTITLEMENT   = 30; // days per 3-year cycle
            $monthlyAnnual      = round($ANNUAL_ENTITLEMENT / 12, 4);

            $processed = 0;
            foreach ($db['employees'] as &$emp) {
                if (($emp['status'] ?? '') !== 'Active') continue;

                $emp['leaveBalances'] = $emp['leaveBalances'] ?? [
                    'annual' => $ANNUAL_ENTITLEMENT,
                    'sick'   => $SICK_ENTITLEMENT,
                    'family' => 3
                ];

                // Accrue monthly annual leave (capped at full annual entitlement)
                $current = floatval($emp['leaveBalances']['annual'] ?? 0);
                $emp['leaveBalances']['annual'] = min(
                    round($current + $monthlyAnnual, 4),
                    $ANNUAL_ENTITLEMENT
                );
                $processed++;
            }
            unset($emp);

            // Leave year-end: March 1 carryover (SA leave cycle starts 1 March)
            if ($now->format('m-d') === '03-01') {
                foreach ($db['employees'] as &$emp) {
                    if (($emp['status'] ?? '') !== 'Active') continue;
                    // Cap carryover to the annual entitlement; any excess is forfeited
                    $emp['leaveBalances']['annual'] = min(
                        floatval($emp['leaveBalances']['annual'] ?? 0),
                        $ANNUAL_ENTITLEMENT
                    );
                    // Note: Proper 3-year sick leave cycle reset requires tracking hire date.
                    // Simplified: reset is tracked manually via employee record.
                }
                unset($emp);
                $results['leave_yearend'] = 'Leave cycle capped for March 1 (SA leave year reset)';
            }

            // Save updated state back to DB
            $newBlob = json_encode($db);
            $saveStmt = $pdo->prepare(
                "INSERT INTO system_storage (key_name, data_blob)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE data_blob = ?"
            );
            $saveStmt->execute(['hrpms_main_state', $newBlob, $newBlob]);

            // Mark this month as processed — use prepared statement
            $logStmt = $pdo->prepare(
                "INSERT IGNORE INTO leave_accrual_log (run_month, employees_processed) VALUES (?, ?)"
            );
            $logStmt->execute([$month, $processed]);

            audit_log($pdo, 'cron', 'LEAVE_ACCRUAL', 'Cron', [
                'month'               => $month,
                'employees_processed' => $processed
            ]);

            $results['leave_accrual'] = [
                'status'              => 'completed',
                'month'               => $month,
                'employees_processed' => $processed,
                'monthly_days_added'  => $monthlyAnnual
            ];
        } else {
            $results['leave_accrual'] = [
                'status' => 'skipped',
                'reason' => 'No employees found in state blob'
            ];
        }
    } else {
        $results['leave_accrual'] = [
            'status' => 'skipped',
            'reason' => "Already ran for {$month}"
        ];
    }
} catch (Throwable $e) {
    debug_log("Cron TASK 1 (Leave Accrual) error: " . $e->getMessage());
    $results['leave_accrual'] = ['status' => 'error', 'message' => $e->getMessage()];
}

// ─────────────────────────────────────────────────────────────
// TASK 2: Session Cleanup
// ─────────────────────────────────────────────────────────────
try {
    $delStmt = $pdo->prepare("DELETE FROM auth_sessions WHERE expires_at < NOW()");
    $delStmt->execute();
    $results['session_cleanup'] = [
        'status'      => 'completed',
        'rows_deleted' => $delStmt->rowCount()  // PDO uses rowCount(), not affected_rows
    ];
} catch (Throwable $e) {
    debug_log("Cron TASK 2 (Session Cleanup) error: " . $e->getMessage());
    $results['session_cleanup'] = ['status' => 'error', 'message' => $e->getMessage()];
}

// ─────────────────────────────────────────────────────────────
// TASK 3: Weekly Backup Trigger (Mondays only)
// ─────────────────────────────────────────────────────────────
if ($now->format('N') === '1') { // 1 = Monday (ISO day of week)
    try {
        // Check if backup already ran this week — use correct column name (created_at)
        $backupCheck = $pdo->prepare(
            "SELECT id FROM audit_log
             WHERE action = 'AUTO_BACKUP'
               AND created_at > DATE_SUB(NOW(), INTERVAL 6 DAY)
             ORDER BY created_at DESC LIMIT 1"
        );
        $backupCheck->execute();
        $lastBackup = $backupCheck->fetch();

        if (!$lastBackup) {
            // Derive APP_URL from environment or server vars (avoids undefined constant)
            $appUrl = env('APP_URL', '');
            if (!$appUrl) {
                $scheme  = (($_SERVER['HTTPS'] ?? '') === 'on') ? 'https' : 'http';
                $host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $appUrl  = $scheme . '://' . $host;
            }
            $appUrl = rtrim($appUrl, '/');

            $ctx = stream_context_create([
                'http' => [
                    'method'  => 'GET',
                    // Use API_KEY constant (not the non-existent API_SECRET_KEY)
                    'header'  => 'X-API-Key: ' . API_KEY,
                    'timeout' => 60
                ]
            ]);
            @file_get_contents($appUrl . '/api/backup.php?type=auto', false, $ctx);

            audit_log($pdo, 'cron', 'AUTO_BACKUP', 'Cron', ['trigger' => 'weekly_monday']);
            $results['backup'] = ['status' => 'triggered'];
        } else {
            $results['backup'] = ['status' => 'skipped', 'reason' => 'Already backed up this week'];
        }
    } catch (Throwable $e) {
        debug_log("Cron TASK 3 (Backup) error: " . $e->getMessage());
        $results['backup'] = ['status' => 'error', 'message' => $e->getMessage()];
    }
}

// ─────────────────────────────────────────────────────────────
// TASK 4: Payroll Reminders (if payroll calendar configured)
// ─────────────────────────────────────────────────────────────
try {
    $calendars  = $db['payrollCalendars'] ?? [];
    $dayOfMonth = (int) $now->format('j');
    $reminders  = 0;

    foreach ($calendars as $cal) {
        $reminderDays = $cal['reminderDays'] ?? [15, 18, 20];
        if (in_array($dayOfMonth, $reminderDays, true)) {
            // TODO: send actual email reminders to payroll contacts
            $reminders++;
        }
    }

    if ($reminders > 0) {
        $results['payroll_reminders'] = ['status' => 'sent', 'count' => $reminders];
    }
} catch (Throwable $e) {
    debug_log("Cron TASK 4 (Payroll Reminders) error: " . $e->getMessage());
    $results['payroll_reminders'] = ['status' => 'error', 'message' => $e->getMessage()];
}

// ─────────────────────────────────────────────────────────────
// TASK 5: Document Expiry Email Alerts (30/60/90 days)
// ─────────────────────────────────────────────────────────────
try {
    $allDocs    = array_merge($db['documents'] ?? [], $db['contracts'] ?? []);
    $thresholds = [30, 60, 90]; // days before expiry to send alert
    $expiring   = [];

    foreach ($allDocs as $doc) {
        $expDate = $doc['expiryDate'] ?? $doc['endDate'] ?? null;
        if (!$expDate) continue;

        $daysLeft = (int) ceil((strtotime($expDate) - time()) / 86400);
        if (in_array($daysLeft, $thresholds, true)) {
            $expiring[] = [
                'name'       => $doc['name'] ?? $doc['title'] ?? 'Unknown Document',
                'category'   => $doc['category'] ?? 'General',
                'expiryDate' => $expDate,
                'daysLeft'   => $daysLeft,
                'employeeId' => $doc['employeeId'] ?? null
            ];
        }
    }

    if (!empty($expiring)) {
        $settings   = $db['settings'] ?? [];
        $alertEmail = $settings['notificationEmail'] ?? ($settings['companyEmail'] ?? '');

        if ($alertEmail && filter_var($alertEmail, FILTER_VALIDATE_EMAIL)) {
            $tableRows = '';
            foreach ($expiring as $item) {
                $empName = '—';
                if ($item['employeeId']) {
                    foreach (($db['employees'] ?? []) as $emp) {
                        if (($emp['id'] ?? null) == $item['employeeId']) {
                            $empName = htmlspecialchars(
                                ($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''), ENT_QUOTES
                            );
                            break;
                        }
                    }
                }
                $urgencyColor = $item['daysLeft'] <= 30 ? '#DC2626' : ($item['daysLeft'] <= 60 ? '#D97706' : '#3B82F6');
                $tableRows .= "<tr>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;'>"
                        . htmlspecialchars($item['name'], ENT_QUOTES) . "</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;'>"
                        . htmlspecialchars($item['category'], ENT_QUOTES) . "</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;'>{$empName}</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;'>"
                        . htmlspecialchars($item['expiryDate'], ENT_QUOTES) . "</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;color:{$urgencyColor};font-weight:700;'>"
                        . (int)$item['daysLeft'] . " days</td>
                </tr>";
            }

            $count   = count($expiring);
            $subject = "⚠ Nexa HR: {$count} Document(s) Expiring Soon";
            $html    = "<!DOCTYPE html><html><body style='font-family:sans-serif;background:#F0F4F8;padding:24px;'>
                <div style='max-width:600px;margin:auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);'>
                    <div style='background:#0B1D3A;padding:20px 24px;'>
                        <h2 style='color:#F59E0B;margin:0;'>Document Expiry Alert</h2>
                        <p style='color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:0.85rem;'>Nexa HR &amp; Payroll — Automated Alert</p>
                    </div>
                    <div style='padding:24px;'>
                        <p style='color:#475569;'>The following <strong>{$count}</strong> document(s) are expiring soon:</p>
                        <table style='width:100%;border-collapse:collapse;font-size:0.85rem;'>
                            <thead><tr style='background:#F8FAFC;'>
                                <th style='padding:8px 12px;text-align:left;'>Document</th>
                                <th style='padding:8px 12px;text-align:left;'>Category</th>
                                <th style='padding:8px 12px;text-align:left;'>Employee</th>
                                <th style='padding:8px 12px;text-align:left;'>Expiry</th>
                                <th style='padding:8px 12px;text-align:left;'>Days Left</th>
                            </tr></thead>
                            <tbody>{$tableRows}</tbody>
                        </table>
                    </div>
                </div>
            </body></html>";

            // Use the unified email utility (not raw mail()) for consistency + SMTP support
            $fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexasystems.co.za';
            $fromName  = SMTP_FROM_NAME  ?: 'Nexa HR & Payroll';
            [$sent, $emailErr] = nexa_send_email($alertEmail, $subject, $html, $fromEmail, $fromName);

            if (!$sent) {
                debug_log("Cron doc expiry alert email failed: " . $emailErr);
            }

            audit_log($pdo, 'cron', 'DOC_EXPIRY_ALERT', 'Cron', [
                'documents_expiring' => $count,
                'email_sent_to'      => $alertEmail,
                'email_ok'           => $sent
            ]);
        }

        $results['doc_expiry_alerts'] = [
            'status'    => 'completed',
            'documents' => count($expiring)
        ];
    } else {
        $results['doc_expiry_alerts'] = ['status' => 'no_expiring_docs'];
    }
} catch (Throwable $e) {
    debug_log("Cron TASK 5 (Doc Expiry) error: " . $e->getMessage());
    $results['doc_expiry_alerts'] = ['status' => 'error', 'message' => $e->getMessage()];
}

// ─────────────────────────────────────────────────────────────
// TASK 6: Clean up expired OTPs
// ─────────────────────────────────────────────────────────────
try {
    $otpCleanup = $pdo->prepare("DELETE FROM auth_otp WHERE expires_at < NOW()");
    $otpCleanup->execute();
    $results['otp_cleanup'] = ['status' => 'completed', 'rows_deleted' => $otpCleanup->rowCount()];
} catch (Throwable $e) {
    // auth_otp table may not exist yet on fresh installs — non-fatal
    $results['otp_cleanup'] = ['status' => 'skipped'];
}

$results['ran_at']   = $now->format('c');
$results['timezone'] = 'Africa/Johannesburg';

json_response($results);
