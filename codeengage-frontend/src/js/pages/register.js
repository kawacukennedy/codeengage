
export class Register {
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
                    <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/15 rounded-full blur-[120px] animate-pulse-slow"></div>
                    <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/15 rounded-full blur-[120px] animate-pulse-slow" style="animation-delay: 2s"></div>
                </div>

                <!-- Visual Side -->
                <div class="hidden lg:flex w-1/2 relative items-center justify-center p-12 z-10 border-r border-white/5">
                    <div class="relative w-full max-w-lg">
                        <div class="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 blur-[100px] rounded-full opacity-50"></div>
                        
                        <div class="glass-strong p-8 rounded-3xl border border-white/10 relative transform hover:scale-[1.02] transition-transform duration-700">
                             <div class="flex items-center gap-3 mb-8">
                                <div class="w-3 h-3 rounded-full bg-red-400/80"></div>
                                <div class="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                                <div class="w-3 h-3 rounded-full bg-green-400/80"></div>
                            </div>
                            <pre class="font-mono text-sm leading-relaxed text-gray-300 pointer-events-none">
<span class="text-neon-purple">const</span> <span class="text-neon-blue">user</span> = <span class="text-neon-purple">new</span> <span class="text-yellow-400">Collaborator</span>({
    name: <span class="text-green-400">"Your Name"</span>,
    role: <span class="text-green-400">"Innovator"</span>
});

<span class="text-neon-purple">await</span> user.<span class="text-yellow-400">join</span>(<span class="text-neon-blue">workspace</span>);
                            </pre>
                        </div>

                        <div class="mt-16 text-center">
                            <h2 class="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Create Account</h2>
                            <p class="text-xl text-gray-400/80 max-w-sm mx-auto">Join the next generation of collaborative developers.</p>
                        </div>
                    </div>
                </div>

                <!-- Form Side -->
                <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 relative overflow-y-auto">
                    <div class="w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl animate-fade-in relative backdrop-blur-2xl my-auto">
                        
                        <div class="mb-10 text-center">
                            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue p-0.5 mb-8 shadow-neon group hover:rotate-3 transition-transform duration-500">
                                <div class="w-full h-full bg-gray-900/90 rounded-[14px] flex items-center justify-center">
                                    <i class="ph-bold ph-user-plus text-3xl text-white"></i>
                                </div>
                            </div>
                            <h1 class="text-3xl font-bold text-white mb-3">Join Us</h1>
                            <p class="text-gray-400">Create your account to start building.</p>
                        </div>

                        <form id="register-form" class="space-y-5">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2 group">
                                    <label class="block text-xs font-medium text-gray-400/80 group-focus-within:text-neon-blue transition-colors px-1 uppercase tracking-wider">Username</label>
                                    <input type="text" name="username" class="w-full bg-gray-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600/60 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20 transition-all outline-none text-sm" placeholder="johndoe" required>
                                </div>
                                <div class="space-y-2 group">
                                    <label class="block text-xs font-medium text-gray-400/80 group-focus-within:text-neon-blue transition-colors px-1 uppercase tracking-wider">Full Name</label>
                                    <input type="text" name="name" class="w-full bg-gray-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600/60 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20 transition-all outline-none text-sm" placeholder="John Doe">
                                </div>
                            </div>

                            <div class="space-y-2 group">
                                <label class="block text-xs font-medium text-gray-400/80 group-focus-within:text-neon-blue transition-colors px-1 uppercase tracking-wider">Email Address</label>
                                <div class="relative">
                                    <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-neon-blue transition-colors">
                                        <i class="ph-bold ph-envelope-simple text-xl"></i>
                                    </span>
                                    <input type="email" name="email" class="w-full pl-12 pr-4 bg-gray-950/40 border border-white/5 rounded-2xl py-3.5 text-white placeholder-gray-600/60 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20 transition-all outline-none text-sm" placeholder="name@company.com" required>
                                </div>
                            </div>

                            <div class="space-y-2 group">
                                <label class="block text-xs font-medium text-gray-400/80 group-focus-within:text-neon-blue transition-colors px-1 uppercase tracking-wider">Password</label>
                                <div class="relative">
                                    <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-neon-blue transition-colors">
                                        <i class="ph-bold ph-lock-key text-xl"></i>
                                    </span>
                                    <input type="password" id="register-password" name="password" class="w-full pl-12 pr-4 bg-gray-950/40 border border-white/5 rounded-2xl py-3.5 text-white placeholder-gray-600/60 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20 transition-all outline-none text-sm" placeholder="Create a strong password" required>
                                </div>
                                
