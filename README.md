# Nexa HR & Payroll System

A full-featured HR and Payroll management system built for South African businesses.  
Built with PHP (PDO/MySQL backend) and a JavaScript single-page app frontend.

---

## 🚀 Quick Setup

### Requirements
- PHP 7.4+ with extensions: `pdo_mysql`, `fileinfo`, `gzencode`, `openssl`
- MySQL 5.7+ or MariaDB 10.3+
- Apache with `mod_rewrite` and `mod_headers` enabled
- (Optional) DomPDF for server-side PDF generation

### 1. Upload Files
Upload the entire project to your server's public root (e.g. `public_html/payroll/`).

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- **Database**: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- **SMTP Email**: `SMTP_HOST` (your mail server hostname — NOT a port number), `SMTP_USER`, `SMTP_PASS`
- **App URL**: `APP_URL` (your full site URL, used by the automated backup trigger)
- **API Key**: `API_KEY` — generate a secure key with `php -r "echo bin2hex(random_bytes(32));"`

### 3. Create Database
Create a MySQL database and user, then grant privileges:
```sql
CREATE DATABASE nexa_payroll CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexauser'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON nexa_payroll.* TO 'nexauser'@'localhost';
FLUSH PRIVILEGES;
```
All tables are **created automatically** on first login — no SQL import required.

### 4. First Login
1. Navigate to your site URL
2. Run the user setup script once:
   ```
   https://yoursite/api/setup.php
   ```
3. Log in with the admin credentials shown

---

## 💰 Running Payroll

### Monthly Payroll Workflow
1. **Employees** → Ensure all employees have correct salary, bank, and tax details
2. **Payroll** → Click **"New Payroll Run"** → Select company and pay period
3. Review the employee list and calculated figures (Gross → PAYE → UIF → Net)
4. Click **"Create Payroll Run & Submit for Approval"**
5. The run enters **"Pending Approval"** status and an approval email is sent to the company
6. **Approve** the run (via email link or directly in the system)
7. Click **"Finalize"** → locks the run
8. Generate the **Bank File** (EFT file for your bank)
9. Send **Payslips** to all employees via email
10. Click **"Mark as Paid"** once EFT is processed

### Pay Frequencies Supported
- Monthly
- Bi-Weekly
- Weekly
- Fortnightly

### South African Tax Compliance
- **PAYE**: Calculated using SARS 2026/2027 tax tables (via `TaxCalc` module)
- **UIF**: 1% employee + 1% employer — capped at the legislated maximum
- **SDL**: 1% employer contribution on remuneration > R500,000/year threshold
- **Medical Aid Tax Credits**: Applied automatically based on main member + dependants
- Supports pension/provident fund deductions (reduces PAYE taxable income)

---

## 🔐 Security

### Authentication
- All passwords hashed with **bcrypt** (cost factor 12)
- Plain-text passwords automatically migrated to bcrypt on first login
- **Two-factor authentication** via email OTP (6-digit code, 10-minute expiry)
- Session tokens stored in httpOnly Secure cookies + MySQL session table

### CSRF Protection
- CSRF tokens generated per session, validated on all mutating POST requests
- Token invalidated on logout

### API Security
- All cron endpoints require `X-API-Key` header or `?api_key=` parameter
- All data endpoints require a valid session cookie
- Role-based access: Admin, HR Manager, Payroll Manager, Employee

### Data Protection
- File uploads: MIME type verified, extension allowlist enforced
- Upload directory protected by `.htaccess` (no PHP execution)
- SQL injection: all queries use PDO prepared statements with `?` placeholders
- XSS: all output uses `htmlspecialchars()` / `sanitizeHTML()`
- HTTPS enforced via `.htaccess` redirect

---

## ⏰ Automated Cron Jobs

Add this to your server's cron tab (or cPanel Cron Jobs):
```bash
# Run daily at 2:00 AM
0 2 * * * curl -s "https://yoursite.co.za/api/cron.php?api_key=YOUR_API_KEY" > /dev/null 2>&1
```

The cron runner handles:
| Task | Frequency |
|------|-----------|
| Monthly leave accrual | Once per calendar month |
| Leave year-end reset (March 1) | Annual |
| Expired session cleanup | Daily |
| Expired OTP cleanup | Daily |
| Automated database backup | Weekly (Mondays) |
| Payroll reminder emails | Configurable per calendar |
| Document expiry alerts (30/60/90 days) | Daily |

---

## 📦 Database Backup

Backups are stored in `/backups/` as compressed `.sql.gz` files.

**Manual backup** (Admin only):
```
GET https://yoursite.co.za/api/backup.php
```

