<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Database\Database;
use App\Repositories\CollaborationRepository;

// Load environment variables if needed, or assume environment is set
$config = require __DIR__ . '/../config/database.php';

try {
    $db = Database::connect($config);
    $repo = new CollaborationRepository($db);
    
    // Cleanup sessions older than 24 hours (86400 seconds)
    $deleted = $repo->cleanupExpired(86400);
    
    echo sprintf("[%s] Cleanup Session Job: Deleted %d expired sessions.\n", date('Y-m-d H:i:s'), $deleted);
    
} catch (\Exception $e) {
    echo sprintf("[%s] Cleanup Session Job Failed: %s\n", date('Y-m-d H:i:s'), $e->getMessage());
    exit(1);
}
