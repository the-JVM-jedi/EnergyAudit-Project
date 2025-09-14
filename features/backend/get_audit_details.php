<?php
// backend/get_audit_details.php

require_once 'db_connect.php';
header('Content-Type: application/json');

// Check for a valid database connection
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

// Get the audit_id from the URL, e.g., ?id=4
$audit_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($audit_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid Audit ID.']);
    exit;
}

$devices = [];
// Use a prepared statement to prevent SQL injection
$sql = "SELECT device_class, description, power_rating_watts, quantity, hours_per_day, daily_kwh_total FROM Devices WHERE audit_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $audit_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Convert numeric strings to actual numbers for Chart.js
        $row['power_rating_watts'] = (int)$row['power_rating_watts'];
        $row['quantity'] = (int)$row['quantity'];
        $row['hours_per_day'] = (float)$row['hours_per_day'];
        $row['daily_kwh_total'] = (float)$row['daily_kwh_total'];
        $devices[] = $row;
    }
    echo json_encode(['success' => true, 'devices' => $devices]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to fetch audit details.']);
}

$stmt->close();
$conn->close();
?>