// Keyboard Shortcuts Manager
class ShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.isModalOpen = false;
        this.init();
    }

    init() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        document.addEventListener('keyup', this.handleKeyup.bind(this));
        
        // Disable shortcuts when typing in input fields
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
                this.isModalOpen = true;
            }
        });
        
        document.addEventListener('focusout', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
                this.isModalOpen = false;
            }
        });
    }

    add(keyCombos, callback, options = {}) {
        if (!Array.isArray(keyCombos)) {
            keyCombos = [keyCombos];
        }

        keyCombos.forEach(combo => {
            const parsed = this.parseKeyCombo(combo);
            const key = this.getKeyKey(parsed);
            
            this.shortcuts.set(key, {
                combo: parsed,
                callback,
                preventDefault: options.preventDefault !== false,
                stopPropagation: options.stopPropagation !== false
            });
        });
    }

    remove(keyCombos) {
        if (!Array.isArray(keyCombos)) {
            keyCombos = [keyCombos];
        }

        keyCombos.forEach(combo => {
            const parsed = this.parseKeyCombo(combo);
            const key = this.getKeyKey(parsed);
            this.shortcuts.delete(key);
        });
    }

    parseKeyCombo(combo) {
        const keys = combo.split('+').map(k => k.trim().toLowerCase());
        return {
            ctrl: keys.includes('ctrl'),
            alt: keys.includes('alt'),
            shift: keys.includes('shift'),
            meta: keys.includes('cmd') || keys.includes('meta'),
            key: keys.find(k => !['ctrl', 'alt', 'shift', 'cmd', 'meta'].includes(k))
        };
    }

    getKeyKey(combo) {
        return `${combo.ctrl ? 'ctrl+' : ''}${combo.alt ? 'alt+' : ''}${combo.shift ? 'shift+' : ''}${combo.meta ? 'meta+' : ''}${combo.key}`;
    }

    eventToCombo(event) {
        return {
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey,
            meta: event.metaKey,
            key: event.key.toLowerCase()
        };
    }

    combosMatch(combo1, combo2) {
        return combo1.ctrl === combo2.ctrl &&
               combo1.alt === combo2.alt &&
               combo1.shift === combo2.shift &&
               combo1.meta === combo2.meta &&
               combo1.key === combo2.key;
    }

    handleKeydown(event) {
        if (this.isModalOpen) return;

        const eventCombo = this.eventToCombo(event);
        const eventKey = this.getKeyKey(eventCombo);

        for (const [shortcutKey, shortcut] of this.shortcuts) {
            if (this.combosMatch(shortcut.combo, eventCombo)) {
                if (shortcut.preventDefault) {
                    event.preventDefault();
                }
                if (shortcut.stopPropagation) {
                    event.stopPropagation();
                }
                
                try {
                    shortcut.callback(event);
                } catch (error) {
                    console.error('Shortcut callback error:', error);
                }
                
                return;
            }
        }
    }

    handleKeyup(event) {
        // Could be used for key release handling if needed
    }

    // Get available shortcuts for help modal
    getShortcuts() {
        const shortcuts = [];
        
        for (const [key, shortcut] of this.shortcuts) {
            const combo = this.formatCombo(shortcut.combo);
            shortcuts.push({
                combo,
                key,
                description: shortcut.description || 'No description'
            });
        }
        
        return shortcuts;
    }

    formatCombo(combo) {
        const parts = [];
        
        if (combo.ctrl) parts.push('Ctrl');
        if (combo.alt) parts.push('Alt');
        if (combo.shift) parts.push('Shift');
        if (combo.meta) parts.push('Cmd');
        if (combo.key) parts.push(combo.key.toUpperCase());
        
        return parts.join(' + ');
    }

    // Show shortcuts help modal
    showHelp() {
        const shortcuts = this.getShortcuts();
        const modal = this.createHelpModal(shortcuts);
        document.body.appendChild(modal);
        
        // Focus and handle keyboard navigation
        modal.focus();
        this.setupHelpModal(modal);
    }

    createHelpModal(shortcuts) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.tabIndex = -1;
        
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div class="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
                    <button class="text-gray-400 hover:text-white transition-colors" onclick="this.closest('.fixed').remove()">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${shortcuts.map(shortcut => `
                            <div class="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                                <span class="text-gray-300">${shortcut.description}</span>
                                <kbd class="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300">
                                    ${shortcut.combo}
                                </kbd>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    setupHelpModal(modal) {
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
            }
        });
    }
}

// Export for use in other modules
window.ShortcutManager = ShortcutManager;