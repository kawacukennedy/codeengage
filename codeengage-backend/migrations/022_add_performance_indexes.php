<?php

return function(PDO $pdo) {
    // Helper functions
    $addIndex = function($pdo, $table, $indexName, $columns) {
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        try {
            if ($driver === 'sqlite') {
                $pdo->exec("CREATE INDEX IF NOT EXISTS {$indexName} ON {$table} ({$columns})");
            } else {
                // MySQL doesn't have IF NOT EXISTS for indexes easily, 
                // but since we just reset the DB, we can just try to create it.
                // Or better, check if it exists in information_schema if we wanted to be robust.
                $pdo->exec("CREATE INDEX {$indexName} ON {$table} ({$columns})");
            }
            echo "Created index {$indexName} on {$table}\n";
        } catch (PDOException $e) {
            echo "Index {$indexName} might already exist or failed: " . $e->getMessage() . "\n";
        }
    };
    
    // Add indexes to 'snippets' table
    $addIndex($pdo, 'snippets', 'idx_snippets_author_id', 'author_id');
    $addIndex($pdo, 'snippets', 'idx_snippets_visibility', 'visibility');
    $addIndex($pdo, 'snippets', 'idx_snippets_created_at_022', 'created_at');
    // Composite index for common filtering
    $addIndex($pdo, 'snippets', 'idx_snippets_visibility_created', 'visibility, created_at');

    // Add indexes to 'audit_logs' table
    $addIndex($pdo, 'audit_logs', 'idx_audit_actor_id', 'actor_id');
    $addIndex($pdo, 'audit_logs', 'idx_audit_created_at_022', 'created_at');

    // Add indexes to 'comments' table
    $addIndex($pdo, 'comments', 'idx_comments_snippet_id', 'snippet_id');
};
