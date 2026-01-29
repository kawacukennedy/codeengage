export default class Navigation {
    constructor(activeRoute) {
        this.activeRoute = activeRoute;
    }

    render() {
        return `
            <nav class="fixed top-0 left-0 right-0 z-50 glass-nav border-b border-white/5">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex items-center justify-between h-16">
                        <!-- Left Side: Logo & Links -->
                        <div class="flex items-center gap-8">
                            <a href="/dashboard" class="flex items-center gap-3 group">
                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple p-0.5 group-hover:rotate-3 transition-transform">
                                    <div class="w-full h-full bg-gray-900 rounded-[7px] flex items-center justify-center">
                                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                    </div>
                                </div>
                                <span class="text-white font-bold tracking-tight">CodeEngage</span>
                            </a>

                            <div class="hidden md:flex items-center gap-1">
                                ${this.renderNavLink('/dashboard', 'Dashboard', 'home')}
                                ${this.renderNavLink('/snippets', 'Snippets', 'code')}
                                ${this.renderNavLink('/profile', 'Profile', 'user')}
                            </div>
                        </div>

                        <!-- Right Side: Actions -->
                        <div class="flex items-center gap-4">
                            <!-- Search Trigger -->
                            <button id="cmd-palette-trigger" class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm group">
                                <svg class="w-4 h-4 group-hover:text-neon-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <span>Search</span>
                                <span class="px-1.5 py-0.5 rounded bg-white/10 text-xs border border-white/5">⌘K</span>
                            </button>

                            <!-- Create Button -->
                            <a href="/new" class="hidden sm:flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-transform shadow-neon">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                <span>New Snippet</span>
                            </a>

                            <!-- Mobile Menu Button -->
                            <button class="md:hidden p-2 text-gray-400 hover:text-white">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </button>

                            <!-- Profile/Logout -->
                            <div class="relative group ml-2">
                                <button class="flex items-center gap-2 outline-none">
                                    <div class="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple p-0.5">
                                        <div class="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                                            <img src="https://ui-avatars.com/api/?name=${window.app?.auth?.user?.username || 'User'}&background=random" class="w-full h-full object-cover">
                                        </div>
                                    </div>
                                </button>
                                
                                <!-- Dropdown -->
                                <div class="absolute right-0 mt-2 w-48 py-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                                    <div class="px-4 py-2 border-b border-white/5">
                                        <div class="text-sm text-white font-medium truncate">${window.app?.auth?.user?.username || 'User'}</div>
                                        <div class="text-xs text-gray-500 truncate">${window.app?.auth?.user?.email || ''}</div>
                                    </div>
                                    <a href="/profile" class="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Your Profile</a>
                                    <a href="/settings" class="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Settings</a>
                                    <div class="border-t border-white/5 my-1"></div>
                                    <button id="logout-btn" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors">Sign Out</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <div class="h-16"></div> <!-- Spacer -->
        `;
    }

    renderNavLink(href, text, iconName) {
        const isActive = this.activeRoute === href;
        const baseClasses = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200";
        const activeClasses = isActive
            ? "bg-white/10 text-white shadow-lg shadow-purple-500/10 border border-white/10"
            : "text-gray-400 hover:text-white hover:bg-white/5";

        const icons = {
            home: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
            code: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`,
            user: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
        };

        return `
            <a href="${href}" class="${baseClasses} ${activeClasses}">
                ${icons[iconName] || ''}
                <span>${text}</span>
            </a>
        `;
    }
}
