<?php

return [
    'up' => function (PDO $pdo) {
        // Enhance users table for lockout
        $pdo->exec("ALTER TABLE users 
            ADD COLUMN login_attempts INT DEFAULT 0,
            ADD COLUMN lockout_until TIMESTAMP NULL");

        // Enhance user_tokens table for session tracking
        $pdo->exec("ALTER TABLE user_tokens 
            ADD COLUMN ip_address VARCHAR(45) NULL,
            ADD COLUMN user_agent TEXT NULL");
    },
    'down' => function (PDO $pdo) {
        $pdo->exec("ALTER TABLE user_tokens 
            DROP COLUMN ip_address,
            DROP COLUMN user_agent");
            
        $pdo->exec("ALTER TABLE users 
            DROP COLUMN login_attempts,
            DROP COLUMN lockout_until");
    }
];
