<?php

// Database Setup Script for CodeEngage (SQLite Fallback)

// Database Setup Script for CodeEngage (SQLite Fallback)

// Simple Autoloader (Replicated from index.php)
spl_autoload_register(function ($className) {
    $dsn = DIRECTORY_SEPARATOR;
    $className = str_replace('App\\', '', $className);
    $className = str_replace('\\', $dsn, $className);
    $className = trim($className, $dsn);
    
    $path = __DIR__ . '/../app/' . $className . '.php';
    
    if (is_readable($path)) {
        require $path;
        return true;
    }
    return false;
});

// Bootstrap
$envFile = __DIR__ . '/../config/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Config
$config = require __DIR__ . '/../config/app.php';
$databaseConfig = require __DIR__ . '/../config/database.php';

// Check connection
$driver = $_ENV['DB_CONNECTION'] ?? 'mysql';
echo "Setting up database using driver: $driver\n";

try {
    if ($driver === 'sqlite') {
        $dbPath = $databaseConfig['sqlite_path'];
        $dsn = "sqlite:{$dbPath}";
        echo "SQLite Path: $dbPath\n";
        
        $storageDir = dirname($dbPath);
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }
        if (!file_exists($dbPath)) {
            touch($dbPath);
            echo "Created database file.\n";
        }
        
        $db = new PDO($dsn, null, null, $databaseConfig['options']);
        $db->exec("PRAGMA foreign_keys = ON;");
    } else {
        $dsn = "mysql:host={$databaseConfig['host']};charset={$databaseConfig['charset']}";
        // Connect without DB name first to create it
        $db = new PDO($dsn, $databaseConfig['user'], $databaseConfig['pass'], $databaseConfig['options']);
        $db->exec("CREATE DATABASE IF NOT EXISTS `{$databaseConfig['name']}`");
        $db->exec("USE `{$databaseConfig['name']}`");
    }
    
    echo "Connected to database.\n";
    
    // Run Migrations
    require_once __DIR__ . '/../migrations/MigrationRunner.php';
    
    $runner = new MigrationRunner($db, __DIR__ . '/../migrations');
    echo "Running migrations...\n";
    $results = $runner->run();
    
    foreach ($results as $result) {
        echo "$result\n";
    }
    
    echo "Database setup complete!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
