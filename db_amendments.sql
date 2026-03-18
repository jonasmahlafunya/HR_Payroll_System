-- #########################################################
-- Nexa HR & Payroll - Database Amendments (REFINED)
-- Apply this to: if0_41384788_nexa_hrpayroll
-- #########################################################

USE `if0_41384788_nexa_hrpayroll`;

-- 1. Create the system_storage table (CRITICAL for PHP Sync Logic)
CREATE TABLE IF NOT EXISTS `system_storage` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `key_name` varchar(50) NOT NULL UNIQUE,
    `data_blob` LONGTEXT NOT NULL,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Refine numeric columns for precise payroll calculations
ALTER TABLE `employees` MODIFY COLUMN `basic_salary` DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE `payroll_runs` MODIFY COLUMN `total_gross` DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE `payroll_runs` MODIFY COLUMN `total_net` DECIMAL(15,2) DEFAULT 0.00;

-- 3. Optimization Indexes
-- We wrap this in a safe check to avoid "Duplicate key" errors
SET @dbname = DATABASE();
SET @tablename = "audit_logs";
SET @indexname = "idx_audit_module";
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = @dbname 
     AND table_name = @tablename 
     AND index_name = @indexname) > 0,
    "SELECT 'Index already exists';",
    "CREATE INDEX idx_audit_module ON audit_logs(module);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Seed initial admin if not present
INSERT IGNORE INTO `users` (`username`, `password_hash`, `name`, `role`, `status`) 
VALUES ('admin', 'admin123', 'System Administrator', 'Super Admin', 'Active');
