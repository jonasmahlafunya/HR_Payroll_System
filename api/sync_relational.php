<?php
/**
 * Nexa HR & Payroll — Relational Sync Helper
 * 
 * Takes the decoded JSON state blob from the frontend and performs a
 * One-Way Sync into the relational database tables (companies, employees, etc.)
 */

function sync_relational_data(mysqli $conn, array $data): void {
    // 1. Sync Companies
    if (!empty($data['companies']) && is_array($data['companies'])) {
        sync_companies($conn, $data['companies']);
    }

    // 2. Sync Departments
    if (!empty($data['departments']) && is_array($data['departments'])) {
        sync_departments($conn, $data['departments']);
    }

    // 3. Sync Employees
    if (!empty($data['employees']) && is_array($data['employees'])) {
        sync_employees($conn, $data['employees']);
    }

    // 4. Sync Payroll Runs
    if (!empty($data['payrollRuns']) && is_array($data['payrollRuns'])) {
        sync_payroll_runs($conn, $data['payrollRuns']);
    }

    // 5. Sync Payslips (Lines)
    if (!empty($data['payslips']) && is_array($data['payslips'])) {
        sync_payroll_lines($conn, $data['payslips']);
    }
}

function sync_companies(mysqli $conn, array $companies): void {
    $stmt = $conn->prepare("
        INSERT INTO `companies` (
            `id`, `name`, `registration_number`, `tax_reference`, `vat_number`, 
            `uif_number`, `sdl_number`, `email`, `contact_phone`, `address`, `status`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            `name` = VALUES(`name`),
            `registration_number` = VALUES(`registration_number`),
            `tax_reference` = VALUES(`tax_reference`),
            `vat_number` = VALUES(`vat_number`),
            `uif_number` = VALUES(`uif_number`),
            `sdl_number` = VALUES(`sdl_number`),
            `email` = VALUES(`email`),
            `contact_phone` = VALUES(`contact_phone`),
            `address` = VALUES(`address`),
            `status` = VALUES(`status`)
    ");

    if (!$stmt) return;

    foreach ($companies as $c) {
        $id = (int)($c['id'] ?? 0);
        if ($id <= 0) continue; 

        $name = substr($c['name'] ?? '', 0, 255);
        $reg = substr($c['registrationNumber'] ?? '', 0, 50);
        $tax = substr($c['taxReference'] ?? '', 0, 50);
        $vat = substr($c['vatNumber'] ?? '', 0, 50);
        $uif = substr($c['uifNumber'] ?? '', 0, 50);
        $sdl = substr($c['sdlNumber'] ?? '', 0, 50);
        $email = substr($c['email'] ?? '', 0, 255);
        $phone = substr($c['contact'] ?? '', 0, 50);
        $address = (string)($c['address'] ?? '');
        $status = in_array($c['status'] ?? '', ['Active', 'Inactive', 'Suspended']) ? $c['status'] : 'Active';

        $stmt->bind_param("issssssssss", 
            $id, $name, $reg, $tax, $vat, $uif, $sdl, $email, $phone, $address, $status
        );
        $stmt->execute();
    }
    $stmt->close();
}

function sync_departments(mysqli $conn, array $departments): void {
    $stmt = $conn->prepare("
        INSERT INTO `departments` (`id`, `name`) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)
    ");

    if (!$stmt) return;

    foreach ($departments as $d) {
        $id = (int)($d['id'] ?? 0);
        if ($id <= 0) continue;

        $name = substr($d['name'] ?? '', 0, 100);
        $stmt->bind_param("is", $id, $name);
        $stmt->execute();
    }
    $stmt->close();
}

function sync_employees(mysqli $conn, array $employees): void {
    $stmt = $conn->prepare("
        INSERT INTO `employees` (
            `id`, `employee_number`, `company_id`, `first_name`, `last_name`, 
            `email`, `position`, `id_number`, `date_of_birth`, `gender`, `race`, `phone`, 
            `address`, `bank_name`, `branch_code`, `account_number`, `account_type`,
            `tax_number`, `uif_number`, `basic_salary`, `hire_date`, `status`, `employment_type`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            `employee_number` = VALUES(`employee_number`),
            `company_id` = VALUES(`company_id`),
            `first_name` = VALUES(`first_name`),
            `last_name` = VALUES(`last_name`),
            `email` = VALUES(`email`),
            `position` = VALUES(`position`),
            `id_number` = VALUES(`id_number`),
            `date_of_birth` = VALUES(`date_of_birth`),
            `gender` = VALUES(`gender`),
            `race` = VALUES(`race`),
            `phone` = VALUES(`phone`),
            `address` = VALUES(`address`),
            `bank_name` = VALUES(`bank_name`),
            `branch_code` = VALUES(`branch_code`),
            `account_number` = VALUES(`account_number`),
            `account_type` = VALUES(`account_type`),
            `tax_number` = VALUES(`tax_number`),
            `uif_number` = VALUES(`uif_number`),
            `basic_salary` = VALUES(`basic_salary`),
            `hire_date` = VALUES(`hire_date`),
            `status` = VALUES(`status`),
            `employment_type` = VALUES(`employment_type`)
    ");

    if (!$stmt) return;

    foreach ($employees as $e) {
        $id = (int)($e['id'] ?? 0);
        if ($id <= 0) continue;

        $empNum = substr($e['employeeNumber'] ?? '', 0, 20);
        $companyId = !empty($e['companyId']) ? (int)$e['companyId'] : null;
        $first = substr($e['firstName'] ?? '', 0, 100);
        $last = substr($e['lastName'] ?? '', 0, 100);
        $email = substr($e['email'] ?? '', 0, 255);
        $pos = substr($e['position'] ?? '', 0, 150);
        $idNum = substr($e['idNumber'] ?? '', 0, 13);
        $dob = (strlen($e['dateOfBirth']??'')==10) ? $e['dateOfBirth'] : null;
        $gender = in_array($e['gender'] ?? '', ['Male','Female','Other','Prefer not to say']) ? $e['gender'] : null;
        $race = substr($e['race'] ?? '', 0, 50);
        $phone = substr($e['phone'] ?? '', 0, 30);
        $addr = (string)($e['address'] ?? '');
        $bank = substr($e['bankName'] ?? '', 0, 100);
        $branch = substr($e['branchCode'] ?? '', 0, 20);
        $accNum = substr($e['accountNumber'] ?? '', 0, 50);
        $accType = substr($e['accountType'] ?? '', 0, 50);
        $taxNum = substr($e['taxNumber'] ?? '', 0, 30);
        $uifNum = substr($e['uifNumber'] ?? '', 0, 30);
        $salary = (float)($e['basicSalary'] ?? 0);
        $hire = (strlen($e['hireDate']??'')==10) ? $e['hireDate'] : null;
        $status = in_array($e['status'] ?? '', ['Active','On Leave','Suspended','Terminated']) ? $e['status'] : 'Active';
        $empType = in_array($e['employmentType'] ?? '', ['Permanent','Contract','Part-Time','Intern','Fixed-Term']) ? $e['employmentType'] : 'Permanent';

        $stmt->bind_param("isissssssssssssssssdsss", 
            $id, $empNum, $companyId, $first, $last, $email, $pos, $idNum, 
            $dob, $gender, $race, $phone, $addr, $bank, $branch, $accNum, $accType, 
            $taxNum, $uifNum, $salary, $hire, $status, $empType
        );
        $stmt->execute();
    }
    $stmt->close();
}

function sync_payroll_runs(mysqli $conn, array $runs): void {
    $stmt = $conn->prepare("
        INSERT INTO `payroll_runs` (
            `id`, `company_id`, `company_name`, `period`, `run_type`, `status`,
            `total_gross`, `total_net`, `total_paye`, `total_uif`, `total_sdl`, 
            `employee_count`, `notes`, `created_by`, `created_at`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            `status` = VALUES(`status`),
            `total_gross` = VALUES(`total_gross`),
            `total_net` = VALUES(`total_net`),
            `total_paye` = VALUES(`total_paye`),
            `notes` = VALUES(`notes`)
    ");

    if (!$stmt) return;

    foreach ($runs as $r) {
        $id = substr($r['id'] ?? '', 0, 60);
        if (!$id) continue;

        $compId = (int)($r['companyId'] ?? 0);
        $coName = substr($r['company'] ?? $r['companyName'] ?? '', 0, 255);
        $period = substr($r['period'] ?? '', 0, 40);
        $type = in_array($r['type'] ?? '', ['Regular','Bonus','Retro','Termination','Correction','Ad-Hoc']) ? $r['type'] : 'Regular';
        $status = in_array($r['status'] ?? '', ['Draft','Pending Approval','Approved','Finalized','Paid','Rolled Back']) ? $r['status'] : 'Draft';
        
        $gross = (float)($r['totals']['gross'] ?? 0);
        $net = (float)($r['totals']['net'] ?? 0);
        $paye = (float)($r['totals']['paye'] ?? 0);
        $uif = (float)($r['totals']['uif'] ?? 0);
        $sdl = (float)($r['totals']['sdl'] ?? 0);
        $count = (int)($r['employeeCount'] ?? 0);
        $notes = (string)($r['notes'] ?? '');
        $by = substr($r['createdBy'] ?? '', 0, 150);
        $at = $r['createdAt'] ?? date('Y-m-d H:i:s');

        $stmt->bind_param("sissssdddddisss", 
            $id, $compId, $coName, $period, $type, $status, 
            $gross, $net, $paye, $uif, $sdl, $count, $notes, $by, $at
        );
        $stmt->execute();
    }
    $stmt->close();
}

function sync_payroll_lines(mysqli $conn, array $payslips): void {
    if (empty($payslips)) return;

    // To prevent duplicates in a one-way sync, we clear lines for the runs being synced.
    // First, find all unique run IDs in this batch.
    $runIds = array_unique(array_filter(array_map(function($p) {
        return substr($p['runId'] ?? '', 0, 60);
    }, $payslips)));

    if (empty($runIds)) return;

    foreach ($runIds as $rid) {
        $safeRid = $conn->real_escape_string($rid);
        $conn->query("DELETE FROM `payroll_run_lines` WHERE `run_id` = '$safeRid'");
    }

    $stmt = $conn->prepare("
        INSERT INTO `payroll_run_lines` (
            `run_id`, `employee_id`, `employee_name`, `company_name`, `period`,
            `basic`, `allowances`, `bonus`, `gross`, `paye`, `uif`, `sdl`, 
            `pension`, `medical`, `other_deductions`, `net`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    if (!$stmt) return;

    foreach ($payslips as $p) {
        $runId = substr($p['runId'] ?? '', 0, 60);
        if (!$runId) continue;

        $empId = (int)($p['employeeId'] ?? 0);
        $name = substr($p['employeeName'] ?? '', 0, 200);
        $co = substr($p['companyName'] ?? '', 0, 255);
        $period = substr($p['period'] ?? '', 0, 40);

        $basic = (float)($p['basicSalary'] ?? $p['basic'] ?? 0);
        $allow = (float)($p['allowances'] ?? 0);
        $bonus = (float)($p['bonus'] ?? 0);
        $gross = (float)($p['gross'] ?? 0);
        $paye = (float)($p['paye'] ?? 0);
        $uif = (float)($p['uif'] ?? 0);
        $sdl = (float)($p['sdl'] ?? 0);
        $pension = (float)($p['pension'] ?? 0);
        $med = (float)($p['medical'] ?? 0);
        $other = (float)($p['other_deductions'] ?? 0);
        $net = (float)($p['net'] ?? 0);

        $stmt->bind_param("sisssddddddddddd", 
            $runId, $empId, $name, $co, $period,
            $basic, $allow, $bonus, $gross, $paye, $uif, $sdl,
            $pension, $med, $other, $net
        );
        $stmt->execute();
    }
    $stmt->close();
}

