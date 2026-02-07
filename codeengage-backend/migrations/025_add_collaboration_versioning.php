<?php

return function(PDO $pdo) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    try {
        if ($driver === 'sqlite') {
            $pdo->exec("ALTER TABLE collaboration_sessions ADD COLUMN version INTEGER DEFAULT 0");
        } else {
            $pdo->exec("ALTER TABLE collaboration_sessions ADD COLUMN version INT DEFAULT 0 AFTER session_token");
        }
    } catch (PDOException $e) {
        // Column might already exist
    }
};
