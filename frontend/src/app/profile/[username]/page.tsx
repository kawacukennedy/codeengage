'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    User,
    MapPin,
    Link as LinkIcon,
    Twitter,
    Github,
    LayoutGrid,
    Award,
    Activity,
    Building2,
    Edit2,
    Calendar,
    BrainCircuit,
    Terminal,
    Star,
    Zap,
    Trophy,
    Briefcase,
    Users,
    ChevronRight,
    FileCode,
    TrendingUp,
    Layout
} from 'lucide-react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn, fetchApi, formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// --- Custom Radar Chart Component ---
const RadarChart = ({ data }: { data: { label: string, value: number }[] }) => {
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const angleStep = (Math.PI * 2) / data.length;

    const points = data.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + radius * (d.value / 100) * Math.cos(angle);
        const y = center + radius * (d.value / 100) * Math.sin(angle);
        return `${x},${y}`;
    }).join(' ');

    const axes = data.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const labelX = center + (radius + 25) * Math.cos(angle);
        const labelY = center + (radius + 20) * Math.sin(angle);
        return { x, y, labelX, labelY, label: d.label };
    });

    return (
        <div className="relative flex items-center justify-center h-[300px]">
            <svg width={size} height={size} className="overflow-visible">
                {/* Background Grid Circles */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((r, i) => (
                    <circle key={i} cx={center} cy={center} r={radius * r} className="fill-none stroke-white/5" />
                ))}
                {/* Axis Lines */}
                {axes.map((axis, i) => (
                    <line key={i} x1={center} y1={center} x2={axis.x} y2={axis.y} className="stroke-white/10" />
                ))}
                {/* Data Polygon */}
                <motion.polygon
                    points={points}
                    className="fill-violet-500/30 stroke-violet-400 stroke-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1, type: "spring" }}
                />
                {/* Labels */}
                {axes.map((axis, i) => (
                    <text
                        key={i}
                        x={axis.labelX}
                        y={axis.labelY}
                        textAnchor="middle"
                        className="text-[10px] font-black fill-slate-500 uppercase tracking-widest"
                    >
                        {axis.label}
                    </text>
                ))}
            </svg>
        </div>
    );
};

