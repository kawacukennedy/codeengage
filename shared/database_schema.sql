-- CodeEngage Complete Database Schema
-- MySQL 8.0+ with utf8mb4_unicode_ci collation

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    preferences JSON DEFAULT (JSON_OBJECT('theme', 'dark', 'editor_mode', 'default')),
    achievement_points INT DEFAULT 0,
    last_active_at TIMESTAMP NULL,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_achievement_points (achievement_points DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    color_theme VARCHAR(50) DEFAULT 'blue',
    settings JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snippets table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snippet versions table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tags_slug (slug),
    INDEX idx_tags_usage (usage_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snippet tags junction table
CREATE TABLE IF NOT EXISTS snippet_tags (
    snippet_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (snippet_id, tag_id),
    FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collaboration sessions table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    snippet_id INT NOT NULL,
    session_token VARCHAR(64) UNIQUE NOT NULL,
    participants JSON DEFAULT (JSON_ARRAY()),
    cursor_positions JSON DEFAULT (JSON_OBJECT()),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
    INDEX idx_collab_sessions_token (session_token),
    INDEX idx_collab_sessions_snippet (snippet_id),
    INDEX idx_collab_sessions_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Code analyses table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_type VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    badge_description TEXT,
    badge_icon VARCHAR(100),
    points_awarded INT DEFAULT 0,
    metadata JSON DEFAULT (JSON_OBJECT()),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_achievements_user (user_id, earned_at DESC),
    INDEX idx_achievements_type (badge_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit logs table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login attempts table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snippet relationships table
CREATE TABLE IF NOT EXISTS snippet_relationships (
    source_snippet_id INT NOT NULL,
    target_snippet_id INT NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    strength DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (source_snippet_id, target_snippet_id, relationship_type),
    FOREIGN KEY (source_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
    FOREIGN KEY (target_snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default roles and permissions
INSERT IGNORE INTO roles (name, description, is_system_role) VALUES
('admin', 'System administrator with full access', TRUE),
('moderator', 'Content moderator with elevated privileges', TRUE),
('user', 'Regular user with standard access', TRUE),
('guest', 'Guest user with read-only access', TRUE);

INSERT IGNORE INTO permissions (name, description) VALUES
('users.create', 'Create new users'),
('users.read', 'View user information'),
('users.update', 'Update user information'),
('users.delete', 'Delete users'),
('snippets.create', 'Create new snippets'),
('snippets.read', 'View snippets'),
('snippets.update', 'Update snippets'),
('snippets.delete', 'Delete snippets'),
('snippets.moderate', 'Moderate snippet content'),
('organizations.create', 'Create organizations'),
('organizations.read', 'View organization information'),
('organizations.update', 'Update organizations'),
('organizations.delete', 'Delete organizations'),
('admin.system', 'Access system administration tools'),
('admin.audit', 'View audit logs'),
('admin.users', 'Manage all users');

-- Assign permissions to roles
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'moderator' AND p.name IN (
    'users.read', 'snippets.read', 'snippets.update', 'snippets.moderate',
    'organizations.read', 'admin.audit'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
    'users.read', 'users.update', 'snippets.create', 'snippets.read', 
    'snippets.update', 'snippets.delete', 'organizations.read'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'guest' AND p.name IN ('snippets.read', 'organizations.read');