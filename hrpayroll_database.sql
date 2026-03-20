-- ============================================================
-- Nexa HR & Payroll - Full Database Schema & Seed Data
-- Database: MySQL 8.0 / MariaDB 10.6+
-- Generated: 2026-03-12
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ============================================================
-- SCHEMA
-- ============================================================

CREATE DATABASE IF NOT EXISTS nexa_hrpayroll CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexa_hrpayroll;


-- ------------------------------------------------------------
-- 1. Companies
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(255)  NOT NULL,
  registration_number VARCHAR(50) UNIQUE,
  tax_reference     VARCHAR(50),
  uif_number        VARCHAR(50),
  sdl_number        VARCHAR(50),
  sars_branch_code  VARCHAR(20),
  bee_level         VARCHAR(20),
  country           CHAR(2)       NOT NULL DEFAULT 'ZA',
  address           TEXT,
  contact           VARCHAR(50),
  status            ENUM('Active','Inactive','Suspended') NOT NULL DEFAULT 'Active',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. Company Banking
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_banking (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  company_id      INT NOT NULL,
  bank_name       VARCHAR(100),
  account_number  VARCHAR(50),
  branch_code     VARCHAR(20),
  account_type    VARCHAR(50),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. Departments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  company_id  INT,
  name        VARCHAR(100)  NOT NULL,
  code        VARCHAR(20),
  manager     VARCHAR(100),
  budget      DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 4. Locations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  company_id  INT,
  name        VARCHAR(100),
  address     TEXT,
  type        ENUM('Headquarters','Branch','Virtual') DEFAULT 'Branch',
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 5. Cost Centers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cost_centers (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  code    VARCHAR(20)  UNIQUE NOT NULL,
  name    VARCHAR(100),
  status  ENUM('Active','Inactive') DEFAULT 'Active'
);

-- ------------------------------------------------------------
-- 6. Roles & Permissions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSON
);

