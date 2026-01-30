<?php

use App\Database\Migration;

class CreateCommentsTable extends Migration
{
    public function up()
    {
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                snippet_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        
        $this->db->exec("
            CREATE INDEX idx_comments_snippet ON comments(snippet_id, created_at DESC);
        ");
    }

    public function down()
    {
        $this->db->exec("DROP TABLE IF EXISTS comments");
    }
}
