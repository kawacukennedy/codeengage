const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');

/**
 * GET /api/leaderboard
 * Fetches the global leaderboard ranked by achievement points.
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url, achievement_points')
            .order('achievement_points', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json({
            scope: 'global',
            rankings: data.map((u, index) => ({
                rank: index + 1,
                ...u
            })),
            last_updated: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch global leaderboard' });
    }
});

/**
 * GET /api/leaderboard/org/:slug
 * Fetches organization-specific leaderboard.
 */
router.get('/org/:slug', authenticate, async (req, res) => {
    try {
        // First get org id
        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', req.params.slug)
            .single();

        if (!org) return res.status(404).json({ error: 'Organization not found' });

        // Fetch users in this org joined with their points
        // Assuming an organization_members table exists
        const { data, error } = await supabase
            .from('organization_members')
            .select(`
                user_id,
                role,
                users (
                    id, 
                    username, 
                    display_name, 
                    achievement_points
                )
            `)
            .eq('organization_id', org.id)
            .order('users(achievement_points)', { ascending: false });

        if (error) throw error;

        res.json({
            scope: req.params.slug,
            rankings: data.map((m, index) => ({
                rank: index + 1,
                ...m.users
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch organization leaderboard' });
    }
});

module.exports = router;
