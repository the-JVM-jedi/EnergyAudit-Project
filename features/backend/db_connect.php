<?php
// backend/db_connect.php

// --- HIDE ALL ERRORS FROM THE BROWSER ---
// This prevents PHP warnings from corrupting the JSON response.
ini_set('display_errors', 0);
ini_set('log_errors', 1); // Log errors to a file instead.
error_reporting(E_ALL);

// --- Database Connection Details ---
$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'energy_db';

// --- Create the Database Connection ---
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// --- Check for Connection Errors ---
// The connection status will be checked in the main script.
// We do NOT use die() or echo here because it would break JSON.

?>