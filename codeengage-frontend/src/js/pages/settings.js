
import Navigation from '../modules/components/navigation.js';

export class Settings {
    constructor(app) {
        this.app = app;
        this.nav = new Navigation('/settings');
    }

    async init() {
        if (!this.app.auth.isAuthenticated()) {
            return this.app.router.navigate('/login');
        }
        this.render();
        this.setupEventListeners();
        this.loadSettings();
    }

    render() {
        const container = document.getElementById('app');
        const user = this.app.auth.user;

        container.innerHTML = `
            ${this.nav.render()}
            <div class="settings-page min-h-screen pb-12">
                <div class="container mx-auto px-4 pt-8">
                    <div class="max-w-4xl mx-auto">
                        <header class="mb-8">
                            <h1 class="text-3xl font-bold text-white mb-2">Settings</h1>
                            <p class="text-gray-400">Manage your account preferences and profile.</p>
                        </header>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <!-- Sidebar -->
                            <div class="md:col-span-1">
                                <nav class="space-y-1">
                                    <button class="w-full text-left px-4 py-2 rounded-lg bg-primary/20 text-primary font-medium">Profile</button>
                                    <button class="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors" onclick="document.getElementById('security-section').scrollIntoView({behavior: 'smooth'})">Security</button>
                                    <button class="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors" onclick="document.getElementById('developer-section').scrollIntoView({behavior: 'smooth'})">Developer</button>
                                </nav>
                            </div>

                            <!-- Content -->
                            <div class="md:col-span-3 space-y-8">
                                <!-- Profile Section -->
                                <section id="profile-section" class="glass-panel p-6 border border-gray-700/50 rounded-xl">
                                    <h2 class="text-xl font-semibold text-white mb-6">Public Profile</h2>
                                    
                                    <div class="flex items-start gap-6 mb-8">
                                        <div class="relative group">
                                            <div class="w-24 h-24 rounded-full bg-gray-700 overflow-hidden border-2 border-gray-600">
                                                <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`}" 
                                                     alt="Profile" 
                                                     class="w-full h-full object-cover">
                                            </div>
                                            <button class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                                <span class="text-xs text-white">Change</span>
                                            </button>
                                        </div>
                                        <div class="flex-1">
                                            <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
                                            <input type="text" value="${user.username}" disabled 
                                                   class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed">
                                            <p class="text-xs text-gray-500 mt-1">Username cannot be changed.</p>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 gap-6">
                                        <div>
                                            <label for="display-name" class="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                                            <input type="text" id="display-name" value="${user.display_name || ''}" 
                                                   class="w-full bg-gray-800 border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-primary focus:border-primary">
                                        </div>

                                        <div>
                                            <label for="bio" class="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                                            <textarea id="bio" rows="3" 
                                                      class="w-full bg-gray-800 border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-primary focus:border-primary"
                                                      placeholder="Tell us a little about yourself...">${user.bio || ''}</textarea>
                                        </div>

                                        <div>
                                            <label for="website" class="block text-sm font-medium text-gray-300 mb-2">Website</label>
                                            <input type="url" id="website" value="${user.website || ''}" placeholder="https://"
                                                   class="w-full bg-gray-800 border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-primary focus:border-primary">
                                        </div>
                                    </div>

                                    <div class="mt-8 pt-6 border-t border-gray-700 flex justify-end">
                                        <button id="save-profile-btn" class="btn btn-primary">Save Changes</button>
                                    </div>
                                </section>

                                <!-- Appearance Section -->
                                <section id="appearance-section" class="glass-panel p-6 border border-gray-700/50 rounded-xl">
                                    <h2 class="text-xl font-semibold text-white mb-6">Appearance</h2>
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h3 class="font-medium text-white">Theme Preference</h3>
                                            <p class="text-sm text-gray-400">Choose your interface theme</p>
                                        </div>
                                        <div class="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                            <button class="px-4 py-1.5 rounded text-sm font-medium text-white bg-gray-700 shadow-sm">Dark</button>
                                            <button class="px-4 py-1.5 rounded text-sm font-medium text-gray-400 hover:text-white">Light</button>
                                        </div>
                                    </div>
                                </section>
                                
                                <!-- Security Section -->
                                <section id="security-section" class="glass-panel p-6 border border-gray-700/50 rounded-xl">
                                    <h2 class="text-xl font-semibold text-white mb-6">Security</h2>
                                    
                                    <div class="space-y-6">
                                        <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                            <div>
                                                <h3 class="font-medium text-white">Active Sessions</h3>
                                                <p class="text-sm text-gray-400">Manage device sessions active on your account.</p>
                                            </div>
                                            <button id="logout-all-btn" class="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium">
                                                Log Out All Devices
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                <!-- Developer Section -->
                                <section id="developer-section" class="glass-panel p-6 border border-gray-700/50 rounded-xl">
                                    <div class="flex items-center justify-between mb-6">
                                        <h2 class="text-xl font-semibold text-white">API Keys</h2>
                                        <button id="create-key-btn" class="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors">
                                            + Generate Key
                                        </button>
                                    </div>
                                    
