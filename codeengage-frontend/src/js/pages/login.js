
export class Login {
    constructor(app) {
        this.app = app;
    }

    async init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="min-h-screen flex bg-deep-space relative overflow-hidden">
                <!-- Background ambient effects -->
                <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/15 rounded-full blur-[120px] animate-pulse-slow"></div>
                    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/15 rounded-full blur-[120px] animate-pulse-slow" style="animation-delay: 2s"></div>
                </div>

                <!-- Visual Side (Hidden on Mobile) -->
                <div class="hidden lg:flex w-1/2 relative items-center justify-center p-12 z-10 border-r border-white/5">
                    <div class="relative w-full max-w-lg">
                        <div class="absolute inset-0 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 blur-[100px] rounded-full opacity-50"></div>
                        
                        <div class="glass-strong p-8 rounded-3xl border border-white/10 relative transform hover:scale-[1.02] transition-transform duration-700">
                            <div class="flex items-center gap-3 mb-8">
                                <div class="w-3 h-3 rounded-full bg-red-400/80"></div>
                                <div class="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                                <div class="w-3 h-3 rounded-full bg-green-400/80"></div>
                            </div>
                            <pre class="font-mono text-sm leading-relaxed text-gray-300 pointer-events-none">
<span class="text-neon-purple">const</span> <span class="text-neon-blue">future</span> = <span class="text-neon-purple">await</span> CodeEngage.<span class="text-yellow-400">connect</span>();
<span class="text-gray-500">// Join existing sessions</span>
<span class="text-neon-purple">if</span> (future.<span class="text-yellow-400">isReady</span>()) {
    <span class="text-neon-blue">console</span>.<span class="text-yellow-400">log</span>(<span class="text-green-400">"Build together."</span>);
}
                            </pre>
                        </div>

                        <div class="mt-16 text-center">
                            <h2 class="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Welcome Back</h2>
                            <p class="text-xl text-gray-400/80 max-w-sm mx-auto">Resume your collaborative journey and build the extraordinary.</p>
                        </div>
                    </div>
                </div>

                <!-- Form Side -->
                <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 relative">
                    <div class="w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl animate-fade-in relative backdrop-blur-2xl">
                        
                        <!-- Mobile Header Logo -->
                        <div class="mb-10 text-center">
                            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple p-0.5 mb-8 shadow-neon group hover:rotate-3 transition-transform duration-500">
                                <div class="w-full h-full bg-gray-900/90 rounded-[14px] flex items-center justify-center">
                                    <i class="ph-bold ph-sign-in text-3xl text-white"></i>
                                </div>
                            </div>
                            <h1 class="text-3xl font-bold text-white mb-3">Sign In</h1>
                            <p class="text-gray-400">Enter your credentials to access your workspace.</p>
                        </div>

                        <form id="login-form" class="space-y-6">
                            <div class="space-y-3 group">
                                <label class="block text-sm font-medium text-gray-300/80 group-focus-within:text-neon-blue transition-colors px-1">Email Address</label>
                                <div class="relative">
                                    <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-neon-blue transition-colors">
                                        <i class="ph-bold ph-envelope-simple text-xl"></i>
                                    </span>
                                    <input type="email" name="email" class="w-full pl-12 pr-4 bg-gray-950/40 border border-white/5 rounded-2xl py-4 text-white placeholder-gray-600/60 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20 transition-all outline-none" placeholder="name@company.com" required autocomplete="email">
                                </div>
                            </div>

                            <div class="space-y-3 group">
                                <div class="flex items-center justify-between px-1">
                                    <label class="block text-sm font-medium text-gray-300/80 group-focus-within:text-neon-blue transition-colors">Password</label>
                                    <a href="#" class="text-xs font-medium text-neon-blue hover:text-neon-purple transition-all hover:translate-x-1">Forgot password?</a>
                                </div>
                                <div class="relative">
                                    <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-neon-blue transition-colors">
                                        <i class="ph-bold ph-lock-key text-xl"></i>
                                    </span>
                                    <input type="password" name="password" class="w-full pl-12 pr-4 bg-gray-950/40 border border-white/5 rounded-2xl py-4 text-white placeholder-gray-600/60 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20 transition-all outline-none" placeholder="••••••••" required autocomplete="current-password">
                                </div>
                            </div>
                            
                            <button type="submit" class="w-full group btn-primary relative rounded-2xl py-4 font-bold text-white shadow-neon transition-all hover:scale-[1.03] active:scale-[0.97] overflow-hidden mt-8">
                                <span class="relative z-10 flex items-center justify-center gap-3">
                                    Sign In
                                    <i class="ph-bold ph-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                </span>
                                <div class="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_auto] animate-gradient"></div>
                            </button>

                            <p class="text-center text-sm text-gray-400 mt-8 pt-4 border-t border-white/5">
                                Don't have an account? 
                                <a href="/register" class="text-neon-blue font-bold hover:text-neon-purple transition-colors ml-1">Create account</a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        const button = e.target.querySelector('button');
        const originalContent = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>';

            const result = await this.app.auth.login(email, password);

            if (result.success) {
                this.app.router.navigate('/dashboard');
            } else {
                this.app.showError(result.message);
                // Shake animation on error
                const card = document.querySelector('.glass');
                card.classList.add('animate-shake');
                setTimeout(() => card.classList.remove('animate-shake'), 500);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.app.showError('An unexpected error occurred. Please try again.');
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    }
}