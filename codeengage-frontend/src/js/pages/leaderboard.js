/**
 * Leaderboard Page Module
 * 
 * Displays global and organization-specific rankings.
 */

import Navigation from '../modules/components/navigation.js';

export class Leaderboard {
    constructor(app) {
        this.app = app;
        this.nav = new Navigation('/leaderboard');
        this.data = {
            leaderboard: [],
            stats: null,
            filter: 'points' // points, achievements, snippets
        };
    }

    /**
     * Initialize the leaderboard page
     */
    async init() {
        await this.loadData();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Load leaderboard data
     */
    async loadData() {
        try {
            const [leaderboardRes, statsRes] = await Promise.all([
                this.app.apiClient.get(`/gamification/leaderboard?type=${this.data.filter}&limit=20`),
                this.app.apiClient.get('/gamification/global-stats')
            ]);

            this.data.leaderboard = leaderboardRes.data || [];
            this.data.stats = statsRes.data;
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.app.showError('Failed to load rankings');
        }
    }

    /**
     * Render the page
     */
    render() {
        const container = document.getElementById('app');
        if (!container) return;

        container.innerHTML = `
            ${this.nav.render()}
            <main class="min-h-screen pt-20 pb-12 px-4 md:px-8">
                <div class="max-w-6xl mx-auto">
                    <!-- Page Header -->
                    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <h1 class="text-4xl md:text-5xl font-black text-white mb-2 leading-none">
                                HALL OF <span class="text-neon-blue">FAME</span>
                            </h1>
                            <p class="text-gray-400 font-medium">Top contributors and achievers in the system.</p>
                        </div>
                        
                        <div class="flex bg-gray-900/50 p-1.5 rounded-xl border border-gray-800">
                            <button class="filter-btn px-6 py-2 rounded-lg font-bold transition-all ${this.data.filter === 'points' ? 'bg-neon-blue text-white shadow-neon' : 'text-gray-500 hover:text-white'}" data-filter="points">XP Points</button>
                            <button class="filter-btn px-6 py-2 rounded-lg font-bold transition-all ${this.data.filter === 'achievements' ? 'bg-neon-blue text-white shadow-neon' : 'text-gray-500 hover:text-white'}" data-filter="achievements">Badges</button>
                            <button class="filter-btn px-6 py-2 rounded-lg font-bold transition-all ${this.data.filter === 'snippets' ? 'bg-neon-blue text-white shadow-neon' : 'text-gray-500 hover:text-white'}" data-filter="snippets">Snippets</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Rankings Table -->
                        <div class="lg:col-span-2">
                            ${this.renderRankings()}
                        </div>

                        <!-- Sidebar / Stats -->
                        <div class="space-y-6">
                            ${this.renderGlobalStats()}
                        </div>
                    </div>
                </div>
            </main>
        `;
    }

    renderRankings() {
        if (!this.data.leaderboard.length) {
            return `
                <div class="glass-panel p-12 text-center rounded-3xl border border-gray-800">
                    <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🏆</div>
                    <h3 class="text-xl font-bold text-white mb-2">No rankings available</h3>
                    <p class="text-gray-400"> rankings will be recalculated shortly.</p>
                </div>
            `;
        }

        const top3 = this.data.leaderboard.slice(0, 3);
        const others = this.data.leaderboard.slice(3);

        return `
            <!-- Podium for Top 3 -->
            <div class="grid grid-cols-3 gap-4 mb-12 items-end px-4">
                <!-- Rank 2 -->
                ${this.renderPodiumElement(top3[1], 2)}
                <!-- Rank 1 -->
                ${this.renderPodiumElement(top3[0], 1)}
                <!-- Rank 3 -->
                ${this.renderPodiumElement(top3[2], 3)}
            </div>

            <div class="glass-panel rounded-3xl border border-gray-800 overflow-hidden">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-gray-800/50 border-b border-gray-700">
                            <th class="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Rank</th>
                            <th class="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                            <th class="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">${this.data.filter.toUpperCase()}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800/50">
                        ${others.map((entry, index) => this.renderTableRow(entry, index + 4)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPodiumElement(entry, rank) {
        if (!entry) return '<div></div>';

        const heights = { 1: 'h-48', 2: 'h-36', 3: 'h-28' };
        const colors = { 1: 'text-yellow-400', 2: 'text-gray-300', 3: 'text-orange-400' };
        const glow = { 1: 'shadow-yellow-500/20', 2: 'shadow-gray-400/20', 3: 'shadow-orange-500/20' };

        return `
            <div class="flex flex-col items-center">
                <div class="relative mb-4 group cursor-pointer" onclick="window.app.router.navigate('/profile/${entry.id}')">
                    <div class="w-16 h-16 md:w-24 md:h-24 rounded-full p-1 bg-gradient-to-br from-gray-700 to-gray-900 border-2 ${rank === 1 ? 'border-yellow-400' : 'border-gray-700'} relative z-10 overflow-hidden">
                        <img src="${entry.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.username}`}" class="w-full h-full rounded-full object-cover">
                    </div>
                    <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center z-20 font-black text-xs ${colors[rank]}">
                        ${rank}
                    </div>
                </div>
                <div class="w-full ${heights[rank]} bg-gray-800/40 border-t-2 ${rank === 1 ? 'border-yellow-400' : 'border-gray-700'} rounded-t-2xl flex flex-col items-center justify-center p-4">
                    <span class="text-white font-bold truncate max-w-full text-sm md:text-base">${this.escapeHtml(entry.display_name || entry.username)}</span>
                    <span class="${colors[rank]} font-black text-lg md:text-xl font-mono">${this.formatValue(entry[this.getValueKey()])}</span>
                </div>
            </div>
        `;
    }

    renderTableRow(entry, rank) {
        return `
            <tr class="hover:bg-gray-800/30 transition-colors cursor-pointer group" onclick="window.app.router.navigate('/profile/${entry.id}')">
                <td class="px-6 py-4 font-mono font-black text-gray-500 group-hover:text-white transition-colors">${rank}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <img src="${entry.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.username}`}" class="w-8 h-8 rounded-full border border-gray-700">
                        <span class="text-white font-bold group-hover:text-neon-blue transition-colors">${this.escapeHtml(entry.display_name || entry.username)}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="text-white font-black font-mono">${this.formatValue(entry[this.getValueKey()])}</span>
                </td>
            </tr>
        `;
    }

    renderGlobalStats() {
        const stats = this.data.stats || {};
        return `
            <div class="glass-panel p-6 rounded-3xl border border-gray-800">
                <h3 class="text-lg font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                    <i class="ph ph-globe text-neon-blue"></i> Global Stats
                </h3>
                <div class="space-y-4">
                    <div class="flex justify-between items-center p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                        <span class="text-gray-400 font-medium text-sm text-center">Total XP Distributed</span>
                        <span class="text-white font-black font-mono">${this.formatValue(stats.total_points || 0)}</span>
                    </div>
                    <div class="flex justify-between items-center p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 text-center">
                        <span class="text-gray-400 font-medium text-sm">Badges Earned</span>
                        <span class="text-white font-black font-mono">${stats.total_achievements || 0}</span>
                    </div>
                    <div class="flex justify-between items-center p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 text-center">
                        <span class="text-gray-400 font-medium text-sm">Active Developers</span>
                        <span class="text-white font-black font-mono">${stats.active_users || 0}</span>
                    </div>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-3xl border border-gray-800 bg-gradient-to-br from-neon-purple/5 to-transparent">
                <h3 class="text-lg font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                    <i class="ph ph-lightning text-yellow-400"></i> Level Up
                </h3>
                <p class="text-gray-400 text-sm mb-6 leading-relaxed">
                    Earn points by sharing snippets, receiving stars, and collaborating in real-time. Reach new tiers to unlock exclusive features.
                </p>
                <div class="space-y-3">
                    <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div class="bg-neon-purple h-full shadow-[0_0_10px_rgba(182,71,255,0.5)]" style="width: 65%"></div>
                    </div>
                    <div class="flex justify-between text-[10px] font-black uppercase text-gray-500 tracking-wider">
                        <span>Newbie</span>
                        <span>Architect</span>
                    </div>
                </div>
            </div>
        `;
    }

    getValueKey() {
        if (this.data.filter === 'points') return 'achievement_points';
        if (this.data.filter === 'achievements') return 'achievement_count';
        if (this.data.filter === 'snippets') return 'snippet_count';
        return 'achievement_points';
    }

    formatValue(val) {
        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val;
    }

    setupEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                this.data.filter = btn.dataset.filter;
                await this.loadData();
                this.render();
                this.setupEventListeners(); // Re-bind
            });
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default Leaderboard;
