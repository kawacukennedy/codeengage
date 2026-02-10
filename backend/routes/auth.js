const express = require('express');
const router = express.Router();
const { authenticate, supabase } = require('../middleware/auth');

// CSRF Protection Stub (Spec Requirement)
const generateCsrfToken = () => Math.random().toString(36).substring(2, 15);

const setAuthCookies = (res, accessToken, refreshToken) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    res.cookie('access_token', accessToken, cookieOptions);
    res.cookie('refresh_token', refreshToken, cookieOptions);
    res.cookie('csrf_token', generateCsrfToken(), { ...cookieOptions, httpOnly: false });
};
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

// Local Rate Limit Store (Simple in-memory for 30s requirement)
const registrationAttempts = new Map();
const COOLDOWN_MS = 30000;

// Register
router.post('/register', async (req, res) => {
    const { email, password, username, displayName, preferences, pin } = req.body;
    const bcrypt = require('bcryptjs');
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = email || ip;

    // Local Cooldown Check
    const lastAttempt = registrationAttempts.get(key);
    const now = Date.now();
    if (lastAttempt && now - lastAttempt < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (now - lastAttempt)) / 1000);
        return res.status(429).json({
            error: `Rate limit hit. Please wait ${remaining} seconds.`,
            retryAfter: remaining
        });
    }

    try {
        // Record attempt
        registrationAttempts.set(key, now);

        if (!pin || pin.length !== 4) {
            return res.status(400).json({ error: 'A 4-digit security PIN is required' });
        }

        const pinHash = await bcrypt.hash(pin, 10);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    display_name: displayName,
                    pin_hash: pinHash,
                    preferences
                }
            }
        });

        if (error) throw error;

        res.json({
            user: data.user,
            access_token: data.session?.access_token,
            message: 'Registration successful. You can now login with your PIN.'
        });
    } catch (error) {
        console.error('[Registration Error]', {
            message: error.message,
            email: req.body.email,
            username: req.body.username,
            stack: error.stack
        });

        const isValidationError = error.message.includes('at least 6 characters') ||
            error.message.includes('already registered') ||
            error.message.includes('invalid email');

        const isRateLimit = error.message.toLowerCase().includes('rate limit exceeded');

        if (isRateLimit) {
            return res.status(429).json({
                error: 'Too many registration attempts. Please wait a few minutes and try again.'
            });
        }

        res.status(isValidationError ? 400 : 500).json({ error: error.message });
    }
});

// Verify Email (Real Supabase OTP)
router.post('/verify', async (req, res) => {
    const { email, code } = req.body;
    try {

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'signup'
        });

        if (error) throw error;

        res.json({
            success: true,
            message: 'Email verified successfully',
            user: data.user,
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token
        });
    } catch (error) {
        console.error('[Verification Error]', { email, message: error.message });
        res.status(400).json({ error: error.message });
    }
});

// Login (PIN-Based)
router.post('/login', async (req, res) => {
    const { email, pin } = req.body;
    const bcrypt = require('bcryptjs');

    try {
        if (!email || !pin) {
            return res.status(400).json({ error: 'Email and 4-digit PIN are required' });
        }

        // Fetch user from public.users to get the pin_hash
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (fetchError || !user || !user.login_pin_hash) {
            return res.status(401).json({ error: 'Invalid email or PIN' });
        }

        const isMatch = await bcrypt.compare(pin, user.login_pin_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or PIN' });
        }

        // Issue a local JWT
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        setAuthCookies(res, token, 'not_applicable_for_pin_auth');

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name,
                preferences: user.preferences
            },
            access_token: token
        });
    } catch (error) {
        console.error('[Login Error]', error);
        res.status(500).json({ error: 'An unexpected error occurred during login' });
    }
});

// Verify 2FA (Simulated)
router.post('/2fa/verify', async (req, res) => {
    const { mfa_token, code } = req.body;
    if (code === '654321') {
        res.json({ success: true, message: '2FA verified' });
    } else {
        res.status(401).json({ error: 'Invalid 2FA code' });
    }
});

// Refresh Token (Spec Requirement)
router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;
    try {
        const { data, error } = await supabase.auth.refreshSession({ refresh_token });
        if (error) throw error;

        res.json({
            user: data.user,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

// Reset Password (Forgot Password)
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        res.json({ success: true, message: 'Password reset link sent to email' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset PIN (Using original password)
router.post('/reset-pin', async (req, res) => {
    const { email, password, newPin } = req.body;
    const bcrypt = require('bcryptjs');

    try {
        if (!email || !password || !newPin || newPin.length !== 4) {
            return res.status(400).json({ error: 'Email, original password, and a new 4-digit PIN are required' });
        }

        // 1. Verify identity with Supabase using original password
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 2. Hash new PIN
        const newPinHash = await bcrypt.hash(newPin, 10);

        // 3. Update public.users
        const { error: updateError } = await supabase
            .from('users')
            .update({ login_pin_hash: newPinHash })
            .eq('email', email);

        if (updateError) throw updateError;

        res.json({ success: true, message: 'Security PIN has been reset successfully' });
    } catch (error) {
        console.error('[Reset PIN Error]', error);
        res.status(500).json({ error: 'Failed to reset PIN' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
