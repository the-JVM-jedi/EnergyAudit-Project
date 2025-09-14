<?php
// backend/get_audits.php

require_once 'db_connect.php';
header('Content-Type: application/json');

// Check for a valid database connection
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

$audits = [];
$sql = "SELECT audit_id, audit_name, audit_date FROM Audits ORDER BY audit_date DESC";
$result = $conn->query($sql);

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $audits[] = $row;
    }
    echo json_encode(['success' => true, 'audits' => $audits]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to fetch audits.']);
}

$conn->close();
?>