'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { fetchApi, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import {
    Zap,
    Clock,
    Star,
    MessageSquare,
    ChevronRight,
    Code2,
    BrainCircuit,
    TrendingUp,
    Activity,
    Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const { user } = useAuthStore();

    const { data: profileData, isLoading: profileLoading } = useQuery({
        queryKey: ['user-profile', user?.username],
        queryFn: () => fetchApi(`/profiles/${user?.username}`),
        enabled: !!user?.username
    });

    const { data: trendingSnippets, isLoading: trendingLoading } = useQuery({
        queryKey: ['trending-snippets'],
        queryFn: () => fetchApi('/snippets?limit=4&sort=trending')
    });

    const stats = [
        {
            label: "Total Snippets",
            value: profileData?.snippets?.length || 0,
            icon: Code2,
            color: "text-blue-400"
        },
        {
            label: "Achievement Pts",
            value: profileData?.achievement_points || 0,
            icon: Star,
            color: "text-amber-400"
        },
        {
            label: "Coding Streak",
            value: `${profileData?.coding_streak || 0}d`,
            icon: TrendingUp,
            color: "text-violet-400"
        },
        {
            label: "Last Activity",
            value: profileData?.last_active_at ? formatRelativeTime(profileData.last_active_at) : 'N/A',
            icon: Activity,
            color: "text-emerald-400"
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20">
                {/* Welcome Banner */}
                <div className="relative glass p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-white/5 overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-600/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                        <div className="space-y-4">
                            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight italic">
                                Welcome Back, <span className="text-violet-400">{user?.display_name || user?.username}</span>
                            </h1>
                            <p className="text-slate-400 max-w-xl font-medium">
                                Ready to accelerate your workflow? Your AI companion is warmed up and waiting for your next instruction.
                            </p>
                            <div className="flex gap-4 pt-2">
                                <Link href="/snippets/create" className="px-6 py-3 bg-white text-slate-950 text-xs font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest flex items-center gap-2">
                                    <Plus size={16} /> New Snippet
                                </Link>
                                <Link href="/ai/pair" className="px-6 py-3 glass hover:bg-white/10 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest flex items-center gap-2">
                                    <BrainCircuit size={16} className="text-violet-400" /> Start Pair Session
                                </Link>
                            </div>
                        </div>
                        <div className="hidden lg:block">
                            <div className="w-32 h-32 rounded-[32px] bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-2xl shadow-violet-500/10 transition-transform group-hover:scale-110">
                                <Zap className="text-violet-500" size={48} fill="currentColor" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Quick Stats Widget */}
                    <div className="md:col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="glass p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-white/5 flex flex-col items-center text-center gap-3 md:gap-4 hover:border-white/10 transition-all">
                                <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center", stat.color.replace('text', 'bg').replace('400', '500/10'))}>
                                    <stat.icon size={20} className={stat.color} />
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="text-xl md:text-2xl font-black text-white italic">{stat.value}</div>
                                    <div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center truncate w-full">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI Suggestions Widget */}
                    <div className="md:col-span-12 lg:col-span-4 glass p-8 rounded-[40px] border border-white/5 bg-gradient-to-br from-violet-600/[0.03] to-transparent">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 italic">
                                <BrainCircuit size={18} className="text-violet-400" /> AI Insights
                            </h3>
                            <div className="flex gap-1">
                                <span className="w-1 h-1 rounded-full bg-violet-500 animate-ping" />
                                <span className="w-1 h-1 rounded-full bg-violet-500" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            {[
                                "Optimize the recursive logic in your 'auth-hook' snippet.",
                                "3 new Go snippets matching your interests were published.",
                                "Your collaboration session with @neon is starting in 5m."
                            ].map((suggestion, i) => (
                                <div key={i} className="flex gap-4 group cursor-pointer">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 group-hover:scale-150 transition-transform" />
                                    <p className="text-xs text-slate-400 font-medium group-hover:text-slate-200 transition-colors leading-relaxed">{suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Snippets Widget */}
                    <div className="md:col-span-12 lg:col-span-12 glass p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-white/5">
                        <div className="flex items-center justify-between mb-8 md:mb-10">
                            <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight italic flex items-center gap-2 md:gap-3">
                                <Code2 size={20} className="text-blue-400" /> Trending Marketplace
                            </h3>
                            <Link href="/snippets" className="text-[10px] md:text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                                Full Library <ChevronRight size={12} />
                            </Link>
                        </div>

                        {trendingLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {trendingSnippets?.snippets?.map((snippet: any) => (
                                    <Link key={snippet.id} href={`/snippets/${snippet.id}`} className="glass group p-6 rounded-[32px] border border-white/5 hover:border-violet-500/30 transition-all flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                                <TrendingUp className="text-violet-500" size={20} />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{snippet.language}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight line-clamp-1">{snippet.title}</h4>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{snippet.description || 'No description'}</p>
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-slate-600 uppercase">
                                            <div className="flex items-center gap-1"><Star size={10} fill="currentColor" /> {snippet.star_count}</div>
                                            <div>{formatRelativeTime(snippet.created_at)}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
