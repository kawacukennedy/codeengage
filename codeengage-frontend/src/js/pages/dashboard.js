/**
 * Dashboard Page Module
 * 
 * Main dashboard showing user's snippets, activity, and quick actions.
 */

export class Dashboard {
    constructor(app) {
        this.app = app;
        this.data = {
            user: null,
            recentSnippets: [],
            starredSnippets: [],
            activity: [],
            stats: null
        };
    }

    /**
     * Initialize the dashboard page
     */
    async init() {
        await this.loadDashboardData();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Load dashboard data from API
     */
    async loadDashboardData() {
        try {
            const [userRes, snippetsRes, starredRes, activityRes] = await Promise.all([
                this.app.apiClient.get('/users/me'),
                this.app.apiClient.get('/users/me/snippets?limit=6'),
                this.app.apiClient.get('/users/me/starred?limit=6'),
                this.app.apiClient.get('/users/me/activity?limit=10')
            ]);

            this.data.user = userRes.data;
            this.data.recentSnippets = snippetsRes.data?.snippets || [];
            this.data.starredSnippets = starredRes.data?.snippets || [];
            this.data.activity = activityRes.data?.activities || [];
            this.data.stats = snippetsRes.data?.stats || {};
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.app.showError('Failed to load dashboard');
        }
    }

    /**
     * Render the dashboard page
     */
    render() {
        const container = document.getElementById('app');
        if (!container) return;

        const user = this.data.user || {};

        container.innerHTML = `
            <div class="dashboard-page">
                <header class="dashboard-header">
                    <div class="welcome-section">
                        <h1>Welcome back, ${this.escapeHtml(user.display_name || user.username || 'Developer')}!</h1>
                        <p class="date">${this.formatDate(new Date())}</p>
                    </div>
                    <div class="quick-actions">
                        <a href="/new" class="btn btn-primary">+ New Snippet</a>
                        <a href="/snippets" class="btn btn-secondary">Browse Snippets</a>
                    </div>
                </header>
                
                <div class="dashboard-stats">
                    ${this.renderStats()}
                </div>
                
                <div class="dashboard-grid">
                    <section class="dashboard-section recent-snippets">
                        <div class="section-header">
                            <h2>Recent Snippets</h2>
                            <a href="/profile?tab=snippets" class="view-all">View all →</a>
                        </div>
                        <div class="snippets-list">
                            ${this.renderSnippetsList(this.data.recentSnippets, 'No snippets yet. Create your first one!')}
                        </div>
                    </section>
                    
                    <section class="dashboard-section starred-snippets">
                        <div class="section-header">
                            <h2>Starred Snippets</h2>
                            <a href="/starred" class="view-all">View all →</a>
                        </div>
                        <div class="snippets-list">
                            ${this.renderSnippetsList(this.data.starredSnippets, 'No starred snippets yet. Star snippets you like!')}
                        </div>
                    </section>
                    
                    <section class="dashboard-section activity-feed">
                        <div class="section-header">
                            <h2>Recent Activity</h2>
                        </div>
                        <div class="activity-list">
                            ${this.renderActivityFeed()}
                        </div>
                    </section>
                    
                    <section class="dashboard-section quick-links">
                        <div class="section-header">
                            <h2>Quick Links</h2>
                        </div>
                        <nav class="quick-links-grid">
                            <a href="/new" class="quick-link">
                                <span class="icon">📝</span>
                                <span class="label">New Snippet</span>
                            </a>
                            <a href="/explore" class="quick-link">
                                <span class="icon">🔍</span>
                                <span class="label">Explore</span>
                            </a>
                            <a href="/profile" class="quick-link">
                                <span class="icon">👤</span>
                                <span class="label">Profile</span>
                            </a>
                            <a href="/settings" class="quick-link">
                                <span class="icon">⚙️</span>
                                <span class="label">Settings</span>
                            </a>
                        </nav>
                    </section>
                </div>
            </div>
        `;
    }

    /**
     * Render stats cards
     */
    renderStats() {
        const stats = this.data.stats || {};
        const user = this.data.user || {};

        return `
            <div class="stat-card">
                <span class="stat-value">${stats.total_snippets || 0}</span>
                <span class="stat-label">Total Snippets</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${stats.total_stars || 0}</span>
                <span class="stat-label">Stars Received</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${stats.total_views || 0}</span>
                <span class="stat-label">Total Views</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${user.achievement_points || 0}</span>
                <span class="stat-label">Achievement Points</span>
            </div>
        `;
    }

    /**
     * Render snippets list
     */
    renderSnippetsList(snippets, emptyMessage) {
        if (!snippets.length) {
            return `<div class="empty-state"><p>${emptyMessage}</p></div>`;
        }

        return snippets.map(snippet => `
            <a href="/snippet/${snippet.id}" class="snippet-item">
                <div class="snippet-info">
                    <h4>${this.escapeHtml(snippet.title)}</h4>
                    <span class="language-tag">${this.escapeHtml(snippet.language)}</span>
                </div>
                <div class="snippet-meta">
                    <span class="stat">⭐ ${snippet.star_count || 0}</span>
                    <span class="date">${this.formatTimeAgo(snippet.updated_at)}</span>
                </div>
            </a>
        `).join('');
    }

    /**
     * Render activity feed
     */
    renderActivityFeed() {
        if (!this.data.activity.length) {
            return '<div class="empty-state"><p>No recent activity</p></div>';
        }

        return this.data.activity.map(activity => `
            <div class="activity-item">
                <span class="activity-icon">${this.getActivityIcon(activity.type)}</span>
                <div class="activity-content">
                    <p>${this.escapeHtml(activity.description)}</p>
                    <span class="activity-time">${this.formatTimeAgo(activity.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get icon for activity type
     */
    getActivityIcon(type) {
        const icons = {
            'snippet_created': '📝',
            'snippet_updated': '✏️',
            'snippet_starred': '⭐',
            'snippet_forked': '🍴',
            'achievement_earned': '🏆',
            'comment_added': '💬',
            'default': '📌'
        };
        return icons[type] || icons.default;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Snippet item clicks are handled by anchors
    }

    /**
     * Format date
     */
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Format time ago
     */
    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        return date.toLocaleDateString();
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default Dashboard;