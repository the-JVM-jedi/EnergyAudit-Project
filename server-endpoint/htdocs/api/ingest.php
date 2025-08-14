<?php
// ingest.php
// Receives raw CSV data from PowerShell clients and stores it in the queue_table.

header("Content-Type: application/json");

// --- Database Configuration ---
$db_host = 'localhost';
$db_user = 'root'; // Default XAMPP user
$db_pass = '';     // Default XAMPP password
$db_name = 'workstation_monitor';

// --- Main Logic ---

// 1. Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Only POST method is accepted.']);
    exit();
}

// 2. Get the raw POST body content
$raw_data = file_get_contents('php://input');

if (empty($raw_data)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Request body is empty.']);
    exit();
}

// 3. Connect to the database
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    http_response_code(500); // Internal Server Error
    // In production, log this error instead of echoing it.
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// 4. Insert the raw data into the queue_table using a prepared statement
$stmt = $conn->prepare("INSERT INTO queue_table (raw_csv_data) VALUES (?)");
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $conn->error]);
    exit();
}

$stmt->bind_param("s", $raw_data);

if ($stmt->execute()) {
    // Success!
    http_response_code(200); // OK
    echo json_encode(['message' => 'Data queued successfully.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to execute statement: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>