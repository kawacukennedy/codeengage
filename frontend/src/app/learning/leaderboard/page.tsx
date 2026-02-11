'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Trophy,
    Medal,
    Users,
    Zap,
    Target,
    Flame,
    TrendingUp,
    Search,
    Filter,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    Award,
    Sparkles,
    Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const ranks = [
    {
        rank: 1,
        user: 'Neural_Ghost',
        avatar: 'NG',
        xp: '124,500',
        snippets: 450,
        streak: 42,
        change: 'up',
        badges: 24,
        color: 'from-amber-400 to-orange-500'
    },
    {
        rank: 2,
        user: 'ByteWizard',
        avatar: 'BW',
        xp: '118,200',
        snippets: 380,
        streak: 15,
        change: 'down',
        badges: 18,
        color: 'from-slate-300 to-slate-400'
    },
    {
        rank: 3,
        user: 'VoidExplorer',
        avatar: 'VE',
        xp: '95,400',
        snippets: 310,
        streak: 8,
        change: 'none',
        badges: 15,
        color: 'from-orange-400 to-amber-700'
    },
    {
        rank: 4,
        user: 'Alex_Rivera',
        avatar: 'AR',
        xp: '84,000',
        snippets: 240,
        streak: 12,
        change: 'up',
        badges: 12,
        isMe: true
    },
    {
        rank: 5,
        user: 'FluxRunner',
        avatar: 'FR',
        xp: '72,100',
        snippets: 195,
        streak: 5,
        change: 'up',
        badges: 10
    }
];

import { fetchApi } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

