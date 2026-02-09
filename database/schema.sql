-- Sunder PostgreSQL Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username varchar(50) UNIQUE NOT NULL,
    email varchar(255) UNIQUE NOT NULL,
    password_hash varchar(255) NOT NULL,
    display_name varchar(100),
    avatar_url text,
    bio text,
    preferences jsonb DEFAULT '{"theme": "dark", "editor_mode": "advanced", "notifications": true}',
    coding_style_signature jsonb,
    ai_model_preferences jsonb DEFAULT '{"temperature": 0.7, "max_tokens": 2048}',
    achievement_points integer DEFAULT 0,
    coding_streak integer DEFAULT 0,
    last_active_at timestamptz,
    email_verified_at timestamptz,
    is_suspended boolean DEFAULT false,
    suspended_reason text,
    suspended_until timestamptz,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_achievement_points ON users(achievement_points DESC);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Organizations Table
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    slug varchar(100) UNIQUE NOT NULL,
    description text,
    owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
    avatar_url text,
    banner_url text,
    color_theme varchar(50) DEFAULT 'violet',
    settings jsonb DEFAULT '{"default_visibility": "organization", "require_approval": false}',
    member_count integer DEFAULT 1,
    snippet_count integer DEFAULT 0,
    is_public boolean DEFAULT true,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);

-- Snippets Table
CREATE TABLE snippets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES users(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
    title varchar(255) NOT NULL,
    description text,
    code text NOT NULL,
    language varchar(50) NOT NULL,
    tags text[] DEFAULT '{}',
    visibility varchar(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'organization', 'unlisted')),
    forked_from_id uuid REFERENCES snippets(id) ON DELETE SET NULL,
    is_template boolean DEFAULT false,
    template_variables jsonb,
    complexity_score float,
    security_scan_result jsonb,
    ai_generated boolean DEFAULT false,
    ai_model_used varchar(100),
    view_count integer DEFAULT 0,
    star_count integer DEFAULT 0,
    fork_count integer DEFAULT 0,
    last_edited_at timestamptz DEFAULT NOW(),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE INDEX idx_snippets_author_id ON snippets(author_id);
CREATE INDEX idx_snippets_language ON snippets(language);
CREATE INDEX idx_snippets_visibility ON snippets(visibility);
CREATE INDEX idx_snippets_created_at ON snippets(created_at DESC);
CREATE INDEX idx_snippets_star_count ON snippets(star_count DESC);
CREATE INDEX idx_snippets_tags ON snippets USING GIN(tags);

-- Snippet Versions
CREATE TABLE snippet_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id uuid REFERENCES snippets(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    code text NOT NULL,
    checksum varchar(64) NOT NULL,
    editor_id uuid REFERENCES users(id) ON DELETE CASCADE,
    change_summary varchar(500),
    ai_assistance jsonb,
    analysis_results jsonb,
    created_at timestamptz DEFAULT NOW(),
    CONSTRAINT unique_snippet_version UNIQUE(snippet_id, version_number)
);

-- Collaboration Sessions
CREATE TABLE collaboration_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id uuid REFERENCES snippets(id) ON DELETE CASCADE,
    session_token varchar(64) UNIQUE NOT NULL,
    host_id uuid REFERENCES users(id) ON DELETE CASCADE,
    participants jsonb DEFAULT '[]',
    cursor_positions jsonb DEFAULT '{}',
    messages jsonb DEFAULT '[]',
    recording_url text,
    is_active boolean DEFAULT true,
    last_activity_at timestamptz DEFAULT NOW(),
    created_at timestamptz DEFAULT NOW(),
    ended_at timestamptz
);

