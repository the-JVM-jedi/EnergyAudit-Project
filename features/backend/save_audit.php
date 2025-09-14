<?php
// backend/save_audit.php

// ALWAYS include the connection file first.
require_once 'db_connect.php'; 

// This header MUST be sent before any other output.
header('Content-Type: application/json');

// --- Check if the database connection from db_connect.php failed ---
if ($conn->connect_error) {
    // If it failed, send back a proper JSON error message and exit.
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// Get Data from the Frontend
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

// Basic Validation
if (empty($data['auditName']) || !isset($data['devices'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid data. Audit name and devices are required.']);
    exit;
}

// Start a Database Transaction
$conn->begin_transaction();

try {
    // Step 1: Insert the Audit Record
    $audit_name = $data['auditName'];
    $notes = isset($data['notes']) ? $data['notes'] : null;

    $sql_audit = "INSERT INTO Audits (audit_name, notes) VALUES (?, ?)";
    $stmt_audit = $conn->prepare($sql_audit);
    $stmt_audit->bind_param("ss", $audit_name, $notes);
    $stmt_audit->execute();

    $last_audit_id = $conn->insert_id;
    $stmt_audit->close();

    // Step 2: Insert Each Device
    // Only proceed if there are devices to insert
    if (!empty($data['devices'])) {
        $sql_device = "INSERT INTO Devices (audit_id, device_class, description, power_rating_watts, quantity, hours_per_day, daily_kwh_total) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt_device = $conn->prepare($sql_device);

        foreach ($data['devices'] as $device) {
            $stmt_device->bind_param("issiiid",
                $last_audit_id,
                $device['class'],
                $device['description'],
                $device['power'],
                $device['quantity'],
                $device['time'],
                $device['dailyKwh']
            );
            $stmt_device->execute();
        }
        $stmt_device->close();
    }

    // Commit the transaction
    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Audit saved successfully!', 'audit_id' => $last_audit_id]);

} catch (mysqli_sql_exception $exception) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => 'Database error during transaction: ' . $exception->getMessage()]);
}

$conn->close();

?>