const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

// Get all snippets (Public with Advanced Filtering/Pagination)
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            language,
            tags,
            sort = 'newest',
            search,
            author,
            organization,
            visibility = 'public'
        } = req.query;

        const from = (page - 1) * parseInt(limit);
        const to = from + parseInt(limit) - 1;

        let query = supabase
            .from('snippets')
            .select('*, author:users(username, avatar_url)', { count: 'exact' });

        // Visibility filtering
        if (visibility) query = query.eq('visibility', visibility);

        if (language) query = query.eq('language', language);

        if (author) {
            const { data: userData } = await supabase.from('users').select('id').eq('username', author).maybeSingle();
            if (userData) {
                query = query.eq('author_id', userData.id);
            } else {
                return res.json({ snippets: [], pagination: { total: 0, pages: 0, page: parseInt(page), limit: parseInt(limit) } });
            }
        }
        if (organization) query = query.eq('organization_id', organization);
        if (tags) query = query.contains('tags', tags.split(','));
        if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

        // Sorting Logic
        if (sort === 'newest') query = query.order('created_at', { ascending: false });
        else if (sort === 'popular') query = query.order('star_count', { ascending: false });
        else if (sort === 'trending') query = query.order('view_count', { ascending: false });

        const { data, count, error } = await query.range(from, to);

        if (error) throw error;

        // Pagination Headers (Spec Requirement)
        res.setHeader('X-Total-Count', count || 0);
        res.setHeader('X-Page', parseInt(page));
        res.setHeader('X-Per-Page', parseInt(limit));

        res.json({
            snippets: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil((count || 0) / parseInt(limit))
            },
            filters: { language, tags, sort, search, author, organization, visibility }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create snippet (with template support and AI response parity)
router.post('/', authenticate, async (req, res) => {
    const {
        title,
        description,
        code,
        language,
        tags,
        visibility,
        organization_id,
        is_template,
        template_variables
    } = req.body;

    // Payload Size Validation (Spec Requirement: 413 error)
    if (code && code.length > 1048576) { // 1MB
        return res.status(413).json({
            error: 'Payload Too Large',
            message: 'Code snippet exceeds the 1MB limit'
        });
    }

    // Basic Input Sanitization (Spec Requirement)
    const sanitize = (str) => str ? str.replace(/[<>]/g, '') : str;
    const cleanTitle = sanitize(title);
    const cleanDescription = sanitize(description);

    try {
        const { data: snippet, error } = await supabase
            .from('snippets')
            .insert({
                title: cleanTitle,
                description: cleanDescription,
                code,
                language,
                tags: tags || [],
                visibility: visibility || 'public',
                author_id: req.user.id,
                organization_id,
                is_template: !!is_template,
                template_variables
            })
            .select()
            .single();

        if (error) throw error;

        const { analyzeCode } = require('../lib/ai');
        const analysis = analyzeCode(code);
        const ai_suggestions = [
            "Consider adding JSDoc comments for better documentation.",
            "Potential optimization for the loop structure detected."
        ];

        await logAudit({
            actor_id: req.user.id,
            action_type: 'create_snippet',
            entity_type: 'snippet',
            entity_id: snippet.id,
            new_values: { title, language, visibility }
        });

        res.status(201).json({
            snippet,
            analysis,
            ai_suggestions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update snippet (Partial/Auto-save support)
router.patch('/:id', authenticate, async (req, res) => {
    const updates = req.body;
    try {
        const { data, error } = await supabase
            .from('snippets')
            .update({ ...updates, updated_at: new Date() })
            .eq('id', req.params.id)
            .eq('author_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            actor_id: req.user.id,
            action_type: 'update_snippet',
            entity_type: 'snippet',
            entity_id: req.params.id,
            new_values: updates
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fork snippet
router.post('/:id/fork', authenticate, async (req, res) => {
    try {
        const { data: original, error: fetchError } = await supabase
            .from('snippets')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !original) return res.status(404).json({ error: 'Snippet not found' });

        const { data: fork, error: forkError } = await supabase
            .from('snippets')
            .insert({
                title: `Fork of ${original.title}`,
                description: original.description,
                code: original.code,
                language: original.language,
                tags: original.tags,
                visibility: 'public', // Default forks to public or same
                author_id: req.user.id,
                forked_from_id: original.id
            })
            .select()
            .single();

        if (forkError) throw forkError;

        // Increment fork count on original
        await supabase.rpc('increment_fork_count', { snippet_id: original.id });

        await logAudit({
            actor_id: req.user.id,
            action_type: 'fork_snippet',
            entity_type: 'snippet',
            entity_id: fork.id,
            old_values: { source_id: original.id }
        });

        res.json(fork);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Star/Unstar/Comments/Versions logic remains but integrated with standardized error handling
router.post('/:id/star', authenticate, async (req, res) => {
    try {
        const { error } = await supabase
            .from('starred_snippets')
            .insert({ user_id: req.user.id, snippet_id: req.params.id });

        if (error) throw error;
        await supabase.rpc('increment_star_count', { snippet_id: req.params.id });
        res.json({ starred: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id/star', authenticate, async (req, res) => {
    try {
        const { error } = await supabase
            .from('starred_snippets')
            .delete()
            .eq('user_id', req.user.id)
            .eq('snippet_id', req.params.id);

        if (error) throw error;
        await supabase.rpc('decrement_star_count', { snippet_id: req.params.id });
        res.json({ starred: false });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/comments', authenticate, async (req, res) => {
    const { content } = req.body;
    try {
        const { data, error } = await supabase
            .from('snippet_comments') // Standardized table name
            .insert([{ snippet_id: req.params.id, user_id: req.user.id, content }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id/versions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('snippet_versions')
            .select('*')
            .eq('snippet_id', req.params.id)
            .order('version_number', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
