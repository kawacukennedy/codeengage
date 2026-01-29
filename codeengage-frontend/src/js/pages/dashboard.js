/**
 * Dashboard Page Module
 * 
 * Main dashboard showing user's snippets, activity, and quick actions.
 */

import Navigation from '../modules/components/navigation.js';

export class Dashboard {
    constructor(app) {
        this.app = app;
        this.nav = new Navigation('/dashboard');
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
        if (!this.app.auth.isAuthenticated()) {
            return this.app.router.navigate('/login');
        }
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
            this.data.recentSnippets = snippetsRes.data || [];
            this.data.starredSnippets = starredRes.data || [];
            this.data.activity = activityRes.data || [];
            this.data.stats = userRes.data?.stats || {}; // Stats might be part of user or separate
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
            ${this.nav.render()}
            <div class="min-h-screen bg-deep-space p-4 md:p-8">
                <!-- Dashboard Header -->
                <header class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Welcome, <span class="text-white">${this.escapeHtml(user.display_name || user.username)}</span>
                        </h1>
                        <p class="text-gray-400 mt-1 flex items-center gap-2">
                             <span class="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                             ${this.formatDate(new Date())}
                        </p>
                    </div>
                    <div class="flex items-center gap-4 mt-4 md:mt-0">
                        <div class="glass px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-gray-300">
                            <span class="text-yellow-400">⚡</span> ${this.data.stats?.total_snippets || 0} Snippets
                        </div>
                        <button id="logout-btn" class="glass p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Logout">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        </button>
                         <a href="/new" class="btn btn-primary rounded-xl shadow-neon hover:scale-105 transition-transform">
                            <span class="text-lg mr-1">+</span> New Snippet
                        </a>
                    </div>
                </header>
                
                <!-- Bento Grid Layout -->
                <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    
                    <!-- Main Hero / Stats (Span 2) -->
                    <div class="md:col-span-2 lg:col-span-2 glass p-6 rounded-2xl relative overflow-hidden group hover:border-gray-600 transition-colors animate-slide-up">
                        <div class="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 rounded-full blur-[80px] -mr-16 -mt-16"></div>
                        <h2 class="text-xl font-semibold text-white mb-6 relative z-10">Overview</h2>
                         <div class="grid grid-cols-2 gap-4 relative z-10">
                            <div class="bg-gray-900/40 p-4 rounded-xl border border-white/5 hover:border-neon-blue/30 transition-colors">
                                <span class="text-gray-400 text-sm block mb-1">Total Views</span>
                                <span class="text-2xl font-bold text-white">${this.data.stats?.total_views || 0}</span>
                            </div>
                            <div class="bg-gray-900/40 p-4 rounded-xl border border-white/5 hover:border-neon-purple/30 transition-colors">
                                <span class="text-gray-400 text-sm block mb-1">Total Stars</span>
                                <span class="text-2xl font-bold text-white">${this.data.stats?.total_stars || 0}</span>
                            </div>
                            <div class="bg-gray-900/40 p-4 rounded-xl border border-white/5 hover:border-green-400/30 transition-colors">
                                <span class="text-gray-400 text-sm block mb-1">Achievement Points</span>
                                <span class="text-2xl font-bold text-white">${this.data.user?.achievement_points || 0}</span>
                            </div>
                             <div class="bg-gray-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onclick="window.location.href='/profile'">
                                <span class="text-neon-blue font-medium">View detailed stats →</span>
                            </div>
                         </div>
                    </div>

                     <!-- Quick Actions / Menu (Span 1) -->
                    <div class="glass p-6 rounded-2xl animate-slide-up" style="animation-delay: 100ms">
                         <h2 class="text-xl font-semibold text-white mb-6">Quick Actions</h2>
                         <nav class="space-y-2">
                            <a href="/new" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-all group">
                                <span class="w-8 h-8 rounded-lg bg-neon-blue/20 flex items-center justify-center text-neon-blue group-hover:scale-110 transition-transform">📝</span>
                                <span class="font-medium">Create Snippet</span>
                            </a>
                            <a href="/snippets" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-all group">
                                <span class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">🔍</span>
                                <span class="font-medium">Browse Library</span>
                            </a>
                            <a href="/profile" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-all group">
                                <span class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">👤</span>
                                <span class="font-medium">Edit Profile</span>
                            </a>
                         </nav>
                    </div>

                    <!-- Activity Feed Sidebar (Span 1, Row 2) - On mobile it flows naturally -->
                    <div class="md:col-span-1 lg:col-span-1 md:row-span-2 glass p-6 rounded-2xl animate-slide-up" style="animation-delay: 200ms">
                         <h2 class="text-xl font-semibold text-white mb-6 flex items-center justify-between">
                            Activity
                            <span class="text-xs font-normal text-gray-400 bg-white/5 px-2 py-1 rounded">Latest</span>
                         </h2>
                         <div class="space-y-4">
                            ${this.renderActivityFeed()}
                         </div>
                    </div>

                    <!-- Recent Snippets (Span 3) -->
                    <div class="md:col-span-2 lg:col-span-3 glass p-6 rounded-2xl animate-slide-up" style="animation-delay: 150ms">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-semibold text-white">Recent Snippets</h2>
                            <a href="/snippets" class="text-sm text-neon-blue hover:text-neon-purple transition-colors">View All</a>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${this.renderSnippetsList(this.data.recentSnippets, 'Start coding to see your snippets here.')}
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    /**
     * Render stats cards
     */
    /**
     * Stats are now inline in render() for Bento Layout
     * Keeping this as utility or deprecated
     */
    renderStats() {
        return '';
    }

    /**
     * Render snippets list
     */
    renderSnippetsList(snippets, emptyMessage) {
        if (!snippets.length) {
            return `<div class="col-span-full h-32 flex items-center justify-center opacity-50 border border-dashed border-gray-700 rounded-xl"><p>${emptyMessage}</p></div>`;
        }

        return snippets.map(snippet => `
            <a href="/snippet/${snippet.id}" class="block group relative">
                <div class="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple opacity-0 group-hover:opacity-100 blur transition duration-500 -z-10 rounded-xl"></div>
                
                <div class="bg-gray-900 border border-white/5 p-4 rounded-xl h-full flex flex-col hover:bg-gray-800 transition-colors">
                    <div class="flex items-start justify-between mb-3">
                        <span class="text-xs font-mono px-2 py-1 rounded bg-gray-800 text-neon-blue border border-neon-blue/20">
                            ${this.escapeHtml(snippet.language)}
                        </span>
                        <span class="text-xs text-gray-500 flex items-center gap-1">
                            ⭐ ${snippet.star_count || 0}
                        </span>
                    </div>
                    <h4 class="text-white font-medium mb-2 line-clamp-1 group-hover:text-neon-blue transition-colors">${this.escapeHtml(snippet.title)}</h4>
                    
                     <div class="mt-auto pt-3 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
                        <span>${this.formatTimeAgo(snippet.updated_at)}</span>
                        <span>v${snippet.version_count || 1}</span>
                    </div>
                </div>
            </a>
        `).join('');
    }

    /**
     * Render activity feed
     */
    renderActivityFeed() {
        if (!this.data.activity.length) {
            return '<p class="text-gray-500 text-sm">No recent activity</p>';
        }

        return this.data.activity.map(activity => `
            <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-900/30 border border-white/5 hover:border-white/10 transition-colors">
                <span class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg border border-gray-700">
                    ${this.getActivityIcon(activity.type)}
                </span>
                <div class="min-w-0 flex-1">
                    <p class="text-sm text-gray-300 line-clamp-2 leading-relaxed">${this.escapeHtml(activity.description)}</p>
                    <span class="text-xs text-gray-500 mt-1 block">${this.formatTimeAgo(activity.created_at)}</span>
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