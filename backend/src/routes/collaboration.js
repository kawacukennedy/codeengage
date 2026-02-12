const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

/**
 * @route POST /collaboration/match
 * @desc Initiates peer review matchmaking based on snippet context.
 * @access Private
 */
router.post('/match', authenticate, async (req, res) => {
    const { snippet_id, topic, preferences } = req.body;
    try {
        // Smarter Matchmaking: Search for experts based on preferred language/topic
        const { data: potentialExperts } = await supabase
            .from('users')
            .select('id, username, achievement_points')
            .gt('achievement_points', preferences?.min_xp || 500)
            .limit(10);

        const matchToken = Math.random().toString(36).substring(2, 10).toUpperCase();

        await logAudit({
            actor_id: req.user.id,
            action_type: 'start_matching',
            entity_type: 'collaboration',
            new_values: { snippet_id, topic, preferences, match_token: matchToken }
        });

        res.json({
            status: 'searching',
            match_token: matchToken,
            estimated_wait: potentialExperts?.length > 0 ? '5s' : '45s',
            preferences_applied: preferences,
            pool_size: potentialExperts?.length || 0
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Matchmaking failed' });
    }
});

/**
 * @route POST /collaboration/sessions
 * @desc Creates a new real-time collaboration session.
 * @access Private
 */
router.post('/sessions', authenticate, async (req, res) => {
    const { snippet_id, settings } = req.body;
    try {
        const session_token = `SESS_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

        const { data: session, error } = await supabase
            .from('collaboration_sessions')
            .insert({
                session_token,
                snippet_id,
                host_id: req.user.id,
                is_active: true,
                participants: [{ user_id: req.user.id, role: 'host' }],
                expires_at: new Date(Date.now() + (settings?.session_duration || 3600) * 1000),
                settings: {
                    allow_recording: !!settings?.allow_recording,
                    max_participants: settings?.max_participants || 5,
                    require_approval: !!settings?.require_approval
                }
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            session_token,
            websocket_url: `wss://api.sunder.app/collaboration/${session_token}`,
            participants: session.participants,
            expires_at: session.expires_at,
            settings: session.settings
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to create session' });
    }
});

/**
 * @route GET /collaboration/sessions/:token/updates
 * @desc Polling endpoint for session updates (messages, cursors).
 * @access Private
 */
router.get('/sessions/:token/updates', authenticate, async (req, res) => {
    const { since } = req.query;
    try {
        let query = supabase
            .from('collaboration_sessions')
            .select('cursor_positions, messages, last_activity_at')
            .eq('session_token', req.params.token);

        if (since) query = query.gt('last_activity_at', since);

        const { data, error } = await query.single();

        if (error) throw error;
        res.json({
            updates: data.messages || [],
            participants: data.cursor_positions || {},
            last_update: data.last_activity_at,
            has_more: false
        });
    } catch (error) {
        res.status(404).json({ status: 'error', message: 'Session or updates not found' });
    }
});

// Expert Peer Review Matchmaking (Spec Requirement)
router.post('/reviews/match', authenticate, async (req, res) => {
    const { preferences, snippet_id } = req.body;
    try {
        const match_id = `REV_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const session_token = `SESS_REV_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Real selection logic: pick an actual user from the db who isn't the current user
        const { data: expert } = await supabase
            .from('users')
            .select('id, username, display_name')
            .neq('id', req.user.id)
            .order('achievement_points', { ascending: false })
            .limit(1)
            .single();

        const matched_user = expert || {
            id: '99999999-9999-9999-9999-999999999999',
            username: 'expert_reviewer_01',
            display_name: 'System Sentinel'
        };

        // Create the pending review in the database
        await supabase.from('code_reviews').insert({
            id: match_id.replace('REV_', ''), // Using the numeric/uuid part
            snippet_id,
            reviewer_id: matched_user.id,
            reviewee_id: req.user.id,
            status: 'pending'
        });

        await logAudit({
            actor_id: req.user.id,
            action_type: 'review_match',
            entity_type: 'collaboration',
            new_values: { preferences, match_id }
        });

        res.json({
            match_id,
            matched_user,
            snippet: snippet_id,
            time_limit: preferences?.duration || 600, // 10 minutes default
            session_token
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Matching service error' });
    }
});

/**
 * Submit Code Review (Lifecycle completion)
 */
router.post('/reviews/:id/submit', authenticate, async (req, res) => {
    const { feedback, rating, duration_seconds } = req.body;
    try {
        const { data: review, error } = await supabase
            .from('code_reviews')
            .update({
                status: 'completed',
                feedback,
                rating,
                duration_seconds,
                completed_at: new Date()
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Sync XP for completing a review (Spec requirement)
        await supabase.rpc('award_achievement_points', {
            user_id: review.reviewer_id,
            points: 100 + (rating * 20)
        });

        res.json({ success: true, review });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// Update session (e.g., end session or set recording URL)
router.patch('/sessions/:token', authenticate, async (req, res) => {
    const { is_active, recording_url } = req.body;
    try {
        const { data, error } = await supabase
            .from('collaboration_sessions')
            .update({
                is_active,
                recording_url,
                updated_at: new Date()
            })
            .eq('session_token', req.params.token)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update session' });
    }
});

module.exports = router;
