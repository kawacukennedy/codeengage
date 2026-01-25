<?php

use PDO;

class Migration_004_create_analysis_tables
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function up(): bool
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS code_analyses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                snippet_version_id INT NOT NULL,
                analysis_type VARCHAR(50) NOT NULL,
                complexity_score DECIMAL(5,2),
                security_issues JSON DEFAULT (JSON_ARRAY()),
                performance_suggestions JSON DEFAULT (JSON_ARRAY()),
                code_smells JSON DEFAULT (JSON_ARRAY()),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (snippet_version_id) REFERENCES snippet_versions(id) ON DELETE CASCADE,
                INDEX idx_code_analyses_version (snippet_version_id),
                INDEX idx_code_analyses_type (analysis_type, created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";

        return $this->db->exec($sql) !== false;
    }

    public function down(): bool
    {
        return $this->db->exec("DROP TABLE IF EXISTS code_analyses") !== false;
    }
}