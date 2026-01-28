<?php

return function(PDO $pdo) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    
    if ($driver === 'sqlite') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snippet_id INTEGER NOT NULL,
            session_token VARCHAR(64) UNIQUE NOT NULL,
            participants TEXT, -- JSON
            cursor_positions TEXT, -- JSON
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
        )");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_collab_sessions_token ON collaboration_sessions(session_token)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_collab_sessions_snippet ON collaboration_sessions(snippet_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_collab_sessions_activity ON collaboration_sessions(last_activity)");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            snippet_id INT NOT NULL,
            session_token VARCHAR(64) UNIQUE NOT NULL,
            participants JSON,
            cursor_positions JSON,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            INDEX idx_collab_sessions_token (session_token),
            INDEX idx_collab_sessions_snippet (snippet_id),
            INDEX idx_collab_sessions_activity (last_activity)
        ) ENGINE=InnoDB");
    }
};