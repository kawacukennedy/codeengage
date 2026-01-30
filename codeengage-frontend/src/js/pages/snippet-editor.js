import Navigation from '../modules/components/navigation.js';
import CollaborativeEditor from '../modules/components/collaborative-editor.js?v=2.1';

export default class SnippetEditor {
    constructor(app, snippetId = null) {
        this.app = app;
        this.snippetId = snippetId;
        this.nav = new Navigation('/new'); // Defaults to new, but updated if edit

        if (snippetId) {
            // Extract base path for nav highlighting compatibility
            this.nav.activeRoute = '/snippets'; // If editing, highlight snippets or just nothing specific
        }

        // Expose instance for inline event handlers (like tag removal)
        window.snippetEditor = this;

        this.data = {
            snippet: null,
            languages: [],
            tags: [],
            isCollaborating: false,
            sessionToken: null,
            participants: []
        };
        this.editor = null;
        this.hasUnsavedChanges = false;
        this.autosaveInterval = null;
        this.isSaving = false;
    }

    async init() {
        this.render(); // Ensure DOM is ready
        await this.loadLanguages();
        await this.loadTags();

        if (this.snippetId) {
            await this.loadSnippet();

            // Check for join token
            const urlParams = new URLSearchParams(window.location.search);
            const joinToken = urlParams.get('join_token');
            if (joinToken) {
                await this.joinSession(joinToken);
            }
        }
    }

