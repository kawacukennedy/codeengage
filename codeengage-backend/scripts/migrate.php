<?php

// Bootstrap manually for CLI
$envFile = __DIR__ . '/../config/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        if (!isset($_ENV[$key])) {
            $_ENV[$key] = trim($value);
        }
    }
}

// Autoloader
spl_autoload_register(function ($className) {
    $ds = DIRECTORY_SEPARATOR;
    $className = str_replace('App\\', '', $className);
    $className = str_replace('\\', $ds, $className);
    $className = trim($className, $ds);
    $path = __DIR__ . '/../app/' . $className . '.php';
    if (is_readable($path)) {
        require $path;
        return true;
    }
    return false;
});

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
    $files = array_filter($files, function($f) {
        return preg_match('/^\d+/', basename($f));
    });
    sort($files);
    
    foreach ($files as $file) {
        $name = basename($file);
        
        if (in_array($name, $applied)) {
            echo "Skipping $name (already applied)\n";
            continue;
        }
        
        echo "Migrating $name... ";
        $beforeClasses = get_declared_classes();
        $migration = require $file;
        $afterClasses = get_declared_classes();
        $newClasses = array_diff($afterClasses, $beforeClasses);
        
        if (is_callable($migration)) {
            $migration($pdo);
            $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
            $stmt->execute([$name]);
            echo "DONE\n";
        } elseif (is_object($migration) && method_exists($migration, 'up')) {
            $migration->up($pdo);
            $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
            $stmt->execute([$name]);
            echo "DONE (Object)\n";
        } elseif (is_array($migration) && isset($migration['up']) && is_callable($migration['up'])) {
            $migration['up']($pdo);
            $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
            $stmt->execute([$name]);
            echo "DONE\n";
        } elseif (!empty($newClasses)) {
            $className = reset($newClasses);
            $instance = new $className($pdo);
            if (method_exists($instance, 'up')) {
                $instance->up($pdo);
                $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
                $stmt->execute([$name]);
                echo "DONE ($className)\n";
            } else {
                echo "FAILED (No up method in $className)\n";
            }
        } else {
            echo "FAILED (Not callable or valid array/class/object)\n";
        }
    }
    
    echo "All migrations completed successfully.\n";
    
} catch (PDOException $e) {
    die("DB Error: " . $e->getMessage() . "\n");
}