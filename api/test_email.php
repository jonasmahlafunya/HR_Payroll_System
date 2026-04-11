<?php
/**
 * Nexa HR — Email Diagnostics (API-key protected)
 *
 * Usage:
 *   https://yourdomain.co.za/api/test_email.php?key=YOUR_API_KEY&to=you@example.com
 *
 * DELETE or restrict this file after diagnosis is complete.
 */
require_once __DIR__ . '/config.php';

$isCLI  = php_sapi_name() === 'cli';
$apiKey = $_GET['key'] ?? '';
$isAuth = defined('API_KEY') && !empty($apiKey) && $apiKey === API_KEY;

if (!$isCLI && !$isAuth) {
    http_response_code(403);
    die('Access denied. Pass ?key=YOUR_API_KEY');
}

if (!$isCLI) header('Content-Type: text/plain; charset=UTF-8');

$to = $isCLI ? ($argv[1] ?? '') : ($_GET['to'] ?? '');
if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    die("Provide a valid recipient.\n  Web: ?key=KEY&to=you@example.com\n");
}

echo "=== Nexa HR Email Diagnostic ===\n\n";
echo "PHP         : " . PHP_VERSION . "\n";
echo "SMTP_HOST   : " . (SMTP_HOST ?: '(not set — will use mail())') . "\n";
echo "SMTP_PORT   : " . (SMTP_PORT ?: '(not set)') . "\n";
echo "SMTP_USER   : " . (SMTP_USER ?: '(not set)') . "\n";
echo "SMTP_PASS   : " . (SMTP_PASS ? str_repeat('*', min(strlen(SMTP_PASS), 16)) . ' (' . strlen(SMTP_PASS) . ' chars)' : '(not set)') . "\n";
echo "FROM_EMAIL  : " . (SMTP_FROM_EMAIL ?: '(not set)') . "\n";
echo "mail() avail: " . (function_exists('mail') ? 'yes' : 'no') . "\n";
echo "Recipient   : $to\n\n";

// ── Step 1: test SMTP connection only (no send) ───────────────────────────────
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    echo "--- SMTP Connection Test ---\n";
    $host  = SMTP_HOST;
    $port  = (int) SMTP_PORT;
    $proto = ($port === 465) ? 'ssl' : 'tcp';

    $socket = @stream_socket_client("$proto://$host:$port", $errno, $errstr, 10);
    if (!$socket) {
        echo "CONNECT : FAILED\n";
        echo "  Error : $errstr ($errno)\n";
        echo "  Tip   : Your server may block outbound port $port.\n";
        echo "          Try port 465 (implicit TLS) or ask your host to unblock port 587.\n\n";
    } else {
        stream_set_timeout($socket, 10);
        echo "CONNECT : OK\n";

        // Read greeting
        $buf = diag_smtp_read($socket);
        echo "GREETING: $buf\n";

        // EHLO
        fwrite($socket, "EHLO nexa.local\r\n");
        $ehlo = diag_smtp_read($socket);
        echo "EHLO    : " . strtok($ehlo, "\n") . " ...\n";

        if ($port === 587) {
            fwrite($socket, "STARTTLS\r\n");
            $tlsResp = diag_smtp_read($socket);
            echo "STARTTLS: $tlsResp\n";
            $tlsOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)
                  || @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            echo "TLS     : " . ($tlsOk ? "OK\n" : "FAILED — openssl extension may be missing\n");

            if ($tlsOk) {
                fwrite($socket, "EHLO nexa.local\r\n");
                diag_smtp_read($socket); // discard
                fwrite($socket, "AUTH LOGIN\r\n");
                $a = diag_smtp_read($socket);
                echo "AUTH    : $a\n";
                fwrite($socket, base64_encode(SMTP_USER) . "\r\n");
                $u = diag_smtp_read($socket);
                echo "USER    : $u\n";
                fwrite($socket, base64_encode(SMTP_PASS) . "\r\n");
                $p = diag_smtp_read($socket);
                echo "PASS    : $p\n";

                if (strpos($p, '535') !== false) {
                    echo "\n*** AUTHENTICATION FAILED ***\n";
                    echo "    Gmail requires an App Password, NOT your regular password.\n";
                    echo "    Steps:\n";
                    echo "      1. Go to myaccount.google.com\n";
                    echo "      2. Security → 2-Step Verification (enable if not on)\n";
                    echo "      3. App Passwords → Mail → Other (Nexa HR)\n";
                    echo "      4. Copy the 16-char code → paste into .env as SMTP_PASS\n\n";
                } elseif (strpos($p, '235') !== false) {
                    echo "\n*** AUTH: SUCCESS ✓ — credentials are correct ***\n\n";
                }
            }
        }
        fwrite($socket, "QUIT\r\n");
        @fclose($socket);
    }
}

