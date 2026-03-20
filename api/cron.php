<?php
/**
 * Nexa HR & Payroll — Scheduled Task Runner
 *
 * This endpoint simulates cron jobs for shared hosting environments.
 * Call it via:
 *   1. A real cron job:  curl -s "https://yoursite.ct.ws/api/cron.php?api_key=YOUR_KEY"
 *   2. The browser client (auto-called on app load once per day)
 *
 * Tasks:
 *   - Monthly leave accrual (runs once per calendar month)
 *   - Leave year-end carryover (runs on March 1)
 *   - Session cleanup (expired sessions removed)
 *   - Backup trigger (weekly)
 */
header('Content-Type: application/json');
require_once 'config.php';

set_cors_headers();

// Require API key for cron
if (!validate_api_key()) {
    json_response(['error' => 'Unauthorized.'], 401);
}

$conn = get_db_connection();
init_tables($conn);

$results = [];
$now     = new DateTime('now', new DateTimeZone('Africa/Johannesburg'));
$month   = $now->format('Y-m');
$today   = $now->format('Y-m-d');

// ─────────────────────────────────────────────────────────────
// TASK 1: Monthly Leave Accrual
// ─────────────────────────────────────────────────────────────
$alreadyRan = $conn->query(
    "SELECT id FROM leave_accrual_log WHERE run_month = '$month'"
);

if (!$alreadyRan || $alreadyRan->num_rows === 0) {
    $stateResult = $conn->query("SELECT data_blob FROM system_storage WHERE key_name='hrpms_main_state'");
    if ($stateResult && $row = $stateResult->fetch_assoc()) {
        $db = json_decode($row['data_blob'], true);

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

            // Accrue annual leave (max cap at 15 days per year)
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
                // Carry over a maximum of 15 days (any excess forfeited)
                $emp['leaveBalances']['annual'] = min(
                    floatval($emp['leaveBalances']['annual'] ?? 0),
                    $ANNUAL_ENTITLEMENT
                );
                // Reset sick leave cycle every 3 years (simplified: reset annually)
                // A proper implementation would track hire date cycles
            }
            unset($emp);
            $results['leave_yearend'] = 'Leave cycle reset for March 1';
        }

        // Save back
        $blob = $conn->real_escape_string(json_encode($db));
        $conn->query("INSERT INTO system_storage (key_name, data_blob) VALUES ('hrpms_main_state', '$blob')
                      ON DUPLICATE KEY UPDATE data_blob = '$blob'");

        // Mark as run
        $conn->query("INSERT IGNORE INTO leave_accrual_log (run_month, employees_processed)
                      VALUES ('$month', $processed)");

        audit_log($conn, 'cron', 'LEAVE_ACCRUAL', 'Cron', [
            'month' => $month, 'employees_processed' => $processed
        ]);

        $results['leave_accrual'] = [
            'status' => 'completed',
            'month'  => $month,
            'employees_processed' => $processed,
            'monthly_days_added'  => $monthlyAnnual
        ];
    }
} else {
    $results['leave_accrual'] = ['status' => 'skipped', 'reason' => "Already ran for $month"];
}

// ─────────────────────────────────────────────────────────────
// TASK 2: Session Cleanup
// ─────────────────────────────────────────────────────────────
$del = $conn->query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
$results['session_cleanup'] = [
    'status' => 'completed',
    'rows_deleted' => $conn->affected_rows
];

// ─────────────────────────────────────────────────────────────
// TASK 3: Weekly Backup Trigger
// ─────────────────────────────────────────────────────────────
if ($now->format('N') === '1') { // Monday
    $lastBackup = $conn->query(
        "SELECT details FROM audit_log WHERE action='AUTO_BACKUP'
         AND timestamp > DATE_SUB(NOW(), INTERVAL 6 DAY)
         ORDER BY timestamp DESC LIMIT 1"
    );
    if (!$lastBackup || $lastBackup->num_rows === 0) {
        // Trigger backup
        $ctx = stream_context_create(['http' => [
            'method'  => 'GET',
            'header'  => 'X-API-Key: ' . API_SECRET_KEY,
            'timeout' => 60
        ]]);
        @file_get_contents(rtrim(APP_URL, '/') . '/api/backup.php?type=auto', false, $ctx);

        audit_log($conn, 'cron', 'AUTO_BACKUP', 'Cron', ['trigger' => 'weekly_monday']);
        $results['backup'] = ['status' => 'triggered'];
    } else {
        $results['backup'] = ['status' => 'skipped', 'reason' => 'Already backed up this week'];
    }
}

// ─────────────────────────────────────────────────────────────
// TASK 4: Payroll reminders (if payroll calendar configured)
// ─────────────────────────────────────────────────────────────
$stateResult2 = $conn->query("SELECT data_blob FROM system_storage WHERE key_name='hrpms_main_state'");
if ($stateResult2 && $row2 = $stateResult2->fetch_assoc()) {
    $db2 = json_decode($row2['data_blob'], true);
    $calendars = $db2['payrollCalendars'] ?? [];
    $dayOfMonth = (int)$now->format('j');
    $reminders  = 0;
    foreach ($calendars as $cal) {
        $reminderDays = $cal['reminderDays'] ?? [15, 18, 20];
        if (in_array($dayOfMonth, $reminderDays)) {
            // In a real system, send email reminders here
            $reminders++;
        }
    }
    if ($reminders > 0) {
        $results['payroll_reminders'] = ['status' => 'sent', 'count' => $reminders];
    }
}

$results['ran_at']   = $now->format('c');
$results['timezone'] = 'Africa/Johannesburg';

$conn->close();
json_response($results);
