-- ============================================================
-- NEXA HR & PAYROLL — COMPLETE DATABASE SCHEMA
-- Database : MySQL 8.0 / MariaDB 10.6+
-- Charset  : utf8mb4
-- Generated: 2026
--
-- INSTRUCTIONS:
--   1. Create the database first (or use your host's DB name)
--   2. Run this entire script once
--   3. Update .env with your DB credentials
--   4. Log in with admin / admin  (change password immediately)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE            = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET NAMES               utf8mb4;

-- ============================================================
-- SECTION 1 — SYSTEM TABLES (used directly by PHP)
-- ============================================================

-- ── 1.1 Main application state blob (localStorage → MySQL sync) ────────────
CREATE TABLE IF NOT EXISTS `system_storage` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `key_name`   VARCHAR(100)    NOT NULL,
    `data_blob`  LONGTEXT        NOT NULL,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_key_name` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Key-value store for the main JSON application state';

-- ── 1.2 Authentication sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `auth_sessions` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `token`      VARCHAR(128)    NOT NULL,
    `username`   VARCHAR(100)    NOT NULL,
    `role`       VARCHAR(60)     NOT NULL,
    `ip_address` VARCHAR(45)         NULL,
    `user_agent` VARCHAR(255)        NULL,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP       NOT NULL,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_token`   (`token`),
    KEY          `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Active user login sessions';

-- ── 1.3 Audit / activity log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_log` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `timestamp`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `username`   VARCHAR(100)    NOT NULL,
    `action`     VARCHAR(200)    NOT NULL,
    `module`     VARCHAR(80)         NULL,
    `details`    JSON                NULL,
    `ip_address` VARCHAR(45)         NULL,
    `user_agent` VARCHAR(255)        NULL,
    PRIMARY KEY  (`id`),
    KEY          `idx_username`  (`username`),
    KEY          `idx_module`    (`module`),
    KEY          `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Append-only audit trail — never DELETE from this table';

-- ── 1.4 Document / file uploads ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `documents` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` VARCHAR(20)       NULL COMMENT 'NULL = company-wide document',
    `category`    VARCHAR(80)   NOT NULL DEFAULT 'General',
    `filename`    VARCHAR(255)  NOT NULL COMMENT 'Original user-facing filename',
    `stored_name` VARCHAR(255)  NOT NULL COMMENT 'Random filename on disk (security)',
    `file_size`   INT UNSIGNED  NOT NULL DEFAULT 0,
    `mime_type`   VARCHAR(100)      NULL,
    `uploaded_by` VARCHAR(100)      NULL,
    `uploaded_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    KEY          `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Uploaded files metadata (actual files stored in /uploads/)';

-- ── 1.5 Leave accrual run tracker ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `leave_accrual_log` (
    `id`                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `run_month`            VARCHAR(7)   NOT NULL COMMENT 'YYYY-MM — prevents double-run',
    `employees_processed`  INT          NOT NULL DEFAULT 0,
    `ran_at`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_run_month` (`run_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per month — cron leave accrual idempotency guard';

-- ============================================================
-- SECTION 2 — NORMALISED RELATIONAL TABLES
-- (used for reporting, exports, and as the source of truth
--  alongside the JSON blob in system_storage)
-- ============================================================

-- ── 2.1 Companies ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `companies` (
    `id`                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`                VARCHAR(255)  NOT NULL,
    `registration_number` VARCHAR(50)       NULL,
    `tax_reference`       VARCHAR(50)       NULL COMMENT 'PAYE / Income Tax ref',
    `vat_number`          VARCHAR(50)       NULL,
    `uif_number`          VARCHAR(50)       NULL,
    `sdl_number`          VARCHAR(50)       NULL,
    `sars_branch_code`    VARCHAR(20)       NULL,
    `bee_level`           VARCHAR(20)       NULL,
    `country_code`        CHAR(2)       NOT NULL DEFAULT 'ZA',
    `address`             TEXT              NULL,
    `contact_phone`       VARCHAR(50)       NULL,
    `email`               VARCHAR(255)      NULL,
    `banking_bank`        VARCHAR(100)      NULL,
    `banking_account`     VARCHAR(50)       NULL,
    `banking_branch`      VARCHAR(20)       NULL,
    `banking_type`        VARCHAR(50)       NULL,
    `primary_color`       VARCHAR(20)       NULL DEFAULT '#4f46e5',
    `logo_path`           VARCHAR(500)      NULL,
    `status`              ENUM('Active','Inactive','Suspended') NOT NULL DEFAULT 'Active',
    `created_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                 ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_reg_number` (`registration_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.2 Departments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `departments` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `company_id`  INT UNSIGNED      NULL,
    `name`        VARCHAR(100)  NOT NULL,
    `code`        VARCHAR(20)       NULL,
    `manager`     VARCHAR(150)      NULL,
    `budget`      DECIMAL(15,2)     NULL DEFAULT 0.00,
    PRIMARY KEY  (`id`),
    KEY          `idx_company` (`company_id`),
    CONSTRAINT   `fk_dept_company` FOREIGN KEY (`company_id`)
                 REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.3 Locations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `locations` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED      NULL,
    `name`       VARCHAR(100)  NOT NULL,
    `address`    TEXT              NULL,
    `type`       ENUM('Headquarters','Branch','Virtual') NOT NULL DEFAULT 'Branch',
    PRIMARY KEY  (`id`),
    KEY          `idx_company` (`company_id`),
    CONSTRAINT   `fk_loc_company` FOREIGN KEY (`company_id`)
                 REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.4 Cost Centres ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cost_centres` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `code`       VARCHAR(20)   NOT NULL,
    `name`       VARCHAR(100)      NULL,
    `company_id` INT UNSIGNED      NULL,
    `status`     ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_code` (`code`),
    KEY          `idx_company` (`company_id`),
    CONSTRAINT   `fk_cc_company` FOREIGN KEY (`company_id`)
                 REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.5 Roles & Permissions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `roles` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)  NOT NULL,
    `description` TEXT              NULL,
    `permissions` JSON              NULL COMMENT 'Array of permission strings',
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.6 System Users (login accounts) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `username`      VARCHAR(100)  NOT NULL,
    `password_hash` VARCHAR(255)  NOT NULL COMMENT 'bcrypt hash — never store plain text',
    `role_id`       INT UNSIGNED      NULL,
    `name`          VARCHAR(150)  NOT NULL,
    `email`         VARCHAR(255)      NULL,
    `employee_id`   INT UNSIGNED      NULL COMMENT 'Linked employee record',
    `status`        ENUM('Active','Inactive','Locked') NOT NULL DEFAULT 'Active',
    `last_login`    DATETIME          NULL,
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_username` (`username`),
    KEY          `idx_role`    (`role_id`),
    CONSTRAINT   `fk_user_role` FOREIGN KEY (`role_id`)
                 REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.7 Employees ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `employees` (
    `id`                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_number`       VARCHAR(20)   NOT NULL,
    `company_id`            INT UNSIGNED      NULL,
    `department_id`         INT UNSIGNED      NULL,
    `location_id`           INT UNSIGNED      NULL,
    `user_id`               INT UNSIGNED      NULL COMMENT 'Portal login account',
    `manager_id`            INT UNSIGNED      NULL COMMENT 'Reports-to employee',
    -- Personal
    `first_name`            VARCHAR(100)  NOT NULL,
    `last_name`             VARCHAR(100)  NOT NULL,
    `id_number`             VARCHAR(13)       NULL COMMENT '13-digit SA ID',
    `passport_number`       VARCHAR(50)       NULL,
    `date_of_birth`         DATE              NULL,
    `gender`                ENUM('Male','Female','Other','Prefer not to say') NULL,
    `race`                  VARCHAR(50)       NULL COMMENT 'EEA reporting field',
    `home_language`         VARCHAR(60)       NULL,
    `nationality`           VARCHAR(60)       NULL DEFAULT 'South African',
    -- Contact
    `email`                 VARCHAR(255)      NULL,
    `phone`                 VARCHAR(30)       NULL,
    `address`               TEXT              NULL,
    -- Employment
    `position`              VARCHAR(150)      NULL,
    `employment_type`       ENUM('Permanent','Contract','Part-Time','Intern','Fixed-Term') NOT NULL DEFAULT 'Permanent',
    `hire_date`             DATE              NULL,
    `termination_date`      DATE              NULL,
    `termination_reason`    VARCHAR(255)      NULL,
    `status`                ENUM('Active','On Leave','Suspended','Terminated') NOT NULL DEFAULT 'Active',
    -- Payroll
    `basic_salary`          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `tax_number`            VARCHAR(30)       NULL,
    `tax_threshold`         ENUM('Primary','Secondary','Tertiary','No Rebate') NOT NULL DEFAULT 'Primary',
    `uif_number`            VARCHAR(30)       NULL,
    -- Benefits
    `medical_aid`           VARCHAR(150)      NULL,
    `medical_members`       TINYINT UNSIGNED  NULL DEFAULT 0,
    `medical_contribution`  DECIMAL(10,2)     NULL DEFAULT 0.00,
    `pension_fund`          VARCHAR(150)      NULL,
    `pension_percent`       DECIMAL(5,2)      NULL DEFAULT 0.00,
    -- Banking
    `bank_name`             VARCHAR(100)      NULL,
    `account_number`        VARCHAR(50)       NULL,
    `branch_code`           VARCHAR(20)       NULL,
    `account_type`          VARCHAR(50)       NULL DEFAULT 'Savings',
    -- Performance
    `performance_rating`    DECIMAL(3,1)      NULL,
    `photo_path`            VARCHAR(500)      NULL,
    `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                   ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_emp_number` (`employee_number`),
    KEY          `idx_company`   (`company_id`),
    KEY          `idx_department`(`department_id`),
    KEY          `idx_status`    (`status`),
    CONSTRAINT   `fk_emp_company`    FOREIGN KEY (`company_id`)    REFERENCES `companies`(`id`)    ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT   `fk_emp_department` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT   `fk_emp_manager`    FOREIGN KEY (`manager_id`)    REFERENCES `employees`(`id`)   ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT   `fk_emp_user`       FOREIGN KEY (`user_id`)       REFERENCES `users`(`id`)       ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.8 Employee Allowances ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `employee_allowances` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`    INT UNSIGNED  NOT NULL,
    `type`           VARCHAR(80)   NOT NULL COMMENT 'e.g. Travel, Housing, Meal',
    `amount`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `effective_from` DATE              NULL,
    `effective_to`   DATE              NULL,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_allow_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.9 Employee Custom Benefits ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `employee_benefits` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`    INT UNSIGNED  NOT NULL,
    `name`           VARCHAR(150)  NOT NULL,
    `type`           ENUM('Allowance','Deduction','Reimbursement','CompanyContribution') NOT NULL,
    `calc`           ENUM('Fixed','Percentage') NOT NULL DEFAULT 'Fixed',
    `value`          DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    `effective_from` DATE              NULL,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_ben_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.10 Emergency Contacts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `emergency_contacts` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`  INT UNSIGNED  NOT NULL,
    `name`         VARCHAR(150)  NOT NULL,
    `relationship` VARCHAR(80)       NULL,
    `phone`        VARCHAR(30)   NOT NULL,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_ec_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.11 Salary History ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `salary_history` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `from_salary` DECIMAL(12,2) NOT NULL,
    `to_salary`   DECIMAL(12,2) NOT NULL,
    `reason`      VARCHAR(255)      NULL,
    `effective_date` DATE        NOT NULL,
    `approved_by` VARCHAR(150)      NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_sal_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.12 Leave Balances ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `leave_balances` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `leave_type`  ENUM('Annual','Sick','Family Responsibility','Study','Maternity','Paternity','Other') NOT NULL,
    `total_days`  DECIMAL(6,2)  NOT NULL DEFAULT 0.00,
    `taken_days`  DECIMAL(6,2)  NOT NULL DEFAULT 0.00,
    `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_emp_type` (`employee_id`, `leave_type`),
    CONSTRAINT   `fk_lb_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.13 Leave Requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `leave_requests` (
    `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`     INT UNSIGNED  NOT NULL,
    `leave_type`      ENUM('Annual','Sick','Family Responsibility','Study','Maternity','Paternity','Other') NOT NULL,
    `start_date`      DATE          NOT NULL,
    `end_date`        DATE          NOT NULL,
    `days`            DECIMAL(5,1)  NOT NULL DEFAULT 0.0,
    `reason`          TEXT              NULL,
    `status`          ENUM('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
    `approved_by`     VARCHAR(150)      NULL,
    `approved_at`     DATETIME          NULL,
    `rejection_reason`VARCHAR(500)      NULL,
    `submitted_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    KEY          `idx_status`   (`status`),
    KEY          `idx_dates`    (`start_date`, `end_date`),
    CONSTRAINT   `fk_lr_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.14 Overtime Requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `overtime_requests` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`  INT UNSIGNED  NOT NULL,
    `work_date`    DATE          NOT NULL,
    `hours`        DECIMAL(5,2)  NOT NULL,
    `rate`         DECIMAL(4,2)  NOT NULL DEFAULT 1.50 COMMENT '1.5 or 2.0',
    `reason`       VARCHAR(255)      NULL,
    `status`       ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    `approved_by`  VARCHAR(150)      NULL,
    `submitted_by` VARCHAR(150)      NULL,
    `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_ot_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.15 Timesheets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `timesheets` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `week_start`  DATE          NOT NULL,
    `hours`       JSON          NOT NULL COMMENT '[8,8,8,8,8] — Mon-Fri',
    `total_hours` DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    `status`      ENUM('Draft','Submitted','Approved') NOT NULL DEFAULT 'Draft',
    `approved_by` VARCHAR(150)      NULL,
    `approved_at` DATETIME          NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_emp_week` (`employee_id`, `week_start`),
    CONSTRAINT   `fk_ts_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.16 Shifts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `shifts` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `shift_date`  DATE          NOT NULL,
    `shift_type`  ENUM('Morning','Afternoon','Night','Off') NOT NULL DEFAULT 'Morning',
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_emp_date` (`employee_id`, `shift_date`),
    CONSTRAINT   `fk_sh_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.17 SARS Tax Tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tax_tables` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `tax_year`    VARCHAR(10)   NOT NULL COMMENT 'e.g. 2025',
    `min_income`  DECIMAL(15,2) NOT NULL,
    `max_income`  DECIMAL(15,2) NOT NULL,
    `rate`        DECIMAL(6,4)  NOT NULL COMMENT '0.1800 = 18%',
    `base_tax`    DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Cumulative tax on lower limit',
    PRIMARY KEY  (`id`),
    KEY          `idx_year` (`tax_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='SARS annual income tax brackets — update each March';

-- ── 2.18 Payroll Calendars ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payroll_calendars` (
    `id`                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `company_id`          INT UNSIGNED  NOT NULL,
    `payroll_frequency`   ENUM('Weekly','Fortnightly','Bi-Weekly','Monthly') NOT NULL DEFAULT 'Monthly',
    `pay_day`             TINYINT UNSIGNED NULL COMMENT 'Day of month e.g. 25',
    `input_cut_off`       TINYINT UNSIGNED NULL,
    `approval_cut_off`    TINYINT UNSIGNED NULL,
    `reminder_days`       JSON              NULL COMMENT '[15,18,20]',
    `next_payroll_date`   DATE              NULL,
    `next_cut_off_date`   DATE              NULL,
    `updated_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    UNIQUE KEY   `uq_company` (`company_id`),
    CONSTRAINT   `fk_cal_company` FOREIGN KEY (`company_id`)
                 REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.19 Payroll Runs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payroll_runs` (
    `id`               VARCHAR(60)   NOT NULL COMMENT 'RUN_<timestamp>',
    `company_id`       INT UNSIGNED  NOT NULL,
    `company_name`     VARCHAR(255)  NOT NULL,
    `period`           VARCHAR(40)   NOT NULL COMMENT 'e.g. January 2026',
    `run_type`         ENUM('Regular','Bonus','Retro','Termination','Correction','Ad-Hoc') NOT NULL DEFAULT 'Regular',
    `status`           ENUM('Draft','Pending Approval','Approved','Finalized','Paid','Rolled Back') NOT NULL DEFAULT 'Draft',
    `locked`           TINYINT(1)    NOT NULL DEFAULT 0,
    `approval_token`   VARCHAR(64)       NULL COMMENT 'Secure token for email approve link',
    `approval_sent_at` DATETIME          NULL,
    `approved_at`      DATETIME          NULL,
    `approved_by`      VARCHAR(150)      NULL,
    `paid_at`          DATETIME          NULL,
    `paid_by`          VARCHAR(150)      NULL,
    `total_gross`      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_net`        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_paye`       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_uif`        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_sdl`        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `employee_count`   INT UNSIGNED  NOT NULL DEFAULT 0,
    `notes`            TEXT              NULL,
    `created_by`       VARCHAR(150)      NULL,
    `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_company`  (`company_id`),
    KEY          `idx_status`   (`status`),
    KEY          `idx_period`   (`period`),
    CONSTRAINT   `fk_run_company` FOREIGN KEY (`company_id`)
                 REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.20 Payroll Run Lines (per-employee detail) ───────────────────────────
CREATE TABLE IF NOT EXISTS `payroll_run_lines` (
    `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `run_id`            VARCHAR(60)   NOT NULL,
    `employee_id`       INT UNSIGNED  NOT NULL,
    `employee_name`     VARCHAR(200)  NOT NULL,
    `company_name`      VARCHAR(255)      NULL,
    `basic`             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `allowances`        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `bonus`             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `gross`             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `paye`              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `uif`               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `sdl`               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `pension`           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `medical`           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `other_deductions`  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `garnishee`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `net`               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `custom_benefits`   JSON              NULL,
    `period`            VARCHAR(40)       NULL,
    PRIMARY KEY  (`id`),
    KEY          `idx_run`      (`run_id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_line_run` FOREIGN KEY (`run_id`)
                 REFERENCES `payroll_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT   `fk_line_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.21 Payslips (link table + metadata) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `payslips` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `run_id`      VARCHAR(60)   NOT NULL,
    `line_id`     INT UNSIGNED      NULL,
    `employee_id` INT UNSIGNED  NOT NULL,
    `period`      VARCHAR(40)       NULL,
    `emailed`     TINYINT(1)    NOT NULL DEFAULT 0,
    `emailed_at`  DATETIME          NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_run`      (`run_id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_ps_run` FOREIGN KEY (`run_id`)
                 REFERENCES `payroll_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT   `fk_ps_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.22 Performance Reviews ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `performance_reviews` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `period`      VARCHAR(50)   NOT NULL,
    `score`       DECIMAL(3,1)      NULL,
    `reviewer`    VARCHAR(150)      NULL,
    `feedback`    TEXT              NULL,
    `status`      ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
    `review_date` DATE              NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_pr_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.23 Performance Goals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `performance_goals` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `title`       VARCHAR(255)  NOT NULL,
    `progress`    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `status`      ENUM('On Track','At Risk','Achieved','Not Met') NOT NULL DEFAULT 'On Track',
    `due_date`    DATE              NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_pg_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.24 Training Records ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `training_records` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `course`      VARCHAR(255)  NOT NULL,
    `provider`    VARCHAR(255)      NULL,
    `train_date`  DATE              NULL,
    `duration`    VARCHAR(50)       NULL,
    `cost`        DECIMAL(10,2)     NULL DEFAULT 0.00,
    `status`      ENUM('Enrolled','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Enrolled',
    `completed_at`DATETIME          NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_tr_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.25 Recruitment — Jobs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `recruitment_jobs` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `company_id`   INT UNSIGNED      NULL,
    `department_id`INT UNSIGNED      NULL,
    `title`        VARCHAR(200)  NOT NULL,
    `location`     VARCHAR(100)      NULL,
    `job_type`     ENUM('Permanent','Contract','Part-Time','Intern') NOT NULL DEFAULT 'Permanent',
    `salary_range` VARCHAR(60)       NULL,
    `status`       ENUM('Open','Active','Filled','On Hold','Cancelled') NOT NULL DEFAULT 'Open',
    `applicant_count` INT UNSIGNED   NOT NULL DEFAULT 0,
    `posted_date`  DATE              NULL,
    `closing_date` DATE              NULL,
    `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_company` (`company_id`),
    CONSTRAINT   `fk_job_company` FOREIGN KEY (`company_id`)
                 REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT   `fk_job_dept` FOREIGN KEY (`department_id`)
                 REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.26 Recruitment — Applicants ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `recruitment_applicants` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `job_id`     INT UNSIGNED  NOT NULL,
    `name`       VARCHAR(150)  NOT NULL,
    `email`      VARCHAR(255)      NULL,
    `phone`      VARCHAR(30)       NULL,
    `stage`      ENUM('Applied','Screening','Interview','Assessment','Offer','Hired','Rejected') NOT NULL DEFAULT 'Applied',
    `rating`     TINYINT UNSIGNED  NULL CHECK (`rating` BETWEEN 1 AND 5),
    `notes`      TEXT              NULL,
    `applied_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_job`   (`job_id`),
    KEY          `idx_stage` (`stage`),
    CONSTRAINT   `fk_app_job` FOREIGN KEY (`job_id`)
                 REFERENCES `recruitment_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.27 Onboarding ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `onboarding` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`  INT UNSIGNED      NULL,
    `employee_name`VARCHAR(150)  NOT NULL,
    `position`     VARCHAR(150)      NULL,
    `start_date`   DATE              NULL,
    `progress`     TINYINT UNSIGNED  NOT NULL DEFAULT 0,
    `status`       ENUM('Not Started','In Progress','Completed') NOT NULL DEFAULT 'Not Started',
    `tasks`        JSON              NULL,
    `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_ob_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.28 Offboarding ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `offboarding` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`   INT UNSIGNED      NULL,
    `employee_name` VARCHAR(150)  NOT NULL,
    `position`      VARCHAR(150)      NULL,
    `exit_date`     DATE              NULL,
    `exit_reason`   VARCHAR(255)      NULL,
    `progress`      TINYINT UNSIGNED  NOT NULL DEFAULT 0,
    `status`        VARCHAR(100)  NOT NULL DEFAULT 'Initiated',
    `tasks`         JSON              NULL,
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_off_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.29 Disciplinary Cases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `disciplinary_cases` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id` INT UNSIGNED  NOT NULL,
    `type`        VARCHAR(100)  NOT NULL,
    `case_date`   DATE          NOT NULL,
    `details`     TEXT              NULL,
    `outcome`     TEXT              NULL,
    `status`      ENUM('Open','Closed','Appealed') NOT NULL DEFAULT 'Open',
    `created_by`  VARCHAR(150)      NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_disc_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.30 Succession Plans ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `succession_plans` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `role`          VARCHAR(200)  NOT NULL,
    `incumbent_id`  INT UNSIGNED      NULL,
    `successor_id`  INT UNSIGNED      NULL,
    `readiness`     ENUM('Ready Now','1-2 Years','3-5 Years','Not Ready') NOT NULL DEFAULT '1-2 Years',
    `created_by`    VARCHAR(150)      NULL,
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    CONSTRAINT   `fk_suc_incumbent` FOREIGN KEY (`incumbent_id`)
                 REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT   `fk_suc_successor` FOREIGN KEY (`successor_id`)
                 REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.31 Engagement Surveys ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `surveys` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `title`       VARCHAR(255)  NOT NULL,
    `questions`   JSON              NULL,
    `deadline`    DATE              NULL,
    `status`      ENUM('Draft','Active','Closed') NOT NULL DEFAULT 'Draft',
    `responses`   INT UNSIGNED  NOT NULL DEFAULT 0,
    `created_by`  VARCHAR(150)      NULL,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.32 Contracts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contracts` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`   INT UNSIGNED      NULL,
    `first_name`    VARCHAR(100)  NOT NULL,
    `last_name`     VARCHAR(100)  NOT NULL,
    `id_number`     VARCHAR(13)       NULL,
    `dob`           DATE              NULL,
    `gender`        VARCHAR(30)       NULL,
    `email`         VARCHAR(255)      NULL,
    `phone`         VARCHAR(30)       NULL,
    `address`       TEXT              NULL,
    `contract_type` ENUM('Permanent','Contractor','Part Time') NOT NULL DEFAULT 'Permanent',
    `company_name`  VARCHAR(255)      NULL,
    `generated_by`  VARCHAR(150)      NULL,
    `generated_on`  DATE          NOT NULL DEFAULT (CURRENT_DATE),
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_employee` (`employee_id`),
    CONSTRAINT   `fk_con_emp` FOREIGN KEY (`employee_id`)
                 REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.33 System Settings ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `system_settings` (
    `setting_key`   VARCHAR(100)  NOT NULL,
    `setting_value` TEXT              NULL,
    `label`         VARCHAR(150)      NULL,
    `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.34 Notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `username`   VARCHAR(100)      NULL,
    `title`      VARCHAR(200)  NOT NULL,
    `message`    TEXT          NOT NULL,
    `type`       ENUM('leave','payroll','system','alert','info') NOT NULL DEFAULT 'info',
    `is_read`    TINYINT(1)    NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`),
    KEY          `idx_username` (`username`),
    KEY          `idx_read`     (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.35 Billing Rates ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `billing_rates` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `service_type`   VARCHAR(100)  NOT NULL,
    `rate`           DECIMAL(10,2) NOT NULL,
    `company_id`     INT UNSIGNED      NULL COMMENT 'NULL = default rate',
    `effective_from` DATE              NULL,
    `effective_to`   DATE              NULL,
    PRIMARY KEY  (`id`),
    KEY          `idx_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2.36 Workflow Rules ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `workflow_rules` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(200)  NOT NULL,
    `trigger`    VARCHAR(100)      NULL,
    `condition`  TEXT              NULL,
    `action`     TEXT              NULL,
    `status`     ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SECTION 3 — SEED DATA
-- ============================================================

-- ── 3.1 Roles ──────────────────────────────────────────────────────────────
INSERT INTO `roles` (`id`, `name`, `description`, `permissions`) VALUES
(1, 'Super Admin',     'Full unrestricted system access',              '["all"]'),
(2, 'HR Manager',      'Employee records and payroll read access',     '["employees.view","employees.edit","payroll.view","reports.view"]'),
(3, 'Payroll Officer', 'Process payroll and view tax compliance',      '["payroll.process","tax.view"]'),
(4, 'Employee',        'Self-service portal only',                     '["self.view"]')
ON DUPLICATE KEY UPDATE `permissions` = VALUES(`permissions`);

-- ── 3.2 System Users ───────────────────────────────────────────────────────
-- Passwords are stored as bcrypt hashes.
-- Plaintext for first login: admin=admin, payroll=payroll, hr=hr
-- CHANGE THESE IMMEDIATELY after first login.
INSERT INTO `users` (`id`, `username`, `password_hash`, `role_id`, `name`, `email`, `status`) VALUES
(1, 'admin',   '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'Administrator',   '', 'Active'),
(2, 'payroll', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 'Payroll Officer',  '', 'Active'),
(3, 'hr',      '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, 'HR Manager',       '', 'Active')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- ── 3.3 SARS Tax Tables 2025/2026 (1 Mar 2025 – 28 Feb 2026) ──────────────
INSERT INTO `tax_tables` (`tax_year`, `min_income`, `max_income`, `rate`, `base_tax`) VALUES
('2025', 0.00,       237100.00,    0.1800, 0.00),
('2025', 237100.01,  370500.00,    0.2600, 42678.00),
('2025', 370500.01,  512800.00,    0.3100, 77362.00),
('2025', 512800.01,  673000.00,    0.3600, 121475.00),
('2025', 673000.01,  857900.00,    0.3900, 179147.00),
('2025', 857900.01,  1817000.00,   0.4100, 251258.00),
('2025', 1817000.01, 99999999.99,  0.4500, 644489.00)
ON DUPLICATE KEY UPDATE `rate` = VALUES(`rate`);

-- ── 3.4 System Settings ────────────────────────────────────────────────────
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `label`) VALUES
('company_name',        '',                           'Company Name'),
('primary_color',       '#4f46e5',                    'Primary Colour'),
('timezone',            'Africa/Johannesburg',        'System Timezone'),
('notif_email',         'true',                       'Email Notifications'),
('notif_inapp',         'true',                       'In-App Notifications'),
('uif_ceiling_monthly', '17712.00',                   'UIF Monthly Ceiling (ZAR)'),
('sdl_rate',            '0.01',                       'SDL Rate'),
('uif_rate',            '0.01',                       'UIF Rate'),
('retirement_cap_pct',  '27.5',                       'Retirement Fund Deduction Cap %'),
('retirement_cap_zar',  '350000.00',                  'Retirement Fund Deduction Cap (annual ZAR)'),
('primary_rebate',      '17235.00',                   'SARS Primary Rebate 2025'),
('secondary_rebate',    '9444.00',                    'SARS Secondary Rebate 2025 (age 65-74)'),
('tertiary_rebate',     '3145.00',                    'SARS Tertiary Rebate 2025 (age 75+)'),
('mtc_main',            '364.00',                     'Medical Tax Credit — main member'),
('mtc_first_dep',       '364.00',                     'Medical Tax Credit — first dependent'),
('mtc_add_dep',         '246.00',                     'Medical Tax Credit — each additional')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ── 3.5 Default Workflow Rules ─────────────────────────────────────────────
INSERT INTO `workflow_rules` (`name`, `trigger`, `condition`, `action`, `status`) VALUES
('Leave Approval > 5 Days', 'Leave Request',   'days > 5',      'Require Manager Approval', 'Active'),
('High Value Expense',       'Expense Claim',   'amount > 5000', 'Require CFO Approval',     'Active'),
('New Hire Onboarding',      'Employee Created','always',        'Start Onboarding Checklist','Active')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- ── 3.6 Default Billing Rates ──────────────────────────────────────────────
INSERT INTO `billing_rates` (`service_type`, `rate`) VALUES
('Per Employee Per Month',  50.00),
('Setup Fee (once-off)',    500.00),
('Ad-Hoc Payroll Run',     200.00),
('SARS Tax Submission',    150.00),
('Report Generation',      100.00)
ON DUPLICATE KEY UPDATE `rate` = VALUES(`rate`);

-- ============================================================
-- RE-ENABLE FOREIGN KEYS
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- QUICK REFERENCE
-- ============================================================
-- Tables created (37 total):
--
-- SYSTEM (PHP direct):
--   system_storage        auth_sessions         audit_log
--   documents             leave_accrual_log
--
-- ORGANISATION:
--   companies             departments           locations
--   cost_centres          roles                 users
--
-- WORKFORCE:
--   employees             employee_allowances   employee_benefits
--   emergency_contacts    salary_history
--
-- LEAVE & ATTENDANCE:
--   leave_balances        leave_requests        overtime_requests
--   timesheets            shifts
--
-- PAYROLL & TAX:
--   tax_tables            payroll_calendars     payroll_runs
--   payroll_run_lines     payslips
--
-- PERFORMANCE & DEVELOPMENT:
--   performance_reviews   performance_goals
--   training_records
--
-- TALENT:
--   recruitment_jobs      recruitment_applicants
--   onboarding            offboarding
--   disciplinary_cases    succession_plans
--
-- SYSTEM CONFIG:
--   contracts             surveys               notifications
--   billing_rates         workflow_rules        system_settings
-- ============================================================