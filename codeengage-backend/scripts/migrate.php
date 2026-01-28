<?php

require_once __DIR__ . '/../public/index.php'; // Bootstrap to load env and config

echo "Starting migrations...\n";

// Get DB connection
$databaseConfig = require __DIR__ . '/../config/database.php';
$dsn = "mysql:host={$databaseConfig['host']};charset={$databaseConfig['charset']}"; // Connect without DB first to create it
$options = $databaseConfig['options'];

try {
    $pdo = new PDO($dsn, $databaseConfig['user'], $databaseConfig['pass'], $options);
    
    // Create database if not exists
    $dbName = $databaseConfig['name'];
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Database '$dbName' checked/created.\n";
    
    // Select database
    $pdo->exec("USE `$dbName`");
    
    // Create migrations table
    $pdo->exec("CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Get applied migrations
    $stm = $pdo->query("SELECT migration FROM migrations");
    $applied = $stm->fetchAll(PDO::FETCH_COLUMN);
    
    // Get migration files
    $files = glob(__DIR__ . '/../migrations/*.php');
    sort($files);
    
    foreach ($files as $file) {
        $name = basename($file);
        
        if (in_array($name, $applied)) {
            echo "Skipping $name (already applied)\n";
            continue;
        }
        
        echo "Migrating $name... ";
        $migration = require $file;
        
        if (is_callable($migration)) {
            $migration($pdo);
            
            $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
            $stmt->execute([$name]);
            echo "DONE\n";
        } else {
            echo "FAILED (Not callable)\n";
        }
    }
    
    echo "All migrations completed successfully.\n";
    
} catch (PDOException $e) {
    die("DB Error: " . $e->getMessage() . "\n");
}