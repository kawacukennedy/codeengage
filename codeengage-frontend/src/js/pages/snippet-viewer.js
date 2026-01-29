/**
 * Snippet Viewer Page Module
 * 
 * Displays proper snippet details with syntax highlighting, version history, and interactive features.
 */

export class SnippetViewer {
    constructor(app, snippetId) {
        this.app = app;
        this.snippetId = snippetId;
        this.snippet = null;
        this.currentVersion = null;
        this.isLoading = false;
    }

    /**
     * Initialize the viewer
     */
    async init() {
        if (!this.snippetId) {
            this.app.showError('No snippet ID provided');
            this.app.router.navigate('/snippets');
            return;
        }

        await this.loadSnippet(this.snippetId);
        this.render(); // Initial render with full structure
        if (this.snippet) {
            this.renderSnippetContent(); // Populate dynamic content
            this.setupEventListeners();
        }
    }

    async loadSnippet(id) {
        try {
            const response = await this.app.apiClient.get(`/snippets/${id}`);
            if (response.success) {
                this.snippet = response.data;
                this.currentVersion = (this.snippet.versions && this.snippet.versions[0]) || null;
            } else {
                throw new Error(response.message || 'Snippet not found');
            }
        } catch (error) {
            console.error('Failed to load snippet:', error);
            this.app.showError('Failed to load snippet');
            this.app.router.navigate('/snippets');
        }
    }

    async loadVersion(versionId) {
        try {
            const response = await this.app.apiClient.get(`/snippets/${this.snippetId}/versions/${versionId}`);
            if (response.success) {
                this.currentVersion = response.data;
                this.renderCode();
                this.updateVersionSelector(versionId);
            }
        } catch (error) {
            this.app.showError('Failed to load version');
        }
    }

