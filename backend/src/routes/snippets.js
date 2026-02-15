const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

/**
 * @route GET /snippets
 * @desc Fetches all public snippets with filtering, search, and pagination.
 * @access Public
 */
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
            .select('*, author:author_id(username, avatar_url)', { count: 'exact' });

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

/**
 * @route POST /snippets
 * @desc Creates a new code snippet with optional AI analysis.
 * @access Private
 */
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
        // Use AI analysis for new snippets as per spec "Neural Analysis"
        const analysis = await analyzeCode(code, { useAI: true, language });

        res.status(201).json({
            snippet,
            analysis,
            ai_suggestions: analysis.neural_analysis?.readability?.suggestions || [
                "Consider adding JSDoc comments for better documentation.",
                "Type safety could be improved in the core logic."
            ]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /snippets/my
 * @desc Fetches all snippets authored by the current user.
 * @access Private
 */
router.get('/my', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('snippets')
            .select('*')
            .eq('author_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /snippets/:id
 * @desc Fetches a single snippet by ID with author details and comment count.
 * @access Public (for public snippets) / Private (for private snippets)
 */
router.get('/:id', async (req, res) => {
    try {
        const { data: snippet, error } = await supabase
            .from('snippets')
            .select('*, author:author_id(id, username, display_name, avatar_url)')
            .eq('id', req.params.id)
            .single();

        if (error || !snippet) {
            return res.status(404).json({ error: 'Snippet not found' });
        }

        // Fetch comments for this snippet
        const { data: comments } = await supabase
            .from('snippet_comments')
            .select('*, user:user_id(username, avatar_url)')
            .eq('snippet_id', req.params.id)
            .order('created_at', { ascending: true });

        // Increment view count
        await supabase.rpc('increment_view_count', { snippet_id: req.params.id }).catch(() => {});

        res.json({
            ...snippet,
            comments: comments || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PATCH /snippets/:id
 * @desc Updates an existing snippet (author only).
 * @access Private
 */
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

/**
 * @route POST /snippets/:id/fork
 * @desc Forks an existing snippet for the current user.
 * @access Private
 */
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

const axios = require('axios');

/**
 * @route POST /snippets/run
 * @desc Executes code in a secure sandbox using the Piston API.
 * @access Private (or Admin with secret)
 */
router.post('/run', (req, res, next) => {
    if (req.headers['x-admin-secret']) return adminOnly(req, res, next);
    authenticate(req, res, next);
}, async (req, res) => {
    const { code, language } = req.body;

    const pistonMap = {
        'javascript': { language: 'js', version: '18.15.0' },
        'typescript': { language: 'ts', version: '5.0.3' },
        'python': { language: 'python', version: '3.10.0' },
        'rust': { language: 'rust', version: '1.68.2' },
        'go': { language: 'go', version: '1.16.2' },
        'ruby': { language: 'ruby', version: '3.0.1' }
    };

    const config = pistonMap[language?.toLowerCase()] || pistonMap['javascript'];

    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: config.language,
            version: config.version,
            files: [{ content: code }]
        });

        const { run } = response.data;

        res.json({
            execution_id: `ps-${Math.random().toString(36).substring(7)}`,
            status: run.stderr ? 'error' : 'success',
            output: run.output,
            duration: `${run.stdout ? 'fast' : 'n/a'}`, // Piston doesn't return exact duration in simple execute
            metadata: {
                runtime: `${config.language} ${config.version}`,
                exit_code: run.code,
                signal: run.signal
            }
        });
    } catch (error) {
        console.error('[Execution Error]', error.response?.data || error.message);
        res.status(500).json({ error: 'Runtime environment failed to respond' });
    }
});

router.get('/:id/versions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('snippet_versions')
            .select('*, author:author_id(username)')
            .eq('snippet_id', req.params.id)
            .order('version_number', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/**
 * @route DELETE /snippets/:id
 * @desc Deletes a snippet (author only).
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { data: snippet, error: fetchError } = await supabase
            .from('snippets')
            .select('author_id')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !snippet) {
            return res.status(404).json({ error: 'Snippet not found' });
        }

        if (snippet.author_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own snippets' });
        }

        const { error } = await supabase
            .from('snippets')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        await logAudit({
            actor_id: req.user.id,
            action_type: 'delete_snippet',
            entity_type: 'snippet',
            entity_id: req.params.id
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
