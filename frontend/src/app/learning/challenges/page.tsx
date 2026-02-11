'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Zap,
    Trophy,
    Target,
    Users,
    Clock,
    ChevronRight,
    Star,
    Award,
    Flame,
    LayoutGrid,
    Search,
    BrainCircuit,
    ArrowUpRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/utils';

export default function LearningChallenges() {
    const [filter, setFilter] = useState('All');

    const { data: realChallenges, isLoading } = useQuery({
        queryKey: ['challenges'],
        queryFn: () => fetchApi('/challenges')
    });

    const stats = [
        { label: 'Current Streak', value: '12 Days', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Global Rank', value: '#1,204', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { label: 'Sunder XP', value: '14,250', icon: Zap, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    ];

    const displayChallenges = realChallenges || [
        {
            id: '1',
            title: 'Async Vortex Resolver',
            category: 'Systems',
            difficulty: 'advanced',
            reward: '500 XP',
            timeLimit: '45m',
            participants: '1.2k',
            status: 'unlocked',
            description: 'Optimize a nested asynchronous queue manager with backpressure handling.'
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-orange-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-orange-600/20 rotate-3">
                            <Zap className="text-white fill-white" size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold text-white uppercase tracking-tight leading-none mb-2 italic">Neural Challenges</h1>
                            <p className="text-slate-400 font-medium">Daily algorithmic quests to sharpen your mental IDE</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
                        {stats.map((stat, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                <stat.icon className={stat.color} size={14} />
                                <div className="leading-none">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                    <p className="text-[11px] font-black text-white">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Hero Challenge */}
                <div className="glass rounded-[48px] p-12 border border-white/5 bg-gradient-to-br from-orange-600/20 via-slate-900 to-transparent relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-orange-600/20 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-white bg-orange-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-orange-600/20">LIVE EVENT</span>
                                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase tracking-widest">
                                    <Clock size={14} /> Ends in 04:12:45
                                </div>
                            </div>
                            <h2 className="text-5xl font-black text-white leading-none uppercase tracking-tighter italic">The Distributed <br />Consensus Gauntlet</h2>
                            <p className="text-slate-400 max-w-xl text-lg leading-relaxed font-medium">
                                Architect a fault-tolerant Raft implementation with sub-10ms heartbeat latency. Top performers earn the <span className="text-white font-black underline decoration-orange-500/50">"Consensus King"</span> badge.
                            </p>
                            <div className="flex items-center gap-8 pt-4">
                                <div className="flex items-center gap-2">
                                    <Users className="text-slate-500" size={18} />
                                    <span className="text-sm font-bold text-white">2.4k Engaged</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Award className="text-amber-400" size={18} />
                                    <span className="text-sm font-bold text-white">+1,200 XP REWARD</span>
                                </div>
                            </div>
                            <button className="px-12 py-5 bg-white text-slate-950 font-black rounded-3xl hover:bg-slate-200 transition-all shadow-2xl shadow-white/10 uppercase tracking-widest text-xs flex items-center gap-3 group">
                                ENTER THE GAUNTLET <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </div>
                        <div className="w-full md:w-[480px] aspect-square glass rounded-[40px] border border-white/10 relative overflow-hidden flex items-center justify-center p-1">
                            <div className="w-full h-full bg-slate-950/80 rounded-[36px] flex flex-col items-center justify-center relative group-hover:scale-[0.98] transition-transform duration-700">
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <div className="grid grid-cols-10 h-full w-full">
                                        {Array.from({ length: 100 }).map((_, i) => (
                                            <div key={i} className="border-[0.5px] border-white/[0.05]" />
                                        ))}
                                    </div>
                                </div>
                                <BrainCircuit className="text-orange-500/40 animate-pulse mb-8" size={120} strokeWidth={1} />
                                <div className="text-center px-10">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Neural Complexity</p>
                                    <div className="flex gap-1.5 justify-center">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className={cn("w-3 h-3 rounded-full", i <= 4 ? "bg-orange-500 shadow-lg shadow-orange-500/40" : "bg-white/5 border border-white/10")} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters & Grid */}
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-3 bg-slate-900 border border-white/5 p-1.5 rounded-2xl w-fit">
                            {['All', 'Algorithms', 'Architecture', 'UI/UX', 'Security'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        filter === cat ? "bg-white text-slate-950 shadow-lg" : "text-slate-500 hover:text-white"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="relative group w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                            <input
                                type="text"
                                placeholder="Search challenges..."
                                className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayChallenges.map((challenge: any) => (
                            <div key={challenge.id} className={cn(
                                "glass rounded-[40px] border border-white/5 p-8 flex flex-col gap-6 transition-all duration-500 relative group overflow-hidden bg-slate-950/20",
                                challenge.status === 'locked' ? "opacity-40 grayscale" : "hover:scale-[1.02] hover:border-orange-500/30",
                                challenge.status === 'completed' ? "border-emerald-500/20" : ""
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                            challenge.difficulty?.toLowerCase() === 'advanced' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                                challenge.difficulty?.toLowerCase() === 'intermediate' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                                    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        )}>
                                            {challenge.difficulty}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{challenge.category}</span>
                                    </div>
                                    {challenge.status === 'completed' && <Award className="text-emerald-500" size={20} />}
                                    {challenge.status === 'locked' && <Target className="text-slate-600" size={20} />}
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight group-hover:text-orange-400 transition-colors italic">{challenge.title}</h3>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed">{challenge.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Time Limit</p>
                                        <div className="flex items-center gap-2 text-white font-black text-[11px] uppercase tracking-wide">
                                            <Clock size={12} className="text-slate-400" /> {challenge.timeLimit}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Reward</p>
                                        <div className="flex items-center gap-2 text-orange-400 font-black text-[11px] uppercase tracking-wide">
                                            <Zap size={12} className="fill-current" /> {challenge.reward}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={challenge.status === 'locked'}
                                    className={cn(
                                        "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2",
                                        challenge.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                            challenge.status === 'locked' ? "bg-slate-800 text-slate-600" :
                                                "bg-white text-slate-950 hover:bg-orange-500 hover:text-white shadow-xl shadow-black/20"
                                    )}
                                >
                                    {challenge.status === 'completed' ? 'Re-Optimize' : challenge.status === 'locked' ? 'Locked' : 'Initialize Quest'}
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
