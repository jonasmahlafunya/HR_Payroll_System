<?php
header('Content-Type: application/json');
require_once 'config.php';

set_cors_headers();

// ── Auth guard: reject requests without a valid session ──────
$conn = get_db_connection();

$token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Please log in.']);
    exit;
}

$safeToken = $conn->real_escape_string($token);
$authResult = $conn->query("SELECT username FROM auth_sessions WHERE token = '$safeToken' AND expires_at > NOW()");
if (!$authResult || $authResult->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Session invalid.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data  = json_decode($input, true);
    
    $to          = $data['companyEmail'] ?? '';
    $companyName = $data['companyName'] ?? 'Your Company';
    $period      = $data['period'] ?? '';
    $totalNet    = $data['totalNet'] ?? '0.00';
    $notes       = $data['notes'] ?? '';
    
    if (empty($to)) {
        echo json_encode(['error' => 'No company email provided.']);
        exit;
    }

    $subject = "Payroll Approval Required - $companyName ($period)";
    
    $message = "Hello,\n\n";
    $message .= "The payroll for $companyName for the period $period has been calculated and is ready for your review and approval.\n\n";
    $message .= "Payroll Summary:\n";
    $message .= "----------------\n";
    $message .= "Total Net Pay: $totalNet\n\n";
    
    if (!empty($notes)) {
        $message .= "Notes from Payroll Admin:\n";
        $message .= "$notes\n\n";
    }
    
    $message .= "Please log in to the HR & Payroll system to review the variance report and finalize the run.\n\n";
    $message .= "Thank you,\nNexa HR & Payroll System";

    $headers = "From: noreply@nexahrpayroll.ct.ws\r\n";
    $headers .= "Reply-To: noreply@nexahrpayroll.ct.ws\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['error' => 'Server failed to dispatch the email. Please check host PHP mail configuration.']);
    }
} else {
    echo json_encode(['error' => 'Invalid request method.']);
}

$conn->close();
?>
