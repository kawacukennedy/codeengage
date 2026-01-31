<?php

use PDO;

class Migration_024_enhance_collaboration_orgs
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function up(): bool
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);

        // 1. Add secret_token and expires_at to snippets
        if ($driver === 'sqlite') {
            $this->db->exec("ALTER TABLE snippets ADD COLUMN secret_token VARCHAR(64) NULL");
            $this->db->exec("ALTER TABLE snippets ADD COLUMN expires_at TIMESTAMP NULL");
        } else {
            $this->db->exec("ALTER TABLE snippets ADD COLUMN secret_token VARCHAR(64) NULL AFTER visibility");
            $this->db->exec("ALTER TABLE snippets ADD COLUMN expires_at TIMESTAMP NULL AFTER secret_token");
        }

        // 2. Create organization_invites table
        if ($driver === 'sqlite') {
            $this->db->exec("CREATE TABLE IF NOT EXISTS organization_invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER NOT NULL,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(64) UNIQUE NOT NULL,
                role TEXT DEFAULT 'member',
                inviter_id INTEGER NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                accepted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
            )");
        } else {
            $this->db->exec("CREATE TABLE IF NOT EXISTS organization_invites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                organization_id INT NOT NULL,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(64) UNIQUE NOT NULL,
                role ENUM('admin', 'member', 'viewer') DEFAULT 'member',
                inviter_id INT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                accepted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        }

        return true;
    }

    public function down(): bool
    {
        // Dropping columns is not supported in many SQLite versions easily, but for development:
        $this->db->exec("DROP TABLE IF EXISTS organization_invites");
        return true;
    }
}

return function(PDO $pdo) {
    $migration = new Migration_024_enhance_collaboration_orgs($pdo);
    return $migration->up();
};
