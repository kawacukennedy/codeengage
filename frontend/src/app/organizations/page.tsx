'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Building2,
    Plus,
    Users,
    Code2,
    Globe,
    Shield,
    ChevronRight,
    Search,
    TrendingUp,
    Zap
} from 'lucide-react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/utils';

export default function OrganizationsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: orgsData, isLoading } = useQuery({
        queryKey: ['my-organizations'],
        queryFn: () => fetchApi('/organizations')
    });

    const organizations = useMemo(() => {
        const list = orgsData?.organizations || [];
        if (!searchQuery) return list;
        return list.filter((org: any) =>
            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [orgsData, searchQuery]);

    return (
        <DashboardLayout>
            <div className="space-y-12 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                <Building2 className="text-blue-400" size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">
                                Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Collectives</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 font-medium tracking-tight">Manage and discover high-performance engineering squads.</p>
                    </div>

                    <Link
                        href="/organizations/create"
                        className="px-8 py-4 bg-white text-slate-950 text-xs font-black rounded-2xl hover:scale-105 transition-all uppercase tracking-widest shadow-xl shadow-white/5 flex items-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Spawn New Core
                    </Link>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Stats/Filters */}
                    <div className="space-y-6">
                        <div className="p-8 rounded-[2.5rem] bg-slate-900/50 border border-white/5 backdrop-blur-xl space-y-8 shadow-xl">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Network Status</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Active Nodes</span>
                                        <span className="text-white font-black">{organizations.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Global Cores</span>
                                        <span className="text-white font-black">1.2k+</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Discovery</h4>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Filter Nexus..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-xs text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-cyan-600 border border-white/10 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
                            <Zap className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                            <h4 className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Upgrade Support</h4>
                            <p className="text-xs text-blue-100/70 font-bold uppercase leading-relaxed mb-6">Unlock Enterprise governance & priority AI clusters.</p>
                            <button className="w-full py-3 bg-white/20 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/30 transition-all border border-white/20">
                                Expand Tier
                            </button>
                        </div>
                    </div>

                    {/* Orgs List */}
                    <div className="lg:col-span-3 space-y-6">
                        {isLoading ? (
                            <div className="space-y-6">
                                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white/5 rounded-[2.5rem] animate-pulse" />)}
                            </div>
                        ) : organizations.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                {organizations.map((org: any) => (
                                    <Link
                                        key={org.id}
                                        href={`/organizations/${org.slug}`}
                                        className="group relative p-8 rounded-[2.5rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
                                    >
                                        <div className="flex items-center gap-8">
                                            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-2xl relative group-hover:scale-110 transition-transform">
                                                {org.name[0]}
                                                {org.is_public && (
                                                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg">
                                                        <Globe size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{org.name}</h3>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-full">@{org.slug}</span>
                                                </div>
                                                <p className="text-sm text-slate-400 font-medium line-clamp-1 max-w-md">{org.description || 'No manifesto provided for this collective.'}</p>
                                                <div className="flex items-center gap-6 pt-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                        <Users size={14} className="text-blue-400" />
                                                        {org.members_count || 1} Members
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                        <Code2 size={14} className="text-cyan-400" />
                                                        2.4k Snippets
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden md:block">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    All Systems Nominal
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Uptime: 99.99%</p>
                                            </div>
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-blue-600 transition-all">
                                                <ChevronRight size={24} />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="p-6 rounded-[2.5rem] bg-slate-900/50 text-slate-600 border border-white/5">
                                    <Building2 size={64} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">No Active Nodes</h3>
                                    <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">You haven't initialized or joined any organizations yet. Start your first collective now.</p>
                                </div>
                                <Link href="/organizations/create" className="px-10 py-4 bg-blue-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20 hover:scale-105 transition-all">
                                    Initialize Core
                                </Link>
                            </div>
                        )}

                        {/* Public Recommendations */}
                        <div className="pt-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                <TrendingUp size={16} className="text-emerald-400" /> Discover Trending Collectives
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { name: 'Sunder Labs', slug: 'sunder-labs', members: 124, type: 'Official' },
                                    { name: 'Vector Collective', slug: 'vector', members: 89, type: 'Public' }
                                ].map((rec) => (
                                    <div key={rec.slug} className="p-6 rounded-3xl bg-slate-900/30 border border-white/5 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-slate-400">{rec.name[0]}</div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-tight italic">{rec.name}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{rec.members} Engs • {rec.type}</p>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">
                                            Request Signal
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
