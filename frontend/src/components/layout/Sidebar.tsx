'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileCode,
    Building2,
    GraduationCap,
    BrainCircuit,
    User,
    Settings,
    ChevronLeft,
    ChevronRight,
    Sun,
    Moon,
    Search,
    TrendingUp,
    LogOut
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { sidebarCollapsed, toggleSidebar, theme, toggleTheme, mobileMenuOpen, toggleMobileMenu } = useUIStore();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        router.push('/auth/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { label: 'Search', icon: Search, href: '/snippets/search' },
        { label: 'Snippets', icon: FileCode, href: '/snippets' },
        { label: 'Organizations', icon: Building2, href: '/organizations' },
        { label: 'Learning Paths', icon: GraduationCap, href: '/learning/paths' },
        { label: 'Leaderboard', icon: TrendingUp, href: '/learning/leaderboard' },
        { label: 'AI Pair', icon: BrainCircuit, href: '/ai/pair' },
        { label: 'My Profile', icon: User, href: `/profile/${user?.username}` },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
                    onClick={toggleMobileMenu}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 lg:static glass border-r border-white/10 flex flex-col transition-all duration-500 z-[70]",
                    sidebarCollapsed ? "lg:w-20" : "lg:w-64",
                    mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="p-6 flex items-center justify-between">
                    {!sidebarCollapsed && (
                        <Link href="/dashboard" className="text-2xl font-black bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
                            SUNDER
                        </Link>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400"
                    >
                        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon size={22} className={cn(isActive ? "text-violet-400" : "group-hover:text-white")} />
                                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10 space-y-2">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-2xl transition-all"
                    >
                        {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
                        {!sidebarCollapsed && <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all"
                    >
                        <LogOut size={22} />
                        {!sidebarCollapsed && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
