export default class Signup {
    constructor(app) {
        this.app = app;
        this.form = null;
        this.loading = false;
        this.passwordStrength = 0;
    }

    render() {
        const div = document.createElement('div');
        div.className = 'min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8';
        div.innerHTML = `
            <div class="max-w-md w-full space-y-8">
                <div>
                    <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
                        Create your account
                    </h2>
                    <p class="mt-2 text-center text-sm text-gray-400">
                        Or <a href="/login" class="font-medium text-blue-400 hover:text-blue-300 transition-colors">sign in to your existing account</a>
                    </p>
                </div>
                
                <form id="signup-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-300">Username</label>
                            <input id="username" name="username" type="text" autocomplete="username" required
                                   class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                   placeholder="Choose a username">
                            <p class="mt-1 text-xs text-gray-500">Must be 3-50 characters, letters, numbers, and underscores only</p>
                        </div>
                        
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-300">Email address</label>
                            <input id="email" name="email" type="email" autocomplete="email" required
                                   class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                   placeholder="Enter your email">
                        </div>

                        <div>
                            <label for="display_name" class="block text-sm font-medium text-gray-300">Display name</label>
                            <input id="display_name" name="display_name" type="text" autocomplete="name" required
                                   class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                   placeholder="Your display name">
                            <p class="mt-1 text-xs text-gray-500">This is how others will see you</p>
                        </div>
                        
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                            <div class="mt-1 relative">
                                <input id="password" name="password" type="password" autocomplete="new-password" required
                                       class="appearance-none block w-full px-3 py-2 pr-10 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                       placeholder="Create a strong password">
                                <button type="button" id="toggle-password" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <svg id="eye-icon" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <div class="mt-2">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs text-gray-500">Password strength</span>
                                    <span id="strength-text" class="text-xs text-gray-500">Enter a password</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div id="strength-bar" class="h-2 rounded-full transition-all duration-300 w-0"></div>
                                </div>
                                <div class="mt-1 text-xs text-gray-500">
                                    <p>• At least 8 characters</p>
                                    <p>• Include uppercase, lowercase, numbers, and symbols</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label for="confirm_password" class="block text-sm font-medium text-gray-300">Confirm password</label>
                            <input id="confirm_password" name="confirm_password" type="password" autocomplete="new-password" required
                                   class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                   placeholder="Confirm your password">
                            <p id="password-match" class="mt-1 text-xs text-gray-500">Passwords do not match</p>
                        </div>
                    </div>

                    <div class="flex items-center">
                        <input id="agree-terms" name="agree_terms" type="checkbox" required
                               class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800">
                        <label for="agree-terms" class="ml-2 block text-sm text-gray-400">
                            I agree to the <a href="/terms" class="text-blue-400 hover:text-blue-300">Terms of Service</a> and <a href="/privacy" class="text-blue-400 hover:text-blue-300">Privacy Policy</a>
                        </label>
                    </div>

                    <div>
                        <button type="submit" id="signup-button"
                                class="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <span id="button-text">Create account</span>
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
                                <h3 class="text-sm font-medium text-red-400">Registration failed</h3>
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
                            <span class="px-2 bg-gray-900 text-gray-400">Or sign up with</span>
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

        this.form = div.querySelector('#signup-form');
        this.setupEventListeners();
        
        return div;
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        const passwordInput = this.form.querySelector('#password');
        const confirmPasswordInput = this.form.querySelector('#confirm_password');
        const togglePasswordBtn = this.form.querySelector('#toggle-password');

        // Password visibility toggle
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            confirmPasswordInput.type = type;
            this.updateEyeIcon(type);
        });

        // Password strength checking
        passwordInput.addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
            this.checkPasswordMatch();
        });

        // Password match checking
        confirmPasswordInput.addEventListener('input', () => {
            this.checkPasswordMatch();
        });

        // Auto-focus username field
        const usernameInput = this.form.querySelector('#username');
        if (usernameInput) {
            setTimeout(() => usernameInput.focus(), 100);
        }
    }

    updateEyeIcon(type) {
        const eyeIcon = this.form.querySelector('#eye-icon');
        if (type === 'text') {
            eyeIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 15.121l3.106-3.106m3.106 3.106l3.106-3.106"></path>
            `;
        } else {
            eyeIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            `;
        }
    }

    checkPasswordStrength(password) {
        let strength = 0;
        let feedback = [];

        // Length check
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 10;

        // Character variety checks
        if (/[a-z]/.test(password)) {
            strength += 15;
            feedback.push('lowercase');
        }
        if (/[A-Z]/.test(password)) {
            strength += 15;
            feedback.push('uppercase');
        }
        if (/[0-9]/.test(password)) {
            strength += 15;
            feedback.push('numbers');
        }
        if (/[^a-zA-Z0-9]/.test(password)) {
            strength += 20;
            feedback.push('symbols');
        }

        this.passwordStrength = Math.min(strength, 100);
        this.updatePasswordStrengthUI(this.passwordStrength);
    }

    updatePasswordStrengthUI(strength) {
        const strengthBar = this.form.querySelector('#strength-bar');
        const strengthText = this.form.querySelector('#strength-text');

        strengthBar.style.width = `${strength}%`;

        if (strength === 0) {
            strengthBar.className = 'h-2 rounded-full transition-all duration-300 w-0 bg-gray-600';
            strengthText.textContent = 'Enter a password';
            strengthText.className = 'mt-1 text-xs text-gray-500';
        } else if (strength < 30) {
            strengthBar.className = 'h-2 rounded-full transition-all duration-300 bg-red-500';
            strengthText.textContent = 'Weak password';
            strengthText.className = 'mt-1 text-xs text-red-400';
        } else if (strength < 60) {
            strengthBar.className = 'h-2 rounded-full transition-all duration-300 bg-yellow-500';
            strengthText.textContent = 'Fair password';
            strengthText.className = 'mt-1 text-xs text-yellow-400';
        } else if (strength < 80) {
            strengthBar.className = 'h-2 rounded-full transition-all duration-300 bg-blue-500';
            strengthText.textContent = 'Good password';
            strengthText.className = 'mt-1 text-xs text-blue-400';
        } else {
            strengthBar.className = 'h-2 rounded-full transition-all duration-300 bg-green-500';
            strengthText.textContent = 'Strong password';
            strengthText.className = 'mt-1 text-xs text-green-400';
        }
    }

    checkPasswordMatch() {
        const password = this.form.querySelector('#password').value;
        const confirmPassword = this.form.querySelector('#confirm_password').value;
        const matchText = this.form.querySelector('#password-match');

        if (confirmPassword.length === 0) {
            matchText.textContent = '';
            matchText.className = 'mt-1 text-xs text-gray-500';
            return;
        }

        if (password === confirmPassword) {
            matchText.textContent = 'Passwords match';
            matchText.className = 'mt-1 text-xs text-green-400';
            return true;
        } else {
            matchText.textContent = 'Passwords do not match';
            matchText.className = 'mt-1 text-xs text-red-400';
            return false;
        }
    }

    async handleSignup() {
        if (this.loading) return;

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        // Validate form
        const validation = this.validateForm(data);
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        this.setLoading(true);
        this.hideError();

        try {
            const response = await this.app.apiClient.post('/auth/register', {
                username: data.username,
                email: data.email,
                display_name: data.display_name,
                password: data.password
            });

            if (response.success) {
                this.app.showSuccess('Account created successfully!');
                
                // Store auth token if provided
                if (response.data.token) {
                    localStorage.setItem('auth_token', response.data.token);
                    this.app.apiClient.setAuthToken(response.data.token);
                }

                // Update current user
                await this.app.checkAuth();
                
                // Redirect to dashboard
                this.app.router.navigate('/dashboard');
            } else {
                this.showError(response.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (errorData.errors) {
                    const errorMessage = Object.values(errorData.errors).flat().join(', ');
                    this.showError(errorMessage);
                } else {
                    this.showError(errorData.message || 'Registration failed');
                }
            } else {
                this.showError('Network error. Please try again.');
            }
        } finally {
            this.setLoading(false);
        }
    }

    validateForm(data) {
        // Username validation
        if (!data.username || data.username.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters long' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
            return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }

        // Display name validation
        if (!data.display_name || data.display_name.length < 1) {
            return { valid: false, message: 'Display name is required' };
        }

        // Password validation
        if (!data.password || data.password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }

        if (data.password !== data.confirm_password) {
            return { valid: false, message: 'Passwords do not match' };
        }

        if (this.passwordStrength < 40) {
            return { valid: false, message: 'Password is too weak. Please choose a stronger password.' };
        }

        // Terms validation
        if (!data.agree_terms) {
            return { valid: false, message: 'You must agree to the Terms of Service and Privacy Policy' };
        }

        return { valid: true };
    }

    setLoading(loading) {
        this.loading = loading;
        const button = this.form.querySelector('#signup-button');
        const buttonText = this.form.querySelector('#button-text');
        const spinner = this.form.querySelector('#loading-spinner');

        if (loading) {
            button.disabled = true;
            buttonText.textContent = 'Creating account...';
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            buttonText.textContent = 'Create account';
            spinner.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = this.form.querySelector('#error-message');
        const errorText = this.form.querySelector('#error-text');
        
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Hide error after 10 seconds
        setTimeout(() => this.hideError(), 10000);
    }

    hideError() {
        const errorDiv = this.form.querySelector('#error-message');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    destroy() {
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSignup);
        }
    }
}