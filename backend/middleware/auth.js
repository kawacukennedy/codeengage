const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key is missing. Database integration will not work.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

    try {
        // Try Supabase first (Standard/Email Auth)
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (!error && user) {
            req.user = user;
            return next();
        }

        // Fallback: Try local JWT (PIN-Based Auth)
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.sub) {
                // Return a mock user object that matches Supabase structure
                req.user = {
                    id: decoded.sub,
                    email: decoded.email,
                    user_metadata: {
                        username: decoded.username,
                        display_name: decoded.display_name || decoded.username
                    }
                };
                return next();
            }
        } catch (jwtErr) {
            return res.status(401).json({ error: 'Unauthorized: Session expired' });
        }
    } catch (err) {
        return res.status(401).json({ error: 'Invalid authentication token' });
    }
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = req.user.user_metadata?.role || 'user';

        if (Array.isArray(roles)) {
            if (!roles.includes(userRole)) {
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }
        } else {
            if (userRole !== roles) {
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }
        }

        next();
    };
};

module.exports = { supabase, authenticate, authorizeRole };
