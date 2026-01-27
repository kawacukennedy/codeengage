// Snippets Browse Page
export default class Snippets {
    constructor(app) {
        this.app = app;
        this.data = {
            snippets: [],
            languages: [],
            tags: [],
            filters: {
                search: '',
                language: '',
                tags: [],
                visibility: '',
                sort: 'recent',
                per_page: 12
            },
            pagination: {
                current_page: 1,
                last_page: 1,
                total: 0,
                per_page: 12
            }
        };
        this.isLoading = false;
    }

    async init() {
        await this.loadLanguages();
        await this.loadTags();
        await this.loadSnippets();
        this.setupEventListeners();
    }

    async loadSnippets() {
        try {
            this.isLoading = true;
            this.updateLoadingState();

            const params = new URLSearchParams({
                page: this.data.pagination.current_page,
                per_page: this.data.filters.per_page,
                sort: this.data.filters.sort,
                ...this.data.filters.language && { language: this.data.filters.language },
                ...this.data.filters.visibility && { visibility: this.data.filters.visibility },
                ...this.data.filters.search && { search: this.data.filters.search },
                ...this.data.filters.tags.length && { tags: this.data.filters.tags.join(',') }
            });

            const response = await this.app.apiClient.get(`/snippets?${params}`);
            
            if (response.success) {
                this.data.snippets = response.data;
                this.data.pagination = response.pagination;
                this.renderSnippets();
                this.renderPagination();
            }
        } catch (error) {
            console.error('Failed to load snippets:', error);
            this.app.showError('Failed to load snippets');
        } finally {
            this.isLoading = false;
            this.updateLoadingState();
        }
    }

    async loadLanguages() {
        try {
            const response = await this.app.apiClient.get('/snippets/languages');
            if (response.success) {
                this.data.languages = response.data;
            }
        } catch (error) {
            console.error('Failed to load languages:', error);
        }
    }

