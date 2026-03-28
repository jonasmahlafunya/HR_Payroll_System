<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'],
    'extensions' => [
        'mysqli' => extension_loaded('mysqli'),
        'openssl' => extension_loaded('openssl'),
        'curl' => extension_loaded('curl'),
        'mbstring' => extension_loaded('mbstring')
    ]
]);