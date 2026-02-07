<?php

return function(PDO $pdo) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    // 1. Add secret_token and expires_at to snippets
    try {
        if ($driver === 'sqlite') {
            $pdo->exec("ALTER TABLE snippets ADD COLUMN secret_token VARCHAR(64) NULL");
            $pdo->exec("ALTER TABLE snippets ADD COLUMN expires_at TIMESTAMP NULL");
        } else {
            $pdo->exec("ALTER TABLE snippets ADD COLUMN secret_token VARCHAR(64) NULL AFTER visibility");
            $pdo->exec("ALTER TABLE snippets ADD COLUMN expires_at TIMESTAMP NULL AFTER secret_token");
        }
    } catch (PDOException $e) {
        // Columns might already exist
    }

    // 2. Create organization_invites table
    if ($driver === 'sqlite') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS organization_invites (
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
        $pdo->exec("CREATE TABLE IF NOT EXISTS organization_invites (
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
};
