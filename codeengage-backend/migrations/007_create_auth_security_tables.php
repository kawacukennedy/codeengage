<?php

return function (PDO $pdo) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    
    // User Tokens (Refresh Tokens)
    if ($driver === 'sqlite') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'refresh',
            token VARCHAR(64) UNIQUE NOT NULL,
            name VARCHAR(255) NULL,
            expires_at TIMESTAMP NULL,
            last_used_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        // Email Verifications
        $pdo->exec("CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        // Password Resets
        $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        // SQLite indexes
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'refresh',
            token VARCHAR(64) UNIQUE NOT NULL,
            name VARCHAR(255) NULL,
            expires_at TIMESTAMP NULL,
            last_used_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS email_verifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_password_resets_email (email)
        )");
    }
    
    // Add email_verified_at column to users if it doesn't exist
    try {
        if ($driver === 'sqlite') {
            $pdo->exec("ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL");
        } else {
            $pdo->exec("ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL AFTER last_active_at");
        }
    } catch (PDOException $e) {
        // Column likely exists, ignore
    }
};
