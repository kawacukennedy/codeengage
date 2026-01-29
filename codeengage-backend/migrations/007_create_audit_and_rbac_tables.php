<?php

use PDO;

class Migration_007_create_audit_and_rbac_tables
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function up(): bool
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);

        if ($driver === 'sqlite') {
             // Roles
            $sql1 = "CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                is_system_role BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )";
            // Permissions
            $sql2 = "CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )";
            // User Roles
            $sql3 = "CREATE TABLE IF NOT EXISTS user_roles (
                user_id INTEGER NOT NULL,
                role_id INTEGER NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, role_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            )";
            // Role Permissions
            $sql4 = "CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            )";
            // Audit Logs
            $sql5 = "CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_id INTEGER NULL,
                action_type VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INTEGER NULL,
                old_values TEXT NULL,
                new_values TEXT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                request_id VARCHAR(64),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
            )";
            $this->db->exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_007 ON audit_logs(actor_id, created_at DESC)");
            $this->db->exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_007 ON audit_logs(entity_type, entity_id)");
            $this->db->exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_action_007 ON audit_logs(action_type, created_at DESC)");

            // Login Attempts
            $sql6 = "CREATE TABLE IF NOT EXISTS login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NULL,
                ip_address VARCHAR(45) NOT NULL,
                attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT 0,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )";
            $this->db->exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_007 ON login_attempts(ip_address, attempt_time DESC)");
            $this->db->exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_user_007 ON login_attempts(user_id, attempt_time DESC)");

            // Relationships
            $sql7 = "CREATE TABLE IF NOT EXISTS snippet_relationships (
                source_snippet_id INTEGER NOT NULL,
                target_snippet_id INTEGER NOT NULL,
                relationship_type VARCHAR(50) NOT NULL,
                strength DECIMAL(3,2) DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (source_snippet_id, target_snippet_id, relationship_type),
                FOREIGN KEY (source_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
                FOREIGN KEY (target_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
            )";
        } else {
            $sql1 = "
                CREATE TABLE IF NOT EXISTS roles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT,
                    is_system_role BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
    
            $sql2 = "
                CREATE TABLE IF NOT EXISTS permissions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
    
            $sql3 = "
                CREATE TABLE IF NOT EXISTS user_roles (
                    user_id INT NOT NULL,
                    role_id INT NOT NULL,
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, role_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
    
            $sql4 = "
                CREATE TABLE IF NOT EXISTS role_permissions (
                    role_id INT NOT NULL,
                    permission_id INT NOT NULL,
                    PRIMARY KEY (role_id, permission_id),
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
    
            $sql5 = "
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    actor_id INT NULL,
                    action_type VARCHAR(100) NOT NULL,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id INT NULL,
                    old_values JSON NULL,
                    new_values JSON NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    request_id VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX idx_audit_logs_actor (actor_id, created_at DESC),
                    INDEX idx_audit_logs_entity (entity_type, entity_id),
                    INDEX idx_audit_logs_action (action_type, created_at DESC)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
    
            $sql6 = "
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NULL,
                    ip_address VARCHAR(45) NOT NULL,
                    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT FALSE,
                    user_agent TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX idx_login_attempts_ip (ip_address, attempt_time DESC),
                    INDEX idx_login_attempts_user (user_id, attempt_time DESC)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
    
            $sql7 = "
                CREATE TABLE IF NOT EXISTS snippet_relationships (
                    source_snippet_id INT NOT NULL,
                    target_snippet_id INT NOT NULL,
                    relationship_type VARCHAR(50) NOT NULL,
                    strength DECIMAL(3,2) DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (source_snippet_id, target_snippet_id, relationship_type),
                    FOREIGN KEY (source_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
        }

        return $this->db->exec($sql1) !== false &&
               $this->db->exec($sql2) !== false &&
               $this->db->exec($sql3) !== false &&
               $this->db->exec($sql4) !== false &&
               $this->db->exec($sql5) !== false &&
               $this->db->exec($sql6) !== false &&
               $this->db->exec($sql7) !== false;
    }

    public function down(): bool
    {
        return $this->db->exec("DROP TABLE IF EXISTS snippet_relationships") !== false &&
               $this->db->exec("DROP TABLE IF EXISTS login_attempts") !== false &&
               $this->db->exec("DROP TABLE IF EXISTS audit_logs") !== false &&
               $this->db->exec("DROP TABLE IF EXISTS role_permissions") !== false &&
               $this->db->exec("DROP TABLE IF EXISTS user_roles") !== false &&
               $this->db->exec("DROP TABLE IF EXISTS permissions") !== false &&
               $this->db->exec("DROP TABLE IF EXISTS roles") !== false;
    }
}

return function(PDO $pdo) {
    $migration = new Migration_007_create_audit_and_rbac_tables($pdo);
    return $migration->up();
};