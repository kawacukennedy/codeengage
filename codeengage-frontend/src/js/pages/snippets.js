/**
 * Snippets Page Module
 * 
 * Displays and manages the list of snippets with search, filtering, and pagination.
 */

import seoManager from '../modules/utils/seo-manager.js';
import Navigation from '../modules/components/navigation.js';

export class Snippets {
    constructor(app) {
        this.app = app;
        this.nav = new Navigation('/snippets');
        this.data = {
            snippets: [],
            total: 0,
            page: 1,
            perPage: 20,
            filters: {
                language: '',
                visibility: '',
                search: '',
                sort: 'created_at',
                order: 'desc'
            }
        };
    }

    /**
     * Initialize the snippets page
     */
    async init() {
        seoManager.update({
            title: 'Explore Code Snippets',
            description: 'Discover thousands of code snippets shared by the CodeEngage community. Search by language, tag, or popularity.',
            keywords: 'search code, find snippets, code examples, programming',
            url: window.location.href
        });
        await this.loadSnippets();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Load snippets from API
     */
    async loadSnippets() {
        try {
            const params = new URLSearchParams({
                page: this.data.page,
                per_page: this.data.perPage,
                ...this.data.filters
            });

            // Remove empty params
            for (const [key, value] of [...params]) {
                if (!value) params.delete(key);
            }

            const response = await this.app.apiClient.get(`/snippets?${params}`);

            console.log('Snippets Page Response:', response);

            // Handle direct array response from API
            if (Array.isArray(response.data)) {
                this.data.snippets = response.data;
                this.data.total = response.data.length;
            } else {
                this.data.snippets = response.data?.snippets || [];
                this.data.total = response.data?.total || 0;
            }
        } catch (error) {
            console.error('Failed to load snippets:', error);
            this.app.showError('Failed to load snippets');
        }
    }

    /**
     * Render the snippets page
     */
    /**
     * Render the snippets page
     */
    render() {
        const container = document.getElementById('app');
        if (!container) return;

        container.innerHTML = `
            ${this.nav.render()}
            <div class="snippets-page min-h-screen bg-deep-space-dark pb-12">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    <!-- Hero Section -->
                    <div class="flex flex-col md:flex-row justify-between items-end mb-10 animate-fadeIn">
                        <div>
                            <h1 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2">
                                Explore Snippets
                            </h1>
                            <p class="text-gray-400 text-lg">Discover and share code snippets from the community</p>
                        </div>
                        <button onclick="window.app.router.navigate('/new')" 
                                class="mt-4 md:mt-0 group relative px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5">
                            <span class="relative z-10 flex items-center">
                                <span class="text-xl mr-2">+</span> Create Snippet
                            </span>
                            <div class="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        </button>
                    </div>
                
                    <!-- Toolbar -->
                    <div class="glass-panel p-4 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 items-center justify-between border border-white/5 bg-gray-900/50 backdrop-blur-xl shadow-xl animate-slideUp">
                        <div class="relative w-full md:w-96 group">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg class="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                            </div>
                            <input type="text" 
                                   id="search-input"
                                   class="block w-full pl-10 pr-3 py-2.5 border border-gray-700 rounded-xl leading-5 bg-gray-800/50 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-inner" 
                                   placeholder="Search by title, description or code..." 
                                   value="${this.escapeHtml(this.data.filters.search)}">
                        </div>
                        
                        <div class="flex flex-wrap gap-3 w-full md:w-auto">
                            <div class="relative">
                                <select id="language-filter" class="appearance-none pl-3 pr-10 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:bg-gray-800 transition-colors shadow-sm">
                                    <option value="">All Languages</option>
                                    ${this.renderLanguageOptions()}
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            
                            <div class="relative">
                                <select id="sort-filter" class="appearance-none pl-3 pr-10 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:bg-gray-800 transition-colors shadow-sm">
                                    <option value="created_at" ${this.data.filters.sort === 'created_at' ? 'selected' : ''}>Newest First</option>
                                    <option value="star_count" ${this.data.filters.sort === 'star_count' ? 'selected' : ''}>Most Popular</option>
                                    <option value="view_count" ${this.data.filters.sort === 'view_count' ? 'selected' : ''}>Most Viewed</option>
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                
                    <!-- Grid Content -->
                    <div class="snippets-content min-h-[400px]">
                        ${this.data.snippets.length ? this.renderSnippetList() : this.renderEmptyState()}
                    </div>
                    
                    <!-- Pagination -->
                    ${this.data.total > this.data.perPage ? this.renderPagination() : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render language filter options
     */
    renderLanguageOptions() {
        const languages = [
            'javascript', 'python', 'php', 'java', 'typescript',
            'go', 'rust', 'ruby', 'c', 'cpp', 'csharp', 'swift',
            'kotlin', 'sql', 'html', 'css', 'bash', 'json', 'yaml'
        ];

        return languages.map(lang =>
            `<option value="${lang}" ${this.data.filters.language === lang ? 'selected' : ''}>
                ${lang.charAt(0).toUpperCase() + lang.slice(1)}
            </option>`
        ).join('');
    }

    /**
     * Render snippet list
     */
    renderSnippetList() {
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp">
                ${this.data.snippets.map(snippet => this.renderSnippetCard(snippet)).join('')}
            </div>
        `;
    }

    /**
     * Render individual snippet card
     */
    renderSnippetCard(snippet) {
        // Language colors map
        const langColors = {
            javascript: 'text-yellow-400 bg-yellow-400/10',
            typescript: 'text-blue-400 bg-blue-400/10',
            python: 'text-green-400 bg-green-400/10',
            php: 'text-purple-400 bg-purple-400/10',
            html: 'text-orange-400 bg-orange-400/10',
            css: 'text-blue-300 bg-blue-300/10',
            default: 'text-gray-400 bg-gray-400/10'
        };

        const langColor = langColors[snippet.language] || langColors.default;

        return `
            <article class="snippet-card group relative bg-gray-900/40 backdrop-blur-sm border border-gray-800 hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-1 cursor-pointer" 
                     data-id="${snippet.id}"
                     onclick="window.app.router.navigate('/snippet/${snippet.id}')">
                
                <!-- Code Preview Header -->
                <div class="relative bg-gray-950/50 p-4 border-b border-gray-800 group-hover:border-gray-700 transition-colors">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex space-x-1.5">
                            <div class="w-3 h-3 rounded-full bg-red-500/20 group-hover:bg-red-500 transition-colors"></div>
                            <div class="w-3 h-3 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500 transition-colors"></div>
                            <div class="w-3 h-3 rounded-full bg-green-500/20 group-hover:bg-green-500 transition-colors"></div>
                        </div>
                        <span class="text-xs font-mono ${langColor} px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wider">
                            ${this.escapeHtml(snippet.language)}
                        </span>
                    </div>
                    <div class="font-mono text-xs text-gray-500 overflow-hidden h-24 opacity-60 group-hover:opacity-100 transition-opacity select-none">
                        <pre><code>${this.escapeHtml(this.truncate(snippet.code || '', 200))}</code></pre>
                    </div>
                    
                    <!-- Gradient overlay on preview -->
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/90"></div>
                </div>

                <!-- Card Body -->
                <div class="p-5">
                    <h3 class="text-lg font-bold text-gray-200 group-hover:text-blue-400 transition-colors mb-2 line-clamp-1">
                        ${this.escapeHtml(snippet.title)}
                    </h3>
                    
                    <p class="text-sm text-gray-400 mb-4 line-clamp-2 h-10">
                        ${this.escapeHtml(snippet.description || 'No description provided.')}
                    </p>

                    <!-- Footer -->
                    <div class="flex items-center justify-between pt-4 border-t border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                        <div class="flex items-center space-x-2">
                             <div class="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                                ${this.escapeHtml(snippet.author?.username?.charAt(0).toUpperCase() || 'U')}
                            </div>
                            <span class="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                                ${this.escapeHtml(snippet.author?.username || 'Unknown')}
                            </span>
                        </div>
                        
                        <div class="flex items-center space-x-3 text-xs text-gray-500">
                             <span class="flex items-center hover:text-yellow-400 transition-colors">
                                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                                ${snippet.star_count || 0}
                            </span>
                            <span class="flex items-center hover:text-blue-400 transition-colors">
                                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                ${snippet.view_count || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
                <div class="h-24 w-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-800/30">
                    <span class="text-4xl">🔭</span>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">No snippets found</h3>
                <p class="text-gray-400 max-w-sm mb-8">
                    We couldn't find any snippets matching your search. Try adjusting your filters or contribute something new!
                </p>
                <button onclick="window.app.router.navigate('/new')" class="btn-primary-glow px-8 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20">
                    Create New Snippet
                </button>
            </div>
        `;
    }

    /**
     * Render pagination
     */
    renderPagination() {
        const totalPages = Math.ceil(this.data.total / this.data.perPage);
        const currentPage = this.data.page;

        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        return `
            <div class="flex justify-center mt-12 mb-8">
                <nav class="flex items-center space-x-2 bg-gray-900/50 p-2 rounded-full border border-gray-800/50 backdrop-blur-sm shadow-xl">
                    <button class="page-btn p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all" 
                            ${currentPage === 1 ? 'disabled' : ''} 
                            data-page="${currentPage - 1}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    
                    <div class="flex items-center px-2 space-x-1">
                        ${pages.map(page =>
            page === '...'
                ? '<span class="px-2 text-gray-600">...</span>'
                : `<button class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${page === currentPage
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }" data-page="${page}">${page}</button>`
        ).join('')}
                    </div>
                    
