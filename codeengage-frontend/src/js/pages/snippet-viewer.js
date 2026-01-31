/**
 * Snippet Viewer Page Module
 * 
 * Displays proper snippet details with syntax highlighting, version history, and interactive features.
 */

import seoManager from '../modules/utils/seo-manager.js';
import CollaborativeEditor from '../modules/components/collaborative-editor.js';


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

                // Load additional data
                this.loadAnalysis(id);
                this.loadRelated(id);
                this.loadComments(id);

                // Update SEO
                seoManager.update({
                    title: this.snippet.title,
                    description: this.snippet.description || `Check out this ${this.snippet.language} snippet on CodeEngage.`,
                    author: this.snippet.author?.username,
                    keywords: `code, snippet, ${this.snippet.language}, ${this.snippet.tags?.map(t => t.name).join(', ') || ''}`,
                    type: 'article',
                    structuredData: {
                        "@context": "https://schema.org",
                        "@type": "SoftwareSourceCode",
                        "name": this.snippet.title,
                        "programmingLanguage": this.snippet.language,
                        "author": {
                            "@type": "Person",
                            "name": this.snippet.author?.username
                        },
                        "text": this.snippet.code,
                        "dateCreated": this.snippet.created_at,
                        "dateModified": this.snippet.updated_at,
                        "description": this.snippet.description
                    }
                });
            } else {
                throw new Error(response.message || 'Snippet not found');
            }
        } catch (error) {
            console.error('Failed to load snippet:', error);
            this.app.showError('Failed to load snippet');
            this.app.router.navigate('/snippets');
        }
    }

    async loadAnalysis(id) {
        try {
            const res = await this.app.apiClient.get(`/snippets/${id}/analyses`);
            if (res.success && res.data.length > 0) {
                // Use the latest analysis
                this.analysis = res.data[0];
                this.renderAnalysis();
            }
        } catch (err) {
            console.log('Failed to load analysis', err);
        }
    }

    async loadRelated(id) {
        try {
            const res = await this.app.apiClient.get(`/snippets/${id}/related`);
            if (res.success) {
                this.relatedSnippets = res.data;
                this.renderRelated();
            }
        } catch (err) {
            console.log('Failed to load related', err);
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
                                <div id="diffView" class="hidden overflow-x-auto custom-scrollbar bg-gray-900/50 p-4"></div>
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
                                <div id="timelineContainer" class="mb-4 hidden">
                                    <label class="text-xs text-gray-400 block mb-1">Version Timeline</label>
                                    <input type="range" id="versionSlider" min="0" max="0" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer">
                                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                                        <span id="timelineStart">v1</span>
                                        <span id="timelineEnd">vLatest</span>
                                    </div>
                                </div>
                                <div id="versionsList" class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    <!-- Versions list -->
                                </div>
                                <button id="diffToggleBtn" class="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-sm text-white px-3 py-2 rounded transition-colors hidden">
                                    Compare with Previous
                                </button>
                            </div>

                            <!-- Related Graph -->
                            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 hidden" id="graphCard">
                                <h3 class="text-lg font-semibold text-white mb-4">Snippet Network</h3>
                                <div id="networkGraph" class="h-48 bg-gray-900 rounded border border-gray-700"></div>
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
            
            <div class="relative group">
                <button class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
                    <span>Export</span>
                    <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 hidden group-hover:block z-50">
                    <a href="/api/export/snippet/${this.snippet.id}?format=json" target="_blank" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white first:rounded-t-lg">JSON</a>
                    <a href="/api/export/snippet/${this.snippet.id}?format=markdown" target="_blank" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">Markdown</a>
                    <a href="/api/export/snippet/${this.snippet.id}?format=vscode" target="_blank" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">VS Code Snippet</a>
                    <a href="/api/export/snippet/${this.snippet.id}?format=jetbrains" target="_blank" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">JetBrains Template</a>
                    <a href="/api/export/snippet/${this.snippet.id}?format=html" target="_blank" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">HTML Embed</a>
                    <div class="border-t border-gray-700 my-1"></div>
                    <button class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white" onclick="window.app.currentPage.syncToGist()">
                        Sync to GitHub Gist
                    </button>
                    ${this.app.auth.user && this.app.auth.user.id === this.snippet.author_id ? `
                        <button class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 last:rounded-b-lg transition-colors" onclick="window.app.currentPage.transferOwnership()">
                            Transfer Ownership
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Code Header
        document.getElementById('codeHeader').innerHTML = `
            <span class="font-mono text-sm text-neon-blue">${this.snippet.language}</span>
            <span class="text-xs text-gray-500">Version ${this.currentVersion?.version_number || 1}</span>
        `;

        // Sidebar
        document.getElementById('sidebarContent').innerHTML = `
            < div >
                <label class="text-xs text-gray-500 uppercase tracking-wide">Description</label>
                <p class="text-sm text-gray-300 mt-1">${this.escapeHtml(this.snippet.description || 'No description')}</p>
            </div >
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
            
            <!--Analysis Section Placeholder-- >
            <div id="analysisSection" class="hidden pt-4 border-t border-gray-700">
                 <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Code Analysis</label>
                 <div id="analysisContent" class="space-y-2"></div>
            </div>

            <!--Related Section Placeholder-- >
            <div id="relatedSection" class="hidden pt-4 border-t border-gray-700">
                 <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Related</label>
                 <div id="relatedContent" class="space-y-2"></div>
            </div>

            <!--Comments Section-- >
            <div id="commentsSection" class="pt-4 border-t border-gray-700">
                <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Comments</label>
                <div id="commentsList" class="space-y-3 mb-3"></div>
                ${this.app.auth.user ? `
                    <form id="commentForm" class="flex flex-col gap-2">
                        <textarea id="commentInput" rows="2" class="w-full bg-gray-800 text-sm text-white rounded border border-gray-700 p-2 focus:border-neon-blue focus:outline-none resize-none" placeholder="Write a comment..."></textarea>
                        <button type="submit" class="self-end px-3 py-1 bg-neon-blue/20 text-neon-blue text-xs font-bold rounded hover:bg-neon-blue/30 transition-colors">Post</button>
                    </form>
                 ` : '<p class="text-xs text-gray-500">Log in to comment</p>'}
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

        // Clear previous content
        codeElement.innerHTML = '';
        codeElement.className = 'h-96 w-full'; // Ensure height

        // Initialize editor in read-only mode
        this.editor = new CollaborativeEditor(codeElement, {
            value: code,
            language: this.snippet.language,
            readOnly: true,
            theme: localStorage.getItem('editor-theme') || 'dracula',
            lineNumbers: true
        });
    }

    renderVersionsList() {
        const list = document.getElementById('versionsList');
        if (!this.snippet.versions) {
            list.innerHTML = '<p class="text-gray-500 text-sm">No version history</p>';
            return;
        }

        list.innerHTML = this.snippet.versions.map(v => `
            <div class="version-item p-3 rounded-xl cursor-pointer transition-all border border-transparent ${this.currentVersion && this.currentVersion.id === v.id ? 'bg-neon-blue/10 border-neon-blue' : 'hover:bg-gray-700/50'}"
                data-version-id="${v.id}">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-bold text-white">Version ${v.version_number}</span>
                    <span class="text-[10px] text-gray-500">${this.formatDate(v.created_at)}</span>
                </div>
                ${v.change_summary ? `<p class="text-xs text-gray-400 truncate">${this.escapeHtml(v.change_summary)}</p>` : ''}
                ${this.app.auth.user && this.app.auth.user.id === this.snippet.author_id && this.currentVersion && this.currentVersion.id !== v.id ? `
                    <button class="mt-2 text-[10px] text-neon-blue hover:underline font-bold" onclick="window.app.currentPage.rollbackToVersion(${v.version_number}, event)">
                        Rollback to this version
                    </button>
                ` : ''}
            </div>
        `).join('');

        list.querySelectorAll('.version-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadVersion(item.dataset.versionId);
            });
        });

        // Setup Timeline Slider
        const slider = document.getElementById('versionSlider');
        const timelineContainer = document.getElementById('timelineContainer');
        if (slider && this.snippet.versions && this.snippet.versions.length > 1) {
            timelineContainer.classList.remove('hidden');
            const maxVer = Math.max(...this.snippet.versions.map(v => v.version_number));
            const minVer = Math.min(...this.snippet.versions.map(v => v.version_number));
            slider.min = minVer;
            slider.max = maxVer;
            slider.value = this.currentVersion ? this.currentVersion.version_number : maxVer;

            document.getElementById('timelineStart').textContent = `v${minVer}`;
            document.getElementById('timelineEnd').textContent = `v${maxVer}`;
        }
    }

    updateVersionSelector(versionId) {
        // Re-render list to update active state
        this.renderVersionsList();

        // Update slider value
        const slider = document.getElementById('versionSlider');
        if (slider && this.snippet.versions && this.currentVersion) {
            slider.value = this.currentVersion.version_number;
        }

        // Show/Hide Diff Button
        const diffBtn = document.getElementById('diffToggleBtn');
        if (diffBtn && this.snippet.versions && this.snippet.versions.length > 1) {
            diffBtn.classList.remove('hidden');
        }
    }

    renderAnalysis() {
        if (!this.analysis) return;
        const section = document.getElementById('analysisSection');
        const content = document.getElementById('analysisContent');
        section.classList.remove('hidden');

        const results = JSON.parse(this.analysis.results_json || '{}');
        const complexity = results.complexity || 'N/A';
        const issues = results.issues || [];

        let healthColor = 'text-green-400';
        if (issues.length > 2) healthColor = 'text-red-400';
        else if (issues.length > 0) healthColor = 'text-yellow-400';

        content.innerHTML = `
            <div class="flex justify-between text-sm">
                <span class="text-gray-400">Complexity</span>
                <span class="text-white">${complexity}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-gray-400">Issues</span>
                <span class="${healthColor}">${issues.length} Found</span>
            </div>
            ${issues.length > 0 ? `
                <div class="mt-2 p-2 bg-gray-900/50 rounded text-xs text-gray-400">
                    ${issues.slice(0, 2).map(i => `<div class="truncate">• ${this.escapeHtml(i.message || i)}</div>`).join('')}
                </div>
            ` : ''}
        `;
    }

    renderRelated() {
        if (!this.relatedSnippets || !this.relatedSnippets.length) return;
        const section = document.getElementById('relatedSection');
        const content = document.getElementById('relatedContent');
        section.classList.remove('hidden');

        content.innerHTML = this.relatedSnippets.slice(0, 3).map(s => `
            <a href="/snippet/${s.id}" class="block p-2 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors">
                <p class="text-sm text-white truncate">${this.escapeHtml(s.title)}</p>
                <div class="flex justify-between items-center text-xs text-gray-500 mt-1">
                    <span>${this.escapeHtml(s.language)}</span>
                    <span class="flex items-center"><i class="mr-1">⭐</i>${s.star_count}</span>
                </div>
            </a>
        `).join('');

        if (window.vis && typeof window.vis !== 'undefined') {
            this.renderNetworkGraph();
        }
    }

    renderNetworkGraph() {
        if (!this.relatedSnippets || !this.relatedSnippets.length) return;

        const graphCard = document.getElementById('graphCard');
        if (graphCard) graphCard.classList.remove('hidden');

        const container = document.getElementById('networkGraph');
        if (!container) return;

        const nodes = new vis.DataSet([
            { id: this.snippet.id, label: 'Current', color: '#7000FF', font: { color: 'white' } },
            ...this.relatedSnippets.map(s => ({
                id: s.id,
                label: s.title.substring(0, 15) + '...',
                color: '#00F0FF',
                shape: 'box'
            }))
        ]);

        const edges = new vis.DataSet(
            this.relatedSnippets.map(s => ({ from: this.snippet.id, to: s.id }))
        );

        const data = { nodes, edges };
        const options = {
            nodes: {
                borderWidth: 1,
                size: 30,
                color: {
                    border: '#ffffff',
                    background: '#0B0F19'
                },
                font: { color: '#cccccc' }
            },
            edges: {
                color: 'rgba(255,255,255,0.2)',
                smooth: { type: 'continuous' }
            },
            physics: {
                stabilization: false,
                barnesHut: {
                    gravitationalConstant: -2000,
                    springConstant: 0.04
                }
            },
            interaction: {
                dragNodes: false,
                zoomView: false,
                dragView: false
            }
        };

        new vis.Network(container, data, options);
    }

    async loadComments(id) {
        try {
            const res = await this.app.apiClient.get(`/ snippets / ${id}/comments`);
            if (res.success) {
                this.renderComments(res.data);
            }
        } catch (err) {
            console.error('Failed to load comments', err);
        }
    }

    renderComments(comments) {
        const list = document.getElementById('commentsList');
        if (!list) return;

        if (!comments.length) {
            list.innerHTML = '<p class="text-xs text-gray-500 italic">No comments yet</p>';
            return;
        }

        list.innerHTML = comments.map(c => `
            <div class="group">
                <div class="flex items-center gap-2 mb-1">
                    <img src="${this.escapeHtml(c.user?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (c.user?.username || 'U'))}" class="w-4 h-4 rounded-full">
                    <span class="text-xs font-bold text-gray-300">${this.escapeHtml(c.user?.username || 'Unknown')}</span>
                    <span class="text-[10px] text-gray-500">${this.formatDate(c.created_at)}</span>
                    ${this.app.auth.user && (this.app.auth.user.id === c.user_id || this.app.auth.user.role === 'admin') ? `
                        <button class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" onclick="window.app.currentPage.deleteComment(${c.id})">
                            <i class="ph ph-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <p class="text-xs text-gray-400 leading-relaxed">${this.escapeHtml(c.content)}</p>
            </div>
        `).join('');
    }

    async postComment(e) {
        e.preventDefault();
        const input = document.getElementById('commentInput');
        const content = input.value.trim();
        if (!content) return;

        try {
            const res = await this.app.apiClient.post(`/snippets/${this.snippetId}/comments`, { content });
            if (res.success) {
                input.value = '';
                this.loadComments(this.snippetId); // Reload
            }
        } catch (error) {
            this.app.showError('Failed to post comment');
        }
    }

    async deleteComment(id) {
        if (!confirm('Delete comment?')) return;
        try {
            const res = await this.app.apiClient.delete(`/comments/${id}`);
            if (res.success) {
                this.loadComments(this.snippetId);
            }
        } catch (error) {
            this.app.showError('Failed to delete comment');
        }
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

        const commentForm = document.getElementById('commentForm');
        if (commentForm) commentForm.addEventListener('submit', (e) => this.postComment(e));

        const slider = document.getElementById('versionSlider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                const verNum = parseInt(e.target.value);
                const version = this.snippet.versions.find(v => v.version_number === verNum);
                if (version) {
                    this.loadVersion(version.id);
                }
            });
        }

        const diffBtn = document.getElementById('diffToggleBtn');
        if (diffBtn) diffBtn.addEventListener('click', () => this.toggleDiff());
    }

    async toggleDiff() {
        const diffView = document.getElementById('diffView');
        const snippetCode = document.getElementById('snippetCode');
        const diffBtn = document.getElementById('diffToggleBtn');

        if (!diffView.classList.contains('hidden')) {
            diffView.classList.add('hidden');
            snippetCode.classList.remove('hidden');
            diffBtn.textContent = 'Compare with Previous';
            return;
        }

        // Find previous version
        const versions = this.snippet.versions;
        const index = versions.findIndex(v => v.id === this.currentVersion.id);
        const prevVersion = versions[index + 1]; // Sorted by latest first

        if (!prevVersion) {
            this.app.showError('No previous version to compare');
            return;
        }

        diffView.classList.remove('hidden');
        snippetCode.classList.add('hidden');
        diffBtn.textContent = 'Hide Comparison';

        // simple line-by-line diff
        const oldLines = prevVersion.code.split('\n');
        const newLines = this.currentVersion.code.split('\n');

        let diffHtml = '<div class="grid grid-cols-2 gap-4 font-mono text-xs">';
        diffHtml += '<div class="text-gray-500 uppercase mb-2">Version ' + prevVersion.version_number + '</div>';
        diffHtml += '<div class="text-gray-500 uppercase mb-2">Version ' + this.currentVersion.version_number + '</div>';

        const maxLines = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';

            const isDifferent = oldLine !== newLine;
            const bgClass = isDifferent ? 'bg-neon-blue/5' : '';

            diffHtml += `<div class="${bgClass} px-2 ${oldLine === '' && i >= oldLines.length ? 'opacity-0' : ''}">${this.escapeHtml(oldLine)}</div>`;
            diffHtml += `<div class="${bgClass} px-2 ${newLine === '' && i >= newLines.length ? 'opacity-0' : ''}">${this.escapeHtml(newLine)}</div>`;
        }
        diffHtml += '</div>';
        diffView.innerHTML = diffHtml;
    }

    async rollbackToVersion(versionNumber, event) {
        if (event) event.stopPropagation();
        if (!confirm(`Rollback to version ${versionNumber}? This will create a new version.`)) {
            return;
        }

        try {
            await this.app.apiClient.post(`/snippets/${this.snippetId}/rollback`, { version: versionNumber });
            this.app.showSuccess('Snippet rolled back');
            await this.loadSnippet(this.snippetId);
            this.render();
            this.renderSnippetContent();
        } catch (error) {
            this.app.showError('Failed to rollback');
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

    async syncToGist() {
        const token = prompt('Enter your GitHub Personal Access Token (repo/gist scope required):');
        if (!token) return;

        try {
            this.app.showInfo('Syncing to Gist...');
            const res = await this.app.apiClient.post(`/export/gist/${this.snippetId}`, { token });
            if (res.success) {
                this.app.showSuccess('Gist created successfully!');
                window.open(res.data.url, '_blank');
            } else {
                this.app.showError(res.message || 'Failed to sync to Gist');
            }
        } catch (error) {
            this.app.showError('Failed to sync to Gist');
        }
    }

    async transferOwnership() {
        const newOwnerUsername = prompt('Enter the username of the new owner:');
        if (!newOwnerUsername) return;

        if (!confirm(`Are you sure you want to transfer ownership to ${newOwnerUsername}? This cannot be undone.`)) return;

        try {
            // First find user by username to get ID (or just send username if backend supports it)
            // Assuming backend needs ID as per snippet-controller.php
            const userRes = await this.app.apiClient.get(`/users/search?query=${newOwnerUsername}`);
            const targetUser = userRes.data.find(u => u.username.toLowerCase() === newOwnerUsername.toLowerCase());

            if (!targetUser) {
                this.app.showError('User not found');
                return;
            }

            const res = await this.app.apiClient.post(`/snippets/${this.snippetId}/transfer`, { new_owner_id: targetUser.id });
            if (res.success) {
                this.app.showSuccess('Ownership transferred successfully');
                this.app.router.navigate('/dashboard');
            }
        } catch (error) {
            this.app.showError('Failed to transfer ownership');
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
        return this.escapeHtml(code);
    }
}

export default SnippetViewer;