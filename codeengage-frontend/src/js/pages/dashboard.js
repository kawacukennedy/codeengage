// Dashboard Page
export default class Dashboard {
    constructor(app) {
        this.app = app;
        this.data = {
            stats: null,
            recentSnippets: [],
            achievements: [],
            activity: []
        };
    }

    async init() {
        await this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            // Load user statistics
            const statsResponse = await this.app.apiClient.get('/users/stats');
            if (statsResponse.success) {
                this.data.stats = statsResponse.data;
            }

            // Load recent snippets
            const snippetsResponse = await this.app.apiClient.get('/snippets?limit=5&sort=recent');
            if (snippetsResponse.success) {
                this.data.recentSnippets = snippetsResponse.data;
            }

            // Load achievements
            const achievementsResponse = await this.app.apiClient.get('/users/achievements?limit=3');
            if (achievementsResponse.success) {
                this.data.achievements = achievementsResponse.data;
            }

            // Load recent activity
            const activityResponse = await this.app.apiClient.get('/users/activity?limit=5');
            if (activityResponse.success) {
                this.data.activity = activityResponse.data;
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.app.showError('Failed to load dashboard data');
        }
    }

    render() {
        const dashboard = document.createElement('div');
        dashboard.className = 'dashboard container mx-auto px-4 py-8';

        // Header
        const header = document.createElement('div');
        header.className = 'dashboard-header mb-8';
        header.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-white mb-2">Welcome back, ${this.app.currentUser?.display_name || 'Developer'}!</h1>
                    <p class="text-gray-400">Here's what's happening with your code snippets today.</p>
                </div>
                <button onclick="window.app.router.navigate('/editor')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    + Create Snippet
                </button>
            </div>
        `;
        dashboard.appendChild(header);

        // Stats Grid
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8';
        statsGrid.innerHTML = this.renderStatsGrid();
        dashboard.appendChild(statsGrid);

        // Main Content Grid
        const contentGrid = document.createElement('div');
        contentGrid.className = 'content-grid grid grid-cols-1 lg:grid-cols-3 gap-8';

        // Recent Snippets
        const recentSnippets = document.createElement('div');
        recentSnippets.className = 'lg:col-span-2';
        recentSnippets.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-white">Recent Snippets</h2>
                    <a href="/snippets" class="text-blue-400 hover:text-blue-300 text-sm">View All</a>
                </div>
                <div class="recent-snippets space-y-4">
                    ${this.renderRecentSnippets()}
                </div>
            </div>
        `;
        contentGrid.appendChild(recentSnippets);

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'space-y-6';

        // Achievements
        const achievementsSection = document.createElement('div');
        achievementsSection.className = 'bg-gray-800 rounded-lg p-6';
        achievementsSection.innerHTML = `
            <h3 class="text-lg font-semibold text-white mb-4">Recent Achievements</h3>
            <div class="achievements space-y-3">
                ${this.renderAchievements()}
            </div>
        `;
        sidebar.appendChild(achievementsSection);

        // Activity Feed
        const activitySection = document.createElement('div');
        activitySection.className = 'bg-gray-800 rounded-lg p-6';
        activitySection.innerHTML = `
            <h3 class="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div class="activity-feed space-y-3">
                ${this.renderActivity()}
            </div>
        `;
        sidebar.appendChild(activitySection);

        // Quick Actions
        const quickActionsSection = document.createElement('div');
        quickActionsSection.className = 'bg-gray-800 rounded-lg p-6';
        quickActionsSection.innerHTML = `
            <h3 class="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div class="quick-actions space-y-2">
                <button onclick="window.app.router.navigate('/editor')" class="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm transition-colors">
                    → Create New Snippet
                </button>
                <button onclick="window.app.router.navigate('/snippets')" class="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm transition-colors">
                    → Browse Snippets
                </button>
                <button onclick="window.app.router.navigate('/profile')" class="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm transition-colors">
                    → Edit Profile
                </button>
            </div>
        `;
        sidebar.appendChild(quickActionsSection);

        contentGrid.appendChild(sidebar);
        dashboard.appendChild(contentGrid);

        // Initialize after DOM insertion
        setTimeout(() => this.init(), 0);

        return dashboard;
    }

