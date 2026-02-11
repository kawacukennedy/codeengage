const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');
const axios = require('axios');

/**
 * GET /api/challenges
 * Fetches available coding challenges.
 */
router.get('/', async (req, res) => {
    try {
        // Fetch challenges from learning_paths where category is 'challenge' or similar
        const { data, error } = await supabase
            .from('learning_paths')
            .select('*')
            .eq('category', 'challenge');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

/**
 * POST /api/challenges/:id/submit
 * Submits a solution for a challenge and verifies it.
 */
router.post('/:id/submit', authenticate, async (req, res) => {
    const { code, language } = req.body;
    try {
        // Fetch the challenge details (specifically the modules/tests)
        const { data: challenge } = await supabase
            .from('learning_paths')
            .select('modules')
            .eq('id', req.params.id)
            .single();

        if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

        // Verification logic (Simulated or via Piston)
        // In a real scenario, we'd run the code against test cases defined in the modules
        const runtimeMap = {
            'javascript': { language: 'javascript', version: '18.15.0' },
            'python': { language: 'python', version: '3.10.0' },
            'typescript': { language: 'typescript', version: '5.0.3' }
        };

        const runtime = runtimeMap[language] || runtimeMap['javascript'];

        // Execute via Piston
        const pistonResponse = await axios.post('https://emkc.org/api/v2/piston/execute', {
            ...runtime,
            files: [{ content: code }]
        });

        const output = pistonResponse.data.run.output;
        const success = !pistonResponse.data.run.stderr && output.length > 0; // Simplified check

        if (success) {
            // Award points
            await supabase.rpc('award_achievement_points', {
                user_id: req.user.id,
                points: 250 // Points for completing a challenge
            });

            // Update user progress
            await supabase.from('user_learning_progress').upsert({
                user_id: req.user.id,
                path_id: req.params.id,
                progress_percent: 100,
                completed_at: new Date()
            });
        }

        res.json({
            success,
            output,
            error: pistonResponse.data.run.stderr,
            points_awarded: success ? 250 : 0
        });
    } catch (error) {
        console.error('[Challenge Submission Error]', error);
        res.status(500).json({ error: 'Submission failed' });
    }
});

module.exports = router;
