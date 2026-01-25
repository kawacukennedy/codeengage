// Auth Manager - JWT and Session Handling
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('auth_token') || null;
        this.user = JSON.parse(localStorage.getItem('current_user') || 'null');
        this.sessionId = localStorage.getItem('session_id') || null;
        this.csrfToken = sessionStorage.getItem('csrf_token') || null;
        this.refreshTimeout = null;
        
        this.init();
    }

    init() {
        // Auto-refresh token before expiry
        if (this.token) {
            this.scheduleTokenRefresh();
        }
        
        // Setup periodic validation
        setInterval(() => {
            this.validateSession();
        }, 60000); // Check every minute
    }

    async login(email, password) {
        try {
            const response = await window.app.apiClient.post('/auth/login', {
                email,
                password
            });

            if (response.success) {
                this.setAuth(response.data);
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    async register(userData) {
        try {
            const response = await window.app.apiClient.post('/auth/register', userData);

            if (response.success) {
                this.setAuth(response.data);
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    }

    async logout() {
        try {
            if (this.token) {
                await window.app.apiClient.post('/auth/logout');
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            this.clearAuth();
        }
    }

    async refreshToken() {
        if (!this.token) return false;

        try {
            const response = await window.app.apiClient.post('/auth/refresh');
            
            if (response.success) {
                this.setAuth(response.data);
                return true;
            } else {
                this.clearAuth();
                return false;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
            return false;
        }
    }

    async getCurrentUser() {
        if (this.user) {
            return this.user;
        }

        if (!this.token) {
            return null;
        }

        try {
            const response = await window.app.apiClient.get('/auth/me');
            if (response.success) {
                this.user = response.data;
                localStorage.setItem('current_user', JSON.stringify(this.user));
                return this.user;
            }
        } catch (error) {
            console.error('Failed to get current user:', error);
        }

        return null;
    }

    setAuth(authData) {
        this.token = authData.token;
        this.user = authData.user;
        this.sessionId = authData.session_id;
        this.csrfToken = authData.csrf_token;

        // Store in persistent storage
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('current_user', JSON.stringify(this.user));
        localStorage.setItem('session_id', this.sessionId);
        
        // CSRF token goes to sessionStorage (page-specific)
        sessionStorage.setItem('csrf_token', this.csrfToken);

        // Update API client
        if (window.app && window.app.apiClient) {
            window.app.apiClient.setAuthToken(this.token);
        }

        // Schedule refresh
        this.scheduleTokenRefresh();
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        this.sessionId = null;
        this.csrfToken = null;

        // Clear storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        localStorage.removeItem('session_id');
        sessionStorage.removeItem('csrf_token');

        // Clear API client token
        if (window.app && window.app.apiClient) {
            window.app.apiClient.setAuthToken(null);
        }

        // Clear refresh timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }

        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
            window.app.router.navigate('/login');
        }
    }

    scheduleTokenRefresh() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        // Parse JWT token to get expiry
        try {
            const payload = this.parseJWT(this.token);
            if (!payload || !payload.exp) {
                return;
            }

            const expiryTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            const refreshTime = expiryTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry

            if (refreshTime > currentTime) {
                const delay = refreshTime - currentTime;
                this.refreshTimeout = setTimeout(() => {
                    this.refreshToken();
                }, delay);
            }
        } catch (error) {
            console.error('Failed to parse JWT for refresh scheduling:', error);
        }
    }

    parseJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch (error) {
            return null;
        }
    }

    validateSession() {
        if (!this.token) return;

        try {
            const payload = this.parseJWT(this.token);
            if (!payload || !payload.exp) {
                this.clearAuth();
                return;
            }

            const currentTime = Date.now() / 1000;
            if (payload.exp < currentTime) {
                // Token expired, try to refresh
                this.refreshToken();
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            this.clearAuth();
        }
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    hasRole(role) {
        return this.user && this.user.roles && this.user.roles.includes(role);
    }

    hasPermission(permission) {
        return this.user && this.user.permissions && this.user.permissions.includes(permission);
    }

    getAuthHeader() {
        return this.token ? `Bearer ${this.token}` : null;
    }

    getCSRFToken() {
        return this.csrfToken;
    }

    // Update user data
    updateUser(userData) {
        if (this.user) {
            this.user = { ...this.user, ...userData };
            localStorage.setItem('current_user', JSON.stringify(this.user));
        }
    }

    // Check if user is owner of resource
    isOwner(resourceOwnerId) {
        return this.user && this.user.id === resourceOwnerId;
    }

    // Check if user can perform action on resource
    canPerform(action, resource) {
        // Admin can do everything
        if (this.hasRole('admin')) {
            return true;
        }

        // Owner can do everything on their resources
        if (this.isOwner(resource.user_id)) {
            return true;
        }

        // Check specific permissions
        const permission = `${action}_${resource.type}`;
        return this.hasPermission(permission);
    }

    // Get user preferences
    getPreferences() {
        return this.user ? this.user.preferences : {};
    }

    // Update user preferences
    updatePreferences(preferences) {
        if (this.user) {
            this.user.preferences = { ...this.user.preferences, ...preferences };
            localStorage.setItem('current_user', JSON.stringify(this.user));
        }
    }

    // Activity tracking
    trackActivity(activity) {
        if (!this.user) return;

        const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
        activities.push({
            ...activity,
            timestamp: Date.now(),
            user_id: this.user.id
        });

        // Keep only last 50 activities
        if (activities.length > 50) {
            activities.splice(0, activities.length - 50);
        }

        localStorage.setItem('user_activities', JSON.stringify(activities));
    }

    getRecentActivities(limit = 10) {
        const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
        return activities.slice(-limit).reverse();
    }
}

// Export for use in other modules
window.AuthManager = AuthManager;