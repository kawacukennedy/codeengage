<?php

use App\Core\Database;

class Migration_022_add_performance_indexes {
    public function up(PDO $pdo) {
        // $db = new Database(); // Not needed
        
        // Add indexes to 'snippets' table
        $this->addIndex($pdo, 'snippets', 'idx_snippets_user_id', 'user_id');
        $this->addIndex($pdo, 'snippets', 'idx_snippets_is_public', 'is_public');
        $this->addIndex($pdo, 'snippets', 'idx_snippets_created_at', 'created_at');
        // Composite index for common filtering
        $this->addIndex($pdo, 'snippets', 'idx_snippets_public_created', 'is_public, created_at');

        // Add indexes to 'activity_logs' table
        $this->addIndex($pdo, 'activity_logs', 'idx_activity_user_id', 'user_id');
        $this->addIndex($pdo, 'activity_logs', 'idx_activity_created_at', 'created_at');

        // Add indexes to 'comments' table
        $this->addIndex($pdo, 'comments', 'idx_comments_snippet_id', 'snippet_id');
    }

    public function down(PDO $pdo) {
        // Remove indexes
        $this->dropIndex($pdo, 'snippets', 'idx_snippets_user_id');
        $this->dropIndex($pdo, 'snippets', 'idx_snippets_is_public');
        $this->dropIndex($pdo, 'snippets', 'idx_snippets_created_at');
        $this->dropIndex($pdo, 'snippets', 'idx_snippets_public_created');
        
        $this->dropIndex($pdo, 'activity_logs', 'idx_activity_user_id');
        $this->dropIndex($pdo, 'activity_logs', 'idx_activity_created_at');
        
        $this->dropIndex($pdo, 'comments', 'idx_comments_snippet_id');
    }

    private function addIndex($pdo, $table, $indexName, $columns) {
        try {
            // Check if index exists (SQLite specific check or generic try/catch)
            $pdo->exec("CREATE INDEX IF NOT EXISTS {$indexName} ON {$table} ({$columns})");
            echo "Created index {$indexName} on {$table}\n";
        } catch (PDOException $e) {
            echo "Index {$indexName} might already exist or failed: " . $e->getMessage() . "\n";
        }
    }

    private function dropIndex($pdo, $table, $indexName) {
        try {
            $pdo->exec("DROP INDEX IF EXISTS {$indexName}");
            echo "Dropped index {$indexName}\n";
        } catch (PDOException $e) {
            echo "Failed to drop index {$indexName}: " . $e->getMessage() . "\n";
        }
    }
}
