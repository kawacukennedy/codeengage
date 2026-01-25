// Notification System
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('toast-container') || this.createContainer();
        this.notifications = new Map();
        this.defaultDuration = 5000;
        this.maxNotifications = 5;
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', options = {}) {
        const id = this.generateId();
        const duration = options.duration || this.defaultDuration;
        const persistent = options.persistent || false;

        // Remove oldest notifications if we exceed the limit
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }

        const notification = this.createNotification(id, message, type, options);
        this.container.appendChild(notification);

        // Track notification
        this.notifications.set(id, {
            element: notification,
            timer: null,
            persistent
        });

        // Add enter animation
        requestAnimationFrame(() => {
            notification.classList.add('notification-enter');
        });

        // Auto-remove if not persistent
        if (!persistent) {
            const timer = setTimeout(() => {
                this.remove(id);
            }, duration);
            this.notifications.get(id).timer = timer;
        }

        return id;
    }

    success(message, options = {}) {
        return this.show(message, 'success', { ...options, icon: '✓' });
    }

    error(message, options = {}) {
        return this.show(message, 'error', { ...options, duration: 10000, icon: '✕' });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', { ...options, icon: '⚠' });
    }

    info(message, options = {}) {
        return this.show(message, 'info', { ...options, icon: 'ℹ' });
    }

    createNotification(id, message, type, options = {}) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md transition-all duration-300 transform`;
        notification.dataset.id = id;

        const typeStyles = {
            success: 'border-green-500 text-green-400',
            error: 'border-red-500 text-red-400',
            warning: 'border-yellow-500 text-yellow-400',
            info: 'border-blue-500 text-blue-400'
        };

        const icons = {
            success: options.icon || '✓',
            error: options.icon || '✕',
            warning: options.icon || '⚠',
            info: options.icon || 'ℹ'
        };

        notification.classList.add(...typeStyles[type].split(' '));

        notification.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0 text-xl">
                    ${icons[type]}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-white text-sm leading-relaxed">${this.escapeHtml(message)}</p>
                    ${options.action ? this.createActionHTML(options.action) : ''}
                </div>
                <button class="notification-close flex-shrink-0 text-gray-400 hover:text-white transition-colors ml-2" onclick="window.app.modules.get('notifications').remove('${id}')">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        // Add hover effect for non-persistent notifications
        if (!options.persistent) {
            notification.addEventListener('mouseenter', () => {
                this.pauseTimer(id);
            });

            notification.addEventListener('mouseleave', () => {
                this.resumeTimer(id);
            });
        }

        return notification;
    }

    createActionHTML(action) {
        return `
            <div class="mt-2 pt-2 border-t border-gray-700">
                <button onclick="(${action.callback})()" class="btn btn-sm btn-primary">
                    ${action.text}
                </button>
            </div>
        `;
    }

    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Add exit animation
        notification.element.classList.add('notification-exit');
        
        // Remove after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    pauseTimer(id) {
        const notification = this.notifications.get(id);
        if (notification && notification.timer) {
            clearTimeout(notification.timer);
            notification.timer = null;
        }
    }

    resumeTimer(id) {
        const notification = this.notifications.get(id);
        if (notification && !notification.persistent && !notification.timer) {
            notification.timer = setTimeout(() => {
                this.remove(id);
            }, this.defaultDuration);
        }
    }

    clear() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
    }

    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Progress notifications
    showProgress(message, progress = 0) {
        const id = this.show(message, 'info', { persistent: true });
        const notification = this.notifications.get(id);
        
        // Add progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'mt-2 bg-gray-700 rounded-full h-1';
        progressBar.innerHTML = `
            <div class="bg-blue-500 h-1 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
        `;
        
        notification.element.querySelector('.flex-1').appendChild(progressBar);
        notification.progress = true;
        
        return {
            updateProgress: (newProgress) => {
                const bar = progressBar.querySelector('.bg-blue-500');
                if (bar) {
                    bar.style.width = `${newProgress}%`;
                }
            },
            complete: (message = 'Complete!') => {
                this.update(id, message, 'success');
                setTimeout(() => this.remove(id), 3000);
            },
            error: (message = 'Failed!') => {
                this.update(id, message, 'error');
                setTimeout(() => this.remove(id), 5000);
            }
        };
    }

    update(id, message, type) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Update message
        const messageElement = notification.element.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }

        // Update type classes
        const typeStyles = {
            success: 'border-green-500 text-green-400',
            error: 'border-red-500 text-red-400',
            warning: 'border-yellow-500 text-yellow-400',
            info: 'border-blue-500 text-blue-400'
        };

        // Remove old type classes
        Object.values(typeStyles).forEach(classes => {
            classes.split(' ').forEach(cls => notification.element.classList.remove(cls));
        });

        // Add new type classes
        notification.element.classList.add(...typeStyles[type].split(' '));
    }
}

// Add CSS for notifications
const notificationStyles = `
.notification {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
}

.notification-enter {
    opacity: 1;
    transform: translateX(0) scale(1);
}

.notification-exit {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
}

.notification-close {
    opacity: 0.7;
}

.notification-close:hover {
    opacity: 1;
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Export for use in other modules
window.NotificationSystem = NotificationSystem;