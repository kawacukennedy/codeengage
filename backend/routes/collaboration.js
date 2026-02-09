const { authenticate, supabase } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

// Start peer matchmaking (Spec Parity)
router.post('/match', authenticate, async (req, res) => {
    const { snippet_id, topic, preferences } = req.body;
    try {
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
            estimated_wait: '12s',
            preferences_applied: preferences
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Matchmaking failed' });
    }
});

// Create Session (Spec name change from /match/accept to satisfy /api/collaboration/sessions endpoint)
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
                expires_at: new Date(Date.now() + (settings?.session_duration || 3600) * 1000)
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            session_token,
            websocket_url: `wss://api.sunder.app/collaboration/${session_token}`,
            participants: session.participants,
            expires_at: session.expires_at
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to create session' });
    }
});

// Get Session Updates (Spec requirement)
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
    const { preferences } = req.body;
    try {
        const match_id = `REV_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const session_token = `SESS_REV_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Simulated matching logic: Pick a random "expert" (mocked)
        const matched_user = {
            id: '99999999-9999-9999-9999-999999999999',
            username: 'expert_reviewer_01',
            display_name: 'Senior Architect',
            experience_level: preferences?.experience_level || 'senior'
        };

        await logAudit({
            actor_id: req.user.id,
            action_type: 'review_match',
            entity_type: 'collaboration',
            new_values: { preferences, match_id }
        });

        res.json({
            match_id,
            matched_user,
            snippet: null, // User would normally select one
            time_limit: preferences?.duration || 1800,
            session_token
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Matching service error' });
    }
});

module.exports = router;
