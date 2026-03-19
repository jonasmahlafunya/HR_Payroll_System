<?php
header('Content-Type: application/json');
require_once 'config.php';

$conn = get_db_connection();
init_storage_table($conn);

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // SAVE ACTION
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        echo json_encode(['error' => 'Invalid data provided']);
        exit;
    }

    $blob = $conn->real_escape_string($input);
    $key = 'hrpms_main_state';

    $sql = "INSERT INTO system_storage (key_name, data_blob) 
            VALUES ('$key', '$blob') 
            ON DUPLICATE KEY UPDATE data_blob = '$blob'";

    if ($conn->query($sql)) {
        echo json_encode(['status' => 'success', 'message' => 'Data persisted to MySQL']);
    } else {
        echo json_encode(['error' => 'Database error: ' . $conn->error]);
    }
} else {
    // LOAD ACTION
    $key = 'hrpms_main_state';
    $result = $conn->query("SELECT data_blob FROM system_storage WHERE key_name = '$key'");
    
    if ($result && $row = $result->fetch_assoc()) {
        echo $row['data_blob'];
    } else {
        echo json_encode(['status' => 'empty', 'message' => 'No server data found']);
    }
}

$conn->close();
?>
