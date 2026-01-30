/**
 * Main Application
 * 
 * Entry point for the CodeEngage frontend application.
 * Orchestrates all modules and initializes the app.
 */

import { Router } from './modules/router.js';
import { Auth } from './modules/auth.js';
import { ApiClient } from './modules/api/client.js';
import { Dashboard } from './pages/dashboard.js';
import { Snippets } from './pages/snippets.js';
import { Profile } from './pages/profile.js';
import { Settings } from './pages/settings.js';
import { Admin } from './pages/admin.js';
import { Organizations } from './pages/organizations.js';
import { SnippetViewer } from './pages/snippet-viewer.js';
import SnippetEditor from './pages/snippet-editor.js';
import NotificationSystem from './modules/components/notification-system.js';
import CommandPalette from './modules/components/command-palette.js';
import CodeVisualizer from './modules/components/code-visualizer.js';
import ShortcutManager from './modules/components/shortcut-manager.js';

class App {
    constructor() {
        // Expose app instance globally immediately
        window.app = this;

        this.apiClient = new ApiClient();
        this.router = new Router(this);
        this.auth = new Auth(this);
        this.notifications = new NotificationSystem();
        this.commandPalette = new CommandPalette();
        this.shortcutManager = new ShortcutManager(this);
        this.visualizer = null; // Will be initialized when needed
        this.currentPage = null;

        // Initialize modules
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Register Service Worker for offline support
            this.registerServiceWorker();

            // Handle online/offline events
            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());

            // Setup global auth interceptor (Network resilience)
            this.apiClient.addResponseInterceptor(async (response) => {
                if (response.status === 401 || response.status === 403) {
                    // Only redirect if we are not already on login/register pages
                    const path = window.location.pathname;
                    if (path !== '/login' && path !== '/register') {
                        console.warn('Session expired or invalid, redirecting to login');
                        await this.auth.logout(false); // Client-side cleanup only
                    }
                }
                return response;
            });

            this.initTheme();

