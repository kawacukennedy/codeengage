// Collaborative Editor - CodeMirror 6 Wrapper
import { EditorState, Compartment, StateField, StateEffect } from 'https://esm.sh/@codemirror/state';
import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
    foldGutter,
    drawSelection,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    highlightSelectionMatches,
    Decoration
} from 'https://esm.sh/@codemirror/view';
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
    insertNewlineAndIndent,
    toggleComment
} from 'https://esm.sh/@codemirror/commands';
import {
    indentOnInput,
    bracketMatching,
    foldKeymap,
    LanguageDescription,
    syntaxHighlighting,
    defaultHighlightStyle
} from 'https://esm.sh/@codemirror/language';
import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap
} from 'https://esm.sh/@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches as searchHighlight } from 'https://esm.sh/@codemirror/search';
import { javascript } from 'https://esm.sh/@codemirror/lang-javascript';
import { python } from 'https://esm.sh/@codemirror/lang-python';
import { php } from 'https://esm.sh/@codemirror/lang-php';
import { html } from 'https://esm.sh/@codemirror/lang-html';
import { css } from 'https://esm.sh/@codemirror/lang-css';
import { sql } from 'https://esm.sh/@codemirror/lang-sql';
import { markdown } from 'https://esm.sh/@codemirror/lang-markdown';

// Custom Themes for CM6
const draculaTheme = EditorView.theme({
    "&": {
        color: "#f8f8f2",
        backgroundColor: "#282a36"
    },
    ".cm-content": {
        caretColor: "#aeafad"
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "#aeafad"
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "#44475a"
    },
    ".cm-gutters": {
        backgroundColor: "#282a36",
        color: "#6272a4",
        border: "none"
    },
    ".cm-activeLine": {
        backgroundColor: "rgba(255, 255, 255, 0.05)"
    },
    ".cm-activeLineGutter": {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        color: "#f8f8f2"
    }
}, { dark: true });

const nordTheme = EditorView.theme({
    "&": {
        color: "#d8dee9",
        backgroundColor: "#2e3440"
    },
    ".cm-gutters": {
        backgroundColor: "#2e3440",
        color: "#4c566a",
        border: "none"
    }
}, { dark: true });

const monokaiTheme = EditorView.theme({
    "&": {
        color: "#f8f8f2",
        backgroundColor: "#272822"
    },
    ".cm-gutters": {
        backgroundColor: "#272822",
        color: "#8f908a",
        border: "none"
    }
}, { dark: true });

