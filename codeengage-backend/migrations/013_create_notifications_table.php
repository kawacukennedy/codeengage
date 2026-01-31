<?php

use App\Helpers\Database;

return new class {
    public function up(PDO $db): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'info',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                data JSON DEFAULT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";

        $db->exec($sql);
        
        // Add index on user_id and is_read for performance
        try {
            $db->exec("CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read)");
        } catch (\PDOException $e) {
            // Index might already exist
        }
    }

    public function down(PDO $db): void
    {
        $db->exec("DROP TABLE IF EXISTS notifications");
    }
};