                                <!-- Segmented password strength meter -->
                                <div class="pt-2 px-1">
                                    <div class="flex gap-2 h-1.5 w-full">
                                        <div class="strength-segment h-full flex-1 bg-white/5 rounded-full transition-all duration-300"></div>
                                        <div class="strength-segment h-full flex-1 bg-white/5 rounded-full transition-all duration-300"></div>
                                        <div class="strength-segment h-full flex-1 bg-white/5 rounded-full transition-all duration-300"></div>
                                        <div class="strength-segment h-full flex-1 bg-white/5 rounded-full transition-all duration-300"></div>
                                    </div>
                                    <div class="flex justify-between items-center mt-2 px-0.5">
                                        <span class="text-[10px] text-gray-500 leading-tight flex-1 pr-4">Include uppercase, lowercase, numbers & symbols.</span>
                                        <span id="strength-text" class="text-[10px] font-bold uppercase tracking-widest text-gray-600">Weak</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button type="submit" class="w-full group btn-primary relative rounded-2xl py-4 font-bold text-white shadow-neon transition-all hover:scale-[1.03] active:scale-[0.97] overflow-hidden mt-6">
                                <span class="relative z-10 flex items-center justify-center gap-3">
                                    Create Account
                                    <i class="ph-bold ph-sparkle group-hover:rotate-12 transition-transform"></i>
                                </span>
                                <div class="absolute inset-0 bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_auto] animate-gradient"></div>
                            </button>

                            <p class="text-center text-sm text-gray-400 mt-8 pt-4 border-t border-white/5">
                                Already have an account? 
                                <a href="/login" class="text-neon-blue font-bold hover:text-neon-purple transition-colors ml-1">Sign in</a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    updatePasswordStrengthUI(strength) {
        const segments = document.querySelectorAll('.strength-segment');
        const text = document.getElementById('strength-text');

        const config = [
            { label: 'Very Weak', color: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]', count: 1 },
            { label: 'Weak', color: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]', count: 2 },
            { label: 'Medium', color: 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]', count: 3 },
            { label: 'Strong', color: 'bg-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.4)]', count: 4 }
        ];

        const res = config[strength - 1] || { label: 'Weak', color: 'bg-white/5', count: 0 };

        segments.forEach((seg, i) => {
            seg.className = 'strength-segment h-full flex-1 rounded-full transition-all duration-500';
            if (i < res.count) {
                seg.classList.add(...res.color.split(' '));
            } else {
                seg.classList.add('bg-white/5');
            }
        });

        if (text) {
            text.textContent = res.label;
            text.className = `text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${strength ? 'text-white' : 'text-gray-600'}`;
        }
    }

    setupEventListeners() {
        const passwordInput = document.getElementById('register-password');

        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (!val) {
                    this.updatePasswordStrengthUI(0);
                    return;
                }

                let strengthScore = 0;
                if (val.length >= 8) strengthScore++;
                if (/[A-Z]/.test(val)) strengthScore++;
                if (/[0-9]/.test(val)) strengthScore++;
                if (/[^A-Za-z0-9]/.test(val)) strengthScore++;

                if (val.length > 0 && strengthScore === 0) strengthScore = 1;

                this.updatePasswordStrengthUI(strengthScore);
            });
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const username = e.target.username.value;
        const name = e.target.name.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const button = e.target.querySelector('button');
        const originalContent = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>';

            const result = await this.app.auth.register({
                username,
                email,
                password,
                display_name: name
            });

            if (result.success) {
                this.app.notifications.show('Account created successfully! Welcome aboard.', 'success');
                setTimeout(() => this.app.router.navigate('/dashboard'), 1500);
            } else {
                this.app.notifications.show(result.message || 'Registration failed', 'error');
                const card = document.querySelector('.glass');
                card.classList.add('animate-shake');
                setTimeout(() => card.classList.remove('animate-shake'), 500);
            }
        } catch (error) {
            console.error('Registration failed:', error);

            let message = error.message || 'Registration failed';
            if (error.data && error.data.errors) {
                const errors = Object.values(error.data.errors).flat();
                if (errors.length > 0) {
                    message = errors.join(', ');
                }
            }

            this.app.notifications.show(message, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    }
}
