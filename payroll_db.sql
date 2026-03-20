-- #########################################################
-- HR & Payroll Management System - COMPREHENSIVE DB EXPORT
-- #########################################################
-- Target Database: if0_41384788_hrpayroll
-- Hostname: sql303.infinityfree.com
-- Created At: 2025-01-25 (SARS 2025/26 Compliant)
-- #########################################################

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+02:00";

-- ─── 1. CORE ORGANIZATION ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `tax_reference` varchar(50) DEFAULT NULL,
  `registration_number` varchar(50) DEFAULT NULL,
  `vat_number` varchar(50) DEFAULT NULL,
  `uif_number` varchar(50) DEFAULT NULL,
  `sdl_number` varchar(50) DEFAULT NULL,
  `address` text,
  `contact_phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `bee_level` varchar(20) DEFAULT NULL,
  `sars_branch` varchar(20) DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT '#4f46e5',
  `logo_url` text,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `manager_name` varchar(255) DEFAULT NULL,
  `budget_annual` decimal(15,2) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text,
  `type` varchar(50) DEFAULT 'Branch',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cost_centers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 2. PERSONNEL ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_number` varchar(20) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `id_number` varchar(13) NOT NULL,
  `passport_number` varchar(50) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `race` enum('African','White','Coloured','Indian','Other') DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `position` varchar(255) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `company_id` int(11) DEFAULT NULL,
  `location_id` int(11) DEFAULT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `employment_type` enum('Permanent','Contract','Temporary','Intern') DEFAULT 'Permanent',
  `hire_date` date DEFAULT NULL,
  `basic_salary` decimal(15,2) DEFAULT 0,
  `tax_number` varchar(50) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `bank_account` varchar(50) DEFAULT NULL,
  `bank_branch` varchar(20) DEFAULT NULL,
  `bank_account_type` varchar(50) DEFAULT NULL,
  `photo_url` text,
  `status` enum('Active','Inactive','Terminated','On Leave') DEFAULT 'Active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_number` (`employee_number`),
  UNIQUE KEY `id_number` (`id_number`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `emergency_contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 3. LEAVE & ATTENDANCE ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `type` enum('Annual','Sick','Family Responsibility','Study','Maternity','Paternity','Unpaid') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days` decimal(5,2) NOT NULL,
  `reason` text,
  `status` enum('Pending','Approved','Rejected','Cancelled') DEFAULT 'Pending',
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `leave_balances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `annual` decimal(8,2) DEFAULT 0,
  `sick` decimal(8,2) DEFAULT 0,
  `family` decimal(8,2) DEFAULT 0,
  `study` decimal(8,2) DEFAULT 0,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 4. PAYROLL & COMPLIANCE ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `tax_tables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(10) NOT NULL, -- e.g. 2025/2026
  `min_income` decimal(15,2) NOT NULL,
  `max_income` decimal(15,2) NOT NULL,
  `rate` decimal(5,4) NOT NULL,
  `rebate` decimal(15,2) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payroll_runs` (
  `id` varchar(50) NOT NULL, -- Format: RUN_YYYYMM_BATCH
  `company_id` int(11) NOT NULL,
  `period` varchar(20) NOT NULL, -- e.g. January 2025
  `run_type` enum('Regular','Bonus','Backpay','Termination','Off-cycle') DEFAULT 'Regular',
  `status` enum('Draft','Validated','Approved','Finalized','Paid') DEFAULT 'Draft',
  `total_gross` decimal(15,2) DEFAULT 0,
  `total_paye` decimal(15,2) DEFAULT 0,
  `total_uif` decimal(15,2) DEFAULT 0,
  `total_sdl` decimal(15,2) DEFAULT 0,
  `total_net` decimal(15,2) DEFAULT 0,
  `employee_count` int(11) DEFAULT 0,
  `created_by` varchar(100) DEFAULT NULL,
  `finalized_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payslips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `run_id` varchar(50) NOT NULL,
  `gross` decimal(15,2) NOT NULL,
  `paye` decimal(15,2) NOT NULL,
  `uif` decimal(15,2) NOT NULL,
  `sdl` decimal(15,2) NOT NULL,
  `medical_aid` decimal(15,2) DEFAULT 0,
  `pension` decimal(15,2) DEFAULT 0,
  `deductions_other` decimal(15,2) DEFAULT 0,
  `net` decimal(15,2) NOT NULL,
  `breakdown_json` longtext, -- Store full JSON for reconstruction
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`),
  FOREIGN KEY (`run_id`) REFERENCES `payroll_runs`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 5. HR MODULES (PERFORMANCE, RECRUITMENT, ETC) ──────────────────────────

CREATE TABLE IF NOT EXISTS `performance_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `period` varchar(50) NOT NULL,
  `score` decimal(3,2) DEFAULT 0,
  `feedback` text,
  `reviewer_name` varchar(255) DEFAULT NULL,
  `review_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Completed',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `performance_goals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `progress` int(11) DEFAULT 0,
  `status` varchar(50) DEFAULT 'Active',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `recruitment_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `department_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'Permanent',
  `salary_range` varchar(100) DEFAULT NULL,
  `status` enum('Open','Closed','On-hold') DEFAULT 'Open',
  `applicants_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `recruitment_applicants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `stage` varchar(50) DEFAULT 'Screening',
  `rating` int(11) DEFAULT 0,
  `status` varchar(20) DEFAULT 'Under Review',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`job_id`) REFERENCES `recruitment_jobs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `disciplinary_cases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `type` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `details` text,
  `outcome` text,
  `status` varchar(20) DEFAULT 'Open',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `training_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `course_name` varchar(255) NOT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `cost` decimal(15,2) DEFAULT 0,
  `status` varchar(20) DEFAULT 'Completed',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 6. SYSTEM & AUTH ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT 'Employee',
  `employee_id` int(11) DEFAULT NULL,
  `status` enum('Active','Inactive','Locked') DEFAULT 'Active',
  `last_login` timestamp NULL DEFAULT NULL,
  `permissions_json` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP,
  `user_name` varchar(255) NOT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `details` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `workflow_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `trigger_event` varchar(100) NOT NULL,
  `condition_rule` text,
  `action_result` text,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 7. SEED DATA ──────────────────────────────────────────────────────────

