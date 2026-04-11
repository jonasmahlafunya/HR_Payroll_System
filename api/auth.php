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

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS (declared before use)
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

/**
 * Send a one-time login code to the user.
 * Returns [bool $sent, string $error]
 */
function send_otp_email(string $to, string $username, string $code): array
{
    $fromName = SMTP_FROM_NAME ?: 'Nexa HR & Payroll';
    $fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexasystems.co.za';
    $subject = 'Your Nexa HR Login Code';

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
            <p style="margin:6px 0 0;font-size:0.78rem;color:rgba(255,255,255,0.5);">www.nexasystems.co.za</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:0.85rem;color:#64748B;">Hello, <strong style="color:#0B1D3A;">{$username}</strong></p>
            <h2 style="margin:0 0 20px;font-size:1.3rem;color:#0B1D3A;">Your Login Verification Code</h2>
            <p style="margin:0 0 24px;font-size:0.9rem;color:#475569;line-height:1.6;">
              Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong> and can only be used once.
            </p>
            <div style="background:#F0F4F8;border:2px dashed #CBD5E1;border-radius:12px;padding:28px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 6px;font-size:0.72rem;font-weight:600;color:#94A3B8;letter-spacing:3px;text-transform:uppercase;">Verification Code</p>
              <p style="margin:0;font-size:2.8rem;font-weight:700;letter-spacing:0.6em;color:#0B1D3A;font-family:monospace;">{$code}</p>
            </div>
            <p style="margin:0;font-size:0.82rem;color:#94A3B8;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:0.75rem;color:#94A3B8;">&copy; 2025 Nexa Systems &bull; Automated security email &mdash; do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

    return nexa_send_email($to, $subject, $html, $fromEmail, $fromName);
}

/**
 * Send a welcome email to a newly created user.
 */
