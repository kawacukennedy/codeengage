<?php
// Simple Backend Test
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/app/Helpers/ApiResponse.php';

// Test database connection
try {
    $config = include __DIR__ . '/config/database.php';
    $dsn = "mysql:host={$config['host']};dbname={$config['name']};charset={$config['charset']}";
    $db = new PDO($dsn, $config['user'], $config['pass'], $config['options']);
    echo "✓ Database connection successful\n";
} catch (Exception $e) {
    echo "✗ Database connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// Test basic API structure
echo "Testing API structure...\n";

$requiredFiles = [
    'public/index.php' => 'API entry point',
    'app/Controllers/Api/AuthController.php' => 'Auth controller',
    'app/Controllers/Api/SnippetController.php' => 'Snippet controller',
    'app/Services/AuthService.php' => 'Auth service',
    'app/Repositories/UserRepository.php' => 'User repository',
    'app/Models/User.php' => 'User model',
    'app/Helpers/ApiResponse.php' => 'API response helper'
];

foreach ($requiredFiles as $file => $description) {
    if (file_exists(__DIR__ . '/' . $file)) {
        echo "✓ {$description} exists\n";
    } else {
        echo "✗ {$description} missing\n";
    }
}

// Test database tables
echo "\nTesting database structure...\n";
$expectedTables = [
    'users', 'snippets', 'snippet_versions', 'collaboration_sessions',
    'code_analyses', 'achievements', 'tags', 'snippet_tags',
    'organizations', 'audit_logs', 'login_attempts'
];

foreach ($expectedTables as $table) {
    $stmt = $db->query("SHOW TABLES LIKE '{$table}'");
    if ($stmt->rowCount() > 0) {
        echo "✓ Table {$table} exists\n";
    } else {
        echo "✗ Table {$table} missing\n";
    }
}

echo "\nBackend test completed!\n";
echo "API is ready for testing.\n";
echo "Start the server with: php -S localhost:8000 -t public\n";