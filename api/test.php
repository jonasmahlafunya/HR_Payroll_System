<?php
/**
 * Nexa HR & Payroll - Server Diagnostics
 * Visit: https://nexahrpayroll.ct.ws/api/test.php
 * DELETE THIS FILE after you are done testing!
 */
header('Content-Type: application/json');

$checks = array();

// PHP version
$checks['php_version'] = PHP_VERSION;
$checks['php_version_ok'] = version_compare(PHP_VERSION, '7.0.0', '>=');

// Required extensions
$extensions = array('openssl', 'json', 'mysqli', 'sockets');
foreach ($extensions as $ext) {
    $checks['ext_' . $ext] = extension_loaded($ext);
}

// Can we open a TCP socket to Gmail?
$errno  = 0;
$errstr = '';
$sock   = @fsockopen('tcp://smtp.gmail.com', 587, $errno, $errstr, 10);
if ($sock) {
    $banner = fgets($sock, 512);
    fclose($sock);
    $checks['smtp_gmail_connect'] = true;
    $checks['smtp_banner']        = trim($banner);
} else {
    $checks['smtp_gmail_connect'] = false;
    $checks['smtp_error']         = $errstr . ' (' . $errno . ')';
}

// Can we write a file? (needed for .env)
$testFile = dirname(__FILE__) . '/test_write_' . time() . '.tmp';
$canWrite = @file_put_contents($testFile, 'test') !== false;
if ($canWrite) @unlink($testFile);
$checks['can_write_files'] = $canWrite;

// .env file locations checked
$envPaths = array(
    dirname(dirname(__FILE__)) . '/.env',
    dirname(__FILE__) . '/.env',
);
foreach ($envPaths as $p) {
    $checks['env_exists_' . basename(dirname($p)) . '_level'] = file_exists($p);
}

// Check if GMAIL_PASS constant is set (if mail.php has been edited)
$checks['mail_php_exists'] = file_exists(dirname(__FILE__) . '/mail.php');

// Current SMTP_PASS from env (masked)
$envPass = '';
foreach ($envPaths as $p) {
    if (!file_exists($p)) continue;
    $lines = file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) continue;
    foreach ($lines as $line) {
        if (strpos($line, 'SMTP_PASS=') === 0) {
            $val = trim(substr($line, 10));
            $envPass = ($val !== '') ? '***SET*** (' . strlen($val) . ' chars)' : 'EMPTY';
        }
    }
    break;
}
$checks['env_smtp_pass'] = $envPass !== '' ? $envPass : 'Not found in .env';

// PHP mail() available?
$checks['mail_function_exists'] = function_exists('mail');

echo json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
