-- CodeEngage Database Schema
-- MySQL 8.0+ compatible

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for users
-- ----------------------------
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `bio` text,
  `preferences` json DEFAULT (JSON_OBJECT('theme', 'dark', 'editor_mode', 'default')),
  `achievement_points` int DEFAULT '0',
  `last_active_at` timestamp NULL DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_username` (`username`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_achievement_points` (`achievement_points` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for organizations
-- ----------------------------
CREATE TABLE `organizations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text,
  `owner_id` int NOT NULL,
  `color_theme` varchar(50) DEFAULT 'blue',
  `settings` json DEFAULT (JSON_OBJECT()),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_organizations_slug` (`slug`),
  KEY `idx_organizations_owner` (`owner_id`),
  CONSTRAINT `fk_organizations_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for organization_members
-- ----------------------------
CREATE TABLE `organization_members` (
  `organization_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('owner','admin','member','viewer') DEFAULT 'member',
  `joined_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`organization_id`,`user_id`),
  KEY `idx_org_members_user` (`user_id`),
  CONSTRAINT `fk_org_members_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_org_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for roles
-- ----------------------------
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text,
  `is_system_role` tinyint(1) DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for permissions
-- ----------------------------
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_permissions_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for user_roles
-- ----------------------------
CREATE TABLE `user_roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assigned_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `idx_user_roles_role` (`role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for role_permissions
-- ----------------------------
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `idx_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for snippets
-- ----------------------------
CREATE TABLE `snippets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `author_id` int NOT NULL,
  `organization_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `visibility` enum('public','private','organization') DEFAULT 'public',
  `language` varchar(50) NOT NULL,
  `forked_from_id` int DEFAULT NULL,
  `is_template` tinyint(1) DEFAULT '0',
  `template_variables` json DEFAULT NULL,
  `view_count` int DEFAULT '0',
  `star_count` int DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_snippets_author` (`author_id`,`created_at` DESC),
  KEY `idx_snippets_language` (`language`,`created_at` DESC),
  KEY `idx_snippets_visibility` (`visibility`,`created_at` DESC),
  KEY `idx_snippets_organization` (`organization_id`,`visibility`),
  KEY `idx_snippets_forked_from` (`forked_from_id`),
  FULLTEXT KEY `idx_snippets_search` (`title`,`description`),
  CONSTRAINT `fk_snippets_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_snippets_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_snippets_forked_from` FOREIGN KEY (`forked_from_id`) REFERENCES `snippets` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for snippet_versions
-- ----------------------------
CREATE TABLE `snippet_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `snippet_id` int NOT NULL,
  `version_number` int NOT NULL,
  `code` longtext NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `editor_id` int NOT NULL,
  `change_summary` varchar(500) DEFAULT NULL,
  `analysis_results` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_snippet_version` (`snippet_id`,`version_number`),
  KEY `idx_snippet_versions_snippet` (`snippet_id`,`version_number` DESC),
  KEY `idx_snippet_versions_editor` (`editor_id`,`created_at` DESC),
  FULLTEXT KEY `idx_snippet_versions_code` (`code`),
  CONSTRAINT `fk_snippet_versions_snippet` FOREIGN KEY (`snippet_id`) REFERENCES `snippets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_snippet_versions_editor` FOREIGN KEY (`editor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for tags
-- ----------------------------
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `description` text,
  `usage_count` int DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tags_slug` (`slug`),
  KEY `idx_tags_usage` (`usage_count` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for snippet_tags
-- ----------------------------
CREATE TABLE `snippet_tags` (
  `snippet_id` int NOT NULL,
  `tag_id` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`snippet_id`,`tag_id`),
  KEY `idx_snippet_tags_tag` (`tag_id`),
  CONSTRAINT `fk_snippet_tags_snippet` FOREIGN KEY (`snippet_id`) REFERENCES `snippets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_snippet_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for collaboration_sessions
-- ----------------------------
CREATE TABLE `collaboration_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `snippet_id` int NOT NULL,
  `session_token` varchar(64) NOT NULL,
  `participants` json DEFAULT (JSON_ARRAY()),
  `cursor_positions` json DEFAULT (JSON_OBJECT()),
  `last_activity` timestamp DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_collab_sessions_token` (`session_token`),
  KEY `idx_collab_sessions_snippet` (`snippet_id`),
  KEY `idx_collab_sessions_activity` (`last_activity`),
  CONSTRAINT `fk_collab_sessions_snippet` FOREIGN KEY (`snippet_id`) REFERENCES `snippets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for code_analyses
-- ----------------------------
CREATE TABLE `code_analyses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `snippet_version_id` int NOT NULL,
  `analysis_type` varchar(50) NOT NULL,
  `complexity_score` decimal(5,2) DEFAULT NULL,
  `security_issues` json DEFAULT (JSON_ARRAY()),
  `performance_suggestions` json DEFAULT (JSON_ARRAY()),
  `code_smells` json DEFAULT (JSON_ARRAY()),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_code_analyses_version` (`snippet_version_id`),
  KEY `idx_code_analyses_type` (`analysis_type`,`created_at` DESC),
  CONSTRAINT `fk_code_analyses_version` FOREIGN KEY (`snippet_version_id`) REFERENCES `snippet_versions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for achievements
-- ----------------------------
CREATE TABLE `achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `badge_type` varchar(50) NOT NULL,
  `badge_name` varchar(100) NOT NULL,
  `badge_description` text,
  `badge_icon` varchar(100) DEFAULT NULL,
  `points_awarded` int DEFAULT '0',
  `metadata` json DEFAULT (JSON_OBJECT()),
  `earned_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_achievements_user` (`user_id`,`earned_at` DESC),
  KEY `idx_achievements_type` (`badge_type`),
  CONSTRAINT `fk_achievements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for audit_logs
-- ----------------------------
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_id` int DEFAULT NULL,
  `action_type` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `request_id` varchar(64) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_actor` (`actor_id`,`created_at` DESC),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_logs_action` (`action_type`,`created_at` DESC),
  CONSTRAINT `fk_audit_logs_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for login_attempts
-- ----------------------------
CREATE TABLE `login_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempt_time` timestamp DEFAULT CURRENT_TIMESTAMP,
  `success` tinyint(1) DEFAULT '0',
  `user_agent` text,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_ip` (`ip_address`,`attempt_time` DESC),
  KEY `idx_login_attempts_user` (`user_id`,`attempt_time` DESC),
  CONSTRAINT `fk_login_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for snippet_relationships
-- ----------------------------
CREATE TABLE `snippet_relationships` (
  `source_snippet_id` int NOT NULL,
  `target_snippet_id` int NOT NULL,
  `relationship_type` varchar(50) NOT NULL,
  `strength` decimal(3,2) DEFAULT '1.00',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`source_snippet_id`,`target_snippet_id`,`relationship_type`),
  KEY `idx_snippet_relationships_target` (`target_snippet_id`),
  CONSTRAINT `fk_snippet_relationships_source` FOREIGN KEY (`source_snippet_id`) REFERENCES `snippets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_snippet_relationships_target` FOREIGN KEY (`target_snippet_id`) REFERENCES `snippets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Insert default data
-- ----------------------------

-- Default roles
INSERT INTO `roles` (`name`, `description`, `is_system_role`) VALUES
('admin', 'System administrator with full access', 1),
('moderator', 'Content moderator with limited admin access', 1),
('user', 'Regular registered user', 1),
('guest', 'Unauthenticated visitor', 1);

-- Default permissions
INSERT INTO `permissions` (`name`, `description`) VALUES
('users.create', 'Create new users'),
('users.read', 'View user information'),
('users.update', 'Update user information'),
('users.delete', 'Delete users'),
('snippets.create', 'Create snippets'),
('snippets.read', 'View snippets'),
('snippets.update', 'Update snippets'),
('snippets.delete', 'Delete snippets'),
('snippets.moderate', 'Moderate snippet content'),
('admin.access', 'Access admin panel'),
('admin.system', 'Manage system settings'),
('admin.audit', 'View audit logs'),
('organizations.create', 'Create organizations'),
('organizations.manage', 'Manage organizations');

-- Assign permissions to roles
INSERT INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT r.id, p.id FROM `roles` r, `permissions` p WHERE r.name = 'admin';

INSERT INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT r.id, p.id FROM `roles` r, `permissions` p 
WHERE r.name = 'moderator' AND p.name IN ('snippets.read', 'snippets.moderate', 'admin.access', 'admin.audit');

INSERT INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT r.id, p.id FROM `roles` r, `permissions` p 
WHERE r.name = 'user' AND p.name IN ('users.read', 'users.update', 'snippets.create', 'snippets.read', 'snippets.update', 'snippets.delete', 'organizations.create');

INSERT INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT r.id, p.id FROM `roles` r, `permissions` p 
WHERE r.name = 'guest' AND p.name = 'snippets.read';

-- Default tags
INSERT INTO `tags` (`name`, `slug`, `description`) VALUES
('JavaScript', 'javascript', 'JavaScript code snippets'),
('Python', 'python', 'Python code snippets'),
('PHP', 'php', 'PHP code snippets'),
('HTML', 'html', 'HTML markup snippets'),
('CSS', 'css', 'CSS styling snippets'),
('React', 'react', 'React component snippets'),
('Vue', 'vue', 'Vue component snippets'),
('Node.js', 'nodejs', 'Node.js server-side code'),
('TypeScript', 'typescript', 'TypeScript code snippets'),
('SQL', 'sql', 'SQL database queries'),
('Docker', 'docker', 'Docker container configurations'),
('Git', 'git', 'Git commands and workflows'),
('API', 'api', 'API integration examples'),
('Algorithm', 'algorithm', 'Algorithm implementations'),
('Utility', 'utility', 'Helper functions and utilities');

SET FOREIGN_KEY_CHECKS = 1;