    renderStatsGrid() {
        const stats = this.data.stats || {
            totalSnippets: 0,
            totalViews: 0,
            totalStars: 0,
            achievementPoints: 0
        };

        return `
            <div class="stat-card bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Total Snippets</p>
                        <p class="text-2xl font-bold text-white">${stats.totalSnippets}</p>
                    </div>
                    <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="stat-card bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Total Views</p>
                        <p class="text-2xl font-bold text-white">${stats.totalViews.toLocaleString()}</p>
                    </div>
                    <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="stat-card bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Total Stars</p>
                        <p class="text-2xl font-bold text-white">${stats.totalStars.toLocaleString()}</p>
                    </div>
                    <div class="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="stat-card bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Points</p>
                        <p class="text-2xl font-bold text-white">${stats.achievementPoints.toLocaleString()}</p>
                    </div>
                    <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentSnippets() {
        if (!this.data.recentSnippets || this.data.recentSnippets.length === 0) {
            return `
                <div class="text-center py-8">
                    <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-gray-400">No snippets yet. Create your first one!</p>
                </div>
            `;
        }

        return this.data.recentSnippets.map(snippet => `
            <div class="snippet-item bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer" onclick="window.app.router.navigate('/snippets/${snippet.id}')">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="text-white font-medium mb-1">${this.escapeHtml(snippet.title)}</h4>
                        <p class="text-gray-400 text-sm mb-2 line-clamp-2">${snippet.description ? this.escapeHtml(snippet.description) : 'No description'}</p>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                            <span class="flex items-center">
                                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                </svg>
                                ${snippet.star_count || 0}
                            </span>
                            <span class="flex items-center">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                ${snippet.view_count || 0}
                            </span>
                            <span class="px-2 py-1 bg-gray-600 rounded text-xs">${snippet.language}</span>
                            <span>${new Date(snippet.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <span class="inline-block px-2 py-1 text-xs rounded ${
                            snippet.visibility === 'public' ? 'bg-green-600 text-white' : 
                            snippet.visibility === 'private' ? 'bg-red-600 text-white' : 
                            'bg-blue-600 text-white'
                        }">
                            ${snippet.visibility}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderAchievements() {
        if (!this.data.achievements || this.data.achievements.length === 0) {
            return '<p class="text-gray-500 text-sm">No achievements yet. Keep coding!</p>';
        }

        return this.data.achievements.map(achievement => `
            <div class="achievement-item flex items-center space-x-3">
                <div class="achievement-icon w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                </div>
                <div class="flex-1">
                    <p class="text-white text-sm font-medium">${this.escapeHtml(achievement.badge_name)}</p>
                    <p class="text-gray-400 text-xs">${this.escapeHtml(achievement.badge_description)}</p>
                </div>
                <span class="text-yellow-400 text-xs font-medium">+${achievement.points_awarded}</span>
            </div>
        `).join('');
    }

    renderActivity() {
        if (!this.data.activity || this.data.activity.length === 0) {
            return '<p class="text-gray-500 text-sm">No recent activity.</p>';
        }

        return this.data.activity.map(item => {
            const activityIcons = {
                'snippet_created': 'bg-blue-600',
                'snippet_starred': 'bg-yellow-600',
                'snippet_forked': 'bg-green-600',
                'achievement_earned': 'bg-purple-600',
                'profile_updated': 'bg-gray-600'
            };

            return `
                <div class="activity-item flex items-start space-x-3">
                    <div class="activity-icon w-2 h-2 ${activityIcons[item.action_type] || 'bg-gray-600'} rounded-full mt-1"></div>
                    <div class="flex-1">
                        <p class="text-gray-300 text-sm">${this.formatActivityMessage(item)}</p>
                        <p class="text-gray-500 text-xs">${new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatActivityMessage(activity) {
        const messages = {
            'snippet_created': 'Created a new snippet',
            'snippet_starred': 'Your snippet was starred',
            'snippet_forked': 'Your snippet was forked',
            'achievement_earned': 'Earned an achievement',
            'profile_updated': 'Updated profile'
        };

        return messages[activity.action_type] || activity.action_type;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}