export default function ProfilePage() {
    const params = useParams();
    const username = params.username as string;
    const [activeTab, setActiveTab] = useState('Overview');

    const tabs = ['Overview', 'Snippets', 'Achievements', 'Activity', 'Organizations', 'Network'];

    const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
        queryKey: ['profile', username],
        queryFn: () => fetchApi(`/profiles/${username}`)
    });

    const { data: personaData, isLoading: personaLoading } = useQuery({
        queryKey: ['persona', username],
        queryFn: () => fetchApi(`/profiles/${username}/persona`)
    });

    const isLoading = profileLoading || personaLoading;
    const error = profileError;

    if (isLoading) return <DashboardLayout><div className="animate-pulse glass h-96 rounded-[40px]" /></DashboardLayout>;
    if (error || !profile) return <DashboardLayout><div className="text-white">Profile Exception Encountered.</div></DashboardLayout>;

    const stats = [
        { label: 'Snippets', value: profile?.snippets?.length || 0 },
        { label: 'Achievements', value: profile?.achievement_points || 0 },
        { label: 'Streak', value: profile?.coding_streak || 0 },
        { label: 'Network', value: '2.4k' }, // Network size (Followers) is still mock in visual, but reputation is pts
    ];

    const initials = profile?.display_name
        ? profile.display_name.split(' ').map((n: any) => n[0]).join('').toUpperCase()
        : profile?.username?.slice(0, 2).toUpperCase() || '??';

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* Profile Header */}
                <div className="glass rounded-[48px] p-12 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

                    <div className="flex flex-col md:flex-row gap-12 items-start md:items-center relative z-10">
                        <div className="w-40 h-40 rounded-[42px] bg-gradient-to-br from-violet-500 via-blue-500 to-emerald-500 p-1 shadow-2xl shadow-violet-500/20">
                            <div className="w-full h-full rounded-[38px] bg-slate-950 flex items-center justify-center overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-5xl font-black bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent italic">{initials}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter">{profile?.display_name || profile?.username}</h1>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-violet-400 font-mono text-xs tracking-[0.2em]">@{profile?.username}</span>
                                        {profile?.achievement_points > 1000 && (
                                            <span className="px-3 py-1 bg-violet-600 font-black text-[10px] text-white rounded-full uppercase tracking-widest italic">Core Faculty</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="px-10 py-4 bg-white text-slate-950 font-black rounded-[24px] hover:bg-emerald-400 transition-all shadow-glow-white uppercase tracking-widest text-xs italic">Follow Signal</button>
                                    <button className="p-4 bg-white/5 text-white rounded-[24px] border border-white/10 hover:bg-white/10 transition-all"><Github size={20} /></button>
                                </div>
                            </div>

                            <p className="text-slate-400 max-w-2xl leading-relaxed font-medium">
                                {profile?.bio || "This user hasn't added a bio yet. They are busy building the future."}
                            </p>

                            <div className="flex flex-wrap gap-8 text-xs font-bold text-slate-600 uppercase tracking-widest">
                                <span className="flex items-center gap-2"><MapPin size={16} className="text-violet-500" /> {profile?.preferences?.location || 'Digital Space'}</span>
                                <span className="flex items-center gap-2"><Calendar size={16} className="text-violet-500" /> Joined {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2024'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-16 pt-12 border-t border-white/5">
                        {stats.map(stat => (
                            <div key={stat.label} className="group cursor-default">
                                <p className="text-3xl font-black text-white italic group-hover:text-violet-400 transition-colors">{stat.value}</p>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2 bg-slate-950/20 p-2 rounded-3xl border border-white/5 w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                activeTab === tab ? "bg-white text-slate-950 shadow-glow-white" : "text-slate-600 hover:text-white"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Overlay */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="min-h-[500px]"
                    >
                        {activeTab === 'Overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Radar Chart (Coding Style) */}
                                <div className="glass p-10 rounded-[48px] border border-white/5 lg:col-span-1">
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8 flex items-center gap-3 italic">
                                        <Zap size={18} className="text-violet-400" /> Coding Style Radar
                                    </h3>
                                    <RadarChart data={Object.entries(personaData?.radar || {}).map(([label, value]) => ({ label: label.toUpperCase(), value: value as number }))} />
                                    <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <p className="text-xl font-black text-white italic">{personaData?.radar?.performance || 0}%</p>
                                            <p className="text-[9px] text-slate-500 font-black uppercase">Efficiency</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-black text-white italic">{personaData?.radar?.security || 0}%</p>
                                            <p className="text-[9px] text-slate-500 font-black uppercase">Security</p>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Personality persona */}
                                <div className="glass p-10 rounded-[48px] border border-white/5 lg:col-span-1 flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute -bottom-10 -right-10 opacity-5">
                                        <BrainCircuit size={200} />
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8 flex items-center gap-3 italic">
                                            <BrainCircuit size={18} className="text-emerald-400" /> AI Persona Profile
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Classification</p>
                                                <p className="text-lg font-black text-white italic">{personaData?.traits?.[0] || 'Unknown Origin'}</p>
                                            </div>
                                            <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                                "{personaData?.summary || "Analyzing coding patterns to determine AI affinity. System processing..."}"
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 relative z-10">
                                        <Terminal size={16} className="text-slate-500" />
                                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Neural Mode: Active</span>
                                    </div>
                                </div>

                                {/* Featured Activity */}
                                <div className="glass p-10 rounded-[48px] border border-white/5 lg:col-span-1 space-y-8">
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 italic">
                                        <Activity size={18} className="text-blue-400" /> Featured Nodes
                                    </h3>
                                    <div className="space-y-6">
                                        {profile?.snippets?.slice(0, 3).map((snip: any) => (
                                            <Link key={snip.id} href={`/snippets/${snip.id}`} className="block group p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">{snip.language}</span>
                                                    <div className="flex items-center gap-1 text-amber-400">
                                                        <Star size={10} fill="currentColor" />
                                                        <span className="text-[10px] font-bold">{snip.star_count}</span>
                                                    </div>
                                                </div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-tight italic line-clamp-1">{snip.title}</h4>
                                                <p className="text-[10px] text-slate-600 font-bold mt-2 uppercase">{formatRelativeTime(snip.created_at)}</p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Snippets' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {profile?.snippets?.map((snip: any) => (
                                    <Link key={snip.id} href={`/snippets/${snip.id}`} className="glass p-8 rounded-[40px] border border-white/5 group hover:scale-[1.02] transition-all flex flex-col">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center">
                                                <FileCode size={18} className="text-violet-400" />
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="px-3 py-1 bg-white/5 text-slate-500 rounded-lg text-[9px] font-black uppercase">{snip.language}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2 group-hover:text-violet-400 transition-colors line-clamp-1">{snip.title}</h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">{snip.description || 'No description provided'}</p>
                                        <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Star size={14} className="text-amber-400" fill="currentColor" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">{snip.star_count} Stars</span>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-700 uppercase">{formatRelativeTime(snip.created_at)}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {activeTab === 'Achievements' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="aspect-square glass rounded-[32px] border border-white/5 flex flex-col items-center justify-center gap-4 group cursor-help hover:border-amber-400/30 transition-all">
                                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center shadow-inner">
                                            <Award size={32} className="text-amber-500 group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-white uppercase italic">Badge-{i}</p>
                                            <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Prestige: 40</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'Activity' && (
                            <div className="glass p-12 rounded-[48px] border border-white/5">
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-12 italic flex items-center gap-3">
                                    <Terminal size={20} className="text-emerald-500" /> System Contrib Stream
                                </h3>
                                <div className="space-y-12 relative">
                                    <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-white/5" />
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="flex gap-8 relative">
                                            <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500 relative z-10" />
                                            <div>
                                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">2h ago</p>
                                                <h4 className="text-sm font-black text-white uppercase italic">Neural Uplink Established</h4>
                                                <p className="text-xs text-slate-500 mt-2 max-w-lg">Successfully refactored the auth-gateway to support higher token resolution and lower latency neural matching.</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Organizations' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="glass p-10 rounded-[48px] border border-white/5 flex flex-col items-center text-center group hover:bg-white/[0.03] transition-all">
                                        <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Building2 className="text-slate-400 group-hover:text-blue-400" size={32} />
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Vortex Engineering</h3>
                                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-2">{i * 12} Core Members</p>
                                        <div className="mt-8 pt-8 border-t border-white/5 w-full">
                                            <button className="text-[10px] font-black text-violet-400 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto">
                                                View HQ <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'Network' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Mutual Nodes */}
                                    <div className="glass p-10 rounded-[48px] border border-white/5 bg-gradient-to-br from-blue-600/5 to-transparent">
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8 flex items-center gap-3 italic">
                                            <Users size={18} className="text-blue-400" /> Mutual Neural Nodes
                                        </h3>
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10" />
                                                        <div>
                                                            <p className="text-xs font-black text-white uppercase">Nexus_Walker_{i}</p>
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Mutual Connections: {12 - i}</p>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 text-slate-500 hover:text-white"><LinkIcon size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Social Graph Teaser */}
                                    <div className="glass p-10 rounded-[48px] border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-24 h-24 bg-violet-600/10 rounded-full flex items-center justify-center border border-violet-500/20">
                                            <Activity size={40} className="text-violet-400 animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-white uppercase tracking-tight italic">Social Graph v2.0</h4>
                                            <p className="text-xs text-slate-500 max-w-[240px] mt-2 leading-relaxed">Visualize your influence across the Sunder network in 3D (Coming Soon to Desktop Nodes).</p>
                                        </div>
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border-4 border-[#0f172a] shadow-xl" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