-- ------------------------------------------------------------
-- 7. Users (System login accounts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'Store bcrypt hash, never plain text',
  role_id       INT,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE,
  status        ENUM('Active','Inactive','Locked') DEFAULT 'Active',
  last_login    DATETIME,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 8. Employees
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  employee_number   VARCHAR(20) UNIQUE NOT NULL,
  company_id        INT,
  department_id     INT,
  user_id           INT UNIQUE COMMENT 'Linked portal login',
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  id_number         VARCHAR(20)  UNIQUE,
  date_of_birth     DATE,
  gender            ENUM('Male','Female','Other','Prefer not to say'),
  race              VARCHAR(50) COMMENT 'EEA reporting field',
  email             VARCHAR(255),
  phone             VARCHAR(30),
  address           TEXT,
  position          VARCHAR(150),
  employment_type   ENUM('Permanent','Contract','Part-Time','Intern','Fixed-Term') DEFAULT 'Permanent',
  manager_id        INT COMMENT 'Self-referencing FK',
  hire_date         DATE,
  termination_date  DATE,
  basic_salary      DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_number        VARCHAR(30),
  tax_threshold     ENUM('Primary','Secondary','Tertiary','No Rebate') DEFAULT 'Primary',
  uif_number        VARCHAR(30),
  medical_aid_tax_credit  BOOLEAN DEFAULT FALSE,
  medical_dependents      TINYINT DEFAULT 0,
  performance_rating      DECIMAL(3,1),
  status                  ENUM('Active','On Leave','Terminated','Suspended') DEFAULT 'Active',
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id)    REFERENCES companies(id)    ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE SET NULL,
  FOREIGN KEY (manager_id)    REFERENCES employees(id)   ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 8b. Employee Allowances
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_allowances (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  type          VARCHAR(80)   NOT NULL COMMENT 'e.g. travel, housing, meal, car',
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  effective_from DATE,
  effective_to   DATE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 8c. Employee Benefits
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_benefits (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT NOT NULL,
  medical_aid     VARCHAR(150),
  medical_members TINYINT DEFAULT 0,
  pension_fund    VARCHAR(150),
  pension_percent DECIMAL(5,2),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 8d. Employee Banking
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_banking (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT NOT NULL UNIQUE,
  bank_name       VARCHAR(100),
  account_number  VARCHAR(50),
  branch_code     VARCHAR(20),
  account_type    VARCHAR(50) DEFAULT 'Savings',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 8e. Employee Skills
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_skills (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  skill_name    VARCHAR(100),
  level         ENUM('Beginner','Intermediate','Expert') DEFAULT 'Intermediate',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 9. Leave Balances
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_balances (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  leave_type    ENUM('Annual','Sick','Family Responsibility','Maternity','Paternity','Other') NOT NULL,
  total         DECIMAL(5,1) NOT NULL DEFAULT 0,
  taken         DECIMAL(5,1) NOT NULL DEFAULT 0,
  remaining     DECIMAL(5,1) GENERATED ALWAYS AS (total - taken) STORED,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 10. Leave Requests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  leave_type    ENUM('Annual','Sick','Family Responsibility','Maternity','Paternity','Other') NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days          DECIMAL(4,1),
  reason        TEXT,
  status        ENUM('Pending','Approved','Rejected','Cancelled') DEFAULT 'Pending',
  approved_by   INT COMMENT 'User ID of approver',
  approved_at   DATETIME,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id)  REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by)  REFERENCES users(id)     ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 11. Tax Tables (SARS PAYE brackets)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tax_tables (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tax_year      YEAR NOT NULL,
  min_income    DECIMAL(12,2) NOT NULL,
  max_income    DECIMAL(12,2) NOT NULL,
  rate          DECIMAL(5,4)  NOT NULL COMMENT 'e.g. 0.18 for 18%',
  rebate        DECIMAL(12,2) NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 12. Payroll Periods
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_periods (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  company_id    INT,
  name          VARCHAR(100) NOT NULL,
  period_type   ENUM('Monthly','Weekly','Bi-Weekly','Fortnightly') DEFAULT 'Monthly',
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  pay_date      DATE,
  status        ENUM('Open','Closed','Processed') DEFAULT 'Open',
  total_gross   DECIMAL(15,2) DEFAULT 0,
  total_paye    DECIMAL(15,2) DEFAULT 0,
  total_uif     DECIMAL(15,2) DEFAULT 0,
  total_sdl     DECIMAL(15,2) DEFAULT 0,
  total_net     DECIMAL(15,2) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 13. Payroll Runs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  company_id        INT NOT NULL,
  period_id         INT,
  run_type          ENUM('Regular','Bonus','Correction','Termination','Ad-Hoc') DEFAULT 'Regular',
  period_label      VARCHAR(100) NOT NULL,
  status            ENUM('Draft','Pending Validation','Validated','Pending Approval','Approved','Finalized','Paid') DEFAULT 'Draft',
  created_by        INT,
  approved_by       INT,
  finalized_by      INT,
  created_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_date     DATETIME,
  finalized_date    DATETIME,
  locked            BOOLEAN DEFAULT FALSE,
  version           INT DEFAULT 1,
  parent_run_id     INT COMMENT 'For correction payrolls',
  correction_reason TEXT,
  total_gross       DECIMAL(15,2) DEFAULT 0,
  total_net         DECIMAL(15,2) DEFAULT 0,
  total_paye        DECIMAL(15,2) DEFAULT 0,
  total_uif         DECIMAL(15,2) DEFAULT 0,
  total_sdl         DECIMAL(15,2) DEFAULT 0,
  employee_count    INT DEFAULT 0,
  notes             TEXT,
  FOREIGN KEY (company_id)    REFERENCES companies(id)      ON DELETE RESTRICT,
  FOREIGN KEY (period_id)     REFERENCES payroll_periods(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)    REFERENCES users(id)           ON DELETE SET NULL,
  FOREIGN KEY (approved_by)   REFERENCES users(id)           ON DELETE SET NULL,
  FOREIGN KEY (finalized_by)  REFERENCES users(id)           ON DELETE SET NULL,
  FOREIGN KEY (parent_run_id) REFERENCES payroll_runs(id)    ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 14. Payroll Run Lines (per-employee pay details)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_run_lines (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  run_id            INT NOT NULL,
  employee_id       INT NOT NULL,
  basic_salary      DECIMAL(12,2) DEFAULT 0,
  total_allowances  DECIMAL(12,2) DEFAULT 0,
  gross_pay         DECIMAL(12,2) DEFAULT 0,
  total_deductions  DECIMAL(12,2) DEFAULT 0,
  paye              DECIMAL(12,2) DEFAULT 0,
  uif_employee      DECIMAL(12,2) DEFAULT 0,
  uif_employer      DECIMAL(12,2) DEFAULT 0,
  sdl               DECIMAL(12,2) DEFAULT 0,
  pension           DECIMAL(12,2) DEFAULT 0,
  medical_aid       DECIMAL(12,2) DEFAULT 0,
  net_pay           DECIMAL(12,2) DEFAULT 0,
  allowances_json   JSON COMMENT 'Itemised allowances snapshot',
  deductions_json   JSON COMMENT 'Itemised deductions snapshot',
  FOREIGN KEY (run_id)      REFERENCES payroll_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)    ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 15. Payslips
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payslips (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  run_id          INT NOT NULL,
  line_id         INT NOT NULL UNIQUE,
  employee_id     INT NOT NULL,
  issued_date     DATE,
  pdf_path        VARCHAR(500) COMMENT 'File system path or cloud storage key',
  emailed         BOOLEAN DEFAULT FALSE,
  emailed_at      DATETIME,
  FOREIGN KEY (run_id)      REFERENCES payroll_runs(id)      ON DELETE CASCADE,
  FOREIGN KEY (line_id)     REFERENCES payroll_run_lines(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)         ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 16. Recruitment - Jobs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recruitment_jobs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  company_id      INT,
  department_id   INT,
  title           VARCHAR(150) NOT NULL,
  location_id     INT,
  job_type        ENUM('Permanent','Contract','Part-Time','Intern') DEFAULT 'Permanent',
  salary_range    VARCHAR(50),
  status          ENUM('Open','Active','Filled','Cancelled') DEFAULT 'Open',
  applicant_count INT DEFAULT 0,
  posted_date     DATE,
  closing_date    DATE,
  FOREIGN KEY (company_id)    REFERENCES companies(id)   ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id)   REFERENCES locations(id)   ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 17. Recruitment - Applicants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recruitment_applicants (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  job_id      INT NOT NULL,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(255),
  phone       VARCHAR(30),
  stage       ENUM('Applied','Screening','Interview','Assessment','Offer','Hired','Rejected') DEFAULT 'Applied',
  rating      TINYINT CHECK (rating BETWEEN 1 AND 5),
  notes       TEXT,
  applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 18. Onboarding Tasks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT,
  employee_name VARCHAR(150),
  position      VARCHAR(150),
  start_date    DATE,
  progress      TINYINT DEFAULT 0 COMMENT 'Percentage 0-100',
  status        ENUM('Not Started','In Progress','Completed') DEFAULT 'Not Started',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 19. Offboarding
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offboarding (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT,
  employee_name   VARCHAR(150),
  position        VARCHAR(150),
  exit_date       DATE,
  exit_reason     VARCHAR(255),
  progress        TINYINT DEFAULT 0,
  status          VARCHAR(80) DEFAULT 'Pending Final Pay',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 20. Performance Reviews
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_reviews (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  period        VARCHAR(50)   NOT NULL,
  score         DECIMAL(3,1),
  reviewer      VARCHAR(150),
  status        ENUM('Pending','In Progress','Completed') DEFAULT 'Pending',
  review_date   DATE,
  notes         TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 21. Performance Goals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_goals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  progress      TINYINT DEFAULT 0,
  status        ENUM('On Track','At Risk','Achieved','Not Met') DEFAULT 'On Track',
  due_date      DATE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 22. Documents
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT COMMENT 'NULL for company-wide docs',
  company_id    INT,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(80),
  file_size     VARCHAR(20),
  file_path     VARCHAR(500),
  upload_date   DATE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)  ON DELETE SET NULL,
  FOREIGN KEY (company_id)  REFERENCES companies(id)  ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 23. Notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        ENUM('leave','payroll','system','alert','info') DEFAULT 'info',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 24. Audit Logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  user_name   VARCHAR(150),
  action      VARCHAR(150) NOT NULL,
  module      VARCHAR(80),
  details     JSON,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 25. Payroll Calendars
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_calendars (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  company_id          INT NOT NULL UNIQUE,
  payroll_frequency   ENUM('Weekly','Bi-Weekly','Fortnightly','Monthly') DEFAULT 'Monthly',
  pay_day             TINYINT COMMENT 'Day of month, e.g. 25',
  input_cut_off       TINYINT,
  approval_cut_off    TINYINT,
  reminder_days       JSON COMMENT 'e.g. [15, 18, 20]',
  next_payroll_date   DATE,
  next_cut_off_date   DATE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 26. Billing Rates (per service type)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_rates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  company_id      INT,
  service_type    VARCHAR(100) NOT NULL,
  rate            DECIMAL(10,2) NOT NULL,
  effective_from  DATE,
  effective_to    DATE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 27. Time & Attendance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_attendance (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT NOT NULL,
  work_date       DATE NOT NULL,
  clock_in        DATETIME,
  clock_out       DATETIME,
  hours_worked    DECIMAL(5,2) GENERATED ALWAYS AS (
                    TIMESTAMPDIFF(MINUTE, clock_in, clock_out) / 60
                  ) STORED,
  overtime_hours  DECIMAL(5,2) DEFAULT 0,
  status          ENUM('Present','Absent','Late','Half Day','On Leave') DEFAULT 'Present',
  notes           VARCHAR(255),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 28. Workflow Rules
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_rules (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  trigger     VARCHAR(100),
  `condition` TEXT,
  action      TEXT,
  status      ENUM('Active','Inactive') DEFAULT 'Active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 29. System Settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key     VARCHAR(100) PRIMARY KEY,
  setting_value   TEXT,
  label           VARCHAR(150),
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- SEED DATA
-- ============================================================

-- Companies
INSERT INTO companies (id, name, registration_number, tax_reference, uif_number, sdl_number, sars_branch_code, bee_level, country, address, contact, status)
VALUES
  (1, 'Acme Corp SA',        '2015/123456/07', '9123456789', 'UIF12345678', 'SDL1234567', '012345', 'Level 4', 'ZA', '123 Main Street, Sandton, Johannesburg, 2196', '+27 11 123 4567', 'Active'),
  (2, 'Tech Innovations SA', '2018/987654/07', '9123456790', 'UIF12345679', NULL,         '012346', 'Level 2', 'ZA', '456 Tech Park, Century City, Cape Town, 7441',  '+27 21 987 6543', 'Active');

-- Company Banking
INSERT INTO company_banking (company_id, bank_name, account_number, branch_code, account_type)
VALUES (1, 'First National Bank', '62012345678', '250655', 'Business Cheque');

-- Departments
INSERT INTO departments (id, company_id, name, code, manager, budget)
VALUES
  (1, 1, 'Information Technology', 'IT',  'Michael Chen',       1500000),
  (2, 1, 'Finance',                'FIN', 'Sarah Van der Merwe', 1200000),
  (3, 1, 'Human Resources',        'HR',  'Admin User',          800000),
  (4, 1, 'Operations',             'OPS', 'TBD',                 2000000);

-- Locations
INSERT INTO locations (id, company_id, name, address, type)
VALUES
  (1, 1, 'Johannesburg HQ',   '123 Main St, Sandton',         'Headquarters'),
  (2, 2, 'Cape Town Branch',  '456 Tech Park, Century City',  'Branch'),
  (3, NULL, 'Remote',         'N/A',                          'Virtual');

-- Cost Centers
INSERT INTO cost_centers (code, name, status)
VALUES
  ('CC001', 'Development',     'Active'),
  ('CC002', 'Administration',  'Active'),
  ('CC003', 'Sales',           'Active');

-- Roles
INSERT INTO roles (id, name, description, permissions)
VALUES
  (1, 'Super Admin',      'Full system access',                         '["all"]'),
  (2, 'HR Manager',       'Access to employee and payroll data',        '["employees.view","employees.edit","payroll.view","reports.view"]'),
  (3, 'Payroll Officer',  'Process payroll and tax',                    '["payroll.process","tax.view"]'),
  (4, 'Employee',         'Self-service access only',                   '["self.view"]');

-- Users (passwords should be bcrypt-hashed in production)
INSERT INTO users (id, username, password_hash, role_id, name, email, status, last_login)
VALUES
  (1, 'admin',    '$2b$12$PLACEHOLDER_HASH_admin',    1, 'Admin User',          'admin@acmecorp.co.za',    'Active', '2025-01-25 09:15:00'),
  (2, 'payroll',  '$2b$12$PLACEHOLDER_HASH_payroll',  3, 'Thandi Nkosi',        'payroll@acmecorp.co.za',  'Active', '2025-01-24 14:30:00'),
  (3, 'emp001',   '$2b$12$PLACEHOLDER_HASH_emp001',   4, 'Thabo Mokoena',       NULL,                      'Active', '2025-01-25 08:45:00'),
  (4, 'manager1', '$2b$12$PLACEHOLDER_HASH_mgr1',     2, 'Michael Chen',        NULL,                      'Active', '2025-01-23 11:20:00');

-- Employees
INSERT INTO employees (id, employee_number, company_id, department_id, user_id, first_name, last_name, id_number, date_of_birth, gender, race, email, phone, address, position, employment_type, manager_id, hire_date, basic_salary, tax_number, tax_threshold, uif_number, medical_aid_tax_credit, medical_dependents, performance_rating, status)
VALUES
  (1, 'EMP001', 1, 1, 3, 'Thabo',   'Mokoena',       '8501015023088', '1985-01-01', 'Male',   'African', 'thabo.mokoena@acmecorp.co.za', '+27 82 123 4567', '456 Oak Avenue, Randburg, 2194', 'Senior Full Stack Developer', 'Permanent', 5, '2020-03-15', 65000.00, '1234567890', 'Primary', 'UF12345678', TRUE,  2, 4.7, 'Active'),
  (2, 'EMP002', 1, 2, NULL,'Sarah',  'Van der Merwe', '9002025018088', '1990-02-02', 'Female', 'White',   'sarah.vdm@acmecorp.co.za',     NULL,              NULL,                            'Senior Accountant',          'Permanent', 3, '2021-06-01', 55000.00, NULL,         'Primary', NULL,         FALSE, 0, NULL, 'Active'),
  (5, 'MNG001', 1, 1, 4, 'Michael', 'Chen',           NULL,            NULL,         NULL,     NULL,      'michael.chen@acmecorp.co.za',  NULL,              NULL,                            'IT Manager',                 'Permanent', NULL,'2019-08-01', 85000.00, NULL,         'Primary', NULL,         FALSE, 0, NULL, 'Active');

-- Employee Allowances
INSERT INTO employee_allowances (employee_id, type, amount)
VALUES
  (1, 'travel',        3500),
  (1, 'housing',       8000),
  (1, 'communication', 1500),
  (1, 'meal',          1000),
  (2, 'travel',        2500),
  (2, 'housing',       6000),
  (2, 'car',           4000);

-- Employee Benefits
INSERT INTO employee_benefits (employee_id, medical_aid, medical_members, pension_fund, pension_percent)
VALUES
  (1, 'Discovery Health Classic Comprehensive', 3, 'Allan Gray', 7.5),
  (2, 'Momentum Health',                        1, 'Sanlam',    7.5);

-- Employee Banking
INSERT INTO employee_banking (employee_id, bank_name, account_number, branch_code)
VALUES
  (1, 'FNB', '62123456789', '250655');

-- Employee Skills
INSERT INTO employee_skills (employee_id, skill_name, level)
VALUES
  (1, 'JavaScript', 'Expert'),
  (1, 'React',      'Expert');

-- Leave Balances
INSERT INTO leave_balances (employee_id, leave_type, total, taken)
VALUES
  (1, 'Annual',               21, 3),
  (1, 'Sick',                 30, 2),
  (1, 'Family Responsibility',  3, 0);

-- Leave Requests
INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status)
VALUES
  (1, 'Annual', '2025-02-10', '2025-02-14', 5, 'Family vacation', 'Approved');

-- Tax Tables (SARS 2025)
INSERT INTO tax_tables (tax_year, min_income, max_income, rate, rebate)
VALUES
  (2025, 0,         237100,     0.18, 0),
  (2025, 237101,    370500,     0.26, 42678),
  (2025, 370501,    512800,     0.31, 77362),
  (2025, 512801,    673000,     0.36, 121475),
  (2025, 673001,    857900,     0.39, 179147),
  (2025, 857901,    1817000,    0.41, 251258),
  (2025, 1817001,   999999999,  0.45, 644489);

-- Payroll Periods
INSERT INTO payroll_periods (id, company_id, name, start_date, end_date, pay_date, status, total_gross, total_paye, total_uif, total_sdl, total_net)
VALUES
  (1, 1, 'January 2025', '2025-01-01', '2025-01-31', '2025-01-25', 'Processed', 4250000, 945320, 22150, 42500, 3189030);

-- Recruitment Jobs
INSERT INTO recruitment_jobs (company_id, department_id, title, job_type, salary_range, status, applicant_count)
VALUES
  (1, 1, 'Senior Full Stack Developer', 'Permanent', 'R65k-R85k', 'Open',   12),
  (1, 3, 'HR Intern',                   'Contract',  'R15k',       'Active', 45);

-- Onboarding
INSERT INTO onboarding (employee_name, position, start_date, progress, status)
VALUES ('New Hire 1', 'Junior Dev', '2025-02-01', 20, 'In Progress');

-- Offboarding
INSERT INTO offboarding (employee_name, position, exit_date, progress, status)
VALUES ('Resigning Employee', 'Designer', '2025-01-31', 60, 'Pending Final Pay');

-- Performance Reviews
INSERT INTO performance_reviews (employee_id, period, score, reviewer, status)
VALUES
  (1, '2024 H2', 4.7, 'Michael Chen', 'Completed'),
  (2, '2024 H2', 4.2, 'CFO',          'Completed');

-- Performance Goals
INSERT INTO performance_goals (employee_id, title, progress, status)
VALUES (1, 'Migrate to Cloud', 75, 'On Track');

-- Documents
INSERT INTO documents (employee_id, company_id, name, category, file_size, upload_date)
VALUES
  (NULL, 1, 'Company_Policy_2025.pdf',      'Policy',   '2.4MB', '2025-01-01'),
  (1,    1, 'Thabo_Mokoena_Contract.pdf',   'Contract', '1.1MB', '2020-03-15');

-- Notifications
INSERT INTO notifications (user_id, title, message, type, is_read)
VALUES
  (1, 'Payroll Due',      'Process January Payroll',          'payroll', FALSE),
  (1, 'Leave Approved',   'Thabo Mokoena - Annual Leave',     'leave',   FALSE);

-- Audit Logs
INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address)
VALUES
  (1, 'Admin User',       'Login',             'Auth',    '{"details":"Successful login from IP 192.168.1.5"}', '192.168.1.5'),
  (1, 'Admin User',       'Updated Settings',  'System',  '{"details":"Changed Primary Color"}',               '192.168.1.5'),
  (2, 'Payroll Officer',  'Processed Payroll', 'Payroll', '{"runId":"#2345"}',                                  '192.168.1.6');

-- Payroll Calendars
INSERT INTO payroll_calendars (company_id, payroll_frequency, pay_day, input_cut_off, approval_cut_off, reminder_days, next_payroll_date, next_cut_off_date)
VALUES
  (1, 'Monthly', 25, 20, 22, '[15, 18, 20]', '2025-02-25', '2025-02-20'),
  (2, 'Monthly', 25, 20, 22, '[15, 18, 20]', '2025-02-25', '2025-02-20');

-- Billing Rates
INSERT INTO billing_rates (company_id, service_type, rate)
VALUES
  (NULL, 'Per Employee Per Month',  50),
  (NULL, 'Setup Fee',               500),
  (NULL, 'Ad-Hoc Payroll Run',      200),
  (NULL, 'Tax Submission',          150),
  (NULL, 'Report Generation',       100);

-- Workflow Rules
INSERT INTO workflow_rules (name, `trigger`, `condition`, action, status)
VALUES
  ('Leave Approval > 5 Days', 'Leave Request',  'Days > 5',      'Require Executive Approval',  'Active'),
  ('High Value Expense',      'Expense Claim',  'Amount > 5000', 'Require CFO Approval',         'Active'),
  ('New Hire Onboarding',     'Employee Created','Always',       'Trigger Onboarding Workflow',  'Active');

-- System Settings
INSERT INTO system_settings (setting_key, setting_value, label)
VALUES
  ('company_name',        'Acme Corp SA',                  'Company Name'),
  ('primary_color',       '#2563EB',                       'Primary Colour'),
  ('accent_color',        '#F59E0B',                       'Accent Colour'),
  ('timezone',            'Africa/Johannesburg',           'System Timezone'),
  ('notif_email',         'true',                          'Email Notifications'),
  ('notif_sms',           'true',                          'SMS Notifications'),
  ('notif_inapp',         'true',                          'In-App Notifications');


-- ============================================================
-- USEFUL INDEXES
-- ============================================================
CREATE INDEX idx_employees_company   ON employees(company_id);
CREATE INDEX idx_employees_dept      ON employees(department_id);
CREATE INDEX idx_employees_status    ON employees(status);
CREATE INDEX idx_leave_requests_emp  ON leave_requests(employee_id);
CREATE INDEX idx_payroll_runs_comp   ON payroll_runs(company_id);
CREATE INDEX idx_payroll_lines_run   ON payroll_run_lines(run_id);
CREATE INDEX idx_audit_logs_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_ts       ON audit_logs(created_at);
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF SCRIPT
-- ============================================================