-- Organization Members
CREATE TABLE organization_members (
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role varchar(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at timestamptz DEFAULT NOW(),
    invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (organization_id, user_id)
);

-- Starred Snippets
CREATE TABLE starred_snippets (
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    snippet_id uuid REFERENCES snippets(id) ON DELETE CASCADE,
    starred_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (user_id, snippet_id)
);

-- Snippet Analyses
CREATE TABLE snippet_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id uuid REFERENCES snippets(id) ON DELETE CASCADE,
    analysis_type varchar(50) NOT NULL,
    results jsonb NOT NULL,
    complexity_score float,
    security_issues jsonb,
    performance_metrics jsonb,
    ai_recommendations text[],
    created_at timestamptz DEFAULT NOW()
);

-- AI Translations
CREATE TABLE ai_translations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_snippet_id uuid REFERENCES snippets(id) ON DELETE CASCADE,
    source_language varchar(50) NOT NULL,
    target_language varchar(50) NOT NULL,
    translated_code text NOT NULL,
    ai_model_used varchar(100),
    accuracy_score float,
    preserved_functionality boolean,
    execution_tests jsonb,
    created_at timestamptz DEFAULT NOW()
);

-- AI Pair Sessions
CREATE TABLE ai_pair_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    snippet_id uuid REFERENCES snippets(id) ON DELETE CASCADE,
    ai_model_config jsonb NOT NULL,
    conversation_history jsonb DEFAULT '[]',
    code_changes jsonb DEFAULT '[]',
    suggestions_provided integer DEFAULT 0,
    session_duration_seconds integer,
    user_feedback jsonb,
    started_at timestamptz DEFAULT NOW(),
    ended_at timestamptz
);

-- Achievements
CREATE TABLE achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    badge_type varchar(50) NOT NULL,
    badge_tier varchar(20) DEFAULT 'bronze' CHECK (badge_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    unlocked_at timestamptz DEFAULT NOW(),
    progress_data jsonb
);

-- Audit Logs
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action_type varchar(100) NOT NULL,
    entity_type varchar(50) NOT NULL,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    request_id varchar(64),
    created_at timestamptz DEFAULT NOW()
);

-- AI Usage Logs
CREATE TABLE ai_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    ai_feature varchar(50) NOT NULL,
    input_tokens integer NOT NULL,
    output_tokens integer NOT NULL,
    total_cost decimal(10, 6),
    model_used varchar(100),
    request_duration_ms integer,
    created_at timestamptz DEFAULT NOW()
);

-- Content Flags
CREATE TABLE content_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id uuid REFERENCES snippets(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    flag_reason varchar(100) NOT NULL,
    description text,
    status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    created_at timestamptz DEFAULT NOW()
);

-- Learning Paths
CREATE TABLE learning_paths (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(255) NOT NULL,
    description text,
    category varchar(100),
    difficulty varchar(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration_minutes integer,
    thumbnail_url text,
    modules jsonb DEFAULT '[]', -- List of lessons/challenges
    created_at timestamptz DEFAULT NOW()
);

-- User Learning Progress (Enrollments)
CREATE TABLE user_learning_progress (
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    path_id uuid REFERENCES learning_paths(id) ON DELETE CASCADE,
    progress_percent integer DEFAULT 0,
    completed_modules jsonb DEFAULT '[]',
    last_accessed_at timestamptz DEFAULT NOW(),
    completed_at timestamptz,
    PRIMARY KEY (user_id, path_id)
);

-- User Followers (Social)
CREATE TABLE user_followers (
    follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
    following_id uuid REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- System Backups (Compliance)
CREATE TABLE system_backups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name varchar(255) NOT NULL,
    backup_type varchar(50) DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'config')),
    storage_provider varchar(50) DEFAULT 'supabase_storage',
    file_path text NOT NULL,
    file_size_bytes bigint,
    checksum varchar(64),
    status varchar(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at timestamptz DEFAULT NOW(),
    completed_at timestamptz
);

-- Advanced Search Indexes
CREATE INDEX idx_snippets_full_text ON snippets USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_snippets_denormalized_stats ON snippets (star_count DESC, view_count DESC, created_at DESC);
CREATE INDEX idx_users_social_streak ON users (coding_streak DESC, last_active_at DESC);
CREATE INDEX idx_system_backups_created_at ON system_backups(created_at DESC);