    render() {
        const container = document.getElementById('app');
        if (!container) return;

        container.innerHTML = `
            <div class="snippet-viewer-page">
                <div class="container mx-auto px-4 py-8">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center space-x-4">
                            <button id="back-btn" class="text-gray-400 hover:text-white transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <div>
                                <h1 id="snippetTitle" class="text-2xl font-bold text-white mb-2">Loading...</h1>
                                <div id="snippetMeta" class="flex items-center space-x-4 text-sm text-gray-400">
                                    <!-- Meta injected here -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-3 action-buttons">
                            <!-- Actions injected here -->
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <!-- Code Section -->
                        <div class="lg:col-span-3">
                            <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
                                <div class="bg-gray-700 px-4 py-2 flex items-center justify-between border-b border-gray-600">
                                    <div class="flex items-center space-x-4" id="codeHeader">
                                        <!-- Language info -->
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <button id="copyCodeBtn" class="text-gray-300 hover:text-white px-3 py-1 text-sm rounded hover:bg-gray-600 transition-colors">
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                <div id="snippetCode" class="overflow-x-auto custom-scrollbar">
                                    <!-- Code injected here -->
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="lg:col-span-1 space-y-6">
                            <!-- Info Card -->
                            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 class="text-lg font-semibold text-white mb-4">Details</h3>
                                <div id="sidebarContent" class="space-y-4">
                                    <!-- Sidebar details -->
                                </div>
                            </div>
                            
                            <!-- Versions Card -->
                             <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 class="text-lg font-semibold text-white mb-4">History</h3>
                                <div id="versionsList" class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    <!-- Versions list -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('back-btn').addEventListener('click', () => {
            this.app.router.navigate('/snippets');
        });
    }

    renderSnippetContent() {
        if (!this.snippet) return;

        // Title & Meta
        document.getElementById('snippetTitle').textContent = this.snippet.title;
        document.getElementById('snippetMeta').innerHTML = `
            <span class="bg-gray-700 px-2 py-1 rounded text-xs">${this.escapeHtml(this.snippet.visibility)}</span>
            <span>By ${this.escapeHtml(this.snippet.author?.username || 'Unknown')}</span>
            <span>${this.formatDate(this.snippet.created_at)}</span>
        `;

        // Actions
        const actionsContainer = document.querySelector('.action-buttons');
        actionsContainer.innerHTML = `
            ${this.app.auth.user && this.app.auth.user.id !== this.snippet.user_id ? `
                <button id="starBtn" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
                    <span class="mr-2">⭐</span> Star (${this.snippet.star_count || 0})
                </button>
                <button id="forkBtn" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
                    <span class="mr-2">🍴</span> Fork
                </button>
            ` : ''}
            ${this.app.auth.user && this.app.auth.user.id === this.snippet.user_id ? `
                <button id="editBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Edit
                </button>
            ` : ''}
        `;

        // Code Header
        document.getElementById('codeHeader').innerHTML = `
            <span class="font-mono text-sm text-green-400">${this.snippet.language}</span>
            <span class="text-xs text-gray-500">Version ${this.currentVersion?.version_number || 1}</span>
        `;

        // Sidebar
        document.getElementById('sidebarContent').innerHTML = `
            <div>
                <label class="text-xs text-gray-500 uppercase tracking-wide">Description</label>
                <p class="text-sm text-gray-300 mt-1">${this.escapeHtml(this.snippet.description || 'No description')}</p>
            </div>
             <div>
                <label class="text-xs text-gray-500 uppercase tracking-wide">Tags</label>
                <div class="flex flex-wrap gap-2 mt-2">
                    ${(this.snippet.tags || []).map(tag => `
                        <span class="px-2 py-1 bg-blue-900 bg-opacity-30 text-blue-300 text-xs rounded-full border border-blue-800">
                            ${this.escapeHtml(tag.name)}
                        </span>
                    `).join('')}
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <div class="text-center">
                    <span class="block text-2xl font-bold text-white">${this.snippet.view_count || 0}</span>
                    <span class="text-xs text-gray-500">Views</span>
                </div>
                 <div class="text-center">
                    <span class="block text-2xl font-bold text-white">${this.snippet.star_count || 0}</span>
                    <span class="text-xs text-gray-500">Stars</span>
                </div>
            </div>
        `;

        // Versions
        this.renderVersionsList();

        // Check star status
        this.checkStarStatus();

        // Render code
        this.renderCode();
    }

    renderCode() {
        const codeElement = document.getElementById('snippetCode');
        const code = this.currentVersion?.code || this.snippet.code || '';

        // Simple highlighting wrapper
        codeElement.innerHTML = `
            <pre class="p-4 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto"><code>${this.highlightSyntax(code)}</code></pre>
        `;
    }

    renderVersionsList() {
        const list = document.getElementById('versionsList');
        if (!this.snippet.versions) {
            list.innerHTML = '<p class="text-gray-500 text-sm">No version history</p>';
            return;
        }

        list.innerHTML = this.snippet.versions.map(v => `
            <div class="version-item p-3 rounded cursor-pointer transition-colors ${this.currentVersion && this.currentVersion.id === v.id ? 'bg-blue-900 bg-opacity-20 border border-blue-800' : 'hover:bg-gray-700'}"
                 data-version-id="${v.id}">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-white">v${v.version_number}</span>
                    <span class="text-xs text-gray-500">${this.formatDate(v.created_at)}</span>
                </div>
                ${v.change_summary ? `<p class="text-xs text-gray-400 mt-1 truncate">${this.escapeHtml(v.change_summary)}</p>` : ''}
            </div>
        `).join('');

        list.querySelectorAll('.version-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadVersion(item.dataset.versionId);
            });
        });
    }

    updateVersionSelector(versionId) {
        // Re-render list to update active state
        this.renderVersionsList();
    }

    setupEventListeners() {
        const starBtn = document.getElementById('starBtn');
        if (starBtn) starBtn.addEventListener('click', () => this.toggleStar());

        const forkBtn = document.getElementById('forkBtn');
        if (forkBtn) forkBtn.addEventListener('click', () => this.forkSnippet());

        const editBtn = document.getElementById('editBtn');
        if (editBtn) editBtn.addEventListener('click', () => {
            this.app.router.navigate(`/editor/${this.snippetId}`);
        });

        const copyBtn = document.getElementById('copyCodeBtn');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            const code = this.currentVersion?.code || this.snippet.code || '';
            navigator.clipboard.writeText(code);
            this.app.showSuccess('Code copied to clipboard');
        });
    }

    async toggleStar() {
        try {
            await this.app.apiClient.post(`/snippets/${this.snippetId}/star`);
            this.app.showSuccess('Star updated');
            // Optimistic update
            // Ideally re-fetch or toggle state
            this.loadSnippet(this.snippetId); // Reload to get new count
        } catch (error) {
            console.error('Star error', error);
        }
    }

    async forkSnippet() {
        if (!confirm('Fork this snippet?')) return;
        try {
            const res = await this.app.apiClient.post(`/snippets/${this.snippetId}/fork`, { title: `Fork of ${this.snippet.title}` });
            if (res.success) {
                this.app.showSuccess('Snippet forked successfully');
                this.app.router.navigate(`/editor/${res.data.id}`);
            }
        } catch (error) {
            this.app.showError('Failed to fork snippet');
        }
    }

    async checkStarStatus() {
        // In a real app, we might check if user already starred it
        // For now, we rely on the button action
    }

    // Utils
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    }

    highlightSyntax(code) {
        // Basic replacement for demo - in prod use Prism/HLJS
        return this.escapeHtml(code)
            .replace(/const|let|var|function|class|import|export|return/g, '<span class="text-purple-400">$&</span>')
            .replace(/\/\/.*/g, '<span class="text-gray-500">$&</span>');
    }
}

export default SnippetViewer;