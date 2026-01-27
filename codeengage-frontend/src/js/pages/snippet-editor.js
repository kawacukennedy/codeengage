// Snippet Editor Page
export default class SnippetEditor {
    constructor(app, snippetId = null) {
        this.app = app;
        this.snippetId = snippetId;
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
        await this.loadLanguages();
        await this.loadTags();
        
        if (this.snippetId) {
            await this.loadSnippet();
        }
        
        this.setupEditor();
        this.setupEventListeners();
        this.startAutosave();
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

        // Initialize CodeMirror
        this.editor = new CodeMirror(editorContainer, {
            value: this.data.snippet?.code || '',
            mode: this.getLanguageMode(this.data.snippet?.language || 'javascript'),
            theme: 'one-dark',
            lineNumbers: true,
            lineWrapping: false,
            indentUnit: 4,
            tabSize: 4,
            autofocus: true,
            extraKeys: {
                'Ctrl-S': () => this.saveSnippet(),
                'Cmd-S': () => this.saveSnippet(),
                'Ctrl-K': () => this.app.commandPalette.show(),
                'Cmd-K': () => this.app.commandPalette.show(),
                'F11': () => this.toggleFullscreen(),
                'Esc': () => this.exitFullscreen()
            }
        });

        // Track changes
        this.editor.on('change', () => {
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
        });

        // Handle language changes
        this.editor.on('optionChange', (cm, option) => {
            if (option === 'mode') {
                this.updateLanguageFromMode();
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

        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                this.updateSaveButton();
            });
        }

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
        try {
            const response = await this.app.apiClient.post('/collaboration/sessions', {
                snippet_id: this.snippetId
            });

            if (response.success) {
                this.data.isCollaborating = true;
                this.data.sessionToken = response.data.session_token;
                this.updateCollaborationUI();
                this.app.showSuccess('Collaboration session started');
            }
        } catch (error) {
            console.error('Failed to start collaboration:', error);
            this.app.showError('Failed to start collaboration');
        }
    }

    async stopCollaboration() {
        try {
            await this.app.apiClient.delete(`/collaboration/sessions/${this.data.sessionToken}`);
            
            this.data.isCollaborating = false;
            this.data.sessionToken = null;
            this.updateCollaborationUI();
            this.app.showSuccess('Collaboration session ended');
        } catch (error) {
            console.error('Failed to stop collaboration:', error);
            this.app.showError('Failed to stop collaboration');
        }
    }

    updateCollaborationUI() {
        const button = document.getElementById('collaboration-button');
        const participantsContainer = document.getElementById('participants-container');
        
        if (button) {
            if (this.data.isCollaborating) {
                button.innerHTML = 'Stop Collaboration';
                button.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors';
            } else {
                button.innerHTML = 'Start Collaboration';
                button.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors';
            }
        }

        if (participantsContainer) {
            participantsContainer.style.display = this.data.isCollaborating ? 'block' : 'none';
        }
    }

    async exportSnippet(format) {
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

    async runAnalysis() {
        if (!this.snippetId) {
            this.app.showError('Please save the snippet first');
            return;
        }

        try {
            const response = await this.app.apiClient.post(`/snippets/${this.snippetId}/analyze`);
            
            if (response.success) {
                this.showAnalysisResults(response.data);
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
        const container = document.createElement('div');
        container.className = 'snippet-editor-page min-h-screen';

        container.innerHTML = `
            <div class="container mx-auto px-4 py-8">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-4">
                        <button onclick="window.app.router.navigate('/snippets')" 
                                class="text-gray-400 hover:text-white transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                        </button>
                        <h1 class="text-2xl font-bold text-white">
                            ${this.snippetId ? 'Edit Snippet' : 'Create New Snippet'}
                        </h1>
                    </div>
                    
                    <div class="flex items-center space-x-3">
                        <button id="analysis-button" 
                                class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                            Analyze
                        </button>
                        
                        <div class="relative">
                            <button class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    onclick="document.getElementById('export-menu').classList.toggle('hidden')">
                                Export
                                <svg class="w-4 h-4 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="export-menu" class="hidden absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg z-10">
                                <button data-export-format="json" class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600 rounded-t-lg">
                                    JSON
                                </button>
                                <button data-export-format="markdown" class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600">
                                    Markdown
                                </button>
                                <button data-export-format="html" class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600 rounded-b-lg">
                                    HTML
                                </button>
                            </div>
                        </div>
                        
                        <button id="collaboration-button" 
                                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Start Collaboration
                        </button>
                        
                        <button id="save-close-button" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Save & Close
                        </button>
                        
                        <button id="save-button" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Save
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <!-- Editor Section -->
                    <div class="lg:col-span-3">
                        <div id="editor-container" class="bg-gray-800 rounded-lg overflow-hidden">
                            <!-- Editor Toolbar -->
                            <div class="bg-gray-700 px-4 py-2 flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <select id="snippet-language" class="bg-gray-600 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="javascript">JavaScript</option>
                                        <option value="typescript">TypeScript</option>
                                        <option value="python">Python</option>
                                        <option value="php">PHP</option>
                                        <option value="html">HTML</option>
                                        <option value="css">CSS</option>
                                        <option value="sql">SQL</option>
                                        <option value="json">JSON</option>
                                        <option value="xml">XML</option>
                                    </select>
                                    
                                    <div class="flex items-center space-x-2">
                                        <button onclick="window.snippetEditor.toggleFullscreen()" 
                                                class="text-gray-400 hover:text-white" title="Fullscreen (F11)">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="flex items-center space-x-2">
                                    <span id="autosave-indicator" class="text-green-400 text-sm"></span>
                                    <span class="text-gray-400 text-sm">Ln 1, Col 1</span>
                                </div>
                            </div>
                            
                            <!-- Code Editor -->
                            <div id="code-editor" class="h-96"></div>
                        </div>
                    </div>

                    <!-- Properties Panel -->
                    <div class="lg:col-span-1">
                        <div class="bg-gray-800 rounded-lg p-6 space-y-6">
                            <!-- Title -->
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                                <input type="text" id="snippet-title" 
                                       class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                       placeholder="Enter snippet title" required>
                            </div>

                            <!-- Description -->
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                <textarea id="snippet-description" rows="3"
                                          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                          placeholder="Describe your snippet"></textarea>
                            </div>

                            <!-- Visibility -->
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Visibility</label>
                                <select id="snippet-visibility" 
                                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                    <option value="organization">Organization</option>
                                </select>
                            </div>

                            <!-- Tags -->
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                                <div class="relative">
                                    <input type="text" id="snippet-tags" 
                                           class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                           placeholder="Add tags (comma separated)">
                                </div>
                                <div id="tags-display" class="mt-2"></div>
                            </div>

                            <!-- Collaboration Participants -->
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

        // Initialize after DOM insertion
        setTimeout(() => this.init(), 0);

        return container;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }
        
        if (this.editor) {
            this.editor.toTextArea();
        }
        
        window.snippetEditor = null;
    }
}

// Make instance globally accessible
window.snippetEditor = null;