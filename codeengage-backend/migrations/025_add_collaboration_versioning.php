<?php

use PDO;

class Migration_025_add_collaboration_versioning
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
            $this->db->exec("ALTER TABLE collaboration_sessions ADD COLUMN version INTEGER DEFAULT 0");
        } else {
            $this->db->exec("ALTER TABLE collaboration_sessions ADD COLUMN version INT DEFAULT 0 AFTER session_token");
        }

        return true;
    }

    public function down(): bool
    {
        return true;
    }
}

return function(PDO $pdo) {
    $migration = new Migration_025_add_collaboration_versioning($pdo);
    return $migration->up();
};
