'use client';

import { Search, Bell, Command, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function Navbar() {
    const { user } = useAuthStore();
    const { mobileMenuOpen, toggleMobileMenu } = useUIStore();
    const initials = user?.display_name
        ? user.display_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : user?.username?.slice(0, 2).toUpperCase() || '??';

    return (
        <header className="h-20 glass border-b border-white/10 flex items-center justify-between px-4 md:px-8 z-40">
            <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 hover:bg-white/5 rounded-xl text-slate-400 mr-2 transition-all active:scale-95"
            >
                <Menu size={24} />
            </button>

            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-500 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-10 md:pl-12 pr-4 md:pr-12 py-2.5 md:py-3 bg-slate-900/50 border border-white/5 rounded-2xl text-xs md:text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-slate-600"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] text-slate-500">
                        <Command size={10} />
                        <span>K</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                    <Bell size={22} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-violet-500 rounded-full border-2 border-[#0f172a]" />
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-white">{user?.display_name || user?.username}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest text-[10px] font-bold">
                            {user?.achievement_points > 1000 ? 'Architect' : 'Developer'}
                        </p>
                    </div>
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-xl" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 p-[2px]">
                            <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center font-bold text-white text-xs">
                                {initials}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
