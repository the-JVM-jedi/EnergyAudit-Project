<?php
// process_queue.php
// This script reads from the queue, processes the data, and moves it to the final repository.
// INTENDED TO BE RUN FROM THE COMMAND LINE / CRON JOB.

// --- Database Configuration ---
$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'workstation_monitor';

// --- Mock Power Formula ---
function calculate_inferred_watts($cpu, $mem) {
    // Formula: Watts = (CPU % * 0.85) + (Memory % * 0.25) + 22.5
    $watts = ($cpu * 0.85) + ($mem * 0.25) + 22.5;
    return round($watts, 2);
}

// --- Main Logic ---
echo "--- Processor started at " . date('Y-m-d H:i:s') . " ---\n";

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error . "\n");
}

// 1. Select all items from the queue
$result = $conn->query("SELECT id, raw_csv_data FROM queue_table ORDER BY id ASC");
if ($result->num_rows === 0) {
    echo "Queue is empty. No work to do.\n";
    $conn->close();
    exit();
}

echo "Found " . $result->num_rows . " items in the queue. Starting processing...\n";

// 2. Prepare the INSERT statement for the final repository (very efficient)
$insert_stmt = $conn->prepare(
    "INSERT INTO metrics_repository (timestamp_utc, computer_name, computer_number, cpu_percent, mem_percent_used, disk_bytes_sec, inferred_watts) VALUES (?, ?, ?, ?, ?, ?, ?)"
);

$processed_ids = [];

// 3. Loop through each queued item
while ($row = $result->fetch_assoc()) {
    $queue_id = $row['id'];
    $raw_csv_data = $row['raw_csv_data'];
    $lines = explode("\n", trim($raw_csv_data));

    foreach ($lines as $line) {
        if (empty(trim($line))) continue;

        // Parse the CSV line
        $data = str_getcsv($line);

        // Assign to variables for clarity
        $timestamp_utc = $data[0];
        $computer_name = $data[1];
        $computer_number = $data[2];
        $cpu_percent = (float)$data[3];
        $mem_percent_used = (float)$data[4];
        $disk_bytes_sec = (int)$data[5];

        // Apply the formula
        $inferred_watts = calculate_inferred_watts($cpu_percent, $mem_percent_used);
        
        // Bind parameters and execute the prepared statement
        $insert_stmt->bind_param("sssddid", 
            $timestamp_utc, $computer_name, $computer_number, 
            $cpu_percent, $mem_percent_used, $disk_bytes_sec, 
            $inferred_watts
        );
        $insert_stmt->execute();
    }
    // Add the ID to our list of processed items
    $processed_ids[] = $queue_id;
    echo "Processed queue item ID: $queue_id\n";
}

// 4. Delete the processed items from the queue
if (!empty($processed_ids)) {
    $id_string = implode(',', $processed_ids);
    $conn->query("DELETE FROM queue_table WHERE id IN ($id_string)");
    echo "Cleaned up " . count($processed_ids) . " processed items from the queue.\n";
}

$insert_stmt->close();
$conn->close();

echo "--- Processor finished at " . date('Y-m-d H:i:s') . " ---\n";
?>