export default function LeaderboardPage() {
    const [timeframe, setTimeframe] = useState('All Time');

    const { data: leaderboardData, isLoading } = useQuery({
        queryKey: ['leaderboard', timeframe],
        queryFn: () => fetchApi('/leaderboard') // timeframe filtering can be added to backend later
    });

    const displayRanks = leaderboardData?.rankings || [];
    const { user } = useAuthStore();

    return (
        <DashboardLayout>
            <div className="space-y-12 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                                <Globe className="text-amber-400" size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">
                                Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Hall of Fame</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 font-medium tracking-tight">The definitive ranking of the elite Void walkers.</p>
                    </div>

                    <div className="flex items-center p-1 bg-slate-900/50 border border-white/5 rounded-2xl backdrop-blur-xl">
                        {['Daily', 'Weekly', 'Monthly', 'All Time'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    timeframe === t
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                        : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top 3 Podium */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end px-4 min-h-[400px]">
                    {isLoading ? (
                        <div className="col-span-3 flex items-center justify-center p-20 opacity-20">
                            <Sparkles className="animate-pulse" size={48} />
                        </div>
                    ) : displayRanks.length >= 3 ? (
                        <>
                            {/* Rank 2 */}
                            <div className="order-2 md:order-1 flex flex-col items-center space-y-4">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-3xl bg-slate-400 flex items-center justify-center text-2xl font-black text-slate-800 rotate-3 group-hover:rotate-0 transition-transform duration-500 shadow-2xl overflow-hidden">
                                        {displayRanks[1]?.avatar_url ? <img src={displayRanks[1].avatar_url} alt="" className="w-full h-full object-cover" /> : displayRanks[1]?.username?.slice(0, 2).toUpperCase()}
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" />
                                    </div>
                                    <div className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-400">
                                        <Medal size={20} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-black text-white italic tracking-tight uppercase truncate max-w-[200px]">{displayRanks[1]?.display_name || displayRanks[1]?.username}</h3>
                                    <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase italic">{displayRanks[1]?.achievement_points?.toLocaleString()} XP</p>
                                </div>
                                <div className="w-full h-32 bg-slate-800/30 border-t-4 border-slate-400/50 rounded-t-3xl flex items-center justify-center">
                                    <span className="text-4xl font-black text-slate-400 italic">2</span>
                                </div>
                            </div>

                            {/* Rank 1 */}
                            <div className="order-1 md:order-2 flex flex-col items-center space-y-6">
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-amber-500/20 blur-2xl rounded-full group-hover:bg-amber-500/30 transition-all duration-700 animate-pulse" />
                                    <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl font-black text-amber-900 -rotate-3 group-hover:rotate-0 transition-transform duration-500 shadow-2xl relative z-10 overflow-hidden">
                                        {displayRanks[0]?.avatar_url ? <img src={displayRanks[0].avatar_url} alt="" className="w-full h-full object-cover" /> : displayRanks[0]?.username?.slice(0, 2).toUpperCase()}
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-amber-500 border-4 border-[#0f172a] flex items-center justify-center text-white shadow-xl z-20">
                                        <Trophy size={24} />
                                    </div>
                                </div>
                                <div className="text-center relative z-10">
                                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase truncate max-w-[250px]">{displayRanks[0]?.display_name || displayRanks[0]?.username}</h3>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <Zap className="text-amber-400 fill-amber-400" size={14} />
                                        <span className="text-xs font-black text-amber-400 tracking-[0.2em] uppercase italic">{displayRanks[0]?.achievement_points?.toLocaleString()} XP</span>
                                    </div>
                                </div>
                                <div className="w-full h-48 bg-amber-500/10 border-t-4 border-amber-400 rounded-t-[3rem] flex items-center justify-center relative shadow-[0_-20px_40px_rgba(245,158,11,0.05)] border-x border-amber-500/10">
                                    <span className="text-6xl font-black text-amber-500 italic pb-10">1</span>
                                </div>
                            </div>

                            {/* Rank 3 */}
                            <div className="order-3 flex flex-col items-center space-y-4">
                                <div className="relative group">
                                    <div className="w-20 h-20 rounded-2xl bg-orange-700 flex items-center justify-center text-xl font-black text-orange-200 -rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-2xl overflow-hidden">
                                        {displayRanks[2]?.avatar_url ? <img src={displayRanks[2].avatar_url} alt="" className="w-full h-full object-cover" /> : displayRanks[2]?.username?.slice(0, 2).toUpperCase()}
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20" />
                                    </div>
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-orange-400">
                                        <Award size={16} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-base font-black text-white italic tracking-tight uppercase truncate max-w-[180px]">{displayRanks[2]?.display_name || displayRanks[2]?.username}</h3>
                                    <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase italic">{displayRanks[2]?.achievement_points?.toLocaleString()} XP</p>
                                </div>
                                <div className="w-full h-24 bg-orange-900/10 border-t-4 border-orange-700/50 rounded-t-2xl flex items-center justify-center">
                                    <span className="text-3xl font-black text-orange-700 italic">3</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-3 text-center p-20 opacity-50 uppercase tracking-[0.3em] font-black text-xs italic">
                            Insufficient data for podium
                        </div>
                    )}
                </div>

                {/* Extended Leaderboard */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-8">
                            <span className="w-8 text-center italic">Pos</span>
                            <span className="w-64">Engineer</span>
                        </div>
                        <div className="flex-1 flex justify-center gap-16">
                            <span>Intelligence Score</span>
                            <span>Daily Streak</span>
                        </div>
                    </div>

                    {!isLoading && displayRanks.slice(3).map((item: any, idx: number) => (
                        <div
                            key={item.username}
                            className={cn(
                                "p-6 rounded-[2.5rem] bg-slate-900/40 border transition-all duration-300 group",
                                item.username === user?.username
                                    ? "border-violet-500/50 bg-violet-500/5 scale-[1.02] shadow-2xl shadow-violet-500/10"
                                    : "border-white/5 hover:border-white/10"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <span className={cn(
                                        "w-8 text-center text-sm font-black italic",
                                        item.username === user?.username ? "text-violet-400" : "text-slate-600"
                                    )}>
                                        #{idx + 4}
                                    </span>
                                    <div className="flex items-center gap-4 w-64">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-xl overflow-hidden",
                                            item.username === user?.username ? "bg-violet-600" : "bg-slate-800"
                                        )}>
                                            {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" /> : item.username?.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-tight italic flex items-center gap-2">
                                                {item.display_name || item.username}
                                                {item.username === user?.username && <Sparkles size={12} className="text-violet-400" />}
                                            </h4>
                                            {item.username === user?.username && <p className="text-[8px] font-black text-violet-500 uppercase tracking-widest">You</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex justify-center gap-24 items-center">
                                    <div className="text-center group-hover:scale-110 transition-transform">
                                        <div className="text-sm font-black text-white tracking-widest">{item.achievement_points?.toLocaleString()}</div>
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">XP Points</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Flame size={12} className={cn(item.coding_streak > 10 ? "text-orange-500 fill-orange-500" : "text-slate-600")} />
                                            <span className="text-sm font-black text-slate-300 tracking-widest">{item.coding_streak || 0}d</span>
                                        </div>
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Streak</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Insight */}
                <div className="p-10 rounded-[3rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl text-center space-y-6">
                    <TrendingUp className="mx-auto text-violet-500 mb-2" size={32} />
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Velocity Matrix</h3>
                    <p className="text-slate-400 text-sm font-medium max-w-lg mx-auto leading-relaxed">Your ranking is determined by a combination of XP, snippet complexity, collaboration frequency, and AI interaction depth.</p>
                    <button className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em] border-b border-violet-500/20 pb-1 hover:text-white transition-colors">
                        Explore Ranking Algorithm
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
