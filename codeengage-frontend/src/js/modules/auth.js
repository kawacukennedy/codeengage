/**
 * Auth Module
 * 
 * Manages user authentication state, login, and registration.
 */

import { setLocal, getLocal, removeLocal } from './utils/storage.js';

export class Auth {
    constructor(app) {
        this.app = app;
        this.user = null;
        this.token = getLocal('auth_token');

        if (this.token) {
            this.app.apiClient.setAuthToken(this.token);
        }
    }

    /**
     * Initialize authentication
     */
    async init() {
        if (this.token) {
            try {
                // Verify token and get user data
                const response = await this.app.apiClient.get('/users/me');
                this.user = response.data;
            } catch (error) {
                console.error('Auth initialization failed:', error);
                this.logout(false); // Silent logout on error
            }
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async login(email, password) {
        try {
            const response = await this.app.apiClient.post('/auth/login', { email, password });

            if (response.data.token) {
                this.setSession(response.data.token, response.data.user);
                return { success: true };
            }

            return { success: false, message: 'Invalid response from server' };
        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                message: error.data?.message || 'Login failed. Please check your credentials.'
            };
        }
    }

    /**
     * Register new user
     * @param {object} userData - User registration data
     */
    async register(userData) {
        try {
            const response = await this.app.apiClient.post('/auth/register', userData);

            // Handle double-wrapped response: client wraps in .data, backend also wraps in .data
            const responseData = response.data?.data || response.data;

            if (responseData?.token) {
                this.setSession(responseData.token, responseData.user);
                return { success: true };
            }

            return { success: false, message: 'Registration successful but no token received' };
        } catch (error) {
            console.error('Registration failed:', error);
            // Re-throw to let caller handle and display specific validation errors
            throw error;
        }
    }

    /**
     * Logout user
     * @param {boolean} notifyServer - Whether to notify server
     */
    async logout(notifyServer = true) {
        if (notifyServer && this.token) {
            try {
                await this.app.apiClient.post('/auth/logout');
            } catch (error) {
                console.warn('Server logout failed:', error);
            }
        }

        this.clearSession();
        this.app.router.navigate('/login');
    }

    /**
     * Set session data
     * @param {string} token - JWT token
     * @param {object} user - User object
     */
    setSession(token, user) {
        this.token = token;
        this.user = user;

        setLocal('auth_token', token);
        this.app.apiClient.setAuthToken(token);
    }

    /**
     * Clear session data
     */
    clearSession() {
        this.token = null;
        this.user = null;

        removeLocal('auth_token');
        this.app.apiClient.setAuthToken(null);
    }

    /**
     * Forgot password request
     * @param {string} email - User email
     */
    async forgotPassword(email) {
        try {
            await this.app.apiClient.post('/auth/forgot-password', { email });
            return { success: true, message: 'Password reset link sent to your email.' };
        } catch (error) {
            return {
                success: false,
                message: error.data?.message || 'Failed to send reset link.'
            };
        }
    }

    /**
     * Reset password
     * @param {string} token - Reset token
     * @param {string} password - New password
     */
    async resetPassword(token, password) {
        try {
            await this.app.apiClient.post('/auth/reset-password', { token, password });
            return { success: true, message: 'Password reset successfully.' };
        } catch (error) {
            return {
                success: false,
                message: error.data?.message || 'Failed to reset password.'
            };
        }
    }
}

export default Auth;
