<?php

return function(PDO $pdo) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    // Add role to users if not exists
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER email_verified_at");
    } catch (PDOException $e) {
        // Column probably already exists, ignore
    }

    // Add host_user_id to collaboration_sessions
    try {
        $pdo->exec("ALTER TABLE collaboration_sessions ADD COLUMN host_user_id INT AFTER snippet_id");
    } catch (PDOException $e) {
        // Column probably already exists, ignore
    }
};