export class CollaborativeEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            value: '',
            language: 'javascript',
            theme: 'dracula',
            lineNumbers: true,
            indentUnit: 4,
            readOnly: false,
            ...options
        };

        this.editor = null;
        this.compartments = {
            language: new Compartment(),
            theme: new Compartment(),
            readOnly: new Compartment()
        };

        this.isCollaborating = false;
        this.sessionToken = null;
        this.currentVersion = 0;
        this.isPolling = false;
        this.participants = [];
        this.isPreviewActive = false;
        this.userId = window.app.auth?.user?.id;

        this.init();
    }

    async init() {
        this.createEditor();
        this.initMinimap();

        if (this.options.collaborate) {
            this.setupCollaboration();
        }

        if (this.options.onReady) {
            this.options.onReady(this);
        }
    }

    createEditor() {
        const state = EditorState.create({
            doc: this.options.value || '',
            extensions: [
                lineNumbers(),
                highlightActiveLine(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                crosshairCursor(),
                highlightSelectionMatches(),
                history(),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...searchKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    indentWithTab,
                    { key: "Mod-s", run: () => { this.save(); return true; } },
                    { key: "Mod-Enter", run: () => { this.runCode(); return true; } },
                    { key: "Mod-/", run: () => { this.toggleComment(); return true; } }
                ]),
                this.compartments.language.of(this.getLanguageExtension(this.options.language)),
                this.compartments.theme.of(this.getThemeExtension(this.options.theme)),
                this.compartments.readOnly.of(EditorState.readOnly.of(this.options.readOnly || false)),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        this.handleDocChange(update);
                    }
                })
            ]
        });

        this.editor = new EditorView({
            state,
            parent: this.container
        });

        // Set initial size
        this.editor.dom.style.height = "100%";
        this.editor.dom.style.width = "100%";
        this.editor.dom.classList.add('premium-editor');
    }

    getLanguageExtension(lang) {
        switch (lang?.toLowerCase()) {
            case 'javascript':
            case 'typescript': return javascript();
            case 'python': return python();
            case 'php': return php();
            case 'html': return html();
            case 'css': return css();
            case 'sql': return sql();
            case 'markdown': return markdown();
            default: return javascript();
        }
    }

    getThemeExtension(theme) {
        switch (theme?.toLowerCase()) {
            case 'dracula': return draculaTheme;
            case 'nord': return nordTheme;
            case 'monokai': return monokaiTheme;
            default: return draculaTheme;
        }
    }

    handleDocChange(update) {
        if (this.options.onChange) {
            this.options.onChange(this.getValue());
        }

        if (this.isPreviewActive) {
            this.updatePreview();
        }

        if (this.isCollaborating && !update.transactions.some(tr => tr.annotation(StateEffect.define()))) {
            // Push changes
            this.pushChange(update.changes.toJSON());
        }
    }

    async pushChange(changes) {
        if (!this.isCollaborating || !this.sessionToken) return;
        try {
            await window.app.apiClient.post(`/collaboration/sessions/${this.sessionToken}/updates`, {
                change: JSON.stringify(changes),
                v: this.currentVersion
            });
        } catch (error) {
            console.error('Push change failed:', error);
        }
    }

    async setupCollaboration() {
        if (!this.options.snippetId) return;

        try {
            const res = await window.app.apiClient.post(`/snippets/${this.options.snippetId}/collaborate`);
            if (res.success) {
                this.sessionToken = res.data.session_token;
                this.isCollaborating = true;
                this.pollUpdates();
            }
        } catch (error) {
            console.error('Collaboration setup failed:', error);
        }
    }

    async pollUpdates() {
        if (!this.isCollaborating || !this.sessionToken || this.isPolling) return;
        this.isPolling = true;

        try {
            const data = await window.app.apiClient.get(
                `/collaboration/sessions/${this.sessionToken}/updates?v=${this.currentVersion}`
            );
            if (data && data.version !== undefined && data.version > this.currentVersion) {
                this.currentVersion = data.version;
                this.applyRemoteUpdate(data);
            }
        } catch (error) {
            if (error.status !== 408) console.error('Polling error:', error);
        } finally {
            this.isPolling = false;
            if (this.isCollaborating) {
                setTimeout(() => this.pollUpdates(), 1000);
            }
        }
    }

    applyRemoteUpdate(data) {
        if (data.metadata?.last_change && parseInt(data.metadata.last_change_by) !== this.userId) {
            const changes = JSON.parse(data.metadata.last_change);
            this.editor.dispatch({
                changes: changes,
                annotations: [StateEffect.define()] // Mark as remote
            });
        }

        if (data.participants) {
            this.participants = data.participants;
            this.updateParticipantsUI();
        }
    }

    initMinimap() {
        const minimap = document.createElement('div');
        minimap.className = 'cm-minimap fixed right-4 top-24 w-32 h-64 bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden pointer-events-none z-10 hidden md:block';
        minimap.style.fontSize = '2px';
        minimap.style.lineHeight = '1';
        minimap.style.color = 'rgba(255,255,255,0.2)';
        minimap.id = 'editor-minimap';
        this.container.appendChild(minimap);

        this.updateMinimap();
    }

    updateMinimap() {
        const minimap = document.getElementById('editor-minimap');
        if (minimap) {
            minimap.textContent = this.getValue().substring(0, 2000); // Limit size
        }
    }

    updateParticipantsUI() {
        const container = document.getElementById('participant-avatars');
        if (!container) return;

        container.innerHTML = this.participants.map(p => `
            <div class="w-8 h-8 rounded-full border-2 border-gray-900 overflow-hidden flex items-center justify-center -ml-2 first:ml-0 bg-gray-800" title="${p.display_name}">
                <span class="text-xs font-bold text-neon-blue">${p.display_name.charAt(0)}</span>
            </div>
        `).join('');
    }

    // Public API
    getValue() { return this.editor ? this.editor.state.doc.toString() : ''; }

    setValue(value) {
        if (!this.editor) return;
        this.editor.dispatch({
            changes: { from: 0, to: this.editor.state.doc.length, insert: value }
        });
    }

    setOption(option, value) {
        if (!this.editor) return;
        if (option === 'mode' || option === 'language') {
            this.editor.dispatch({
                effects: this.compartments.language.reconfigure(this.getLanguageExtension(value))
            });
        } else if (option === 'theme') {
            this.editor.dispatch({
                effects: this.compartments.theme.reconfigure(this.getThemeExtension(value))
            });
        } else if (option === 'readOnly') {
            this.editor.dispatch({
                effects: this.compartments.readOnly.reconfigure(EditorState.readOnly.of(value))
            });
        }
    }

    toggleComment() {
        if (this.editor) toggleComment(this.editor);
    }

    async toggleFocusMode() {
        document.body.classList.toggle('focus-mode');
        window.app.showInfo(document.body.classList.contains('focus-mode') ? 'Focus Mode ON' : 'Focus Mode OFF');
    }

    async toggleMarkdownPreview() {
        this.isPreviewActive = !this.isPreviewActive;
        const editorContainer = this.container;

        if (this.isPreviewActive) {
            if (!document.getElementById('markdown-preview')) {
                const preview = document.createElement('div');
                preview.id = 'markdown-preview';
                preview.className = 'markdown-preview prose prose-invert p-6 overflow-y-auto bg-gray-900/30 border-l border-gray-700 w-1/2';
                editorContainer.parentElement.classList.add('flex');
                editorContainer.classList.add('w-1/2');
                editorContainer.parentElement.appendChild(preview);
            }
            this.updatePreview();
        } else {
            const preview = document.getElementById('markdown-preview');
            if (preview) {
                preview.remove();
                editorContainer.parentElement.classList.remove('flex');
                editorContainer.classList.remove('w-1/2');
            }
        }
    }

    updatePreview() {
        const preview = document.getElementById('markdown-preview');
        if (!preview) return;

        const content = this.getValue();
        if (window.marked) {
            preview.innerHTML = window.marked.parse(content);
        } else {
            preview.innerHTML = `<pre>${content}</pre>`;
        }
    }

    save() {
        if (this.options.onSave) this.options.onSave(this.getValue());
        window.app.showSuccess('Snippet saved');
    }

    runCode() {
        if (this.options.onRun) this.options.onRun(this.getValue());
    }

    destroy() {
        this.updatePosition(this.position);
    }

    updatePosition(position) {
        if (!this.editor || !this.element) return;
        this.position = position;
        const coords = this.editor.charCoords({ line: position.line, ch: position.ch }, 'local');
        this.element.style.left = coords.left + 'px';
        this.element.style.top = coords.top + 'px';
        if (this.label) {
            this.label.style.transform = `translateX(${coords.left}px) translateY(${coords.top - 20}px)`;
        }
    }

    remove() {
        if (this.element && this.element.parentNode) this.element.parentNode.removeChild(this.element);
    }
}

export default CollaborativeEditor;