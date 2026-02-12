const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');

// Get all learning paths
router.get('/paths', async (req, res) => {
    try {
        const { data, error } = await supabase.from('learning_paths').select('*');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user progress in learning paths
router.get('/progress', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_learning_progress')
            .select('*, learning_paths(*)')
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enroll in a path
router.post('/enroll', authenticate, async (req, res) => {
    const { path_id } = req.body;
    try {
        const { data, error } = await supabase
            .from('user_learning_progress')
            .insert({ user_id: req.user.id, path_id, progress_percent: 0 })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update progress
router.patch('/progress/:pathId', authenticate, async (req, res) => {
    const { progress_percent, completed_modules } = req.body;
    try {
        const { data, error } = await supabase
            .from('user_learning_progress')
            .update({
                progress_percent,
                completed_modules,
                last_accessed_at: new Date(),
                completed_at: progress_percent === 100 ? new Date() : null
            })
            .eq('user_id', req.user.id)
            .eq('path_id', req.params.pathId)
            .select()
            .single();

        if (error) throw error;

        // If completed, award XP (simulated)
        if (progress_percent === 100) {
            await supabase.rpc('award_achievement_points', { user_id: req.user.id, points: 500 });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const { logAudit } = require('../lib/audit');

// Skill Assessment (Absolute Spec Parity)
router.post('/assess', authenticate, async (req, res) => {
    try {
        const { data: snippets } = await supabase
            .from('snippets')
            .select('language, code')
            .eq('author_id', req.user.id);

        const { analyzeCodeStatic } = require('../lib/ai');

        const languageStats = {};
        snippets?.forEach(s => {
            const analysis = analyzeCodeStatic(s.code);
            if (!languageStats[s.language]) {
                languageStats[s.language] = { count: 0, totalComplexity: 0 };
            }
            languageStats[s.language].count++;
            languageStats[s.language].totalComplexity += analysis.complexity_score;
        });

        const skills = {};
        Object.entries(languageStats).forEach(([lang, stats]) => {
            const avgComplexity = stats.totalComplexity / stats.count;

            if (stats.count > 10 && avgComplexity > 70) skills[lang] = 'expert';
            else if (stats.count > 5 || avgComplexity > 50) skills[lang] = 'advanced';
            else skills[lang] = 'intermediate';
        });

        // Default if no snippets
        if (Object.keys(skills).length === 0) {
            skills['general'] = 'novice';
        }

        await supabase.from('users').update({ coding_style_signature: skills }).eq('id', req.user.id);

        await logAudit({
            actor_id: req.user.id,
            action_type: 'skill_assessment',
            entity_type: 'user',
            new_values: { skills }
        });

        res.json({ success: true, skills });
    } catch (error) {
        console.error('[Skill Assessment Error]', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Global XP Awarding System
 */
router.post('/xp/award', authenticate, async (req, res) => {
    const { points, reason } = req.body;
    try {
        await supabase.rpc('award_achievement_points', { user_id: req.user.id, points });

        await logAudit({
            actor_id: req.user.id,
            action_type: 'award_xp',
            entity_type: 'user',
            new_values: { points, reason }
        });

        res.json({ success: true, points_awarded: points });
    } catch (error) {
        res.status(500).json({ error: 'Failed to award XP' });
    }
});

module.exports = router;