    async loadTags() {
        try {
            const response = await this.app.apiClient.get('/tags/popular');
            if (response.success) {
                this.data.tags = response.data;
            }
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.data.filters.search = e.target.value;
                    this.data.pagination.current_page = 1;
                    this.loadSnippets();
                }, 500);
            });
        }

        // Language filter
        const languageSelect = document.getElementById('language-filter');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.data.filters.language = e.target.value;
                this.data.pagination.current_page = 1;
                this.loadSnippets();
            });
        }

        // Visibility filter
        const visibilitySelect = document.getElementById('visibility-filter');
        if (visibilitySelect) {
            visibilitySelect.addEventListener('change', (e) => {
                this.data.filters.visibility = e.target.value;
                this.data.pagination.current_page = 1;
                this.loadSnippets();
            });
        }

        // Sort filter
        const sortSelect = document.getElementById('sort-filter');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.data.filters.sort = e.target.value;
                this.data.pagination.current_page = 1;
                this.loadSnippets();
            });
        }

        // Per page filter
        const perPageSelect = document.getElementById('per-page-filter');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.data.filters.per_page = parseInt(e.target.value);
                this.data.pagination.current_page = 1;
                this.loadSnippets();
            });
        }

        // Clear filters
        const clearButton = document.getElementById('clear-filters');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    clearFilters() {
        this.data.filters = {
            search: '',
            language: '',
            tags: [],
            visibility: '',
            sort: 'recent',
            per_page: 12
        };
        this.data.pagination.current_page = 1;

        // Reset form inputs
        document.getElementById('search-input').value = '';
        document.getElementById('language-filter').value = '';
        document.getElementById('visibility-filter').value = '';
        document.getElementById('sort-filter').value = 'recent';
        document.getElementById('per-page-filter').value = '12';

        this.loadSnippets();
    }

    render() {
        const container = document.createElement('div');
        container.className = 'snippets-page container mx-auto px-4 py-8';

        // Header
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-8';
        header.innerHTML = `
            <div>
                <h1 class="text-3xl font-bold text-white mb-2">Explore Snippets</h1>
                <p class="text-gray-400">Discover and browse code snippets from the community</p>
            </div>
            <button onclick="window.app.router.navigate('/editor')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                + Create Snippet
            </button>
        `;
        container.appendChild(header);

        // Filters Section
        const filtersSection = document.createElement('div');
        filtersSection.className = 'bg-gray-800 rounded-lg p-6 mb-8';
        filtersSection.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Search</label>
                    <div class="relative">
                        <input type="text" id="search-input" placeholder="Search snippets..." 
                               class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500">
                        <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Language</label>
                    <select id="language-filter" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                        <option value="">All Languages</option>
                        ${this.renderLanguageOptions()}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Visibility</label>
                    <select id="visibility-filter" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                        <option value="">All</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="organization">Organization</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                    <select id="sort-filter" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                        <option value="recent">Most Recent</option>
                        <option value="popular">Most Popular</option>
                        <option value="stars">Most Stars</option>
                        <option value="views">Most Views</option>
                        <option value="title">Title (A-Z)</option>
                    </select>
                </div>
            </div>
            
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <select id="per-page-filter" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-blue-500">
                        <option value="12">12 per page</option>
                        <option value="24">24 per page</option>
                        <option value="48">48 per page</option>
                    </select>
                    <button id="clear-filters" class="text-gray-400 hover:text-white text-sm transition-colors">
                        Clear Filters
                    </button>
                </div>
                <div class="text-sm text-gray-400">
                    ${this.renderResultCount()}
                </div>
            </div>
        `;
        container.appendChild(filtersSection);

        // Snippets Grid
        const snippetsGrid = document.createElement('div');
        snippetsGrid.id = 'snippets-grid';
        snippetsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8';
        container.appendChild(snippetsGrid);

        // Pagination
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        container.appendChild(paginationContainer);

        // Loading state
        const loadingContainer = document.createElement('div');
        loadingContainer.id = 'loading-container';
        loadingContainer.className = 'hidden';
        loadingContainer.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        `;
        container.appendChild(loadingContainer);

        // Initialize after DOM insertion
        setTimeout(() => this.init(), 0);

        return container;
    }

    renderLanguageOptions() {
        return this.data.languages.map(lang => 
            `<option value="${lang.language}">${lang.language} (${lang.count})</option>`
        ).join('');
    }

    renderResultCount() {
        const { current_page, per_page, total } = this.data.pagination;
        const start = (current_page - 1) * per_page + 1;
        const end = Math.min(current_page * per_page, total);
        
        return `Showing ${start}-${end} of ${total.toLocaleString()} snippets`;
    }

    renderSnippets() {
        const grid = document.getElementById('snippets-grid');
        if (!grid) return;

        if (this.data.snippets.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <h3 class="text-xl font-semibold text-white mb-2">No snippets found</h3>
                    <p class="text-gray-400 mb-6">Try adjusting your filters or create your first snippet</p>
                    <button onclick="window.app.router.navigate('/editor')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Create First Snippet
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.data.snippets.map(snippet => this.renderSnippetCard(snippet)).join('');
    }

    renderSnippetCard(snippet) {
        return `
            <div class="snippet-card bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer group"
                 onclick="window.app.router.navigate('/snippets/${snippet.id}')">
                <div class="mb-3">
                    <h3 class="text-white font-semibold text-lg mb-1 group-hover:text-blue-400 transition-colors">
                        ${this.escapeHtml(snippet.title)}
                    </h3>
                    <p class="text-gray-400 text-sm line-clamp-2">
                        ${this.escapeHtml(snippet.description || 'No description')}
                    </p>
                </div>
                
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <span class="inline-block px-2 py-1 bg-gray-600 rounded text-xs text-white">
                            ${this.escapeHtml(snippet.language)}
                        </span>
                        <span class="inline-block px-2 py-1 ${
                            snippet.visibility === 'public' ? 'bg-green-600' : 
                            snippet.visibility === 'private' ? 'bg-red-600' : 
                            'bg-blue-600'
                        } rounded text-xs text-white">
                            ${snippet.visibility}
                        </span>
                    </div>
                </div>
                
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <div class="flex items-center space-x-3">
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
                    </div>
                    <span>${new Date(snippet.created_at).toLocaleDateString()}</span>
                </div>
                
                <div class="mt-3 pt-3 border-t border-gray-700">
                    <div class="flex items-center">
                        <img src="${snippet.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(snippet.author_name)}&background=374151&color=f3f4f6`}" 
                             alt="${snippet.author_name}" 
                             class="w-5 h-5 rounded-full mr-2">
                        <span class="text-xs text-gray-400">${this.escapeHtml(snippet.author_name)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderPagination() {
        const container = document.getElementById('pagination-container');
        if (!container) return;

        const { current_page, last_page } = this.data.pagination;
        
        if (last_page <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagination = '<div class="flex items-center justify-center space-x-2">';
        
        // Previous button
        if (current_page > 1) {
            pagination += `
                <button onclick="window.snippetsPage.goToPage(${current_page - 1})" 
                        class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, current_page - 2);
        const endPage = Math.min(last_page, current_page + 2);

        if (startPage > 1) {
            pagination += `
                <button onclick="window.snippetsPage.goToPage(1)" 
                        class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">1</button>
            `;
            if (startPage > 2) {
                pagination += '<span class="px-3 py-2 text-gray-400">...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === current_page;
            pagination += `
                <button onclick="window.snippetsPage.goToPage(${i})" 
                        class="px-3 py-2 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'} rounded-lg transition-colors">
                    ${i}
                </button>
            `;
        }

        if (endPage < last_page) {
            if (endPage < last_page - 1) {
                pagination += '<span class="px-3 py-2 text-gray-400">...</span>';
            }
            pagination += `
                <button onclick="window.snippetsPage.goToPage(${last_page})" 
                        class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">${last_page}</button>
            `;
        }

        // Next button
        if (current_page < last_page) {
            pagination += `
                <button onclick="window.snippetsPage.goToPage(${current_page + 1})" 
                        class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            `;
        }

        pagination += '</div>';
        container.innerHTML = pagination;
    }

    goToPage(page) {
        this.data.pagination.current_page = page;
        this.loadSnippets();
        window.scrollTo(0, 0);
    }

    updateLoadingState() {
        const grid = document.getElementById('snippets-grid');
        const loading = document.getElementById('loading-container');
        
        if (this.isLoading) {
            if (grid) grid.classList.add('hidden');
            if (loading) loading.classList.remove('hidden');
        } else {
            if (grid) grid.classList.remove('hidden');
            if (loading) loading.classList.add('hidden');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make instance globally accessible for pagination handlers
window.snippetsPage = null;