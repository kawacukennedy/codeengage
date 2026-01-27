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
import { Admin } from './pages/admin.js';
import { CodeEditor as Editor } from './modules/editor.js';

class App {
    constructor() {
        this.apiClient = new ApiClient();
        this.router = new Router(this);
        this.auth = new Auth(this);
        this.currentPage = null;

        // Initialize modules
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            await this.auth.init();
            this.setupRoutes();
            this.router.handleRouteChange();
            this.setupGlobalListeners();
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showError('Failed to start application');
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

        this.router.add('/profile', async () => {
            this.currentPage = new Profile(this);
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

        this.router.add('/new', async () => {
            // Load editor page directly or via a page module
            const container = document.getElementById('app');
            container.innerHTML = '<h1>New Snippet</h1><div id="editor"></div>';
            const editor = new Editor('editor');
            editor.init();
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
            <div class="auth-page">
                <div class="auth-card animate-fadeIn">
                    <div class="auth-header">
                        <div class="logo-icon">
                            <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        </div>
                        <h1>Welcome Back</h1>
                        <p>Sign in to continue to CodeEngage</p>
                    </div>
                    <form id="login-form">
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" name="email" placeholder="name@company.com" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" name="password" placeholder="••••••••" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">
                            <span>Sign In</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                        <div class="auth-footer">
                            <p>Don't have an account? <a href="/register">Create account</a></p>
                        </div>
                    </form>
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
            <div class="auth-page">
                <div class="auth-card animate-fadeIn">
                    <div class="auth-header">
                        <div class="logo-icon">
                            <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                        </div>
                        <h1>Create Account</h1>
                        <p>Join the community of developers</p>
                    </div>
                    <form id="register-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" name="username" placeholder="johndoe" required>
                            </div>
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" name="name" placeholder="John Doe">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" name="email" placeholder="name@company.com" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" name="password" placeholder="Create a strong password" required>
                            <small style="font-size: 0.8rem; color: var(--color-gray-400); margin-top: 0.5rem; display: block; line-height: 1.4;">
                                Requires 8+ chars and at least one Uppercase, Lowercase, and Number.
                            </small>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">
                            <span>Create Account</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </button>
                        <div class="auth-footer">
                            <p>Already have an account? <a href="/login">Sign in</a></p>
                        </div>
                    </form>
                </div>
            </div>
        `;

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
                button.innerHTML = '<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>';

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
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
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