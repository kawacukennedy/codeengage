// Demo Sandbox Component
class DemoSandbox {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            theme: 'dark',
            autoRun: false,
            showConsole: true,
            showPreview: true,
            allowedLanguages: ['javascript', 'html', 'css'],
            ...options
        };
        
        this.code = '';
        this.language = '';
        this.isRunning = false;
        this.console = [];
        this.preview = null;
        
        this.init();
    }

    init() {
        this.container.className = 'demo-sandbox bg-gray-900 rounded-lg overflow-hidden';
        this.createSandboxInterface();
    }

    createSandboxInterface() {
        this.container.innerHTML = `
            <div class="sandbox-header bg-gray-800 border-b border-gray-700 px-4 py-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <h3 class="text-lg font-semibold text-white">Demo Sandbox</h3>
                        <select class="language-selector bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600">
                            <option value="javascript">JavaScript</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                        </select>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="run-button bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium">
                            Run Code
                        </button>
                        <button class="clear-button bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium">
                            Clear
                        </button>
                        <button class="fullscreen-button bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium">
                            Fullscreen
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="sandbox-body grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div class="editor-panel">
                    <div class="editor-header bg-gray-800 px-3 py-2 border-b border-gray-700">
                        <span class="text-sm text-gray-300">Code Editor</span>
                    </div>
                    <div class="editor-content">
                        <textarea class="code-editor w-full h-96 bg-gray-900 text-gray-100 font-mono text-sm p-4 resize-none focus:outline-none" 
                                  placeholder="Write your code here..." spellcheck="false"></textarea>
                    </div>
                </div>
                
                <div class="output-panel">
                    <div class="output-header bg-gray-800 px-3 py-2 border-b border-gray-700">
                        <div class="flex items-center space-x-4">
                            <button class="output-tab active px-2 py-1 text-sm text-gray-300 border-b-2 border-blue-500" data-tab="console">
                                Console
                            </button>
                            <button class="output-tab px-2 py-1 text-sm text-gray-300 hover:text-white" data-tab="preview">
                                Preview
                            </button>
                        </div>
                    </div>
                    
                    <div class="output-content">
                        <div class="console-output h-96 bg-gray-900 p-4 overflow-y-auto font-mono text-sm">
                            <div class="console-line text-gray-500">Console output will appear here...</div>
                        </div>
                        <div class="preview-output h-96 bg-white hidden" id="preview-frame">
                            <iframe class="w-full h-full border-0" src="about:blank"></iframe>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="sandbox-footer bg-gray-800 border-t border-gray-700 px-4 py-2">
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <div class="flex items-center space-x-4">
                        <span>Status: <span class="status-text text-green-400">Ready</span></span>
                        <span>Lines: <span class="line-count">0</span></span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="auto-run mr-1" ${this.options.autoRun ? 'checked' : ''}>
                            Auto-run
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="show-console mr-1" ${this.options.showConsole ? 'checked' : ''}>
                            Show Console
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        this.addEventListeners();
    }

    addEventListeners() {
        const runButton = this.container.querySelector('.run-button');
        const clearButton = this.container.querySelector('.clear-button');
        const fullscreenButton = this.container.querySelector('.fullscreen-button');
        const languageSelector = this.container.querySelector('.language-selector');
        const codeEditor = this.container.querySelector('.code-editor');
        const outputTabs = this.container.querySelectorAll('.output-tab');
        const autoRunCheckbox = this.container.querySelector('.auto-run');
        const showConsoleCheckbox = this.container.querySelector('.show-console');
        
        runButton.addEventListener('click', () => this.runCode());
        
        clearButton.addEventListener('click', () => this.clearSandbox());
        
        fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        
        languageSelector.addEventListener('change', (e) => {
            this.language = e.target.value;
            this.updateEditorForLanguage();
        });
        
        codeEditor.addEventListener('input', (e) => {
            this.code = e.target.value;
            this.updateLineCount();
            
            if (this.options.autoRun) {
                clearTimeout(this.autoRunTimeout);
                this.autoRunTimeout = setTimeout(() => this.runCode(), 1000);
            }
        });
        
        outputTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                outputTabs.forEach(t => t.classList.remove('active', 'border-b-2', 'border-blue-500'));
                e.target.classList.add('active', 'border-b-2', 'border-blue-500');
                
                const tabName = e.target.dataset.tab;
                this.switchOutputTab(tabName);
            });
        });
        
        autoRunCheckbox.addEventListener('change', (e) => {
            this.options.autoRun = e.target.checked;
        });
        
        showConsoleCheckbox.addEventListener('change', (e) => {
            this.options.showConsole = e.target.checked;
            this.updateOutputVisibility();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.runCode();
                } else if (e.key === 'l') {
                    e.preventDefault();
                    this.clearConsole();
                }
            }
        });
    }

    updateEditorForLanguage() {
        const codeEditor = this.container.querySelector('.code-editor');
        const placeholder = {
            javascript: '// Write JavaScript code here\nconsole.log("Hello, World!");',
            html: '<!-- Write HTML code here -->\n<h1>Hello, World!</h1>\n<p>This is a demo.</p>',
            css: '/* Write CSS code here */\nbody {\n  font-family: Arial, sans-serif;\n  background: #f0f0f0;\n}'
        };
        
        codeEditor.placeholder = placeholder[this.language] || placeholder.javascript;
    }

    updateLineCount() {
        const lineCount = this.container.querySelector('.line-count');
        if (lineCount) {
            const lines = this.code.split('\n').length;
            lineCount.textContent = lines;
        }
    }

    updateStatus(status, color = 'text-green-400') {
        const statusText = this.container.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = status;
            statusText.className = `status-text ${color}`;
        }
    }

    switchOutputTab(tabName) {
        const consoleOutput = this.container.querySelector('.console-output');
        const previewOutput = this.container.querySelector('.preview-output');
        
        if (tabName === 'console') {
            consoleOutput.classList.remove('hidden');
            previewOutput.classList.add('hidden');
        } else if (tabName === 'preview') {
            consoleOutput.classList.add('hidden');
            previewOutput.classList.remove('hidden');
        }
    }

    updateOutputVisibility() {
        const outputPanel = this.container.querySelector('.output-panel');
        if (outputPanel) {
            outputPanel.style.display = this.options.showConsole ? 'block' : 'none';
        }
    }

    async runCode() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateStatus('Running...', 'text-yellow-400');
        
        const runButton = this.container.querySelector('.run-button');
        runButton.disabled = true;
        runButton.textContent = 'Running...';
        
        try {
            this.clearConsole();
            
            switch (this.language) {
                case 'javascript':
                    await this.runJavaScript();
                    break;
                case 'html':
                    await this.runHTML();
                    break;
                case 'css':
                    await this.runCSS();
                    break;
                default:
                    throw new Error(`Unsupported language: ${this.language}`);
            }
            
            this.updateStatus('Success', 'text-green-400');
        } catch (error) {
            this.logToConsole(`Error: ${error.message}`, 'error');
            this.updateStatus('Error', 'text-red-400');
        } finally {
            this.isRunning = false;
            runButton.disabled = false;
            runButton.textContent = 'Run Code';
        }
    }

    async runJavaScript() {
        // Create a custom console object
        const customConsole = {
            log: (...args) => this.logToConsole(args.join(' '), 'log'),
            error: (...args) => this.logToConsole(args.join(' '), 'error'),
            warn: (...args) => this.logToConsole(args.join(' '), 'warn'),
            info: (...args) => this.logToConsole(args.join(' '), 'info'),
            clear: () => this.clearConsole()
        };
        
        // Create a sandboxed execution environment
        const sandboxCode = `
            (function() {
                const console = ${JSON.stringify(customConsole)};
                try {
                    ${this.code}
                } catch (error) {
                    console.error(error.message);
                }
            })()
        `;
        
        // Execute the code
        try {
            const func = new Function('console', this.code);
            func(customConsole);
        } catch (error) {
            this.logToConsole(`Execution Error: ${error.message}`, 'error');
        }
    }

    async runHTML() {
        const iframe = this.container.querySelector('#preview-frame iframe');
        if (iframe) {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Demo Preview</title>
                </head>
                <body>
                    ${this.code}
                </body>
                </html>
            `;
            
            iframe.srcdoc = htmlContent;
            this.logToConsole('HTML rendered in preview', 'info');
            
            // Switch to preview tab
            const previewTab = this.container.querySelector('[data-tab="preview"]');
            if (previewTab) {
                previewTab.click();
            }
        }
    }

    async runCSS() {
        const iframe = this.container.querySelector('#preview-frame iframe');
        if (iframe) {
            const cssContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>CSS Demo</title>
                    <style>
                        ${this.code}
                    </style>
                </head>
                <body>
                    <div class="demo-content">
                        <h1>CSS Demo</h1>
                        <p>This text is styled with your CSS.</p>
                        <button>Button Example</button>
                        <div class="box">Box Example</div>
                    </div>
                    <style>
                        .demo-content {
                            padding: 20px;
                            font-family: Arial, sans-serif;
                        }
                        .box {
                            width: 100px;
                            height: 100px;
                            background: #ddd;
                            margin: 10px 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                    </style>
                </body>
                </html>
            `;
            
            iframe.srcdoc = cssContent;
            this.logToConsole('CSS applied to preview', 'info');
            
            // Switch to preview tab
            const previewTab = this.container.querySelector('[data-tab="preview"]');
            if (previewTab) {
                previewTab.click();
            }
        }
    }

    logToConsole(message, type = 'log') {
        const consoleOutput = this.container.querySelector('.console-output');
        if (!consoleOutput) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logLine = document.createElement('div');
        logLine.className = 'console-line mb-1';
        
        const typeColors = {
            log: 'text-gray-300',
            error: 'text-red-400',
            warn: 'text-yellow-400',
            info: 'text-blue-400'
        };
        
        const typeIcons = {
            log: '›',
            error: '✕',
            warn: '⚠',
            info: 'ℹ'
        };
        
        logLine.innerHTML = `
            <span class="text-gray-500">[${timestamp}]</span>
            <span class="${typeColors[type]} ml-2">${typeIcons[type]} ${message}</span>
        `;
        
        // Remove placeholder if it exists
        const placeholder = consoleOutput.querySelector('.text-gray-500');
        if (placeholder && placeholder.textContent.includes('Console output')) {
            placeholder.remove();
        }
        
        consoleOutput.appendChild(logLine);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        // Store in console history
        this.console.push({ timestamp, message, type });
    }

    clearConsole() {
        const consoleOutput = this.container.querySelector('.console-output');
        if (consoleOutput) {
            consoleOutput.innerHTML = `
                <div class="console-line text-gray-500">Console cleared...</div>
            `;
            this.console = [];
        }
    }

    clearSandbox() {
        const codeEditor = this.container.querySelector('.code-editor');
        if (codeEditor) {
            codeEditor.value = '';
            this.code = '';
        }
        
        this.clearConsole();
        
        const iframe = this.container.querySelector('#preview-frame iframe');
        if (iframe) {
            iframe.srcdoc = '';
        }
        
        this.updateLineCount();
        this.updateStatus('Cleared', 'text-gray-400');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen().then(() => {
                this.container.classList.add('fullscreen');
            }).catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                this.container.classList.remove('fullscreen');
            });
        }
    }

    // Public methods
    setCode(code) {
        this.code = code;
        const codeEditor = this.container.querySelector('.code-editor');
        if (codeEditor) {
            codeEditor.value = code;
        }
        this.updateLineCount();
    }

    getCode() {
        return this.code;
    }

    setLanguage(language) {
        this.language = language;
        const languageSelector = this.container.querySelector('.language-selector');
        if (languageSelector) {
            languageSelector.value = language;
        }
        this.updateEditorForLanguage();
    }

    getLanguage() {
        return this.language;
    }

    getConsoleHistory() {
        return this.console;
    }

    destroy() {
        if (this.autoRunTimeout) {
            clearTimeout(this.autoRunTimeout);
        }
        this.container.innerHTML = '';
    }
}

export default DemoSandbox;