**Automated weekly backup**: Triggered by cron on Mondays.

Retention period: Configured by `BACKUP_RETAIN` in `.env` (default: 30 days).

**What's backed up**: `system_storage`, `users`, `companies`, `documents`, `audit_log`  
**Not backed up**: `auth_sessions` (live session tokens — intentionally excluded for security)

---

## 📁 Project Structure

```
/
├── index.html              # Single-page app entry point
├── .env                    # Environment config (never commit this)
├── .env.example            # Template for .env
├── .htaccess               # HTTPS redirect, security headers, file protection
├── api/
│   ├── config.php          # DB, session, CSRF, email helpers (central config)
│   ├── auth.php            # Login, OTP 2FA, user management
│   ├── sync.php            # State blob save/load
│   ├── cron.php            # Automated scheduled tasks
│   ├── mail.php            # Payroll approval email sender
│   ├── approve.php         # Email approval callback page
│   ├── payslip_pdf.php     # Payslip HTML/PDF renderer
│   ├── documents.php       # Document upload/download/delete
│   ├── backup.php          # Database backup
│   ├── audit.php           # Audit trail viewer
│   └── lib/totp.php        # TOTP 2FA library
├── js/
│   ├── auth.js             # Login flow, session handling
│   ├── core.js             # App bootstrap, routing
│   ├── utils.js            # Toast, modals, forms, Wizard class
│   ├── data.js             # localStorage DB wrapper
│   └── modules/            # Feature modules (payroll, employees, reports, etc.)
└── css/
    ├── main.css            # Global styles and layout
    ├── components.css      # Reusable component styles
    └── themes.css          # Color theme variables
```

---

## 🐛 Known Issues Fixed (v2.0)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `cron.php` | Used MySQLi API on a PDO connection — all cron tasks crashed | Rewrote entirely using PDO |
| 2 | `cron.php` | `API_SECRET_KEY` undefined — backup trigger fatal error | Changed to `API_KEY` constant |
| 3 | `cron.php` | `APP_URL` undefined — backup URL broken | Derived from `$_SERVER` / `.env` |
| 4 | `cron.php` | `leave_accrual_log` table never created | Added `CREATE TABLE IF NOT EXISTS` |
| 5 | `cron.php` | SQL injection in leave accrual queries | Replaced with PDO prepared statements |
| 6 | `cron.php` | `audit_log.timestamp` wrong column name | Fixed to `created_at` |
| 7 | `payslip_pdf.php` | Used MySQLi on PDO connection — payslips crashed | Rewrote using PDO; removed `close()` |
| 8 | `payslip_pdf.php` | Payslip only showed Basic/PAYE/UIF | Added all lines: pension, medical, garnishee, bonus, OT, custom benefits |
| 9 | `.env` | `SMTP_HOST=2029` (port number, not hostname) | Fixed to correct hostname format |
| 10 | `payroll.js:460` | `companyId` undefined — "New Payroll Run" modal crashed | Removed erroneous reference |
| 11 | `payroll.js` | `btoa()` approval token — easily decoded | Replaced with `crypto.getRandomValues()` |
| 12 | `auth.php` | Min password 4 characters — too weak | Raised to 8 characters |
| 13 | `backup.php` | `auth_sessions` in backup (live tokens exposed) | Removed; added `companies` table |
| 14 | `config.php` | Duplicate `init_tables()` function | Removed; `ensure_all_tables()` is the single source of truth |
| 15 | `documents.php` | Global JSON Content-Type conflicted with file downloads | Made Content-Type route-specific |
| 16 | `utils.js` | `console.log` leaking salary/ID data to devtools | Removed production log statements |

---

## 🔮 Recommended Future Improvements

1. **Dedicated payroll tables**: Move payroll runs and employee data from the JSON blob to proper relational tables (employees, payroll_runs, payslips) for better performance and reporting
2. **SARS eFiling integration**: Automate EMP201, IRP5, and UIF submission
3. **Leave management portal**: Employee self-service leave requests with line-manager approval
4. **Mobile app**: PWA already configured (`manifest.json`, `sw.js`) — extend for offline capability
5. **Analytics dashboard**: Charts for payroll cost trends, headcount, department spend
6. **Multi-tenant isolation**: Database-level tenant separation for SaaS deployment
7. **Audit trail export**: Export audit log to PDF/Excel for compliance reviews
8. **DomPDF integration**: Install via Composer for server-side PDF payslips

---

## 📞 Support

**Nexa Systems** — [www.nexasystems.co.za](https://www.nexasystems.co.za)  
Email: info@nexasystems.co.za
