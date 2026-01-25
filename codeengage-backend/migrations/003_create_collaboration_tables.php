<?php

use PDO;

class Migration_003_create_collaboration_tables
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function up(): bool
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS collaboration_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                snippet_id INT NOT NULL,
                session_token VARCHAR(64) UNIQUE NOT NULL,
                participants JSON DEFAULT (JSON_ARRAY()),
                cursor_positions JSON DEFAULT (JSON_OBJECT()),
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
                INDEX idx_collab_sessions_token (session_token),
                INDEX idx_collab_sessions_snippet (snippet_id),
                INDEX idx_collab_sessions_activity (last_activity)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";

        return $this->db->exec($sql) !== false;
    }

    public function down(): bool
    {
        return $this->db->exec("DROP TABLE IF EXISTS collaboration_sessions") !== false;
    }
}