            await this.auth.init();
            this.setupGlobalListeners();
            this.setupRoutes();
            this.router.handleRouteChange();
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showError('Application failed to initialize properly');
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    }

    handleOnline() {
        this.showSuccess('You are back online');
        document.body.classList.remove('is-offline');
    }

    handleOffline() {
        this.showError('You are currently offline. Some features may be unavailable.');
        document.body.classList.add('is-offline');
    }

    /**
     * Initialize/Update theme based on settings
     */
    initTheme() {
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        // Public routes
        this.router.add('/', () => this.renderLanding());

        // Protected routes
        this.router.add('/dashboard', async () => {
            this.currentPage = new Dashboard(this);
            await this.currentPage.init();
        }, { protected: true });

        this.router.add('/snippets', async () => {
            this.currentPage = new Snippets(this);
            await this.currentPage.init();
        }, { protected: true });

        this.router.add('/snippet/:id', async (params) => {
            this.currentPage = new SnippetViewer(this, params.id);
            await this.currentPage.init();
        }, { protected: true });

        this.router.add('/profile', async () => {
            this.currentPage = new Profile(this);
            await this.currentPage.init();
        }, { protected: true });

        this.router.add('/settings', async () => {
            this.currentPage = new Settings(this);
            await this.currentPage.init();
        }, { protected: true });

        // Organization Routes
        this.router.add('/organizations', async () => {
            this.currentPage = new Organizations(this, 'list');
            await this.currentPage.init();
        }, { protected: true });

        this.router.add('/organizations/new', async () => {
            this.currentPage = new Organizations(this, 'create');
            await this.currentPage.init();
        }, { protected: true });

        this.router.add('/organizations/:id', async (params) => {
            this.currentPage = new Organizations(this, 'details', params);
            await this.currentPage.init();
        }, { protected: true });

        this.router.add('/admin', async () => {
            if (this.auth.user?.role !== 'admin') {
                return this.router.navigate('/dashboard');
            }
            this.currentPage = new Admin(this);
            await this.currentPage.init();
        }, { protected: true });

        // Starred route - redirect to dashboard which shows starred snippets
        this.router.add('/starred', async () => {
            this.router.navigate('/dashboard');
        }, { protected: true });

        this.router.add('/join/:token', async (params) => {
            try {
                const response = await this.apiClient.post('/collaboration/join_invite', { token: params.token });
                if (response.success) {
                    // Navigate to editor for the snippet with join token
                    const session = response.data;
                    this.router.navigate(`/editor/${session.snippet_id}?join_token=${params.token}`);
                }
            } catch (error) {
                this.showError('Invalid or expired invite link');
                this.router.navigate('/dashboard');
            }
        }, { protected: true });

        this.router.add('/new', async () => {
            this.currentPage = new SnippetEditor(this);
            await this.currentPage.init();
            this.currentPage.render();
        }, { protected: true });

        this.router.add('/editor/:id', async (params) => {
            this.currentPage = new SnippetEditor(this, params.id);
            await this.currentPage.init();
            this.currentPage.render();
        }, { protected: true });

        // Auth routes
        this.router.add('/login', async () => {
            if (this.auth.isAuthenticated()) return this.router.navigate('/dashboard');
            this.renderLogin();
        }, { guest: true });

        this.router.add('/register', async () => {
            if (this.auth.isAuthenticated()) return this.router.navigate('/dashboard');
            this.renderRegister();
        }, { guest: true });
    }

    /**
     * Render login page
     */
    renderLogin() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="min-h-screen flex bg-deep-space">
                <!-- Visual Side -->
                <div class="hidden md:flex w-1/2 relative items-center justify-center p-12 overflow-hidden sticky top-0 h-screen">
                    <div class="absolute inset-0 bg-gradient-radial from-neon-purple/20 to-transparent opacity-50"></div>
                    <div class="absolute -top-40 -left-40 w-96 h-96 bg-neon-blue rounded-full blur-[128px] opacity-20 animate-pulse-slow"></div>
                    <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-neon-purple rounded-full blur-[128px] opacity-20 animate-pulse-slow" style="animation-delay: 1s"></div>
                    
                    <div class="relative z-10 max-w-lg text-center">
                         <div class="mb-8 relative group">
                            <div class="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <div class="glass-strong p-6 rounded-2xl border border-white/10 transform rotate-[-2deg] group-hover:rotate-0 transition duration-500">
                                <pre class="text-left text-sm font-mono text-gray-300"><code><span class="text-neon-purple">async function</span> <span class="text-neon-blue">innovate</span>() {
  <span class="text-neon-purple">await</span> CodeEngage.connect();
  <span class="text-gray-500">// Build the future</span>
  <span class="text-neon-purple">return</span> <span class="text-green-400">true</span>;
}</code></pre>
                            </div>
                        </div>
                        <h2 class="text-4xl font-bold text-white mb-4 tracking-tight">Welcome Back</h2>
                        <p class="text-lg text-gray-400 leading-relaxed">Return to your collaborative workspace and continue building amazing things.</p>
                    </div>
                </div>

                <!-- Form Side -->
                <div class="w-full lg:w-1/2 lg:ml-auto flex items-center justify-center p-4 md:p-8 relative min-h-screen overflow-y-auto">
                    <div class="absolute inset-0 bg-[url('/assets/svg/grid-pattern.svg')] opacity-5"></div>
                    <!-- Mobile Background Elements -->
                    <div class="lg:hidden absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 rounded-full blur-[80px]"></div>
                    <div class="lg:hidden absolute bottom-0 left-0 w-64 h-64 bg-neon-blue/20 rounded-full blur-[80px]"></div>
                    
                    <div class="w-full max-w-md glass p-6 md:p-10 rounded-3xl relative z-10 animate-fade-in mx-auto">
                        <div class="mb-8 text-center md:text-left">
                            <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 text-neon-blue mb-4">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                            </div>
                            <h1 class="text-2xl font-bold text-white mb-2">Sign In</h1>
                            <p class="text-gray-400">Enter your credentials to access your account.</p>
                        </div>

                        <form id="login-form" class="space-y-6">
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-300">Email Address</label>
                                <input type="email" name="email" class="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none" placeholder="name@company.com" required>
                            </div>
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-sm font-medium text-gray-300">Password</label>
                                    <a href="#" class="text-sm text-neon-blue hover:text-neon-purple transition-colors">Forgot password?</a>
                                </div>
                                <input type="password" name="password" class="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none" placeholder="••••••••" required>
                            </div>
                            
                            <button type="submit" class="w-full btn-primary rounded-xl py-3.5 font-semibold text-white shadow-neon transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Sign In
                            </button>

                            <p class="text-center text-sm text-gray-400">
                                Don't have an account? 
                                <a href="/register" class="text-neon-blue font-medium hover:text-neon-purple transition-colors">Create account</a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            const button = e.target.querySelector('button');
            const originalText = button.innerHTML;

            try {
                button.disabled = true;
                button.innerHTML = '<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>';

                const result = await this.auth.login(email, password);

                if (result.success) {
                    this.router.navigate('/dashboard');
                } else {
                    this.showError(result.message);
                }
            } finally {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        });
    }

    /**
     * Render register page
     */
    renderRegister() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="min-h-screen flex bg-deep-space">
                <!-- Visual Side -->
                <div class="hidden md:flex w-1/2 relative items-center justify-center p-12 overflow-hidden sticky top-0 h-screen">
                    <div class="absolute inset-0 bg-gradient-radial from-neon-blue/20 to-transparent opacity-50"></div>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]"></div>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-neon-purple/20 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
                    
                    <div class="relative z-10 max-w-lg text-center">
                         <div class="mb-8 flex justify-center">
                            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple p-0.5 transform rotate-3 hover:rotate-6 transition duration-300">
                                <div class="w-full h-full bg-gray-900 rounded-2xl flex items-center justify-center">
                                    <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                </div>
                            </div>
                        </div>
                        <h2 class="text-4xl font-bold text-white mb-4 tracking-tight">Join the Revolution</h2>
                        <p class="text-lg text-gray-400 leading-relaxed">Collaborate with thousands of developers building the future of software.</p>
                    </div>
                </div>

                <!-- Form Side -->
                <div class="w-full lg:w-1/2 lg:ml-auto flex items-center justify-center p-4 md:p-8 relative min-h-screen overflow-y-auto">
                    <!-- Mobile Background Elements -->
                    <div class="lg:hidden absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 rounded-full blur-[80px]"></div>

                    <div class="w-full max-w-md glass p-6 md:p-10 rounded-3xl relative z-10 animate-fade-in my-10 mx-auto">
                        <div class="mb-8">
                            <h1 class="text-2xl font-bold text-white mb-2">Create Account</h1>
                            <p class="text-gray-400">Start your coding journey today.</p>
                        </div>

                        <form id="register-form" class="space-y-5">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="text-sm font-medium text-gray-300">Username</label>
                                    <input type="text" name="username" class="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none" placeholder="johndoe" required>
                                </div>
                                <div class="space-y-2">
                                    <label class="text-sm font-medium text-gray-300">Full Name</label>
                                    <input type="text" name="name" class="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none" placeholder="John Doe">
                                </div>
                            </div>

                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-300">Email Address</label>
                                <input type="email" name="email" class="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none" placeholder="name@company.com" required>
                            </div>
                            
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-300">Password</label>
                                <div class="relative">
                                    <input type="password" id="register-password" name="password" class="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none" placeholder="Create a strong password" required>
                                    <div class="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                        <div id="password-strength" class="h-full bg-gray-600 w-0 transition-all duration-300"></div>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-500 flex justify-between">
                                    <span>Must include uppercase, lowercase, and number.</span>
                                    <span id="strength-text" class="hidden font-medium"></span>
                                </p>
                            </div>
                            
                            <button type="submit" class="w-full btn-primary rounded-xl py-3.5 font-semibold text-white shadow-neon transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Create Account
                            </button>

                            <p class="text-center text-sm text-gray-400">
                                Already have an account? 
                                <a href="/login" class="text-neon-blue font-medium hover:text-neon-purple transition-colors">Sign in</a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Password Strength Meter Logic
        const passwordInput = document.getElementById('register-password');
        const strengthBar = document.getElementById('password-strength');
        const strengthText = document.getElementById('strength-text');

        passwordInput?.addEventListener('input', (e) => {
            const val = e.target.value;
            let strength = 0;
            let checks = {
                length: val.length >= 8,
                hasUpper: /[A-Z]/.test(val),
                hasLower: /[a-z]/.test(val),
                hasNumber: /[0-9]/.test(val),
                hasSpecial: /[^A-Za-z0-9]/.test(val)
            };

            if (checks.length) strength += 20;
            if (checks.hasUpper) strength += 20;
            if (checks.hasLower) strength += 20;
            if (checks.hasNumber) strength += 20;
            if (checks.hasSpecial) strength += 20;

            strengthBar.style.width = `${strength}%`;

            if (strength <= 20) {
                strengthBar.className = 'h-full bg-red-500 w-0 transition-all duration-300';
                strengthText.textContent = 'Weak';
                strengthText.className = 'font-medium text-red-500';
            } else if (strength <= 60) {
                strengthBar.className = 'h-full bg-yellow-500 w-0 transition-all duration-300';
                strengthText.textContent = 'Medium';
                strengthText.className = 'font-medium text-yellow-500';
            } else {
                strengthBar.className = 'h-full bg-green-500 w-0 transition-all duration-300';
                strengthText.textContent = 'Strong';
                strengthText.className = 'font-medium text-green-500';
            }
            strengthBar.style.width = `${strength}%`; // Re-apply width after class change
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.username.value;
            const name = e.target.name.value;
            const email = e.target.email.value;
            const password = e.target.password.value;
            const button = e.target.querySelector('button');
            const originalText = button.innerHTML;

            try {
                button.disabled = true;
                button.innerHTML = '<div class="flex items-center justify-center"><div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div></div>';

                // Send username, email, password, and map name to display_name
                const result = await this.auth.register({
                    username,
                    email,
                    password,
                    display_name: name
                });

                if (result.success) {
                    this.router.navigate('/dashboard');
                } else {
                    this.showError(result.message);
                }
            } catch (error) {
                console.error('Registration failed:', error);
                let message = error.message || 'Registration failed';

                if (error.data && error.data.errors) {
                    // Combine all error messages
                    const errors = Object.values(error.data.errors).flat();
                    if (errors.length > 0) {
                        message = errors.join('\n');
                    }
                }

                this.showError(message);
            } finally {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        });
    }

    /**
     * Render landing page
     */
    renderLanding() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="landing-page">
                <nav class="landing-nav glass-nav">
                    <div class="nav-brand">
                        <span class="logo-icon">
                            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        </span>
                        <span class="logo-text">CodeEngage</span>
                    </div>
                    <div class="nav-links">
                        <a href="/login" class="nav-link">Sign In</a>
                        <a href="/register" class="btn btn-primary btn-sm">Get Started</a>
                    </div>
                </nav>
                
                <header class="landing-hero">
                    <div class="hero-content animate-fadeIn">
                        <div class="hero-badge">
                            <span class="badge-dot"></span>
                            Now with real-time collaboration
                        </div>
                        <h1 class="hero-title">
                            Share Code.<br>
                            <span class="text-gradient">Ignite Innovation.</span>
                        </h1>
                        <p class="hero-subtitle">
                            The enterprise-grade platform for developers to share snippets, 
                            discover solutions, and collaborate in real-time.
                        </p>
                        <div class="hero-actions">
                            <a href="/register" class="btn btn-primary btn-lg glow-effect">
                                Start Collaborating
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                            </a>
                            <a href="#features" class="btn btn-secondary btn-lg glass-btn">
                                Explore Features
                            </a>
                        </div>
                        
                        <div class="hero-stats">
                            <div class="stat-item">
                                <span class="stat-value">10k+</span>
                                <span class="stat-label">Developers</span>
                            </div>
                            <div class="stat-separator"></div>
                            <div class="stat-item">
                                <span class="stat-value">50k+</span>
                                <span class="stat-label">Snippets</span>
                            </div>
                            <div class="stat-separator"></div>
                            <div class="stat-item">
                                <span class="stat-value">99%</span>
                                <span class="stat-label">Uptime</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hero-visual animate-slideUp">
                        <div class="code-window glass-panel">
                            <div class="window-header">
                                <div class="window-controls">
                                    <span class="control close"></span>
                                    <span class="control minimize"></span>
                                    <span class="control maximize"></span>
                                </div>
                                <div class="window-title">collaboration.js</div>
                            </div>
                            <div class="window-content">
                                <pre><code class="language-javascript"><span class="keyword">class</span> <span class="class-name">Collaboration</span> {
    <span class="keyword">constructor</span>(session) {
        <span class="keyword">this</span>.users = session.users;
        <span class="keyword">this</span>.sync();
    }
    
    <span class="function">broadcast</span>(change) {
        <span class="comment">// Real-time sync logic</span>
        <span class="keyword">await</span> socket.emit(<span class="string">'change'</span>, change);
    }
}</code></pre>
                            </div>
                        </div>
                    </div>
                </header>

                <section id="features" class="features-section">
                    <div class="section-header">
                        <h2>Enterprise Features</h2>
                        <p>Everything you need to scale your development.</p>
                    </div>
                    
                    <div class="features-grid">
                        <div class="feature-card glass-panel tilt-card">
                            <div class="feature-icon icon-blue">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                            </div>
                            <h3>Syntax Highlighting</h3>
                            <p>Beautiful highlighting for over 100+ languages including JavaScript, Python, Go, and Rust.</p>
                        </div>
                        <div class="feature-card glass-panel tilt-card">
                            <div class="feature-icon icon-purple">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <h3>Smart Search</h3>
                            <p>Find exactly what you need with our AI-powered semantic search engine.</p>
                        </div>
                        <div class="feature-card glass-panel tilt-card">
                            <div class="feature-icon icon-green">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            </div>
                            <h3>Team Collaboration</h3>
                            <p>Review code, leave comments, and pair program in real-time securely.</p>
                        </div>
                    </div>
                </section>
                
                <footer class="landing-footer">
                    <p>&copy; 2026 CodeEngage. Built for developers.</p>
                </footer>
            </div>
        `;
    }

    /**
     * Show global error notification
     * @param {string} message - Error message
     */
    showError(message) {
        return this.notifications.error(message);
    }

    showSuccess(message) {
        return this.notifications.success(message);
    }

    showInfo(message) {
        return this.notifications.info(message);
    }

    /**
     * Setup global event listeners
     */
    setupGlobalListeners() {
        // Handle logout
        document.addEventListener('click', async (e) => {
            if (e.target.matches('#logout-btn')) {
                e.preventDefault();
                await this.auth.logout();
            }
        });
    }
}

// Start application
window.app = new App();