// Client-side Router
class Router {
    constructor() {
        this.routes = new Map();
        this.notFoundHandler = null;
        this.currentPath = '';
        this.currentParams = {};
    }

    addRoute(path, name, handler) {
        // Convert path to regex pattern
        const pattern = this.pathToRegex(path);
        this.routes.set(pattern, { name, handler });
    }

    pathToRegex(path) {
        // Convert :param to named capture groups
        const regex = new RegExp(
            '^' + path.replace(/\//g, '\\/').replace(/:\w+/g, '([^\\/]+)') + '$'
        );
        return regex;
    }

    matchRoute(path) {
        for (const [pattern, route] of this.routes) {
            const match = path.match(pattern);
            if (match) {
                const params = {};
                const paramNames = this.extractParamNames(route.name);
                
                // Extract named parameters from regex groups
                paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                
                return { handler: route.handler, params };
            }
        }
        
        return null;
    }

    extractParamNames(path) {
        // This is a simplified version - in production, you'd parse the original route path
        // For now, return empty array and extract from URL
        return [];
    }

    extractParamsFromUrl(path, matchedPath) {
        const pathParts = path.split('/').filter(Boolean);
        const matchedParts = matchedPath.split('/').filter(Boolean);
        const params = {};
        
        matchedParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const paramName = part.substring(1);
                params[paramName] = pathParts[index] || '';
            }
        });
        
        return params;
    }

    async navigate(path, state = {}) {
        // Update browser history
        history.pushState(state, '', path);
        
        // Update current route
        this.currentPath = path;
        
        // Handle the route
        await this.handleRoute(path);
    }

    async handleRoute(path) {
        let match = this.matchRoute(path);
        
        if (!match) {
            if (this.notFoundHandler) {
                return this.notFoundHandler();
            }
            return;
        }
        
        // Extract params properly
        const params = this.extractParamsFromUrl(path, this.getOriginalPath(match.handler));
        this.currentParams = params;
        
        try {
            await match.handler(params);
        } catch (error) {
            console.error('Route handler error:', error);
            if (this.notFoundHandler) {
                this.notFoundHandler();
            }
        }
    }

    getOriginalPath(handler) {
        // Find the original path for this handler
        for (const [pattern, route] of this.routes) {
            if (route.handler === handler) {
                // This is a simplified approach
                // In production, store the original path in the route object
                return '/'; // fallback
            }
        }
        return '/';
    }

    start() {
        // Handle initial route
        this.handleRoute(window.location.pathname);
        
        // Handle browser navigation
        window.addEventListener('popstate', (e) => {
            this.currentPath = window.location.pathname;
            this.handleRoute(window.location.pathname);
        });
        
        // Handle navigation links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.hostname === window.location.hostname && link.getAttribute('href')) {
                const href = link.getAttribute('href');
                
                // Skip if it's a hash link, external link, or has target="_blank"
                if (href.startsWith('#') || href.startsWith('http') || link.target === '_blank') {
                    return;
                }
                
                e.preventDefault();
                this.navigate(href);
            }
        });
    }

    setNotFoundHandler(handler) {
        this.notFoundHandler = handler;
    }

    getCurrentPath() {
        return this.currentPath;
    }

    getCurrentParams() {
        return this.currentParams;
    }
}

// Export for use in other modules
window.Router = Router;