function send_welcome_email(string $to, string $name, string $username): void
{
    $fromName = SMTP_FROM_NAME ?: 'Nexa HR & Payroll';
    $fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexasystems.co.za';
    $subject = 'Welcome to Nexa HR & Payroll';

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
            <p style="color:#475569;line-height:1.6;">Your account has been set up on the Nexa HR &amp; Payroll system.</p>
            <p style="color:#475569;">Your username is: <strong style="color:#0B1D3A;">{$username}</strong></p>
            <p style="color:#475569;">Each time you log in, a one-time verification code will be sent to this email address.</p>
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

    nexa_send_email($to, $subject, $html, $fromEmail, $fromName);
}

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────
try {
    $pdo = get_db_connection();
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    ensure_all_tables($pdo);
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
        $hasHashCol = array_key_exists('password_hash', $user);
        $hashVal = $hasHashCol ? (string) ($user['password_hash'] ?? '') : '';
        $plainVal = (string) ($user['password'] ?? '');

        if ($hasHashCol && strpos($hashVal, '$2') === 0) {
            $passwordOk = password_verify($password, $hashVal);
        } else {
            $storedPlain = ($hashVal !== '') ? $hashVal : $plainVal;
            $passwordOk = ($password === $storedPlain);
            if ($passwordOk) {
                $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                try {
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
            debug_log("User $username has no email, skipping 2FA");
        } else {
            ensure_otp_table($pdo);

            $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $hashed = password_hash($code, PASSWORD_BCRYPT);
            $expires = date('Y-m-d H:i:s', time() + 600);

            $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);
            $pdo->prepare("INSERT INTO auth_otp (username, code_hash, expires_at) VALUES (?, ?, ?)")
                ->execute([$username, $hashed, $expires]);

            [$sent, $err] = send_otp_email($email, $username, $code);

            if (!$sent) {
                debug_log("OTP email FAILED for $username: $err");
                $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);
                $detail = (APP_ENV === 'development') ? $err
                    : 'Please contact your system administrator or check the SMTP settings in .env';
                json_response(['error' => 'Could not send verification code.', 'detail' => $detail], 500);
            }

            $parts = explode('@', $email);
            $masked = substr($parts[0], 0, 2) . str_repeat('*', max(2, strlen($parts[0]) - 2)) . '@' . $parts[1];

            audit_log($pdo, $username, 'OTP_SENT', 'Auth', ['email' => $masked]);
            json_response(['status' => '2fa_email_required', 'email_hint' => $masked, 'username' => $username]);
        }

        // Fallback: no email — create session immediately
        $token = bin2hex(random_bytes(32));
        $roleVal = $user['role'] ?? 'Employee';
        $empId = $user['employee_id'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

        $stmt = $pdo->prepare("INSERT INTO auth_sessions (token, username, role, employee_id, ip_address, user_agent, expires_at)
                               VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))");
        $stmt->execute([$token, $username, $roleVal, $empId, $ip, $ua, SESSION_LIFETIME]);

        set_session_cookie($token);

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
                'csrf' => generate_csrf_token()
            ]);
        } else {
            json_response(['valid' => false], 200);
        }
    } catch (Throwable $e) {
        json_response(['error' => 'Session Verification Failure'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// CSRF TOKEN INITIATION
// ─────────────────────────────────────────────────────────────
if ($action === 'csrf') {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    json_response(['csrf' => $_SESSION['csrf_token']]);
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
// SEND EMAIL OTP
// ─────────────────────────────────────────────────────────────
if ($action === 'send_otp' && $reqMethod === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        if (!$username)
            json_response(['error' => 'Username required.'], 400);

        $stmt = $pdo->prepare("SELECT username, email FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if (!$user || empty($user['email'])) {
            json_response(['error' => 'User not found or no email on record.'], 404);
        }

        ensure_otp_table($pdo);

        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $hashed = password_hash($code, PASSWORD_BCRYPT);
        $expires = date('Y-m-d H:i:s', time() + 600);

        $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);
        $pdo->prepare("INSERT INTO auth_otp (username, code_hash, expires_at) VALUES (?, ?, ?)")
            ->execute([$username, $hashed, $expires]);

        [$sent, $err] = send_otp_email($user['email'], $username, $code);

        if (!$sent) {
            debug_log("OTP email failed for $username: $err");
            json_response(['error' => 'Could not send verification email. ' . $err], 500);
        }

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
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $code = trim($input['code'] ?? '');

        if (!$username || !$code)
            json_response(['error' => 'Username and code required.'], 400);

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

        $pdo->prepare("DELETE FROM auth_otp WHERE username = ?")->execute([$username]);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if (!$user)
            json_response(['error' => 'User not found.'], 404);

        $token = bin2hex(random_bytes(32));
        $roleVal = $user['role'] ?? 'Employee';
        $empId = $user['employee_id'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

        $pdo->prepare("INSERT INTO auth_sessions (token,username,role,employee_id,ip_address,user_agent,expires_at)
                       VALUES (?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? SECOND))")
            ->execute([$token, $username, $roleVal, $empId, $ip, $ua, SESSION_LIFETIME]);

        set_session_cookie($token);

        if (session_status() === PHP_SESSION_NONE)
            session_start();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        $safeUser = $user;
        unset($safeUser['password'], $safeUser['password_hash'], $safeUser['two_factor_secret']);

        audit_log($pdo, $username, 'LOGIN_SUCCESS_2FA', 'Auth', ['role' => $roleVal]);
        json_response([
            'status' => 'success',
            'token' => $token,
            'user' => $safeUser,
            'csrf' => $_SESSION['csrf_token']
        ]);

    } catch (Throwable $e) {
        debug_log("verify_otp error: " . $e->getMessage());
        json_response(['error' => 'Verification failed.'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// CREATE USER (admin only)
// ─────────────────────────────────────────────────────────────
if ($action === 'create_user' && $reqMethod === 'POST') {
    try {
        $session = validate_session($pdo);
        if (!$session || !in_array(strtolower($session['role']), ['admin', 'super admin', 'hr manager', 'payroll manager'])) {
            json_response(['error' => 'Unauthorized. Admin session required.'], 403);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $role = trim($input['role'] ?? 'Employee');
        $empId = intval($input['employee_id'] ?? 0) ?: null;

        if (!$username || !$password) {
            json_response(['error' => 'Username and password are required.'], 400);
        }
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['error' => 'Invalid email address.'], 400);
        }

        $chk = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $chk->execute([$username]);
        if ($chk->fetch()) {
            json_response(['error' => 'Username already exists.'], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $col = 'password';
        $chkCol = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'");
        if ($chkCol->fetch())
            $col = 'password_hash';

        $sql = "INSERT INTO users (name, email, username, `$col`, role, employee_id, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW())";
        $pdo->prepare($sql)->execute([$name ?: $username, $email, $username, $hash, $role, $empId]);

        $newId = $pdo->lastInsertId();
        audit_log($pdo, $session['username'], 'USER_CREATED', 'Settings', [
            'new_user' => $username,
            'role' => $role
        ]);

        if ($email && SMTP_HOST && SMTP_USER) {
            send_welcome_email($email, $name ?: $username, $username);
        }

        json_response(['status' => 'created', 'id' => (int) $newId, 'username' => $username]);

    } catch (Throwable $e) {
        debug_log("create_user error: " . $e->getMessage());
        json_response(['error' => 'User creation failed: ' . $e->getMessage()], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// PASSWORD CHANGE (authenticated user)
// ─────────────────────────────────────────────────────────────
if ($action === 'change_password' && $reqMethod === 'POST') {
    try {
        $session = validate_session($pdo);
        if (!$session)
            json_response(['error' => 'Unauthorized.'], 401);

        $input = json_decode(file_get_contents('php://input'), true);
        $newPass = $input['password'] ?? '';
        $targetUser = $input['username'] ?? $session['username'];

        // Minimum 8 characters required for payroll system security
        if (!$newPass || strlen($newPass) < 8) {
            json_response(['error' => 'Password must be at least 8 characters.'], 400);
        }

        // Only admins can change other people's passwords
        if ($targetUser !== $session['username']) {
            if (!in_array(strtolower($session['role']), ['admin', 'super admin'])) {
                json_response(['error' => 'Cannot change another user\'s password.'], 403);
            }
        }

        $hash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);
        $col = 'password';
        $chkCol = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'");
        if ($chkCol->fetch())
            $col = 'password_hash';

        $upd = $pdo->prepare("UPDATE users SET `$col` = ? WHERE username = ?");
        $upd->execute([$hash, $targetUser]);

        audit_log($pdo, $session['username'], 'PASSWORD_CHANGED', 'Auth', ['target' => $targetUser]);
        json_response(['status' => 'success']);

    } catch (Throwable $e) {
        debug_log("change_password error: " . $e->getMessage());
        json_response(['error' => 'Password change failed.'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// UPDATE PROFILE (employee self-service)
// ─────────────────────────────────────────────────────────────
if ($action === 'update_profile' && $reqMethod === 'POST') {
    try {
        $session = validate_session($pdo);
        if (!$session)
            json_response(['error' => 'Unauthorized.'], 401);

        $input = json_decode(file_get_contents('php://input'), true);
        $email = trim($input['email'] ?? '');
        $name = trim($input['name'] ?? '');

        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['error' => 'Invalid email address.'], 400);
        }

        $sets = [];
        $params = [];
        if ($email) {
            $sets[] = 'email = ?';
            $params[] = $email;
        }
        if ($name) {
            $sets[] = 'name = ?';
            $params[] = $name;
        }

        if (!empty($sets)) {
            $params[] = $session['username'];
            $pdo->prepare("UPDATE users SET " . implode(', ', $sets) . " WHERE username = ?")->execute($params);
        }

        audit_log($pdo, $session['username'], 'PROFILE_UPDATED', 'Auth', ['fields' => array_keys($input)]);
        json_response(['status' => 'success']);

    } catch (Throwable $e) {
        debug_log("update_profile error: " . $e->getMessage());
        json_response(['error' => 'Profile update failed.'], 500);
    }
}

// ─────────────────────────────────────────────────────────────
// FALLBACK
// ─────────────────────────────────────────────────────────────
json_response(['error' => 'Invalid action.'], 400);