// ── Step 2: actually send a test email ───────────────────────────────────────
echo "--- Sending Test Email ---\n";

$fromEmail = SMTP_FROM_EMAIL ?: 'noreply@nexasystems.co.za';
$fromName  = SMTP_FROM_NAME  ?: 'Nexa HR & Payroll';
$subject   = 'Nexa HR — Email Test';
$html      = '<html><body style="font-family:Arial,sans-serif;padding:32px;">'
           . '<h2 style="color:#0B1D3A;">Email Test Successful</h2>'
           . '<p>This confirms that email delivery is working correctly on your Nexa HR &amp; Payroll system.</p>'
           . '<p style="color:#64748B;font-size:0.85em;">Sent: ' . date('Y-m-d H:i:s') . '</p>'
           . '</body></html>';

[$sent, $err] = diag_send_email($to, $subject, $html, $fromEmail, $fromName);
if ($sent) {
    echo "RESULT  : SUCCESS ✓\n";
    echo "          Test email sent to $to\n";
    echo "          Check your inbox (and spam folder).\n";
} else {
    echo "RESULT  : FAILED\n";
    echo "  Error : $err\n";
}

// ── Helpers (self-contained, no dependency on auth.php) ───────────────────────
function diag_smtp_read($socket): string {
    $buf = '';
    while (!feof($socket)) {
        $line = fgets($socket, 1024);
        if ($line === false) break;
        $buf .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    return trim($buf);
}

function diag_send_email(string $to, string $subject, string $html, string $fromEmail, string $fromName): array {
    // Try SMTP first
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        $host  = SMTP_HOST;
        $port  = (int) SMTP_PORT;
        $proto = ($port === 465) ? 'ssl' : 'tcp';

        $sock = @stream_socket_client("$proto://$host:$port", $e, $es, 10);
        if ($sock) {
            stream_set_timeout($sock, 10);
            diag_smtp_read($sock); // greeting
            fwrite($sock, "EHLO nexa.local\r\n"); diag_smtp_read($sock);
            if ($port === 587) {
                fwrite($sock, "STARTTLS\r\n"); diag_smtp_read($sock);
                @stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)
                    || @stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                fwrite($sock, "EHLO nexa.local\r\n"); diag_smtp_read($sock);
            }
            fwrite($sock, "AUTH LOGIN\r\n"); diag_smtp_read($sock);
            fwrite($sock, base64_encode(SMTP_USER) . "\r\n"); diag_smtp_read($sock);
            fwrite($sock, base64_encode(SMTP_PASS) . "\r\n");
            $passR = diag_smtp_read($sock);
            if (strpos($passR, '235') === false) {
                @fclose($sock);
                $hint = strpos($passR, '535') !== false
                    ? ' [Gmail: use an App Password — myaccount.google.com/apppasswords]' : '';
                return [false, "Auth failed$hint: $passR"];
            }
            fwrite($sock, "MAIL FROM:<$fromEmail>\r\n"); diag_smtp_read($sock);
            fwrite($sock, "RCPT TO:<$to>\r\n"); diag_smtp_read($sock);
            fwrite($sock, "DATA\r\n"); diag_smtp_read($sock);
            $boundary = '=_Diag_' . bin2hex(random_bytes(6));
            $msg  = "Date: " . date('r') . "\r\nFrom: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
            $msg .= "To: $to\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
            $msg .= "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n";
            $msg .= $html . "\r\n.\r\n";
            fwrite($sock, $msg);
            $resp = diag_smtp_read($sock);
            fwrite($sock, "QUIT\r\n"); @fclose($sock);
            if (strpos($resp, '250') !== false) return [true, ''];
            return [false, "Message rejected: $resp"];
        }
        return [false, "Could not connect to $host:$port — $es ($e)"];
    }

    // Fallback: PHP mail()
    if (function_exists('mail')) {
        $h  = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
        $h .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
        $ok = @mail($to, $subject, $html, $h);
        return $ok ? [true, ''] : [false, 'mail() returned false — check server mail config'];
    }
    return [false, 'No email method available'];
}
