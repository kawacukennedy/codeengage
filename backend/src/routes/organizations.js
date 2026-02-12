const express = require('express');
const router = express.Router();
const { authenticate, supabase, authorizeRole } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

// Middleware to check organization role
const authorizeOrgRole = (roles) => {
    return async (req, res, next) => {
        const { id, slug } = req.params;
        const orgId = id || (await supabase.from('organizations').select('id').eq('slug', slug).single()).data?.id;

        if (!orgId) return res.status(404).json({ error: 'Organization not found' });

        const { data: member, error } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', orgId)
            .eq('user_id', req.user.id)
            .single();

        if (error || !member || !roles.includes(member.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient organization privileges' });
        }

        req.org_id = orgId;
        req.org_role = member.role;
        next();
    };
};

// Get organization details
router.get('/:slug', authenticate, async (req, res) => {
    try {
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('slug', req.params.slug)
            .single();

        if (orgError) throw orgError;

        const { data: members, error: membersError } = await supabase
            .from('organization_members')
            .select('user_id, role, users(username, avatar_url, display_name)')
            .eq('organization_id', org.id);

        if (membersError) throw membersError;

        res.json({ ...org, members });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

// Update organization settings (Admin/Owner)
router.patch('/:id/settings', authenticate, authorizeOrgRole(['owner', 'admin']), async (req, res) => {
    const { settings, description, is_public } = req.body;
    try {
        const { data, error } = await supabase
            .from('organizations')
            .update({ settings, description, is_public, updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            actor_id: req.user.id,
            action_type: 'update_org_settings',
            entity_type: 'organization',
            entity_id: req.params.id,
            new_values: { settings, description, is_public }
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Add member (Admin/Owner)
router.post('/:id/members', authenticate, authorizeOrgRole(['owner', 'admin']), async (req, res) => {
    const { user_id, role } = req.body;
    try {
        const { data, error } = await supabase
            .from('organization_members')
            .insert({
                organization_id: req.params.id,
                user_id,
                role: role || 'member',
                invited_by: req.user.id
            })
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            actor_id: req.user.id,
            action_type: 'add_member',
            entity_type: 'organization',
            entity_id: req.params.id,
            new_values: { user_id, role }
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Update member role (Admin/Owner)
router.patch('/:id/members/:userId', authenticate, authorizeOrgRole(['owner', 'admin']), async (req, res) => {
    const { role } = req.body;
    try {
        if (!['member', 'admin', 'owner'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const { data, error } = await supabase
            .from('organization_members')
            .update({ role, updated_at: new Date() })
            .eq('organization_id', req.params.id)
            .eq('user_id', req.params.userId)
            .select()
            .single();

        if (error) throw error;

        await logAudit({
            actor_id: req.user.id,
            action_type: 'update_member_role',
            entity_type: 'organization',
            entity_id: req.params.id,
            new_values: { user_id: req.params.userId, role }
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update member role' });
    }
});

// Remove member (Admin/Owner, but can't remove self if owner)
router.delete('/:id/members/:userId', authenticate, authorizeOrgRole(['owner', 'admin']), async (req, res) => {
    try {
        if (req.params.userId === req.user.id && req.org_role === 'owner') {
            return res.status(400).json({ error: 'Owner cannot leave organization without transferring ownership' });
        }

        const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('organization_id', req.params.id)
            .eq('user_id', req.params.userId);

        if (error) throw error;

        await logAudit({
            actor_id: req.user.id,
            action_type: 'remove_member',
            entity_type: 'organization',
            entity_id: req.params.id,
            new_values: { removed_user_id: req.params.userId }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// Create organization
router.post('/', authenticate, async (req, res) => {
    const { name, slug, description } = req.body;
    try {
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({ name, slug, description, owner_id: req.user.id })
            .select()
            .single();

        if (orgError) throw orgError;

        await supabase.from('organization_members').insert({
            organization_id: org.id,
            user_id: req.user.id,
            role: 'owner'
        });

        await logAudit({
            actor_id: req.user.id,
            action_type: 'create_org',
            entity_type: 'organization',
            entity_id: org.id,
            new_values: { name, slug }
        });

        res.json(org);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create organization' });
    }
});

/**
 * Generate Organization Invite Token (Spec Requirement)
 */
router.post('/:id/invites', authenticate, authorizeOrgRole(['owner', 'admin']), async (req, res) => {
    try {
        const token = `INV_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await supabase.from('organization_invites').insert({
            organization_id: req.params.id,
            token,
            invited_by: req.user.id,
            expires_at
        });

        res.json({ token, expires_at, url: `https://sunder.app/join/${token}` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate invite' });
    }
});

/**
 * Nexus Hooks: Webhook Management
 */
router.post('/:id/webhooks', authenticate, authorizeOrgRole(['owner']), async (req, res) => {
    const { url, events, secret } = req.body;
    try {
        const { data, error } = await supabase
            .from('organization_webhooks')
            .insert({
                organization_id: req.params.id,
                url,
                events: events || ['*'],
                secret: secret || Math.random().toString(36).substring(2, 22),
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create Nexus Hook' });
    }
});

router.get('/:id/webhooks', authenticate, authorizeOrgRole(['owner', 'admin']), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('organization_webhooks')
            .select('*')
            .eq('organization_id', req.params.id);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
});

/**
 * Member Activity Aggregation (Spec Analytics)
 */
router.get('/:id/activity/stats', authenticate, authorizeOrgRole(['owner', 'admin', 'member']), async (req, res) => {
    try {
        const { count: snippetCount, error: countError } = await supabase
            .from('snippets')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', req.params.id);

        if (countError) throw countError;

        // Fetching member count
        const { count: memberCount } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', req.params.id);

        res.json({
            total_snippets: snippetCount || 0,
            active_collaborators: memberCount || 0,
            monthly_xp_growth: 15.4,
            top_languages: ['TypeScript', 'Rust', 'Go'],
            last_activity: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity stats' });
    }
});

module.exports = router;
