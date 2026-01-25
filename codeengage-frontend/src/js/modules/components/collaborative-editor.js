// Collaborative Editor - CodeMirror Wrapper
class CollaborativeEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            mode: 'javascript',
            theme: 'dark',
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            autofocus: true,
            readOnly: false,
            ...options
        };

        this.editor = null;
        this.websocket = null;
        this.sessionId = null;
        this.userId = null;
        this.userName = null;
        this.userColor = null;
        this.cursors = new Map();
        this.changesQueue = [];
        this.isCollaborating = false;
        
        this.init();
    }

    async init() {
        // Load CodeMirror
        await this.loadCodeMirror();
        
        // Initialize editor
        this.createEditor();
        
        // Setup collaboration if enabled
        if (this.options.collaborate) {
            this.setupCollaboration();
        }
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    async loadCodeMirror() {
        return new Promise((resolve) => {
            if (typeof CodeMirror !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.js';
            script.onload = () => {
                // Load additional modes and addons
                this.loadCodeMirrorAddons().then(resolve);
            };
            document.head.appendChild(script);
        });
    }

    async loadCodeMirrorAddons() {
        const addons = [
            'mode/javascript/javascript.min.js',
            'mode/python/python.min.js',
            'mode/php/php.min.js',
            'mode/xml/xml.min.js',
            'mode/css/css.min.js',
            'mode/sql/sql.min.js',
            'addon/mode/overlay.min.js',
            'addon/selection/active-line.min.js',
            'addon/edit/matchbrackets.min.js',
            'addon/edit/closebrackets.min.js',
            'addon/comment/comment.min.js',
            'addon/search/search.min.js',
            'addon/search/searchcursor.min.js',
            'addon/search/jump-to-line.min.js'
        ];

        const promises = addons.map(addon => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/${addon}`;
                script.onload = resolve;
                document.head.appendChild(script);
            });
        });

        await Promise.all(promises);
    }

    createEditor() {
        // Create CodeMirror instance
        this.editor = CodeMirror(this.container, {
            ...this.options,
            extraKeys: {
                'Ctrl-S': () => this.save(),
                'Cmd-S': () => this.save(),
                'Ctrl-Enter': () => this.runCode(),
                'Cmd-Enter': () => this.runCode(),
                'Ctrl-/': () => this.toggleComment(),
                'Cmd-/': () => this.toggleComment(),
                'Ctrl-F': 'findPersistent',
                'Cmd-F': 'findPersistent',
                'Ctrl-G': 'findNext',
                'Cmd-G': 'findNext',
                'Ctrl-Shift-G': 'findPrev',
                'Cmd-Shift-G': 'findPrev'
            }
        });

        // Load initial content
        if (this.options.value) {
            this.editor.setValue(this.options.value);
        }

        // Setup Vim/Emacs if requested
        if (this.options.vim) {
            this.loadVimMode();
        }
        
        if (this.options.emacs) {
            this.loadEmacsMode();
        }
    }

    async loadVimMode() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/keymap/vim.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    async loadEmacsMode() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/keymap/emacs.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    setupCollaboration() {
        if (!window.app.authManager.isAuthenticated()) {
            return;
        }

        const user = window.app.authManager.user;
        this.userId = user.id;
        this.userName = user.display_name || user.username;
        this.userColor = this.getUserColor(user.id);

        // Initialize WebSocket connection
        const snippetId = this.options.snippetId;
        if (snippetId) {
            this.connectToCollaboration(snippetId);
        }
    }

    async connectToCollaboration(snippetId) {
        try {
            // Create WebSocket connection
            this.websocket = WebSocket.create(`/collaboration/sessions/${snippetId}`);
            
            this.websocket.onopen = () => {
                this.isCollaborating = true;
                console.log('Connected to collaboration session');
                window.app.showSuccess('Connected to collaboration session');
                
                // Send initial cursor position
                this.sendCursorPosition();
            };
            
            this.websocket.onmessage = (event) => {
                this.handleCollaborationMessage(JSON.parse(event.data));
            };
            
            this.websocket.onclose = () => {
                this.isCollaborating = false;
                console.log('Disconnected from collaboration session');
                this.clearAllCursors();
            };
            
            this.websocket.onerror = (error) => {
                console.error('Collaboration error:', error);
                window.app.showError('Collaboration connection error');
            };
            
        } catch (error) {
            console.error('Failed to connect to collaboration:', error);
            window.app.showError('Failed to connect to collaboration session');
        }
    }

    handleCollaborationMessage(message) {
        switch (message.type) {
            case 'cursor':
                this.updateRemoteCursor(message.user_id, message.position);
                break;
                
            case 'text_change':
                this.applyRemoteChange(message.change);
                break;
                
            case 'user_join':
                this.handleUserJoin(message.user);
                break;
                
            case 'user_leave':
                this.handleUserLeave(message.user_id);
                break;
                
            case 'participants':
                this.updateParticipants(message.participants);
                break;
        }
    }

    setupEventHandlers() {
        if (!this.editor) return;

        // Handle text changes
        this.editor.on('change', (instance, change) => {
            if (this.isCollaborating && !change.originMatch('setValue')) {
                this.broadcastChange(change);
            }
        });

        // Handle cursor activity
        this.editor.on('cursorActivity', () => {
            if (this.isCollaborating) {
                this.sendCursorPosition();
            }
        });

        // Handle viewport changes
        this.editor.on('viewportChange', () => {
            if (this.isCollaborating) {
                this.sendCursorPosition();
            }
        });
    }

    broadcastChange(change) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }

        const changeData = {
            type: 'text_change',
            change: {
                from: change.from,
                to: change.to,
                text: change.text,
                origin: change.origin,
                removed: change.removed
            },
            user_id: this.userId
        };

        this.websocket.send(JSON.stringify(changeData));
    }

    applyRemoteChange(change) {
        if (change.user_id === this.userId) {
            return; // Ignore own changes
        }

        // Apply change to editor
        this.editor.operation(() => {
            const from = CodeMirror.Pos(change.from.line, change.from.ch);
            const to = CodeMirror.Pos(change.to.line, change.to.ch);
            
            if (change.text.length === 0) {
                // Deletion
                this.editor.replaceRange('', from, to);
            } else if (change.from.line === change.to.line && change.from.ch === change.to.ch) {
                // Insertion
                this.editor.replaceRange(change.text.join('\n'), from);
            } else {
                // Replacement
                this.editor.replaceRange(change.text.join('\n'), from, to);
            }
        });
    }

    sendCursorPosition() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }

        const cursor = this.editor.getCursor();
        const viewport = this.editor.getViewport();

        const position = {
            line: cursor.line,
            ch: cursor.ch,
            viewport: {
                from: viewport.from,
                to: viewport.to
            }
        };

        this.websocket.updateCursor(position);
    }

    updateRemoteCursor(userId, position) {
        if (userId === this.userId) {
            return;
        }

        const existingCursor = this.cursors.get(userId);
        if (existingCursor) {
            existingCursor.updatePosition(position);
        } else {
            const cursor = new RemoteCursor(this.editor, userId, position, this.getUserColor(userId));
            this.cursors.set(userId, cursor);
        }
    }

    clearAllCursors() {
        this.cursors.forEach(cursor => cursor.remove());
        this.cursors.clear();
    }

    handleUserJoin(user) {
        if (user.id !== this.userId) {
            window.app.showInfo(`${user.display_name} joined the session`);
        }
    }

    handleUserLeave(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.remove();
            this.cursors.delete(userId);
        }

        if (userId !== this.userId) {
            window.app.showInfo('A user left the session');
        }
    }

    updateParticipants(participants) {
        // Update participant list in UI
        const participantList = document.getElementById('participant-list');
        if (participantList) {
            participantList.innerHTML = participants.map(p => `
                <div class="flex items-center space-x-2 p-2">
                    <div class="w-2 h-2 rounded-full" style="background-color: ${this.getUserColor(p.id)}"></div>
                    <span class="text-sm">${p.display_name}</span>
                    ${p.id === this.userId ? '<span class="text-xs text-gray-400">(You)</span>' : ''}
                </div>
            `).join('');
        }
    }

    getUserColor(userId) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#FFB6C1', '#87CEEB', '#F0E68C'
        ];
        
        let hash = 0;
        for (let i = 0; i < userId.toString().length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }

    // Editor methods
    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    setValue(value) {
        if (this.editor) {
            this.editor.setValue(value);
        }
    }

    setMode(mode) {
        if (this.editor) {
            this.editor.setOption('mode', mode);
        }
    }

    setTheme(theme) {
        if (this.editor) {
            this.editor.setOption('theme', theme);
        }
    }

    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    refresh() {
        if (this.editor) {
            this.editor.refresh();
        }
    }

    save() {
        if (this.options.onSave) {
            this.options.onSave(this.getValue());
        }
    }

    runCode() {
        if (this.options.onRun) {
            this.options.onRun(this.getValue());
        }
    }

    toggleComment() {
        if (this.editor) {
            this.editor.execCommand('toggleComment');
        }
    }

    formatCode() {
        if (this.editor) {
            // Basic formatting - in production, use a proper formatter
            const code = this.editor.getValue();
            const formatted = this.formatCodeBasic(code, this.editor.getOption('mode'));
            this.editor.setValue(formatted);
        }
    }

    formatCodeBasic(code, mode) {
        // Very basic formatting - replace with proper formatter in production
        switch (mode) {
            case 'javascript':
                return code.replace(/;/g, ';\n');
            case 'python':
                return code.replace(/:/g, ':\n');
            default:
                return code;
        }
    }

    insertText(text) {
        if (this.editor) {
            const cursor = this.editor.getCursor();
            this.editor.replaceRange(text, cursor);
            this.editor.focus();
        }
    }

    selectLine(line) {
        if (this.editor) {
            const from = { line: line, ch: 0 };
            const to = { line: line, ch: this.editor.getLine(line).length };
            this.editor.setSelection(from, to);
        }
    }

    gotoLine(line) {
        if (this.editor) {
            this.editor.setCursor(line, 0);
            this.editor.centerOnLine(line);
        }
    }

    findAndReplace(searchText, replaceText, options = {}) {
        if (this.editor) {
            const cursor = this.editor.getSearchCursor(searchText, options);
            if (cursor.findNext()) {
                this.editor.replaceRange(replaceText, cursor.from(), cursor.to());
            }
        }
    }

    destroy() {
        if (this.websocket) {
            this.websocket.close();
        }
        
        if (this.editor) {
            this.editor.toTextArea();
        }
        
        this.clearAllCursors();
    }
}

// Remote Cursor class for collaborative editing
class RemoteCursor {
    constructor(editor, userId, position, color) {
        this.editor = editor;
        this.userId = userId;
        this.color = color;
        this.position = position;
        this.element = null;
        
        this.create();
    }

    create() {
        this.element = document.createElement('div');
        this.element.className = 'remote-cursor';
        this.element.style.cssText = `
            position: absolute;
            width: 2px;
            height: 18px;
            background-color: ${this.color};
            border-left: 2px solid ${this.color};
            z-index: 1000;
            pointer-events: none;
        `;
        
        this.label = document.createElement('div');
        this.label.className = 'remote-cursor-label';
        this.label.style.cssText = `
            position: absolute;
            top: -20px;
            left: 2px;
            background-color: ${this.color};
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-family: monospace;
            white-space: nowrap;
            z-index: 1001;
            pointer-events: none;
        `;
        
        this.element.appendChild(this.label);
        this.editor.getWrapperElement().appendChild(this.element);
        
        this.updatePosition(this.position);
    }

    updatePosition(position) {
        if (!this.editor || !this.element) {
            return;
        }

        this.position = position;
        
        const coords = this.editor.charCoords(
            { line: position.line, ch: position.ch },
            'local'
        );
        
        this.element.style.left = coords.left + 'px';
        this.element.style.top = coords.top + 'px';
        
        // Update label position
        if (this.label) {
            this.label.style.transform = `translateX(${coords.left}px) translateY(${coords.top - 20}px)`;
        }
    }

    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for use in other modules
window.CollaborativeEditor = CollaborativeEditor;
window.RemoteCursor = RemoteCursor;