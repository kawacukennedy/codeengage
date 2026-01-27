<?php

use PDO;

class Migration_002_create_snippets_tables
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function up(): bool
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS snippets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                author_id INT NOT NULL,
                organization_id INT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                visibility ENUM('public', 'private', 'organization') DEFAULT 'public',
                language VARCHAR(50) NOT NULL,
                forked_from_id INT NULL,
                is_template BOOLEAN DEFAULT FALSE,
                template_variables JSON NULL,
                view_count INT DEFAULT 0,
                star_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
                FOREIGN KEY (forked_from_id) REFERENCES snippets(id) ON DELETE SET NULL,
                INDEX idx_snippets_author (author_id, created_at DESC),
                INDEX idx_snippets_language (language, created_at DESC),
                INDEX idx_snippets_visibility (visibility, created_at DESC),
                INDEX idx_snippets_organization (organization_id, visibility),
                FULLTEXT idx_snippets_search (title, description)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";

        $sql2 = "
            CREATE TABLE IF NOT EXISTS snippet_versions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                snippet_id INT NOT NULL,
                version_number INT NOT NULL,
                code LONGTEXT NOT NULL,
                checksum VARCHAR(64) NOT NULL,
                editor_id INT NOT NULL,
                change_summary VARCHAR(500),
                analysis_results JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
                FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY (snippet_id, version_number),
                INDEX idx_snippet_versions_snippet (snippet_id, version_number DESC),
                INDEX idx_snippet_versions_editor (editor_id, created_at DESC),
                FULLTEXT idx_snippet_versions_code (code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";

        return $this->db->exec($sql) !== false && $this->db->exec($sql2) !== false;
    }

    public function down(): bool
    {
        return $this->db->exec("DROP TABLE IF EXISTS snippet_versions") !== false &&
               $this->db->exec("DROP TABLE IF EXISTS snippets") !== false;
    }
}