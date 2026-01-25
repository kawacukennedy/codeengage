// Main Application Bootstrap
class CodeEngage {
    constructor() {
        this.config = {
            apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
            appName: import.meta.env.VITE_APP_NAME || 'CodeEngage',
            version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        };
        
        this.modules = new Map();
        this.router = null;
        this.apiClient = null;
        this.currentUser = null;
        this.theme = localStorage.getItem('theme') || 'dark';
        
        this.init();
    }

    async init() {
        try {
            // Initialize theme
            this.initTheme();
            
            // Initialize modules
            await this.loadModules();
            
            // Initialize router
            this.initRouter();
            
            // Initialize keyboard shortcuts
            this.initShortcuts();
            
            // Initialize notifications
            this.initNotifications();
            
            // Check authentication
            await this.checkAuth();
            
            // Start router
            this.router.start();
            
            console.log(`${this.config.appName} v${this.config.version} initialized`);
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Application failed to initialize');
        }
    }

    initTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const svg = themeToggle.querySelector('svg');
            if (this.theme === 'light') {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
            } else {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
            }
        }
    }

    async loadModules() {
        // API Client
        this.apiClient = new ApiClient(this.config.apiBaseUrl);
        
        // Other modules will be loaded as needed
        this.modules.set('apiClient', this.apiClient);
    }

    initRouter() {
        this.router = new Router();
        
        // Register routes
        this.router.addRoute('/', 'dashboard', this.pages.dashboard);
        this.router.addRoute('/dashboard', 'dashboard', this.pages.dashboard);
        this.router.addRoute('/snippets', 'snippets', this.pages.snippets);
        this.router.addRoute('/snippets/:id', 'snippet-viewer', this.pages.snippetViewer);
        this.router.addRoute('/editor', 'snippet-editor', this.pages.snippetEditor);
        this.router.addRoute('/editor/:id', 'snippet-editor', this.pages.snippetEditor);
        this.router.addRoute('/profile', 'profile', this.pages.profile);
        this.router.addRoute('/login', 'login', this.pages.login);
        this.router.addRoute('/signup', 'signup', this.pages.signup);
        this.router.addRoute('/admin', 'admin', this.pages.admin);
        
        // 404 handler
        this.router.setNotFoundHandler(() => {
            this.showPage('404');
        });
    }

    initShortcuts() {
        this.shortcutManager = new ShortcutManager();
        
        // Global shortcuts
        this.shortcutManager.add(['Ctrl+K', 'Cmd+K'], () => {
            this.commandPalette.show();
        });
        
        this.shortcutManager.add(['Ctrl+/', 'Cmd+/'], () => {
            this.showShortcuts();
        });
        
        this.shortcutManager.add(['Ctrl+N', 'Cmd+N'], () => {
            this.router.navigate('/editor');
        });
        
        this.shortcutManager.add(['Ctrl+S', 'Cmd+S'], (e) => {
            // Handle save in editor
            if (this.currentPage === 'snippet-editor') {
                e.preventDefault();
                this.saveCurrentSnippet();
            }
        });
    }

    initNotifications() {
        this.notificationSystem = new NotificationSystem();
        this.modules.set('notifications', this.notificationSystem);
    }

    async checkAuth() {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                this.apiClient.setAuthToken(token);
                const response = await this.apiClient.get('/auth/me');
                if (response.success) {
                    this.currentUser = response.data;
                    this.updateUserUI();
                } else {
                    localStorage.removeItem('auth_token');
                    this.apiClient.setAuthToken(null);
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('auth_token');
            this.apiClient.setAuthToken(null);
        }
    }

    updateUserUI() {
        const userMenu = document.getElementById('user-menu');
        if (userMenu && this.currentUser) {
            const avatar = userMenu.querySelector('img');
            if (avatar) {
                avatar.src = this.currentUser.avatar_url || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.display_name)}&background=374151&color=f3f4f6`;
                avatar.alt = this.currentUser.display_name;
            }
        }
    }

    async showPage(pageName, data = {}) {
        this.currentPage = pageName;
        
        // Hide loading indicator
        document.getElementById('app-loading').classList.add('hidden');
        
        // Clear main content
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = '';
        
        try {
            // Load page content
            let content;
            switch (pageName) {
                case 'dashboard':
                    content = await this.loadDashboard(data);
                    break;
                case 'snippets':
                    content = await this.loadSnippets(data);
                    break;
                case 'snippet-viewer':
                    content = await this.loadSnippetViewer(data);
                    break;
                case 'snippet-editor':
                    content = await this.loadSnippetEditor(data);
                    break;
                case 'profile':
                    content = await this.loadProfile(data);
                    break;
                case 'login':
                    content = await this.loadLogin(data);
                    break;
                case 'signup':
                    content = await this.loadSignup(data);
                    break;
                case 'admin':
                    content = await this.loadAdmin(data);
                    break;
                case '404':
                    content = this.load404();
                    break;
                default:
                    throw new Error(`Unknown page: ${pageName}`);
            }
            
            mainContent.appendChild(content);
            
            // Initialize page-specific functionality
            this.initPage(pageName, data);
            
        } catch (error) {
            console.error(`Failed to load page ${pageName}:`, error);
            mainContent.innerHTML = `
                <div class="container mx-auto px-4 py-8">
                    <div class="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-6">
                        <h2 class="text-red-400 text-xl font-semibold mb-2">Page Load Error</h2>
                        <p class="text-red-300">Failed to load the requested page. Please try again.</p>
                    </div>
                </div>
            `;
        }
    }

    // Page loading methods (to be implemented)
    async loadDashboard() {
        const Dashboard = (await import('./pages/dashboard.js')).default;
        return new Dashboard(this).render();
    }

    async loadSnippets() {
        const Snippets = (await import('./pages/snippets.js')).default;
        return new Snippets(this).render();
    }

    async loadSnippetViewer(data) {
        const SnippetViewer = (await import('./pages/snippet-viewer.js')).default;
        return new SnippetViewer(this, data.id).render();
    }

    async loadSnippetEditor(data) {
        const SnippetEditor = (await import('./pages/snippet-editor.js')).default;
        return new SnippetEditor(this, data.id).render();
    }

    async loadProfile() {
        const Profile = (await import('./pages/profile.js')).default;
        return new Profile(this).render();
    }

    async loadLogin() {
        const Login = (await import('./pages/login.js')).default;
        return new Login(this).render();
    }

    async loadSignup() {
        const Signup = (await import('./pages/signup.js')).default;
        return new Signup(this).render();
    }

    async loadAdmin() {
        const Admin = (await import('./pages/admin.js')).default;
        return new Admin(this).render();
    }

    load404() {
        const div = document.createElement('div');
        div.className = 'container mx-auto px-4 py-8 text-center';
        div.innerHTML = `
            <div class="py-12">
                <h1 class="text-6xl font-bold text-gray-600 mb-4">404</h1>
                <h2 class="text-2xl font-semibold text-gray-400 mb-4">Page Not Found</h2>
                <p class="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
                <a href="/" class="btn btn-primary">Go Home</a>
            </div>
        `;
        return div;
    }

    // Utility methods
    showSuccess(message) {
        this.notificationSystem.success(message);
    }

    showError(message) {
        this.notificationSystem.error(message);
    }

    showWarning(message) {
        this.notificationSystem.warning(message);
    }

    showInfo(message) {
        this.notificationSystem.info(message);
    }

    async logout() {
        try {
            await this.apiClient.post('/auth/logout');
            localStorage.removeItem('auth_token');
            this.apiClient.setAuthToken(null);
            this.currentUser = null;
            this.router.navigate('/');
            this.showSuccess('Logged out successfully');
        } catch (error) {
            this.showError('Logout failed');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CodeEngage();
});

// Page registry
window.app.pages = {};