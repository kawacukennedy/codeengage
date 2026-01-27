<?php

// Database migration script
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../migrations/MigrationRunner.php';

try {
    // Create database connection
    $config = include __DIR__ . '/../config/database.php';
    
    $dsn = "mysql:host={$config['host']};dbname={$config['name']};charset={$config['charset']}";
    $options = $config['options'];
    
    $db = new PDO($dsn, $config['user'], $config['pass'], $options);

    // Run migrations
    $runner = new MigrationRunner($db, __DIR__ . '/../migrations');
    
    $command = $argv[1] ?? 'run';
    
    switch ($command) {
        case 'run':
            echo "Running migrations...\n";
            $results = $runner->run();
            foreach ($results as $result) {
                echo $result . "\n";
            }
            break;
            
        case 'rollback':
            $steps = (int)($argv[2] ?? 1);
            echo "Rolling back {$steps} migration(s)...\n";
            $results = $runner->rollback($steps);
            foreach ($results as $result) {
                echo $result . "\n";
            }
            break;
            
        case 'status':
            $status = $runner->status();
            echo "Migration Status:\n";
            echo "Total Available: {$status['total_available']}\n";
            echo "Total Executed: {$status['total_executed']}\n";
            echo "Total Pending: {$status['total_pending']}\n";
            
            if (!empty($status['pending'])) {
                echo "\nPending Migrations:\n";
                foreach ($status['pending'] as $migration) {
                    echo "  - {$migration}\n";
                }
            }
            break;
            
        default:
            echo "Usage: php migrate.php [run|rollback|status] [steps]\n";
            echo "  run      - Run all pending migrations\n";
            echo "  rollback - Rollback N migrations (default: 1)\n";
            echo "  status   - Show migration status\n";
            break;
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}