-- Companies
INSERT INTO `companies` (`id`, `name`, `tax_reference`, `registration_number`, `uif_number`, `sdl_number`, `address`, `sars_branch`) VALUES
(1, 'Acme Corp SA', '9123456789', '2015/123456/07', 'UIF12345678', 'SDL1234567', '123 Rivonia Rd, Sandton, Johannesburg', '012345');

-- Departments
INSERT INTO `departments` (`id`, `company_id`, `name`, `code`, `manager_name`) VALUES
(1, 1, 'Information Technology', 'IT', 'Michael Chen'),
(2, 1, 'Finance', 'FIN', 'Sarah Van der Merwe'),
(3, 1, 'Human Resources', 'HR', 'Admin User');

-- Employees
INSERT INTO `employees` (`id`, `employee_number`, `first_name`, `last_name`, `id_number`, `email`, `position`, `department_id`, `company_id`, `basic_salary`, `status`) VALUES
(1, 'EMP001', 'Thabo', 'Mahlafunya', '8501015023088', 'thabo@acmecorp.co.za', 'CTO', 1, 1, 85000.00, 'Active'),
(2, 'EMP002', 'Sarah', 'Jenkins', '9005051234081', 's.jenkins@acmecorp.co.za', 'HR Manager', 3, 1, 45000.00, 'Active');

-- Leave Balances
INSERT INTO `leave_balances` (`employee_id`, `annual`, `sick`, `family`) VALUES
(1, 18.00, 30.00, 3.00),
(2, 21.00, 28.00, 3.00);

-- Users
INSERT INTO `users` (`username`, `password_hash`, `name`, `role`, `email`, `employee_id`) VALUES
('admin', 'admin123', 'System Administrator', 'Super Admin', 'admin@acme.co.za', NULL),
('thabo', 'password123', 'Thabo Mahlafunya', 'Employee', 'thabo@acme.co.za', 1);

-- Tax Tables (2025/26)
INSERT INTO `tax_tables` (`tax_year`, `min_income`, `max_income`, `rate`, `rebate`) VALUES
('2025/26', 0, 237100, 0.18, 0),
('2025/26', 237101, 370500, 0.26, 42678),
('2025/26', 370501, 512800, 0.31, 77362),
('2025/26', 512801, 673000, 0.36, 121475);

-- Workflow Rules
INSERT INTO `workflow_rules` (`name`, `trigger_event`, `condition_rule`, `action_result`) VALUES
('High Leave Request', 'Leave Request', 'Days > 5', 'Require Director Approval'),
('New Hire', 'Employee Created', 'Always', 'Start Onboarding');
