/**
 * Router Module
 * 
 * Handles client-side routing and page navigation.
 */

export class Router {
    constructor(app) {
        this.app = app;
        this.routes = [];
        this.currentRoute = null;
        this.params = {};
        this.routeMetrics = new Map(); // Track route performance and errors

        // Handle back/forward buttons
        window.addEventListener('popstate', () => this.handleRouteChange());

        // Handle link clicks
        document.addEventListener('click', (e) => this.handleLinkClick(e));

        // Handle unhandled route errors
        window.addEventListener('error', (e) => {
            if (e.error && e.error.context?.type === 'route_error') {
                this.handleRouteError(e.error, e.error.context);
            }
        });
    }

    /**
     * Add a route definition
     * @param {string} path - URL path pattern (e.g., '/user/:id')
     * @param {Function} handler - Function to call when route matches
     * @param {object} options - Route options (protected, guest, etc.)
     */
    add(path, handler, options = {}) {
        this.routes.push({
            path,
            handler,
            options,
            regex: this.pathToRegex(path)
        });
    }

    /**
     * Convert path pattern to regex
     * @param {string} path - Path pattern
     * @returns {RegExp} Regex for matching
     */
    pathToRegex(path) {
        // dynamic segments (:param)
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:(\w+)/g, '([^\\/]+)');

        return new RegExp(`^${pattern}\\/?$`);
    }

    /**
     * Extract parameters from URL
     * @param {string} path - Path pattern
     * @param {string} url - Actual URL
     * @returns {object} Extracted parameters
     */
    extractParams(path, url) {
        const paramNames = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
        const regex = this.pathToRegex(path);
        const matches = url.match(regex);

        if (!matches) return {};

        const params = {};
        paramNames.forEach((name, i) => {
            params[name] = matches[i + 1];
        });

        return params;
    }

    /**
     * Navigate to a URL
     * @param {string} url - URL to navigate to
     * @param {boolean} replace - Whether to replace history state
     */
    navigate(url, replace = false) {
        if (replace) {
            history.replaceState(null, '', url);
        } else {
            history.pushState(null, '', url);
        }

        this.handleRouteChange();
    }

    /**
     * Handle route change
     */
    async handleRouteChange() {
        const path = window.location.pathname;

        // Find matching route
        const route = this.routes.find(r => r.regex.test(path));

        if (!route) {
            console.warn(`No route found for ${path}`);
            console.log('Registered routes:', this.routes.map(r => r.path));
            return this.handle404();
        }

        // Check authentication
        if (route.options.protected && !this.app.auth.isAuthenticated()) {
            return this.navigate('/login', true); // Redirect to login
        }

        if (route.options.guest && this.app.auth.isAuthenticated()) {
            return this.navigate('/dashboard', true); // Redirect to dashboard
        }

        this.currentRoute = route;
        this.params = this.extractParams(route.path, path);

        // Cleanup previous page
        if (this.app.currentPage && typeof this.app.currentPage.destroy === 'function') {
            this.app.currentPage.destroy();
        }

        try {
            await route.handler(this.params);

            // Update active link classes
            document.querySelectorAll('a').forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === path);
            });

            // Scroll to top
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Route handler error:', error);
            this.app.showError('Failed to load page');
        }
    }

    /**
     * Handle link clicks for SPA navigation
     */
    handleLinkClick(e) {
        const link = e.target.closest('a');

        if (!link) return;

        const href = link.getAttribute('href');

        // Ignore external links, anchors, or new tab clicks
        if (
            !href ||
            href.startsWith('http') ||
            href.startsWith('//') ||
            href.startsWith('#') ||
            link.target === '_blank' ||
            e.ctrlKey || e.metaKey || e.shiftKey
        ) {
            return;
        }

        e.preventDefault();
        this.navigate(href);
    }

    /**
     * Handle 404 Not Found
     */
    handle404() {
        const container = document.getElementById('app');
        if (container) {
            container.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-deep-space p-4 text-center">
                    <div class="space-y-6 max-w-lg">
                        <div class="relative">
                            <div class="absolute inset-0 bg-neon-purple blur-3xl opacity-20 rounded-full"></div>
                            <h1 class="relative text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">404</h1>
                        </div>
                        <h2 class="text-3xl font-bold text-white">Page Not Found</h2>
                        <p class="text-gray-400 text-lg">
                            The code snippet you are looking for has been garbage collected or never existed.
                        </p>
                        <div class="pt-4 flex justify-center gap-4">
                            <a href="/" class="px-6 py-3 rounded-xl bg-gray-800 text-white font-medium hover:bg-gray-700 transition-colors">
                                Home
                            </a>
                            <a href="/dashboard" class="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold shadow-neon hover:opacity-90 transition-opacity">
                                Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

export default Router;