                    <button class="page-btn p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all" 
                            ${currentPage === totalPages ? 'disabled' : ''} 
                            data-page="${currentPage + 1}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </nav>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('search-input');

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(searchInput.value);
                }
            });

            // Add realtime search with debounce could be nice, but sticking to Enter for now
            // or adding a clear button listener if I added one
        }

        // Filters
        ['language-filter', 'visibility-filter', 'sort-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.handleFilterChange());
            }
        });

        // Pagination - Updated selector to match new DOM
        // The nav no longer has .pagination class, so we target the buttons directly 
        // or add a class to the nav context. 
        // Let's target via the data attribute which is more robust
        document.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Find closest button in case click hits the SVG icon inside
                const button = e.target.closest('button');
                if (!button) return;

                const page = parseInt(button.dataset.page);
                if (!isNaN(page) && page !== this.data.page) {
                    this.handlePageChange(page);
                }
            });
        });

        // Snippet card clicks are now handled via inline onclick in renderSnippetCard
        // to use the router properly
    }

    /**
     * Handle search
     */
    async handleSearch(query) {
        this.data.filters.search = query;
        this.data.page = 1;
        await this.loadSnippets();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Handle filter change
     */
    async handleFilterChange() {
        this.data.filters.language = document.getElementById('language-filter')?.value || '';
        this.data.filters.visibility = document.getElementById('visibility-filter')?.value || '';
        this.data.filters.sort = document.getElementById('sort-filter')?.value || 'created_at';
        this.data.page = 1;

        await this.loadSnippets();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Handle page change
     */
    async handlePageChange(page) {
        this.data.page = page;
        await this.loadSnippets();
        this.render();
        this.setupEventListeners();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Truncate text
     */
    truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
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

export default Snippets;