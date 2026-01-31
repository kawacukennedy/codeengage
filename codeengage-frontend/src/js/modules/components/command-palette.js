// Command Palette - Global command launcher
export class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.commands = new Map();
        this.recentCommands = [];
        this.searchInput = null;
        this.resultsContainer = null;
        this.selectedIndex = 0;
        this.maxRecentCommands = 10;

        this.init();
    }

    init() {
        // Register default commands
        this.registerDefaultCommands();

        // Setup DOM elements
        this.setupDOM();

        // Load recent commands from localStorage
        this.loadRecentCommands();
    }

    registerDefaultCommands() {
        // Navigation commands
        this.register('dashboard', {
            title: 'Dashboard',
            description: 'Go to dashboard',
            icon: '🏠',
            action: () => window.app.router.navigate('/dashboard'),
            category: 'navigation'
        });

        this.register('editor', {
            title: 'New Snippet',
            description: 'Create new code snippet',
            icon: '➕',
            action: () => window.app.router.navigate('/editor'),
            category: 'navigation',
            keywords: ['new', 'create', 'snippet']
        });

        this.register('snippets', {
            title: 'Explore Snippets',
            description: 'Browse public snippets',
            icon: '🔍',
            action: () => window.app.router.navigate('/snippets'),
            category: 'navigation',
            keywords: ['explore', 'browse', 'search']
        });

        this.register('profile', {
            title: 'Profile',
            description: 'Go to your profile',
            icon: '👤',
            action: () => window.app.router.navigate('/profile'),
            category: 'navigation'
        });

        // Snippet actions
        this.register('create-snippet', {
            title: 'Create Snippet',
            description: 'Create a new code snippet',
            icon: '📝',
            action: () => window.app.router.navigate('/editor'),
            category: 'create',
            keywords: ['new', 'create', 'snippet']
        });

        this.register('save-snippet', {
            title: 'Save Current Snippet',
            description: 'Save the current snippet',
            icon: '💾',
            action: () => this.saveCurrentSnippet(),
            category: 'create',
            condition: () => window.app.currentPage === 'snippet-editor'
        });

        this.register('run-code', {
            title: 'Run Code',
            description: 'Execute the current code',
            icon: '▶️',
            action: () => this.runCurrentCode(),
            category: 'create',
            condition: () => window.app.currentPage === 'snippet-editor'
        });

        // Search commands
        this.register('search-snippets', {
            title: 'Search Snippets',
            description: 'Search through all snippets',
            icon: '🔍',
            action: () => this.focusSnippetSearch(),
            category: 'search',
            keywords: ['find', 'search', 'query']
        });

        this.register('search-docs', {
            title: 'Search Documentation',
            description: 'Search CodeEngage documentation',
            icon: '📚',
            action: () => this.searchDocumentation(),
            category: 'search'
        });

        // Theme commands
        this.register('toggle-theme', {
            title: 'Toggle Theme',
            description: 'Switch between light and dark themes',
            icon: '🌓',
            action: () => window.app.toggleTheme(),
            category: 'settings',
            keywords: ['theme', 'dark', 'light']
        });

        this.register('theme-dracula', {
            title: 'Theme: Dracula',
            description: 'Switch editor theme to Dracula',
            icon: '🧛',
            action: () => this.setEditorTheme('dracula'),
            category: 'settings',
            condition: () => !!this.getEditor()
        });

        this.register('theme-nord', {
            title: 'Theme: Nord',
            description: 'Switch editor theme to Nord',
            icon: '❄️',
            action: () => this.setEditorTheme('nord'),
            category: 'settings',
            condition: () => !!this.getEditor()
        });

        // Editor Productivity
        this.register('toggle-focus', {
            title: 'Toggle Focus Mode',
            description: 'Hide UI for distraction-free editing',
            icon: '🎯',
            action: () => this.getEditor()?.toggleFocusMode(),
            category: 'editor',
            keywords: ['focus', 'zen', 'distraction'],
            condition: () => !!this.getEditor()
        });

        this.register('toggle-markdown', {
            title: 'Toggle Markdown Preview',
            description: 'Show/hide live markdown preview',
            icon: '📖',
            action: () => this.getEditor()?.toggleMarkdownPreview(),
            category: 'editor',
            keywords: ['preview', 'markdown', 'split'],
            condition: () => !!this.getEditor()
        });

        // User commands
        this.register('logout', {
            title: 'Logout',
            description: 'Sign out of your account',
            icon: '🚪',
            action: () => window.app.logout(),
            category: 'settings',
            condition: () => window.app.authManager.isAuthenticated()
        });

        this.register('settings', {
            title: 'Settings',
            description: 'Open user settings',
            icon: '⚙️',
            action: () => window.app.router.navigate('/settings'),
            category: 'settings'
        });

        // Help commands
        this.register('help', {
            title: 'Help',
            description: 'Show help and shortcuts',
            icon: '❓',
            action: () => this.showHelp(),
            category: 'help',
            keywords: ['shortcuts', 'keys', 'help']
        });

        this.register('shortcuts', {
            title: 'Keyboard Shortcuts',
            description: 'Show all keyboard shortcuts',
            icon: '⌨️',
            action: () => window.app.shortcutManager.showHelp(),
            category: 'help'
        });

        // Advanced commands
        this.register('export-snippets', {
            title: 'Export Snippets',
            description: 'Export your snippets as JSON',
            icon: '📤',
            action: () => this.exportSnippets(),
            category: 'advanced'
        });

        this.register('import-snippets', {
            title: 'Import Snippets',
            description: 'Import snippets from JSON file',
            icon: '📥',
            action: () => this.importSnippets(),
            category: 'advanced'
        });

        this.register('clear-cache', {
            title: 'Clear Cache',
            description: 'Clear application cache',
            icon: '🧹',
            action: () => this.clearCache(),
            category: 'advanced'
        });

        // Admin commands
        this.register('admin', {
            title: 'Admin Dashboard',
            description: 'Open admin dashboard',
            icon: '👑',
            action: () => window.app.router.navigate('/admin'),
            category: 'admin',
            condition: () => window.app.authManager.hasRole('admin')
        });

        this.register('audit-logs', {
            title: 'Audit Logs',
            description: 'View system audit logs',
            icon: '📋',
            action: () => window.app.router.navigate('/admin/audit'),
            category: 'admin',
            condition: () => window.app.authManager.hasRole('admin')
        });
    }

    getEditor() {
        return window.app?.currentPage?.editor;
    }

    setEditorTheme(theme) {
        const editor = this.getEditor();
        if (editor) {
            editor.setOption('theme', theme);
            window.app.showSuccess(`Theme set to ${theme}`);
        }
    }

    register(name, command) {
        this.commands.set(name, {
            ...command,
            name,
            score: 0
        });
    }

    setupDOM() {
        // Get modal elements
        this.modal = document.getElementById('command-palette');
        this.searchInput = document.getElementById('command-search');
        this.resultsContainer = document.getElementById('command-results');

        if (!this.modal || !this.searchInput || !this.resultsContainer) {
            console.error('Command palette DOM elements not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search input handler
        this.searchInput.addEventListener('input', () => {
            this.handleSearch();
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                e.preventDefault();
                this.hide();
            }
        });
    }

    show() {
        if (this.isOpen) {
            return;
        }

        this.isOpen = true;
        this.modal.classList.remove('hidden');

        // Focus search input
        setTimeout(async () => {
            this.searchInput.focus();
            this.searchInput.value = '';
            await this.handleSearch();
        }, 100);
    }

    hide() {
        if (!this.isOpen) {
            return;
        }

        this.isOpen = false;
        this.modal.classList.add('hidden');
        this.selectedIndex = 0;
    }

    async handleSearch() {
        const query = this.searchInput.value.toLowerCase().trim();
        const results = await this.searchCommands(query);

        this.displayResults(results);
        this.updateSelectedIndex(0);
    }

    async searchCommands(query) {
        if (!query) {
            return this.getRecentCommands();
        }

        const results = [];

        // 1. Search through registered commands
        for (const [name, command] of this.commands) {
            if (command.condition && !command.condition()) {
                continue;
            }

            const score = this.calculateMatchScore(query, command, name);
            if (score > 40) { // Threshold for commands
                results.push({ ...command, type: 'command', score });
            }
        }

        // 2. Search snippets from backend
        try {
            const response = await window.app.apiClient.get(`/snippets?search=${encodeURIComponent(query)}&limit=5`);

            let snippets = [];
            if (Array.isArray(response)) {
                snippets = response;
            } else if (response && response.snippets) {
                snippets = response.snippets;
            } else if (response && response.data) {
                // Handle wrapped response properly
                if (Array.isArray(response.data)) {
                    snippets = response.data;
                } else if (response.data.snippets) {
                    snippets = response.data.snippets;
                }
            }

            if (snippets && Array.isArray(snippets)) {
                snippets.forEach(snippet => {
                    results.push({
                        name: `snippet-${snippet.id}`,
                        title: snippet.title,
                        description: snippet.description || `Language: ${snippet.language}`,
                        icon: '📄',
                        type: 'snippet',
                        action: () => window.app.router.navigate(`/snippet/${snippet.id}`),
                        score: 70 // High enough to appear but below exact command matches
                    });
                });
            }
        } catch (error) {
            console.error('Snippet search failed:', error);
        }

        // Sort by score
        results.sort((a, b) => b.score - a.score);

        return results.slice(0, 10);
    }

    calculateMatchScore(query, command, name) {
        query = query.toLowerCase();
        let score = 0;

        const title = command.title.toLowerCase();
        const description = (command.description || '').toLowerCase();
        const keywords = command.keywords || [];

        // Exact match (highest weight)
        if (title === query) score += 1000;
        if (name === query) score += 900;

        // Title matches
        if (title.startsWith(query)) score += 500;
        if (title.includes(query)) score += 300;

        // Keyword matches
        keywords.forEach(kw => {
            if (kw.toLowerCase() === query) score += 400;
            if (kw.toLowerCase().includes(query)) score += 100;
        });

        // Fuzzy match title
        const fuzzyScore = this.fuzzyMatch(query, title);
        score += fuzzyScore * 50;

        // Description match (lowest weight)
        if (description.includes(query)) score += 50;

        return score;
    }

    fuzzyMatch(query, text) {
        if (!query) return 1;
        let score = 0;
        let queryIdx = 0;
        let lastIdx = -1;

        for (let i = 0; i < query.length; i++) {
            const char = query[i];
            const idx = text.indexOf(char, lastIdx + 1);
            if (idx === -1) return 0; // Not a fuzzy match

            // Bonus for consecutive characters
            if (idx === lastIdx + 1) score += 5;

            // Bonus for starting character match
            if (idx === 0) score += 10;

            lastIdx = idx;
            queryIdx++;
        }

        return score + (queryIdx / text.length) * 10;
    }

    displayResults(results) {
        this.resultsContainer.innerHTML = '';

        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="p-4 text-gray-400 text-center">
                    No commands found
                </div>
            `;
            return;
        }

        results.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index);
            this.resultsContainer.appendChild(resultElement);
        });
    }

    createResultElement(result, index) {
        const element = document.createElement('div');
        element.className = 'command-result flex items-center space-x-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors';
        element.dataset.index = index;

        element.innerHTML = `
            <div class="text-2xl">${result.icon}</div>
            <div class="flex-1 min-w-0">
                <div class="font-medium text-white">${this.highlightMatch(result.title)}</div>
                <div class="text-sm text-gray-400">${this.highlightMatch(result.description)}</div>
                <div class="text-xs text-gray-500 mt-1">Category: ${result.category}</div>
            </div>
        `;

        // Click handler
        element.addEventListener('click', () => {
            this.executeCommand(result);
        });

        return element;
    }

    highlightMatch(text) {
        if (!this.searchInput.value) {
            return text;
        }

        const query = this.searchInput.value.toLowerCase();
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-500 text-black">$1</mark>');
    }

    handleKeyNavigation(e) {
        const results = this.resultsContainer.querySelectorAll('.command-result');
        if (results.length === 0) {
            return;
        }

        let newIndex = this.selectedIndex;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                newIndex = Math.min(this.selectedIndex + 1, results.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newIndex = Math.max(this.selectedIndex - 1, 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.selectedIndex < results.length) {
                    const result = results[this.selectedIndex].commandData;
                    this.executeCommand(result);
                }
                return;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = results.length - 1;
                break;
        }

        if (newIndex !== this.selectedIndex) {
            this.updateSelectedIndex(newIndex);
        }
    }

    updateSelectedIndex(index) {
        const results = this.resultsContainer.querySelectorAll('.command-result');

        // Remove previous selection
        if (this.selectedIndex >= 0 && this.selectedIndex < results.length) {
            results[this.selectedIndex].classList.remove('bg-gray-700');
            results[this.selectedIndex].classList.remove('border-l-2');
            results[this.selectedIndex].classList.remove('border-blue-500');
        }

        // Add new selection
        if (index >= 0 && index < results.length) {
            results[index].classList.add('bg-gray-700');
            results[index].classList.add('border-l-2');
            results[index].classList.add('border-blue-500');

            // Store command data
            const commandName = results[index].dataset.commandName;
            if (commandName) {
                results[index].commandData = this.commands.get(commandName);
            }
        }

        this.selectedIndex = index;
    }

    executeCommand(command) {
        if (command.action && typeof command.action === 'function') {
            // Add to recent commands
            this.addToRecentCommands(command.name);

            // Execute action
            command.action();

            // Hide palette
            this.hide();
        }
    }

    getRecentCommands() {
        return this.recentCommands
            .map(name => this.commands.get(name))
            .filter(cmd => cmd && (!cmd.condition || cmd.condition()));
    }

    addToRecentCommands(commandName) {
        // Remove if already exists
        const index = this.recentCommands.indexOf(commandName);
        if (index > -1) {
            this.recentCommands.splice(index, 1);
        }

        // Add to beginning
        this.recentCommands.unshift(commandName);

        // Keep only recent commands
        if (this.recentCommands.length > this.maxRecentCommands) {
            this.recentCommands = this.recentCommands.slice(0, this.maxRecentCommands);
        }

        // Save to localStorage
        localStorage.setItem('recent_commands', JSON.stringify(this.recentCommands));
    }

    loadRecentCommands() {
        const saved = localStorage.getItem('recent_commands');
        if (saved) {
            try {
                this.recentCommands = JSON.parse(saved);
            } catch (error) {
                console.error('Failed to load recent commands:', error);
                this.recentCommands = [];
            }
        }
    }

    // Command actions
    saveCurrentSnippet() {
        if (window.app.currentPage === 'snippet-editor') {
            // Dispatch save event to editor
            window.dispatchEvent(new CustomEvent('save-snippet'));
        }
    }

    runCurrentCode() {
        if (window.app.currentPage === 'snippet-editor') {
            // Dispatch run event to editor
            window.dispatchEvent(new CustomEvent('run-code'));
        }
    }

    focusSnippetSearch() {
        // Navigate to snippets and focus search
        window.app.router.navigate('/snippets');
        setTimeout(() => {
            const searchInput = document.getElementById('snippet-search');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    }

    searchDocumentation() {
        window.open('/docs', '_blank');
    }

    exportSnippets() {
        // Implement export functionality
        window.app.showInfo('Export functionality coming soon');
    }

    importSnippets() {
        // Implement import functionality
        window.app.showInfo('Import functionality coming soon');
    }

    clearCache() {
        localStorage.clear();
        sessionStorage.clear();
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
        window.app.showSuccess('Cache cleared successfully');
        setTimeout(() => location.reload(), 1000);
    }

    showHelp() {
        window.app.shortcutManager.showHelp();
    }

    // Public methods
    isCommandPaletteOpen() {
        return this.isOpen;
    }
}

// Export for use in other modules
export default CommandPalette;