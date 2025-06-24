<?php
// Database connection for CodeEngage
$host = 'localhost';
$user = 'root';
$pass = 'kent....';
$db   = getenv('DB_NAME') ?: 'codeengage_dev';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die('Database connection failed: ' . $conn->connect_error);
}
?> 