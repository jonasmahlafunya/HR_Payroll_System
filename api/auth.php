<?php
/**
 * Nexa HR & Payroll — Authentication Endpoint (PDO & Prepared Statements)
 */

header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
$reqUri = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
debug_log(">>> AUTH [$reqMethod]: $reqUri");

set_cors_headers();

try {
    $pdo = get_db_connection();
    ensure_all_tables($pdo);
    // In production, migrations should be run during deployment, not on every request
    // init_tables($pdo); 
} catch (Throwable $e) {
    json_response(['error' => 'Initialization Error', 'message' => $e->getMessage()], 500);
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'login';

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
if ($action === 'login' && $reqMethod === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            json_response(['error' => 'Username and password are required.'], 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            audit_log($pdo, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'User not found']);
            json_response(['error' => 'Invalid credentials.'], 401);
        }

        // Password verification (Bcrypt or Plain-text migration)
        $passwordOk = false;
        $hasHashCol  = array_key_exists('password_hash', $user);
        $hashVal     = $hasHashCol ? (string)($user['password_hash'] ?? '') : '';
        $plainVal    = (string)($user['password'] ?? '');

        if ($hasHashCol && strpos($hashVal, '$2') === 0) {
            // Already a bcrypt hash
            $passwordOk = password_verify($password, $hashVal);
        } else {
            // Legacy plain-text: compare then migrate
            $storedPlain = ($hashVal !== '') ? $hashVal : $plainVal;
            $passwordOk  = ($password === $storedPlain);
            if ($passwordOk) {
                $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                try {
                    // Only update password_hash if the column exists in the DB
                    $chk = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'");
                    $col = $hasHashCol ? 'password_hash' : ($chk->fetch() ? 'password_hash' : 'password');
                    $upd = $pdo->prepare("UPDATE users SET `$col` = ? WHERE username = ?");
                    $upd->execute([$newHash, $username]);
                } catch (Throwable $upErr) {
                    debug_log("Password migration skipped: " . $upErr->getMessage());
                }
            }
        }

        if (!$passwordOk) {
            audit_log($pdo, $username, 'LOGIN_FAIL', 'Auth', ['reason' => 'Wrong password']);
            json_response(['error' => 'Invalid credentials.'], 401);
        }

        // Password correct — always send email OTP (2FA via email)
        $email = $user['email'] ?? '';
        if (!$email) {
            // No email on record — fall through to direct login (legacy accounts)
            debug_log("User $username has no email, skipping 2FA");
        } else {
            ensure_otp_table($pdo);

            $code    = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $hashed  = password_hash($code, PASSWORD_BCRYPT);
            $expires = date('Y-m-d H:i:s', time() + 600);

            $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);
            $pdo->prepare("INSERT INTO auth_otp (username, code_hash, expires_at) VALUES (?, ?, ?)")
                ->execute([$username, $hashed, $expires]);

            [$sent, $err] = send_otp_email($email, $username, $code);

            if (!$sent) {
                debug_log("OTP email failed for $username: $err");
                // Degrade gracefully — don't block login if email fails
            }

            // Mask email for frontend hint
            $parts  = explode('@', $email);
            $masked = substr($parts[0], 0, 2) . str_repeat('*', max(2, strlen($parts[0]) - 2)) . '@' . $parts[1];

            audit_log($pdo, $username, 'OTP_SENT', 'Auth', ['email' => $masked]);
            json_response(['status' => '2fa_email_required', 'email_hint' => $masked, 'username' => $username]);
        }

        // ── Fallback: no email — create session immediately ──
        // Generate session token
        $token = bin2hex(random_bytes(32));
        $roleVal = $user['role'] ?? 'Employee';
        $empId = $user['employee_id'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

        $stmt = $pdo->prepare("INSERT INTO auth_sessions (token, username, role, employee_id, ip_address, user_agent, expires_at)
                               VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))");
        $stmt->execute([$token, $username, $roleVal, $empId, $ip, $ua, SESSION_LIFETIME]);

        set_session_cookie($token);

        // Security: Reset CSRF token on login
        if (session_status() === PHP_SESSION_NONE)
            session_start();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        $safeUserData = $user;
        unset($safeUserData['password'], $safeUserData['password_hash'], $safeUserData['two_factor_secret']);

        audit_log($pdo, $username, 'LOGIN_SUCCESS', 'Auth', ['role' => $user['role']]);

        json_response([
            'status' => 'success',
            'token' => $token,
            'user' => $safeUserData,
            'csrf' => $_SESSION['csrf_token']
        ]);
    } catch (Throwable $e) {
        debug_log("Login Error: " . $e->getMessage());
        json_response(['error' => 'Login Logic Failure'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// VERIFY SESSION
// ─────────────────────────────────────────────────────────────
if ($action === 'verify') {
    try {
        $session = validate_session($pdo);
        if ($session) {
            json_response([
                'valid' => true,
                'user' => $session,
                'csrf' => generate_csrf_token() // Provide CSRF token on verify
            ]);
        } else {
            json_response(['valid' => false], 401);
        }
    } catch (Throwable $e) {
        json_response(['error' => 'Session Verification Failure'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// CSRF TOKEN FETCH (For non-logged in state if needed, or refreshing)
// ─────────────────────────────────────────────────────────────
if ($action === 'csrf') {
    json_response(['csrf' => generate_csrf_token()]);
}

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────
if ($action === 'logout') {
    $token = $_COOKIE[COOKIE_NAME] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if ($token) {
        $stmt = $pdo->prepare("DELETE FROM auth_sessions WHERE token = ?");
        $stmt->execute([$token]);
    }
    destroy_session_cookie();

    if (session_status() !== PHP_SESSION_NONE) {
        session_unset();
        session_destroy();
    }

    json_response(['status' => 'logged_out']);
}

// ─────────────────────────────────────────────────────────────
// SEND EMAIL OTP  (called internally after password check)
// ─────────────────────────────────────────────────────────────
if ($action === 'send_otp' && $reqMethod === 'POST') {
    try {
        $input    = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        if (!$username) json_response(['error' => 'Username required.'], 400);

        $stmt = $pdo->prepare("SELECT username, email FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if (!$user || empty($user['email'])) {
            json_response(['error' => 'User not found or no email on record.'], 404);
        }

        ensure_otp_table($pdo);

        $code    = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $hashed  = password_hash($code, PASSWORD_BCRYPT);
        $expires = date('Y-m-d H:i:s', time() + 600); // 10 minutes

        // Upsert OTP record
        $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);
        $pdo->prepare("INSERT INTO auth_otp (username, code_hash, expires_at) VALUES (?, ?, ?)")
            ->execute([$username, $hashed, $expires]);

        // Send email
        [$sent, $err] = send_otp_email($user['email'], $username, $code);

        if (!$sent) {
            debug_log("OTP email failed for $username: $err");
            json_response(['error' => 'Could not send verification email. ' . $err], 500);
        }

        // Return masked email hint
        $email = $user['email'];
        $parts = explode('@', $email);
        $masked = substr($parts[0], 0, 2) . str_repeat('*', max(2, strlen($parts[0]) - 2)) . '@' . $parts[1];

        audit_log($pdo, $username, 'OTP_SENT', 'Auth', ['email' => $masked]);
        json_response(['status' => 'otp_sent', 'email_hint' => $masked]);

    } catch (Throwable $e) {
        debug_log("send_otp error: " . $e->getMessage());
        json_response(['error' => 'Failed to send OTP.'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// VERIFY EMAIL OTP
// ─────────────────────────────────────────────────────────────
if ($action === 'verify_otp' && $reqMethod === 'POST') {
    try {
        $input    = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $code     = trim($input['code'] ?? '');

        if (!$username || !$code) json_response(['error' => 'Username and code required.'], 400);

        ensure_otp_table($pdo);

        $stmt = $pdo->prepare("SELECT code_hash, expires_at FROM auth_otp WHERE username = ?");
        $stmt->execute([$username]);
        $row = $stmt->fetch();

        if (!$row) {
            json_response(['error' => 'No verification code found. Please log in again.'], 401);
        }
        if (strtotime($row['expires_at']) < time()) {
            $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);
            json_response(['error' => 'Verification code has expired. Please log in again.'], 401);
        }
        if (!password_verify($code, $row['code_hash'])) {
            audit_log($pdo, $username, 'OTP_FAIL', 'Auth', []);
            json_response(['error' => 'Invalid verification code.'], 401);
        }

        // OTP correct — clean up and create session
        $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if (!$user) json_response(['error' => 'User not found.'], 404);

        $token   = bin2hex(random_bytes(32));
        $roleVal = $user['role'] ?? 'Employee';
        $empId   = $user['employee_id'] ?? null;
        $ip      = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $ua      = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

        $pdo->prepare("INSERT INTO auth_sessions (token,username,role,employee_id,ip_address,user_agent,expires_at)
                       VALUES (?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? SECOND))")
            ->execute([$token, $username, $roleVal, $empId, $ip, $ua, SESSION_LIFETIME]);

        set_session_cookie($token);

        if (session_status() === PHP_SESSION_NONE) session_start();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        $safeUser = $user;
        unset($safeUser['password'], $safeUser['password_hash'], $safeUser['two_factor_secret']);

        audit_log($pdo, $username, 'LOGIN_SUCCESS_2FA', 'Auth', ['role' => $roleVal]);
        json_response([
            'status' => 'success',
            'token'  => $token,
            'user'   => $safeUser,
            'csrf'   => $_SESSION['csrf_token']
        ]);

    } catch (Throwable $e) {
        debug_log("verify_otp error: " . $e->getMessage());
        json_response(['error' => 'Verification failed.'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// CREATE USER  (admin only, saves directly to DB)
// ─────────────────────────────────────────────────────────────
if ($action === 'create_user' && $reqMethod === 'POST') {
    try {
        // Require a valid admin session
        $session = validate_session($pdo);
        if (!$session || !in_array(strtolower($session['role']), ['admin', 'super admin', 'hr manager', 'payroll manager'])) {
            json_response(['error' => 'Unauthorized. Admin session required.'], 403);
        }

        $input    = json_decode(file_get_contents('php://input'), true);
        $name     = trim($input['name'] ?? '');
        $email    = trim($input['email'] ?? '');
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $role     = trim($input['role'] ?? 'Employee');
        $empId    = intval($input['employee_id'] ?? 0) ?: null;

        if (!$username || !$password) {
            json_response(['error' => 'Username and password are required.'], 400);
        }
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['error' => 'Invalid email address.'], 400);
        }

        // Check uniqueness
        $chk = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $chk->execute([$username]);
        if ($chk->fetch()) {
            json_response(['error' => 'Username already exists.'], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        // Detect which password column exists
        $col = 'password';
        $chkCol = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'");
        if ($chkCol->fetch()) $col = 'password_hash';

        $sql = "INSERT INTO users (name, email, username, `$col`, role, employee_id, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW())";
        $pdo->prepare($sql)->execute([$name ?: $username, $email, $username, $hash, $role, $empId]);

        $newId = $pdo->lastInsertId();
        audit_log($pdo, $session['username'], 'USER_CREATED', 'Settings', [
            'new_user' => $username, 'role' => $role
        ]);

        // Send welcome email if email provided
        if ($email && SMTP_HOST && SMTP_USER) {
            send_welcome_email($email, $name ?: $username, $username);
        }

        json_response(['status' => 'created', 'id' => (int)$newId, 'username' => $username]);

    } catch (Throwable $e) {
        debug_log("create_user error: " . $e->getMessage());
        json_response(['error' => 'User creation failed: ' . $e->getMessage()], 500);
    }
}

json_response(['error' => 'Invalid action.'], 400);

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function ensure_otp_table($pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS `auth_otp` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `username`   VARCHAR(100) NOT NULL UNIQUE,
        `code_hash`  VARCHAR(255) NOT NULL,
        `expires_at` DATETIME NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_user (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function send_otp_email(string $to, string $username, string $code): array
{
    $fromName  = SMTP_FROM_NAME  ?: 'Nexa HR & Payroll';
    $fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexasystems.co.za';
    $subject   = 'Your Nexa HR Login Code';

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0B1D3A;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:1.1rem;font-weight:700;color:#F59E0B;letter-spacing:0.5px;">NEXA HR &amp; PAYROLL</p>
            <p style="margin:6px 0 0;font-size:0.78rem;color:rgba(255,255,255,0.5);">www.nexasystems.co.za</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:0.85rem;color:#64748B;">Hello, <strong style="color:#0B1D3A;">{$username}</strong></p>
            <h2 style="margin:0 0 20px;font-size:1.3rem;color:#0B1D3A;">Your Login Verification Code</h2>
            <p style="margin:0 0 24px;font-size:0.9rem;color:#475569;line-height:1.6;">
              Use the code below to complete your sign-in. This code is valid for <strong>10 minutes</strong> and can only be used once.
            </p>
            <!-- OTP Box -->
            <div style="background:#F0F4F8;border:2px dashed #CBD5E1;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 6px;font-size:0.75rem;font-weight:600;color:#94A3B8;letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
              <p style="margin:0;font-size:2.4rem;font-weight:700;letter-spacing:0.5em;color:#0B1D3A;">{$code}</p>
            </div>
            <p style="margin:0 0 8px;font-size:0.82rem;color:#94A3B8;">
              If you didn&#39;t request this code, please ignore this email. Your account remains secure.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:0.75rem;color:#94A3B8;">&copy; 2025 Nexa Systems &bull; This is an automated security email, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

    // Use existing send_smtp if available
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        return send_smtp_simple($to, $subject, $html, $fromEmail, $fromName);
    }
    // Fallback to mail()
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>\r\n";
    $sent = @mail($to, $subject, $html, $headers);
    return $sent ? [true, ''] : [false, 'mail() failed'];
}

function send_welcome_email(string $to, string $name, string $username): void
{
    $fromName  = SMTP_FROM_NAME  ?: 'Nexa HR & Payroll';
    $fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexasystems.co.za';
    $subject   = 'Welcome to Nexa HR & Payroll';
    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0B1D3A;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:1.1rem;font-weight:700;color:#F59E0B;letter-spacing:0.5px;">NEXA HR &amp; PAYROLL</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#0B1D3A;">Welcome, {$name}!</h2>
            <p style="color:#475569;line-height:1.6;">Your account has been created on the Nexa HR &amp; Payroll system.</p>
            <p style="color:#475569;">Your username is: <strong style="color:#0B1D3A;">{$username}</strong></p>
            <p style="color:#475569;">A verification code will be sent to this email address each time you log in.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:0.75rem;color:#94A3B8;">&copy; 2025 Nexa Systems</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        send_smtp_simple($to, $subject, $html, $fromEmail, $fromName);
    }
}

function send_smtp_simple(string $to, string $subject, string $html, string $fromEmail, string $fromName): array
{
    try {
        $host   = SMTP_HOST;
        $port   = SMTP_PORT;
        $socket = @fsockopen("tcp://$host", $port, $errno, $errstr, 10);
        if (!$socket) return [false, "Connect: $errstr ($errno)"];

        fgets($socket, 512);
        smtp_cmd($socket, 'EHLO ' . (gethostname() ?: 'localhost'));

        if ($port == 587) {
            smtp_cmd($socket, 'STARTTLS');
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                @fclose($socket);
                return [false, 'TLS failed'];
            }
            smtp_cmd($socket, 'EHLO ' . (gethostname() ?: 'localhost'));
        }

        smtp_cmd($socket, 'AUTH LOGIN');
        smtp_cmd($socket, base64_encode(SMTP_USER));
        smtp_cmd($socket, base64_encode(SMTP_PASS));
        smtp_cmd($socket, "MAIL FROM:<$fromEmail>");
        smtp_cmd($socket, "RCPT TO:<$to>");
        smtp_cmd($socket, 'DATA');

        $msg  = "Date: " . date('r') . "\r\n";
        $msg .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
        $msg .= "To: $to\r\n";
        $msg .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $msg .= "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $msg .= chunk_split(base64_encode($html)) . "\r\n.\r\n";

        fwrite($socket, $msg);
        $resp = fgets($socket, 512);
        smtp_cmd($socket, 'QUIT');
        @fclose($socket);

        return (substr($resp, 0, 3) === '250') ? [true, ''] : [false, "SMTP: $resp"];
    } catch (Throwable $e) {
        return [false, $e->getMessage()];
    }
}

function smtp_cmd($socket, string $cmd): string
{
    fwrite($socket, "$cmd\r\n");
    $resp = '';
    while (!feof($socket)) {
        $line = fgets($socket, 512);
        if ($line === false) break;
        $resp .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    return $resp;
}
