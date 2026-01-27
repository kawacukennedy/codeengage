export default class Login {
    constructor(app) {
        this.app = app;
        this.form = null;
        this.loading = false;
    }

    render() {
        const div = document.createElement('div');
        div.className = 'min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8';
        div.innerHTML = `
            <div class="max-w-md w-full space-y-8">
                <div>
                    <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
                        Sign in to your account
                    </h2>
                    <p class="mt-2 text-center text-sm text-gray-400">
                        Or <a href="/signup" class="font-medium text-blue-400 hover:text-blue-300 transition-colors">create a new account</a>
                    </p>
                </div>
                
                <form id="login-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-300">Email address</label>
                            <input id="email" name="email" type="email" autocomplete="email" required
                                   class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                   placeholder="Enter your email">
                        </div>
                        
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                            <input id="password" name="password" type="password" autocomplete="current-password" required
                                   class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                   placeholder="Enter your password">
                        </div>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <input id="remember-me" name="remember_me" type="checkbox"
                                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800">
                            <label for="remember-me" class="ml-2 block text-sm text-gray-400">
                                Remember me
                            </label>
                        </div>

                        <div class="text-sm">
                            <a href="/forgot-password" class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <button type="submit" id="login-button"
                                class="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <span id="button-text">Sign in</span>
                            <svg id="loading-spinner" class="hidden ml-2 -mr-1 w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </button>
                    </div>

                    <div id="error-message" class="hidden mt-4 bg-red-900 bg-opacity-20 border border-red-700 rounded-md p-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-red-400">Sign in failed</h3>
                                <p class="mt-1 text-sm text-red-300" id="error-text"></p>
                            </div>
                        </div>
                    </div>
                </form>

                <div class="mt-6">
                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-600"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-gray-900 text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <div class="mt-6 grid grid-cols-2 gap-3">
                        <button type="button" class="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            <span class="ml-2">GitHub</span>
                        </button>

                        <button type="button" class="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span class="ml-2">Google</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.form = div.querySelector('#login-form');
        this.setupEventListeners();
        
        return div;
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Auto-focus email field
        const emailInput = this.form.querySelector('#email');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
    }

    async handleLogin() {
        if (this.loading) return;

        const email = this.form.querySelector('#email').value.trim();
        const password = this.form.querySelector('#password').value;
        const rememberMe = this.form.querySelector('#remember-me').checked;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        this.setLoading(true);
        this.hideError();

        try {
            const response = await this.app.apiClient.post('/auth/login', {
                email,
                password,
                remember_me: rememberMe
            });

            if (response.success) {
                // Store auth token
                if (response.data.token) {
                    localStorage.setItem('auth_token', response.data.token);
                    this.app.apiClient.setAuthToken(response.data.token);
                }

                // Update current user
                await this.app.checkAuth();
                
                this.app.showSuccess('Login successful!');
                
                // Redirect to intended page or dashboard
                const redirect = new URLSearchParams(window.location.search).get('redirect');
                this.app.router.navigate(redirect || '/dashboard');
            } else {
                this.showError(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.loading = loading;
        const button = this.form.querySelector('#login-button');
        const buttonText = this.form.querySelector('#button-text');
        const spinner = this.form.querySelector('#loading-spinner');

        if (loading) {
            button.disabled = true;
            buttonText.textContent = 'Signing in...';
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            buttonText.textContent = 'Sign in';
            spinner.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = this.form.querySelector('#error-message');
        const errorText = this.form.querySelector('#error-text');
        
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Hide error after 5 seconds
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        const errorDiv = this.form.querySelector('#error-message');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    destroy() {
        if (this.form) {
            this.form.removeEventListener('submit', this.handleLogin);
        }
    }
}