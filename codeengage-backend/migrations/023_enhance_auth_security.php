<?php

return function (PDO $pdo) {
    // Enhance users table for lockout
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN login_attempts INT DEFAULT 0");
    } catch (PDOException $e) {
        // Column might already exist
    }
    
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN lockout_until TIMESTAMP NULL");
    } catch (PDOException $e) {
        // Column might already exist
    }

    // Enhance user_tokens table for session tracking
    try {
        $pdo->exec("ALTER TABLE user_tokens ADD COLUMN ip_address VARCHAR(45) NULL");
    } catch (PDOException $e) {
        // Column might already exist
    }
    
    try {
        $pdo->exec("ALTER TABLE user_tokens ADD COLUMN user_agent TEXT NULL");
    } catch (PDOException $e) {
        // Column might already exist
    }
};
