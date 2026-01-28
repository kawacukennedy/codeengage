<?php

return function(PDO $pdo) {
    // Tags
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    if ($driver === 'sqlite') {
        // Tags
        $pdo->exec("CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(50) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            usage_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC)");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            usage_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tags_slug (slug),
            INDEX idx_tags_usage (usage_count DESC)
        ) ENGINE=InnoDB");
    }

    // Snippets
    if ($driver === 'sqlite') {
        // Snippets
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_id INTEGER NOT NULL,
            organization_id INTEGER NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            visibility TEXT DEFAULT 'public', -- ENUM handled as TEXT
            language VARCHAR(50) NOT NULL,
            forked_from_id INTEGER NULL,
            is_template BOOLEAN DEFAULT 0,
            template_variables TEXT NULL, -- JSON as TEXT
            view_count INTEGER DEFAULT 0,
            star_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL,
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
            FOREIGN KEY (forked_from_id) REFERENCES snippets(id) ON DELETE SET NULL
        )");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_snippets_author ON snippets(author_id, created_at DESC)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language, created_at DESC)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_snippets_visibility ON snippets(visibility, created_at DESC)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_snippets_organization ON snippets(organization_id, visibility)");
        // Skip FULLTEXT for SQLite simplicity or use separate FTS table (skipping for now)
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippets (
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
        ) ENGINE=InnoDB");
    }

    // Snippet Versions
    if ($driver === 'sqlite') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippet_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snippet_id INTEGER NOT NULL,
            version_number INTEGER NOT NULL,
            code LONGTEXT NOT NULL,
            checksum VARCHAR(64) NOT NULL,
            editor_id INTEGER NOT NULL,
            change_summary VARCHAR(500),
            analysis_results TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_snippet_versions_unique ON snippet_versions(snippet_id, version_number)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_snippet_versions_snippet ON snippet_versions(snippet_id, version_number DESC)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_snippet_versions_editor ON snippet_versions(editor_id, created_at DESC)");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippet_versions (
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
        ) ENGINE=InnoDB");
    }

    // Snippet Tags
    if ($driver === 'sqlite') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippet_tags (
            snippet_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (snippet_id, tag_id),
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippet_tags (
            snippet_id INT NOT NULL,
            tag_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (snippet_id, tag_id),
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        ) ENGINE=InnoDB");
    }

    // Snippet Relationships
    if ($driver === 'sqlite') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippet_relationships (
            source_snippet_id INTEGER NOT NULL,
            target_snippet_id INTEGER NOT NULL,
            relationship_type VARCHAR(50) NOT NULL,
            strength DECIMAL(3,2) DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (source_snippet_id, target_snippet_id, relationship_type),
            FOREIGN KEY (source_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (target_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
        )");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS snippet_relationships (
            source_snippet_id INT NOT NULL,
            target_snippet_id INT NOT NULL,
            relationship_type VARCHAR(50) NOT NULL,
            strength DECIMAL(3,2) DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (source_snippet_id, target_snippet_id, relationship_type),
            FOREIGN KEY (source_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (target_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB");
    }
};