    async joinSession(token) {
        // Guest flow
        try {
            // Validate/Join via API already done in app.js? 
            // app.js called join_invite, which adds user to session.
            // But CollaborativeEditor needs to connect (poll).

            // We need to tell the editor to start collaborating with this token.
            // But startCollaboration() currently creates a new session.
            // We need a way to "connect" to existing session.

            this.data.isCollaborating = true;
            this.data.sessionToken = token; // Store regarding

            // Wait for editor to be ready then connect
            const checkEditor = setInterval(() => {
                if (this.editor) {
                    clearInterval(checkEditor);
                    this.editor.sessionToken = token;
                    this.editor.isCollaborating = true;
                    this.editor.pollUpdates();
                    this.editor.sendCursorPosition();
                    this.updateCollaborationUI();
                    window.app.showSuccess('Connected to collaboration session');
                }
            }, 100);

        } catch (error) {
            console.error('Failed to auto-join:', error);
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

    async loadSnippet() {
        try {
            const response = await this.app.apiClient.get(`/snippets/${this.snippetId}`);
            if (response.success) {
                this.data.snippet = response.data;
                this.populateForm();
            }
        } catch (error) {
            console.error('Failed to load snippet:', error);
            this.app.showError('Failed to load snippet');
        }
    }

    setupEditor() {
        const editorContainer = document.getElementById('code-editor');
        if (!editorContainer) return;

        // Initialize Collaborative Editor
        this.editor = new CollaborativeEditor(editorContainer, {
            value: this.data.snippet?.code || '',
            mode: this.getLanguageMode(this.data.snippet?.language || 'javascript'),
            snippetId: this.snippetId,
            collaborate: this.data.isCollaborating,
            theme: 'dracula', // Default
            lineNumbers: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            matchBrackets: true,
            onSave: () => this.saveSnippet(),
            onRun: () => this.runAnalysis(),
            onReady: (editorInstance) => {
                // Track changes once editor is ready
                editorInstance.editor.on('change', () => {
                    this.hasUnsavedChanges = true;
                    this.updateSaveButton();
                });
            }
        });
    }

    setupEventListeners() {
        // Form inputs
        const titleInput = document.getElementById('snippet-title');
        const descriptionInput = document.getElementById('snippet-description');
        const languageSelect = document.getElementById('snippet-language');
        const visibilitySelect = document.getElementById('snippet-visibility');
        const tagsInput = document.getElementById('snippet-tags');

        // Editor Toolbar
        const themeSelect = document.getElementById('editor-theme');
        const fontSizeSelect = document.getElementById('editor-font-size');
        const focusModeBtn = document.getElementById('editor-focus-mode');

        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => this.updateTheme(e.target.value));
        }

        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => this.updateFontSize(e.target.value));
        }

        if (focusModeBtn) {
            focusModeBtn.addEventListener('click', () => this.toggleFocusMode());
        }

        const previewBtn = document.getElementById('editor-preview');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.toggleMarkdownPreview());
        }

        titleInput.addEventListener('input', () => {
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
        });

        if (descriptionInput) {
            descriptionInput.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                this.updateSaveButton();
            });
        }

        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.updateEditorLanguage(e.target.value);
                this.hasUnsavedChanges = true;
                this.updateSaveButton();
            });
        }

        if (visibilitySelect) {
            visibilitySelect.addEventListener('change', () => {
                this.hasUnsavedChanges = true;
                this.updateSaveButton();
            });
        }

        if (tagsInput) {
            this.setupTagsInput(tagsInput);
        }

        // Save button
        const saveButton = document.getElementById('save-button');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveSnippet());
        }

        // Save and close button
        const saveCloseButton = document.getElementById('save-close-button');
        if (saveCloseButton) {
            saveCloseButton.addEventListener('click', () => this.saveAndClose());
        }

        // Cancel button
        const cancelButton = document.getElementById('cancel-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.handleCancel());
        }

        // Collaboration toggle
        const collabButton = document.getElementById('collaboration-button');
        if (collabButton) {
            collabButton.addEventListener('click', () => this.toggleCollaboration());
        }

        // Export buttons
        const exportButtons = document.querySelectorAll('[data-export-format]');
        exportButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.exportSnippet(e.target.dataset.exportFormat);
            });
        });

        // Analysis button
        const analysisButton = document.getElementById('analysis-button');
        if (analysisButton) {
            analysisButton.addEventListener('click', () => this.runAnalysis());
        }

        // Prevent accidental navigation
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    setupTagsInput(input) {
        let currentTags = this.data.snippet?.tags || [];

        // Create tag suggestions
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'tag-suggestions hidden absolute bg-gray-700 border border-gray-600 rounded-lg mt-1 w-full z-10';
        input.parentNode.appendChild(suggestionsContainer);

        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const lastTag = value.split(',').pop().trim();

            if (lastTag.length > 0) {
                this.showTagSuggestions(lastTag, suggestionsContainer);
            } else {
                suggestionsContainer.classList.add('hidden');
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                this.addTagFromInput(input);
            }
        });

        // Display existing tags
        this.displayTags(currentTags);
    }

    showTagSuggestions(query, container) {
        const suggestions = this.data.tags.filter(tag =>
            tag.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        if (suggestions.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = suggestions.map(tag => `
            <div class="tag-suggestion px-3 py-2 hover:bg-gray-600 cursor-pointer text-white text-sm"
                onclick="window.snippetEditor.addTag('${tag.name}')">
                ${tag.name} <span class="text-gray-400">(${tag.usage_count})</span>
            </div>
        `).join('');

        container.classList.remove('hidden');
    }

    addTag(tagName) {
        const input = document.getElementById('snippet-tags');
        const currentTags = this.getCurrentTags();

        if (!currentTags.includes(tagName)) {
            currentTags.push(tagName);
            input.value = currentTags.join(', ');
            this.displayTags(currentTags);
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
        }

        // Hide suggestions
        const suggestionsContainer = input.parentNode.querySelector('.tag-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
        }
    }

    addTagFromInput(input) {
        const value = input.value;
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        if (tags.length > 0) {
            this.displayTags(tags);
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
        }
    }

    getCurrentTags() {
        const input = document.getElementById('snippet-tags');
        return input.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    displayTags(tags) {
        const container = document.getElementById('tags-display');
        if (!container) return;

        container.innerHTML = tags.map(tag => `
            <span class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-sm rounded mr-2 mb-2">
                ${this.escapeHtml(tag)}
                <button onclick="window.snippetEditor.removeTag('${tag}')"
                    class="ml-2 text-blue-200 hover:text-white">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </span>
        `).join('');
    }

    removeTag(tagName) {
        const input = document.getElementById('snippet-tags');
        const currentTags = this.getCurrentTags();
        const newTags = currentTags.filter(tag => tag !== tagName);

        input.value = newTags.join(', ');
        this.displayTags(newTags);
        this.hasUnsavedChanges = true;
        this.updateSaveButton();
    }

    populateForm() {
        if (!this.data.snippet) return;

        document.getElementById('snippet-title').value = this.data.snippet.title || '';
        document.getElementById('snippet-description').value = this.data.snippet.description || '';
        document.getElementById('snippet-language').value = this.data.snippet.language || 'javascript';
        document.getElementById('snippet-visibility').value = this.data.snippet.visibility || 'public';
        document.getElementById('snippet-tags').value = this.data.snippet.tags?.map(tag => tag.name).join(', ') || '';

        this.displayTags(this.data.snippet.tags?.map(tag => tag.name) || []);

        if (this.editor) {
            this.editor.setValue(this.data.snippet.code || '');
        }
    }

    async saveSnippet() {
        if (this.isSaving) return;

        try {
            this.isSaving = true;
            this.updateSaveButton();

            const formData = this.getFormData();

            // Validation
            if (!formData.title || !formData.title.trim()) {
                this.app.showError('Title is required');
                this.isSaving = false;
                this.updateSaveButton();
                return;
            }
            if (!formData.code || !formData.code.trim()) {
                this.app.showError('Code content cannot be empty');
                this.isSaving = false;
                this.updateSaveButton();
                return;
            }

            console.log('Saving snippet payload:', formData);

            let response;
            if (this.snippetId) {
                response = await this.app.apiClient.put(`/snippets/${this.snippetId}`, formData);
            } else {
                response = await this.app.apiClient.post('/snippets', formData);
            }

            if (response.success) {
                this.hasUnsavedChanges = false;
                this.updateSaveButton();

                if (!this.snippetId) {
                    this.snippetId = response.data.id;
                    this.data.snippet = response.data;
                    window.history.replaceState({}, '', `/editor/${this.snippetId}`);
                }

                this.app.showSuccess('Snippet saved successfully');
            }
        } catch (error) {
            console.error('Failed to save snippet:', error);
            this.app.showError('Failed to save snippet');
        } finally {
            this.isSaving = false;
            this.updateSaveButton();
        }
    }

    async saveAndClose() {
        await this.saveSnippet();
        if (!this.hasUnsavedChanges) {
            window.app.router.navigate('/snippets');
        }
    }

    handleCancel() {
        if (this.hasUnsavedChanges) {
            if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                window.app.router.navigate('/snippets');
            }
        } else {
            window.app.router.navigate('/snippets');
        }
    }

    getFormData() {
        return {
            title: document.getElementById('snippet-title').value,
            description: document.getElementById('snippet-description').value,
            language: document.getElementById('snippet-language').value,
            visibility: document.getElementById('snippet-visibility').value,
            code: this.editor ? this.editor.getValue() : '',
            tags: this.getCurrentTags()
        };
    }

    updateEditorLanguage(language) {
        if (this.editor) {
            this.editor.setOption('mode', this.getLanguageMode(language));
        }
    }

    updateLanguageFromMode() {
        if (!this.editor) return;

        const mode = this.editor.getOption('mode');
        const language = this.getLanguageFromMode(mode);

        const languageSelect = document.getElementById('snippet-language');
        if (languageSelect) {
            languageSelect.value = language;
        }
    }

    getLanguageMode(language) {
        const modes = {
            'javascript': 'javascript',
            'typescript': 'javascript',
            'python': 'python',
            'php': 'php',
            'html': 'htmlmixed',
            'css': 'css',
            'sql': 'sql',
            'json': 'application/json',
            'xml': 'xml'
        };

        return modes[language] || 'text/plain';
    }

    getLanguageFromMode(mode) {
        const languages = {
            'javascript': 'javascript',
            'python': 'python',
            'php': 'php',
            'htmlmixed': 'html',
            'css': 'css',
            'sql': 'sql',
            'application/json': 'json',
            'xml': 'xml'
        };

        return languages[mode] || 'plaintext';
    }

    updateSaveButton() {
        const saveButton = document.getElementById('save-button');
        const saveCloseButton = document.getElementById('save-close-button');

        if (!saveButton) return;

        if (this.isSaving) {
            saveButton.innerHTML = 'Saving...';
            saveButton.disabled = true;
            saveButton.className = 'bg-gray-600 text-white px-4 py-2 rounded-lg font-medium cursor-not-allowed';
        } else if (this.hasUnsavedChanges) {
            saveButton.innerHTML = 'Save Changes';
            saveButton.disabled = false;
            saveButton.className = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors';
        } else {
            saveButton.innerHTML = 'Saved';
            saveButton.disabled = true;
            saveButton.className = 'bg-green-600 text-white px-4 py-2 rounded-lg font-medium cursor-not-allowed';
        }

        if (saveCloseButton) {
            saveCloseButton.disabled = this.isSaving;
        }
    }

    startAutosave() {
        this.autosaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges && !this.isSaving) {
                this.autosave();
            }
        }, 30000); // Autosave every 30 seconds
    }

    async autosave() {
        try {
            const formData = this.getFormData();

            if (this.snippetId) {
                await this.app.apiClient.put(`/snippets/${this.snippetId}`, formData);
            }

            // Show subtle autosave indicator
            this.showAutosaveIndicator();
        } catch (error) {
            console.error('Autosave failed:', error);
        }
    }

    showAutosaveIndicator() {
        const indicator = document.getElementById('autosave-indicator');
        if (indicator) {
            indicator.textContent = 'Autosaved';
            indicator.className = 'text-green-400 text-sm';

            setTimeout(() => {
                indicator.textContent = '';
            }, 2000);
        }
    }

    toggleFullscreen() {
        const editorContainer = document.getElementById('editor-container');

        if (!document.fullscreenElement) {
            editorContainer.requestFullscreen().then(() => {
                editorContainer.classList.add('fullscreen');
            });
        } else {
            document.exitFullscreen().then(() => {
                editorContainer.classList.remove('fullscreen');
            });
        }
    }

    exitFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }

    async toggleCollaboration() {
        if (this.data.isCollaborating) {
            await this.stopCollaboration();
        } else {
            await this.startCollaboration();
        }
    }

    async startCollaboration() {
        if (!this.snippetId) {
            this.app.showError('Please save the snippet first');
            return;
        }

        try {
            this.data.isCollaborating = true;
            this.editor.startCollaboration(this.snippetId);
            this.updateCollaborationUI();
        } catch (error) {
            console.error('Failed to start collaboration:', error);
            this.app.showError('Failed to start collaboration');
        }
    }

    async stopCollaboration() {
        try {
            this.data.isCollaborating = false;
            this.editor.isCollaborating = false;
            this.updateCollaborationUI();
            this.app.showSuccess('Collaboration session ended');
        } catch (error) {
            console.error('Failed to stop collaboration:', error);
        }
    }

    updateCollaborationUI() {
        const button = document.getElementById('collaboration-button');
        const participantsContainer = document.getElementById('participants-container');

        if (button) {
            if (this.data.isCollaborating) {
                button.innerHTML = 'Stop Collaboration';
                button.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors';

                // Add Share Button if not exists
                if (!document.getElementById('share-collab-btn')) {
                    const shareBtn = document.createElement('button');
                    shareBtn.id = 'share-collab-btn';
                    shareBtn.className = 'bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors ml-2';
                    shareBtn.innerHTML = '<i class="ph ph-share-network mr-2"></i>Share';
                    shareBtn.onclick = () => this.generateInviteLink('view'); // Default to view
                    button.parentNode.insertBefore(shareBtn, button.nextSibling);
                }
            } else {
                button.innerHTML = 'Start Collaboration';
                button.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors';
                const shareBtn = document.getElementById('share-collab-btn');
                if (shareBtn) shareBtn.remove();
            }
        }

        if (participantsContainer) {
            participantsContainer.style.display = this.data.isCollaborating ? 'block' : 'none';
        }
    }

    async exportSnippet(format) {
        if (!this.snippetId) {
            this.app.showError('Please save the snippet first');
            return;
        }

        try {
            const response = await this.app.apiClient.get(`/snippets/${this.snippetId}/export?format=${format}`);

            if (response.success) {
                this.downloadFile(response.data.filename, response.data.content, response.data.mime_type);
                this.app.showSuccess(`Snippet exported as ${format.toUpperCase()}`);
            }
        } catch (error) {
            console.error('Failed to export snippet:', error);
            this.app.showError('Failed to export snippet');
        }
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    async generateInviteLink(permission = 'view') {
        if (!this.data.isCollaborating || !this.editor.sessionToken) {
            this.app.showError('Must be in a collaboration session');
            return;
        }

        try {
            const response = await this.app.apiClient.post(`/collaboration/sessions/${this.editor.sessionToken}/invite`, {
                permission
            });

            if (response.success) {
                this.showInviteModal(response.data.url, permission);
            }
        } catch (error) {
            console.error('Failed to generate invite:', error);
            this.app.showError('Failed to generate invite link');
        }
    }

    showInviteModal(path, permission) {
        const fullUrl = `${window.location.origin}${path}`;

        // Simple modal implementation
        const modalHtml = `
            <div id="invite-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-md w-full">
                    <h3 class="text-xl font-bold text-white mb-4">Share Collaboration</h3>
                    <p class="text-gray-400 mb-4">Share this link to invite others to <span class="text-white font-medium">${permission}</span> this snippet.</p>
                    
                    <div class="flex gap-2 mb-6">
                        <input type="text" readonly value="${fullUrl}" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 font-mono text-sm focus:outline-none">
                        <button onclick="navigator.clipboard.writeText('${fullUrl}'); this.textContent='Copied!'" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Copy
                        </button>
                    </div>

                    <div class="flex justify-end">
                        <button onclick="document.getElementById('invite-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async runAnalysis() {
        if (!this.snippetId) {
            this.app.showError('Please save the snippet first');
            return;
        }

        try {
            const response = await this.app.apiClient.post(`/snippets/${this.snippetId}/analyze`);

            if (response.success) {
                this.showAnalysisResults(response.data);
                if (this.editor && response.data.issues) {
                    this.editor.setAnnotations(response.data.issues);
                }
                this.app.showSuccess('Code analysis completed');
            }
        } catch (error) {
            console.error('Failed to run analysis:', error);
            this.app.showError('Failed to run code analysis');
        }
    }

    showAnalysisResults(results) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div class="p-6">
                    <h2 class="text-xl font-semibold text-white mb-4">Code Analysis Results</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <h3 class="text-lg font-medium text-white mb-2">Complexity Score</h3>
                            <div class="bg-gray-700 rounded-lg p-4">
                                <span class="text-2xl font-bold ${results.complexity_score > 10 ? 'text-red-400' : 'text-green-400'}">
                                    ${results.complexity_score}
                                </span>
                                <span class="text-gray-400 ml-2">/ 20</span>
                            </div>
                        </div>
                        
                        ${results.security_issues.length > 0 ? `
                            <div>
                                <h3 class="text-lg font-medium text-white mb-2">Security Issues</h3>
                                <div class="space-y-2">
                                    ${results.security_issues.map(issue => `
                                        <div class="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-3">
                                            <p class="text-red-400 font-medium">${issue.message}</p>
                                            <p class="text-gray-400 text-sm">Line ${issue.line}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${results.performance_suggestions.length > 0 ? `
                            <div>
                                <h3 class="text-lg font-medium text-white mb-2">Performance Suggestions</h3>
                                <div class="space-y-2">
                                    ${results.performance_suggestions.map(suggestion => `
                                        <div class="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-3">
                                            <p class="text-yellow-400 font-medium">${suggestion.message}</p>
                                            <p class="text-gray-400 text-sm">Line ${suggestion.line}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="mt-6 flex justify-end">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    render() {
        const container = document.getElementById('app');
        if (!container) return;

        // Clean up any existing editor instance
        if (this.editor) {
            this.editor = null;
        }

        container.innerHTML = `
            ${this.nav.render()}
            <div class="snippet-editor-page min-h-screen pb-12">
                <div class="container mx-auto px-4 pt-8">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-8 animate-fadeIn">
                        <div class="flex items-center space-x-4">
                            <button onclick="window.app.router.navigate('/snippets')" 
                                    class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 bg-opacity-50 text-gray-400 hover:text-white hover:bg-gray-700 transition-all border border-gray-700">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <div>
                                <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                    ${this.snippetId ? 'Edit Snippet' : 'Create Snippet'}
                                </h1>
                                <p class="text-sm text-gray-400 mt-1">
                                    ${this.snippetId ? 'Update your code masterpiece' : 'Share your knowledge with the world'}
                                </p>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-3">
                            <button id="analysis-button" 
                                    class="glass-btn px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center hover:bg-white hover:bg-opacity-10 text-purple-300 border-purple-500 border-opacity-30">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                                Analyze
                            </button>
                            
                            <div class="relative group">
                                <button class="glass-btn px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center hover:bg-white hover:bg-opacity-10 text-gray-300">
                                    Export
                                    <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>
                                <div class="hidden group-hover:block absolute right-0 top-full mt-2 w-48 glass-panel shadow-xl rounded-lg overflow-hidden py-1 z-50">
                                    <button data-export-format="json" class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors">
                                        JSON Format
                                    </button>
                                    <button data-export-format="markdown" class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors">
                                        Markdown
                                    </button>
                                    <button data-export-format="html" class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors">
                                        HTML Format
                                    </button>
                                </div>
                            </div>
                            
                            <div class="h-8 w-px bg-gray-700 mx-2"></div>

                            <button id="collaboration-button" 
                                    class="glass-btn px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center text-green-400 hover:bg-green-500 hover:bg-opacity-10 border-green-500 border-opacity-30">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                Collaborate
                            </button>
                            
                            <button id="save-button" 
                                    class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-blue-500/30 transition-all text-sm flex items-center">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                                </svg>
                                Save Snippet
                            </button>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slideUp">
                        <!-- Editor Section -->
                        <div class="lg:col-span-3 space-y-4">
                            <div id="editor-container" class="glass-panel overflow-hidden border border-gray-700/50 shadow-2xl relative group flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
                                <!-- Editor Toolbar -->
                                <div class="bg-gray-900/50 backdrop-blur px-4 py-3 flex-none flex items-center justify-between border-b border-gray-700/50">
                                    <div class="flex items-center space-x-4">
                                        <div class="flex items-center space-x-2">
                                            <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                            <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                                            <div class="flex items-center gap-2">
                             <div class="relative">
                                <select id="editor-theme" class="bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:border-primary">
                                    <option value="dracula">Dracula</option>
                                    <option value="monokai">Monokai</option>
                                    <option value="material">Material</option>
                                    <option value="nord">Nord</option>
                                </select>
                            </div>
                            <div class="relative">
                                <select id="editor-font-size" class="bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:border-primary">
                                    <option value="12px">12px</option>
                                    <option value="14px" selected>14px</option>
                                    <option value="16px">16px</option>
                                    <option value="18px">18px</option>
                                </select>
                            </div>
                            <button id="editor-focus-mode" title="Toggle Focus Mode" class="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors">
                                <i class="ph ph-corners-out"></i>
                            </button>
                            <span class="w-px h-4 bg-gray-700 mx-1"></span>
                            <span id="autosave-indicator" class="text-xs text-gray-500 min-w-[60px] text-right"></span>
                        </div>
                    </div>
                    
                    <div id="code-editor" class="h-[calc(100vh-320px)] border-b border-gray-700/50 text-base"></div>
                                        <select id="snippet-language" class="bg-transparent text-gray-300 text-sm focus:outline-none cursor-pointer hover:text-white transition-colors">
                                            <option value="javascript">JavaScript</option>
                                            <option value="typescript">TypeScript</option>
                                            <option value="python">Python</option>
                                            <option value="php">PHP</option>
                                            <option value="html">HTML</option>
                                            <option value="css">CSS</option>
                                            <option value="sql">SQL</option>
                                            <option value="json">JSON</option>
                                            <option value="xml">XML</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                            <option value="go">Go</option>
                                            <option value="rust">Rust</option>
                                        </select>
                                    </div>
                                    
                                    <div class="flex items-center space-x-4 text-xs">
                                        <span id="autosave-indicator" class="text-green-400 opacity-0 transition-opacity duration-300 flex items-center">
                                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Saved
                                        </span>
                                        <div class="h-4 w-px bg-gray-700"></div>
                                        <button onclick="window.snippetEditor.toggleFullscreen()" 
                                                class="text-gray-400 hover:text-white transition-colors flex items-center">
                                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                                            </svg>
                                            Fullscreen
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Code Editor -->
                                <div id="code-editor" class="text-base font-mono bg-gray-900 flex-1 overflow-hidden h-full"></div>
                                
                                <!-- Bottom Status Bar -->
                                <div class="bg-gray-900/80 px-4 py-1 text-xs text-gray-500 border-t border-gray-700/50 flex justify-between">
                                    <span>UTF-8</span>
                                    <span id="cursor-position">Ln 1, Col 1</span>
                                </div>
                            </div>
                        </div>

                        <!-- Properties Panel -->
                        <div class="lg:col-span-1">
                            <div class="glass-panel p-6 space-y-6 sticky top-24">
                                <h3 class="text-lg font-semibold text-white border-b border-gray-700/50 pb-4 mb-2">Details</h3>
                                
                                <!-- Title -->
                                <div class="space-y-2">
                                    <label class="block text-xs font-medium text-gray-400 uppercase tracking-wider">Title</label>
                                    <input type="text" id="snippet-title" 
                                           class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                           placeholder="e.g. Recursive Fibonacci" required>
                                </div>

                                <!-- Description -->
                                <div class="space-y-2">
                                    <label class="block text-xs font-medium text-gray-400 uppercase tracking-wider">Description</label>
                                    <textarea id="snippet-description" rows="4"
                                              class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm resize-none"
                                              placeholder="Explain what this snippet does..."></textarea>
                                </div>

                                <!-- Visibility -->
                                <div class="space-y-2">
                                    <label class="block text-xs font-medium text-gray-400 uppercase tracking-wider">Visibility</label>
                                    <div class="relative">
                                        <select id="snippet-visibility" 
                                                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm appearance-none cursor-pointer">
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                            <option value="organization">Organization</option>
                                        </select>
                                        <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </div>



                                <!-- Tags -->
                                <div class="space-y-2">
                                    <label class="block text-xs font-medium text-gray-400 uppercase tracking-wider">Tags</label>
                                    <div class="relative group">
                                        <input type="text" id="snippet-tags" 
                                               class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                               placeholder="Type and press comma...">
                                         <div class="absolute right-3 top-2.5 text-gray-500">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div id="tags-display" class="flex flex-wrap gap-2 mt-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Scripts -->
                <div id="participants-container" class="fixed bottom-6 right-6 hidden z-50">
                    <div class="glass-panel p-3 rounded-lg flex items-center space-x-3 border border-green-500/30">
                        <span class="relative flex h-3 w-3">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span class="text-sm font-medium text-green-400">Live Session Active</span>
                    </div>
                </div>
                            <div id="participants-container" class="hidden">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Participants</label>
                                <div id="participants-list" class="space-y-2"></div>
                            </div>

                            <!-- Actions -->
                            <div class="pt-4 border-t border-gray-700">
                                <button id="cancel-button" 
                                        class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Make window.snippetEditor available for global callbacks (like tag removal)
        window.snippetEditor = this;

        // Initialize components after DOM is ready
        this.setupEditor();
        this.setupEventListeners();
        this.startAutosave();

        // Initial UI updates
        this.updateSaveButton();
        this.updateCollaborationUI();

        // If we have snippet data, ensure it's populated (in case of re-render)
        if (this.data.snippet && !this.editor) {
            this.populateForm();
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateTheme(theme) {
        if (this.editor) {
            this.editor.setTheme(theme);
        }
        localStorage.setItem('editor_theme', theme);
    }

    updateFontSize(size) {
        const editorElement = document.getElementById('code-editor');
        if (editorElement) {
            editorElement.style.fontSize = size;
            if (this.editor) this.editor.refresh();
        }
        localStorage.setItem('editor_font_size', size);
    }

    toggleFocusMode() {
        if (this.editor) {
            this.editor.toggleFocusMode();
        }
    }

    toggleMarkdownPreview() {
        if (this.editor) {
            this.editor.toggleMarkdownPreview();
        }
    }

    destroy() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }

        if (this.editor) {
            this.editor.destroy();
        }

        window.snippetEditor = null;
    }
}

// Make instance globally accessible
window.snippetEditor = null;