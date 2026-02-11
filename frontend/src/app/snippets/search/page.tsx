'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Search,
    Filter,
    ChevronDown,
    Star,
    Code2,
    Eye,
    MessageSquare,
    Zap,
    TrendingUp,
    Clock,
    LayoutGrid,
    List,
    ArrowUpRight,
    Sparkles,
    Hash
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/utils';
import Link from 'next/link';

export default function SnippetSearchPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<string[]>(['TypeScript']);

    const { data: results, isLoading } = useQuery({
        queryKey: ['snippet-search', searchQuery, activeFilters],
        queryFn: () => fetchApi(`/snippets?search=${searchQuery}&tags=${activeFilters.join(',')}`),
        enabled: searchQuery.length > 2 || activeFilters.length > 0
    });

    const toggleFilter = (filter: string) => {
        setActiveFilters((prev: string[]) =>
            prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-10 max-w-7xl mx-auto pb-20">
                {/* Search Hero */}
                <div className="relative p-12 rounded-[3.5rem] bg-slate-950/40 border border-white/5 backdrop-blur-3xl overflow-hidden group">
                    <div className="absolute -right-20 -top-20 w-[40rem] h-[40rem] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute -left-20 -bottom-20 w-[40rem] h-[40rem] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative z-10 space-y-8 flex flex-col items-center text-center">
                        <div className="space-y-4">
                            <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">
                                Search the <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400">Universal Ledger</span>
                            </h1>
                            <p className="text-slate-400 font-medium max-w-2xl mx-auto">Access the collective intelligence of the Sunder network. Billions of cycles saved through optimized snippets.</p>
                        </div>

                        <div className="w-full max-w-3xl relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={24} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Query function, pattern, or logic..."
                                className="w-full pl-16 pr-24 py-6 bg-slate-900 border border-white/5 rounded-[2.5rem] text-xl text-white placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all font-bold shadow-2xl"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/5">⌘ K</span>
                                <button className="p-3 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-500/20 hover:scale-105 transition-all">
                                    <Sparkles size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {['TypeScript', 'Rust', 'Go', 'Python', 'React', 'Optimized', 'Security'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleFilter(tag)}
                                    className={cn(
                                        "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all",
                                        activeFilters.includes(tag)
                                            ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20"
                                            : "bg-white/5 border-white/5 text-slate-500 hover:text-white hover:border-white/10"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results Bar */}
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                            <TrendingUp size={14} className="text-emerald-400" />
                            {results?.snippets?.length || 0} Engines Located
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <button className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all">
                            Sort: Relevance <ChevronDown size={14} />
                        </button>
                    </div>

                    <div className="flex items-center p-1 bg-slate-950/50 border border-white/5 rounded-2xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2.5 rounded-xl transition-all",
                                viewMode === 'grid' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
                            )}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2.5 rounded-xl transition-all",
                                viewMode === 'list' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
                            )}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Results */}
                <div className={cn(
                    "grid gap-8",
                    viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                )}>
                    {isLoading ? (
                        [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-white/5 rounded-[2.5rem] animate-pulse" />)
                    ) : results?.snippets?.map((snippet: any) => (
                        <Link
                            key={snippet.id}
                            href={`/snippets/${snippet.id}`}
                            className="group relative p-8 rounded-[3rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl hover:border-violet-500/30 transition-all duration-500 flex flex-col gap-6 overflow-hidden"
                        >
                            <div className="absolute -right-20 -top-20 w-40 h-40 bg-violet-600/5 blur-[80px] group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-start justify-between relative z-10">
                                <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl text-violet-400 group-hover:scale-110 transition-transform">
                                    <Code2 size={24} />
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{snippet.language}</span>
                                </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tight group-hover:text-violet-400 transition-colors line-clamp-1">{snippet.title}</h3>
                                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">{snippet.description || 'Global intelligence module for specialized engineering workflows.'}</p>
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t border-white/5 relative z-10">
                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                    <Star size={12} className="fill-amber-500 text-amber-500" />
                                    {snippet.star_count}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                    <Eye size={12} />
                                    {snippet.view_count || '1.2k'}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                    <MessageSquare size={12} />
                                    24
                                </div>
                                <div className="ml-auto flex items-center gap-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-tighter italic">
                                    <Clock size={10} />
                                    2h ago
                                </div>
                            </div>

                            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-violet-600 text-white rounded-[20px] flex items-center justify-center translate-x-32 group-hover:translate-x-0 transition-transform shadow-2xl shadow-violet-600/40">
                                <ArrowUpRight size={28} />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Empty State / Suggestions */}
                {!isLoading && results?.snippets?.length === 0 && (
                    <div className="p-20 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-slate-700 border border-white/5 border-dashed">
                            <Search size={48} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Signal Lost</h3>
                            <p className="text-slate-500 font-medium max-w-sm">We couldn't locate any modules matching your query in the current spectrum.</p>
                        </div>
                        <button className="px-10 py-4 bg-white text-slate-950 text-[10px] font-black rounded-2xl uppercase tracking-widest shadow-2xl hover:bg-slate-200 transition-all">
                            Broadcast New Requirement
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
