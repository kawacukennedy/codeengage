<?php

return function(PDO $pdo) {
    // Helper functions
    $addIndex = function($pdo, $table, $indexName, $columns) {
        try {
            // Check if index exists (SQLite specific check or generic try/catch)
            $pdo->exec("CREATE INDEX IF NOT EXISTS {$indexName} ON {$table} ({$columns})");
            echo "Created index {$indexName} on {$table}\n";
        } catch (PDOException $e) {
            echo "Index {$indexName} might already exist or failed: " . $e->getMessage() . "\n";
        }
    };
    
    // Add indexes to 'snippets' table
    $addIndex($pdo, 'snippets', 'idx_snippets_user_id', 'user_id');
    $addIndex($pdo, 'snippets', 'idx_snippets_is_public', 'is_public');
    $addIndex($pdo, 'snippets', 'idx_snippets_created_at', 'created_at');
    // Composite index for common filtering
    $addIndex($pdo, 'snippets', 'idx_snippets_public_created', 'is_public, created_at');

    // Add indexes to 'activity_logs' table
    $addIndex($pdo, 'activity_logs', 'idx_activity_user_id', 'user_id');
    $addIndex($pdo, 'activity_logs', 'idx_activity_created_at', 'created_at');

    // Add indexes to 'comments' table
    $addIndex($pdo, 'comments', 'idx_comments_snippet_id', 'snippet_id');
};