                                    <div id="api-keys-list" class="space-y-3">
                                        <p class="text-gray-400 text-sm">Loading API keys...</p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- API Key Modal -->
            <div id="api-key-modal" class="fixed inset-0 z-[60] hidden flex items-center justify-center p-4">
                <div class="fixed inset-0 bg-black/80 backdrop-blur-sm" onclick="document.getElementById('api-key-modal').classList.add('hidden')"></div>
                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full relative z-10 shadow-2xl">
                    <h3 class="text-xl font-bold text-white mb-4">New API Key Generated</h3>
                    <p class="text-sm text-gray-400 mb-4">Please copy this key now. It will not be shown again.</p>
                    
                    <div class="flex items-center gap-2 mb-6">
                        <input type="text" id="new-api-key-display" readonly 
                               class="flex-1 bg-black border border-gray-800 rounded px-3 py-2 text-neon-blue font-mono text-sm" />
                        <button onclick="navigator.clipboard.writeText(document.getElementById('new-api-key-display').value)" 
                                class="p-2 bg-gray-800 rounded hover:bg-gray-700 text-gray-400 hover:text-white" title="Copy">
                            <i class="ph ph-copy"></i>
                        </button>
                    </div>
                    
                    <button class="w-full btn btn-primary" onclick="document.getElementById('api-key-modal').classList.add('hidden'); window.location.reload();">Done</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }

        const logoutAllBtn = document.getElementById('logout-all-btn');
        if (logoutAllBtn) {
            logoutAllBtn.addEventListener('click', () => this.handleLogoutAll());
        }

        const createKeyBtn = document.getElementById('create-key-btn');
        if (createKeyBtn) {
            createKeyBtn.addEventListener('click', () => this.handleCreateKey());
        }
    }

    loadSettings() {
        this.loadApiKeys();
    }

    async loadApiKeys() {
        try {
            const list = document.getElementById('api-keys-list');
            if (!list) return;

            const response = await this.app.apiClient.get('/api-keys');
            if (response.success) {
                const keys = response.data;
                if (!keys.length) {
                    list.innerHTML = `<p class="text-sm text-gray-500 italic">No API keys generated yet.</p>`;
                    return;
                }

                list.innerHTML = keys.map(key => `
                    <div class="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <div>
                            <p class="text-white font-medium text-sm">${key.name}</p>
                            <p class="text-xs text-gray-500 font-mono mt-0.5">Created: ${new Date(key.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] uppercase tracking-wider text-gray-600 border border-gray-800 rounded px-1.5 py-0.5">
                                ${key.last_used_at ? 'Actv: ' + new Date(key.last_used_at).toLocaleDateString() : 'Unused'}
                            </span>
                            <button class="text-red-400 hover:text-red-300 p-1" onclick="window.app.currentPage.deleteKey(${key.id})">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Failed to load API keys:', error);
        }
    }

    async handleCreateKey() {
        const name = prompt('Enter a name for this API Key (e.g. "CI/CD Pipeline"):', 'My API Key');
        if (!name) return;

        try {
            const response = await this.app.apiClient.post('/api-keys', { name });
            if (response.success) {
                const newKey = response.data.key;
                const modal = document.getElementById('api-key-modal');
                const display = document.getElementById('new-api-key-display');
                if (modal && display) {
                    display.value = newKey;
                    modal.classList.remove('hidden');
                }
            } else {
                this.app.showError(response.message || 'Failed to create key');
            }
        } catch (error) {
            console.error('Create key error:', error);
            this.app.showError('Failed to create API key');
        }
    }

    async deleteKey(id) {
        if (!confirm('Are you sure you want to revoke this API key? Applications using it will stop working.')) return;

        try {
            const response = await this.app.apiClient.delete(`/api-keys/${id}`);
            if (response.success) {
                this.app.showSuccess('API Key revoked');
                this.loadApiKeys();
            } else {
                this.app.showError('Failed to revoke key');
            }
        } catch (error) {
            console.error('Delete key error:', error);
            this.app.showError('Error revoking key');
        }
    }

    async handleLogoutAll() {
        if (!confirm('Are you sure you want to log out of all devices? You will be redirected to login.')) return;

        try {
            // Call backend with ?all=true
            await this.app.apiClient.post('/auth/logout?all=true');
            // Clear local session
            this.app.auth.logout(); // This clears local storage and redirects
        } catch (error) {
            console.error('Logout all error', error);
            this.app.showError('Logout failed');
            // Force local logout anyway
            this.app.auth.logout();
        }
    }

    async saveProfile() {
        const btn = document.getElementById('save-profile-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin inline-block mr-2">⟳</span> Saving...`;

        const data = {
            display_name: document.getElementById('display-name').value,
            bio: document.getElementById('bio').value,
            website: document.getElementById('website').value
        };

        try {
            // Assume we have an endpoint for this, or simulate it
            await this.app.apiClient.put('/users/me', data);

            // Update local user data
            this.app.auth.user = { ...this.app.auth.user, ...data };
            this.app.showSuccess('Profile updated successfully');
        } catch (error) {
            console.error('Failed to update profile:', error);
            this.app.showError('Failed to update profile');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}
