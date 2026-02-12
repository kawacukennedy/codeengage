const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');

// Update profile
router.patch('/update', authenticate, async (req, res) => {
    const { display_name, bio, preferences } = req.body;
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ display_name, bio, preferences, updated_at: new Date() })
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Follow User
router.post('/:username/follow', authenticate, async (req, res) => {
    try {
        const { data: targetUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', req.params.username)
            .single();

        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const { error } = await supabase
            .from('user_followers')
            .insert({ follower_id: req.user.id, following_id: targetUser.id });

        if (error) throw error;
        res.json({ success: true, message: `Followed ${req.params.username}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unfollow User
router.delete('/:username/follow', authenticate, async (req, res) => {
    try {
        const { data: targetUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', req.params.username)
            .single();

        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const { error } = await supabase
            .from('user_followers')
            .delete()
            .eq('follower_id', req.user.id)
            .eq('following_id', targetUser.id);

        if (error) throw error;
        res.json({ success: true, message: `Unfollowed ${req.params.username}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Persona Data (Simulated Radar Chart)
router.get('/:username/persona', async (req, res) => {
    try {
        // Simulated AI analysis of coding style
        const personaData = {
            radar: {
                readability: 85,
                performance: 72,
                security: 90,
                innovation: 65,
                collaboration: 88
            },
            summary: "Highly secure and readable coder with a strong collaborative streak. Patterns suggest a preference for robust architectures over experimental features.",
            traits: ["Defensive", "Social", "Optimized"]
        };
        res.json(personaData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get profile by username
router.get('/:username', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', req.params.username)
            .single();

        if (error) throw error;

        // Also fetch snippets for this user
        const { data: snippets } = await supabase
            .from('snippets')
            .select('*')
            .eq('author_id', data.id)
            .order('created_at', { ascending: false });

        res.json({
            ...data,
            snippets: snippets || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Key Management (Spec Requirement)
router.get('/api-keys', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('preferences->api_keys')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;
        res.json(data.api_keys || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

router.post('/api-keys', authenticate, async (req, res) => {
    const { label } = req.body;
    try {
        const newKey = {
            id: Math.random().toString(36).substring(7),
            label: label || 'Default Key',
            key: `sk_sunder_${Math.random().toString(36).substring(2, 24)}`,
            created_at: new Date().toISOString()
        };

        // Append to user preferences
        const { data: user } = await supabase.from('users').select('preferences').eq('id', req.user.id).single();
        const currentKeys = user.preferences.api_keys || [];

        await supabase
            .from('users')
            .update({
                preferences: {
                    ...user.preferences,
                    api_keys: [...currentKeys, newKey]
                }
            })
            .eq('id', req.user.id);

        res.status(201).json(newKey);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});

router.delete('/api-keys/:keyId', authenticate, async (req, res) => {
    try {
        const { data: user } = await supabase.from('users').select('preferences').eq('id', req.user.id).single();
        const currentKeys = user.preferences.api_keys || [];
        const updatedKeys = currentKeys.filter(k => k.id !== req.params.keyId);

        await supabase
            .from('users')
            .update({
                preferences: {
                    ...user.preferences,
                    api_keys: updatedKeys
                }
            })
            .eq('id', req.user.id);

        res.json({ success: true, message: 'API key revoked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
});

module.exports = router;
