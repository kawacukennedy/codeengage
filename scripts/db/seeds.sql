-- Sunder Seed Data

-- Initial Organizations
INSERT INTO organizations (name, slug, description, color_theme, is_public) VALUES
('Sunder Core Group', 'sunder-core', 'Initial architectural collective for Sunder development.', 'violet', true),
('Rust Systems Labs', 'rust-labs', 'Deep research into memory-safe systems and lower-level logic.', 'orange', true),
('Neural Engineering', 'neural-eng', 'Advancing human-AI collaborative patterns.', 'fuchsia', true);

-- Learning Paths (Spec Alignment)
INSERT INTO learning_paths (title, description, category, difficulty, estimated_duration_minutes, xp_reward) VALUES
('Neural Architect Expedition', 'Master the art of building AI-resilient software systems and high-fidelity neural interfaces.', 'ai', 'advanced', 1440, 1200),
('Rust Core Master', 'Go beyond the basics of memory safety and systems programming with production Rust.', 'systems', 'advanced', 2400, 2000),
('Advanced Web Orchestration', 'Orchestrate complex cloud-native web applications with Next.js and secure APIs.', 'web', 'intermediate', 1800, 1500);

-- Initial Snippets (Samples)
-- Note: These would usually be linked to a user, but for seeding purposes, we might just provide templates
INSERT INTO snippets (title, description, code, language, tags, visibility, is_template) VALUES
('Prompt Injection Guard', 'Secure your LLM calls with a deterministic verification layer.', 'function securePrompt(input) {\n  const blackList = ["IGNORE PREVIOUS", "SYSTEM_RESET"];\n  return blackList.some(p => input.toUpperCase().includes(p)) ? null : input;\n}', 'javascript', ARRAY['security', 'ai', 'middleware'], 'public', true),
('Safe Memory Buffer', 'Pinned buffer pool for high-performance WebSocket streaming.', '// Rust memory buffer pattern\nuse std::pin::Pin;\n\nstruct SafeBuffer {\n    data: Pin<Box<[u8; 1024]>>,\n}', 'rust', ARRAY['systems', 'performance'], 'public', true);
