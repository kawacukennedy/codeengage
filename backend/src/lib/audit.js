const { supabase } = require('../middleware/auth');

/**
 * Logs an action to the audit_logs table.
 * @param {Object} params
 * @param {string} params.actor_id - ID of the user performing the action
 * @param {string} params.action_type - Type of action (e.g., 'update_snippet', 'delete_user')
 * @param {string} params.entity_type - Type of entity affected (e.g., 'snippet', 'user')
 * @param {string} [params.entity_id] - ID of the entity affected
 * @param {Object} [params.old_values] - Data before the change
 * @param {Object} [params.new_values] - Data after the change
 * @param {string} [params.ip_address] - IP address of the requester
 */
const logAudit = async ({
    actor_id,
    action_type,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address
}) => {
    try {
        const { error } = await supabase.from('audit_logs').insert({
            actor_id,
            action_type,
            entity_type,
            entity_id,
            old_values,
            new_values,
            ip_address
        });

        if (error) console.error('Audit Log Error:', error.message);
    } catch (err) {
        console.error('Audit Log System Failure:', err.message);
    }
};

module.exports = { logAudit };
