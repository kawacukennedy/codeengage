<?php

class MigrationRunner
{
    private PDO $db;
    private string $migrationsPath;

    public function __construct(PDO $db, string $migrationsPath)
    {
        $this->db = $db;
        $this->migrationsPath = $migrationsPath;
        $this->createMigrationsTable();
    }

    private function createMigrationsTable(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->db->exec($sql);
    }

    public function run(): array
    {
        $executed = $this->getExecutedMigrations();
        $available = $this->getAvailableMigrations();
        $pending = array_diff($available, $executed);
        $results = [];

        foreach ($pending as $migration) {
            try {
                $this->runMigration($migration);
                $results[] = "Migrated: {$migration}";
            } catch (Exception $e) {
                $results[] = "Failed: {$migration} - " . $e->getMessage();
            }
        }

        return $results;
    }

    public function rollback(int $steps = 1): array
    {
        $executed = $this->getExecutedMigrations();
        $recent = array_reverse(array_slice($executed, -$steps));
        $results = [];

        foreach ($recent as $migration) {
            try {
                $this->rollbackMigration($migration);
                $results[] = "Rolled back: {$migration}";
            } catch (Exception $e) {
                $results[] = "Failed to rollback: {$migration} - " . $e->getMessage();
            }
        }

        return $results;
    }

    private function getExecutedMigrations(): array
    {
        $stmt = $this->db->query("SELECT migration FROM migrations ORDER BY migration");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    private function getAvailableMigrations(): array
    {
        $files = glob($this->migrationsPath . '/*.php');
        $migrations = [];

        foreach ($files as $file) {
            $migrations[] = basename($file, '.php');
        }

        sort($migrations);
        return $migrations;
    }

    private function runMigration(string $migrationName): void
    {
        require_once $this->migrationsPath . '/' . $migrationName . '.php';
        $className = str_replace('-', '_', $migrationName);

        if (class_exists($className)) {
            $migration = new $className($this->db);
            $migration->up();

            $stmt = $this->db->prepare("INSERT INTO migrations (migration) VALUES (?)");
            $stmt->execute([$migrationName]);
        } else {
            throw new Exception("Migration class {$className} not found");
        }
    }

    private function rollbackMigration(string $migrationName): void
    {
        require_once $this->migrationsPath . '/' . $migrationName . '.php';
        $className = str_replace('-', '_', $migrationName);

        if (class_exists($className)) {
            $migration = new $className($this->db);
            $migration->down();

            $stmt = $this->db->prepare("DELETE FROM migrations WHERE migration = ?");
            $stmt->execute([$migrationName]);
        } else {
            throw new Exception("Migration class {$className} not found");
        }
    }

    public function status(): array
    {
        $executed = $this->getExecutedMigrations();
        $available = $this->getAvailableMigrations();
        $pending = array_diff($available, $executed);

        return [
            'executed' => $executed,
            'available' => $available,
            'pending' => $pending,
            'total_executed' => count($executed),
            'total_available' => count($available),
            'total_pending' => count($pending)
        ];
    }
}