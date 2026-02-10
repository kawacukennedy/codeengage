'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Search,
    ChevronDown,
    Star,
    Users,
    Clock,
    LayoutGrid,
    List,
    FileCode
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { cn, fetchApi, formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

export default function SnippetExplorer() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedLanguage, setSelectedLanguage] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const languages = ['All', 'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Swift', 'C++'];
    const tags = ['Web', 'Mobile', 'AI', 'Security', 'Frontend', 'Backend', 'DevOps'];

    const { data: snippetsData, isLoading, error } = useQuery({
        queryKey: ['snippets', selectedLanguage, searchQuery],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedLanguage !== 'All') params.append('language', selectedLanguage);
            if (searchQuery) params.append('search', searchQuery);
            params.append('limit', '20');
            return fetchApi(`/snippets?${params.toString()}`);
        }
    });

    const snippets = snippetsData?.snippets || [];

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Marketplace</h1>
                        <p className="text-slate-400 font-medium">Discover and fork community-sourced neural code nodes</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-900 border border-white/10 rounded-xl overflow-hidden p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white")}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white")}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <aside className="w-full lg:w-64 space-y-10">
                        {/* Search Input */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-xs font-bold uppercase tracking-widest placeholder:text-slate-600"
                            />
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 italic">Languages</h3>
                            <div className="space-y-2">
                                {languages.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setSelectedLanguage(lang)}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            selectedLanguage === lang ? "bg-violet-600/20 text-violet-400 border border-violet-500/30" : "text-slate-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 italic">Neural Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <button key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-600 uppercase hover:border-violet-500/50 hover:text-white transition-all tracking-tighter">
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Found <span className="text-white font-black">{snippetsData?.pagination?.total || 0}</span> results
                                {selectedLanguage !== 'All' && <span> for <span className="text-violet-400 font-black italic">{selectedLanguage}</span></span>}
                            </span>
                            <button className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white bg-slate-900 px-4 py-2 rounded-xl border border-white/10 uppercase tracking-widest">
                                Sort: {snippetsData?.filters?.sort || 'Newest'} <ChevronDown size={14} />
                            </button>
                        </div>

                        <div className={cn(
                            "grid gap-6",
                            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                        )}>
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="glass rounded-[32px] h-[180px] animate-pulse bg-white/5" />
                                ))
                            ) : error ? (
                                <div className="col-span-full py-12 text-center glass rounded-[32px] border border-white/5">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Signal Lost. Backend Sync Failed.</p>
                                </div>
                            ) : snippets?.length === 0 ? (
                                <div className="col-span-full py-20 text-center glass rounded-[40px] border border-white/5">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">No neural nodes match your sequence.</p>
                                </div>
                            ) : (
                                snippets.map((snippet: any) => (
                                    <Link
                                        href={`/snippets/${snippet.id}`}
                                        key={snippet.id}
                                        className="glass group overflow-hidden rounded-[40px] border border-white/5 hover:border-violet-500/30 transition-all duration-500 block relative"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-600/10 transition-colors" />
                                        <div className="p-8 relative z-10">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-violet-600/10 flex items-center justify-center border border-violet-500/10 group-hover:scale-110 transition-transform duration-500">
                                                        <FileCode className="text-violet-400" size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight italic line-clamp-1">{snippet.title}</h3>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">@{snippet.author?.username || 'anonymous'}</p>
                                                    </div>
                                                </div>
                                                <button className="p-2 text-slate-500 hover:text-amber-400 hover:bg-white/5 rounded-xl transition-all">
                                                    <Star size={18} />
                                                </button>
                                            </div>

                                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2 min-h-[2.5rem]">
                                                {snippet.description || 'No description provided for this neural node.'}
                                            </p>

                                            <div className="flex flex-wrap gap-2 mb-8">
                                                <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/10 rounded-md text-[9px] font-black text-violet-400 uppercase tracking-widest">
                                                    {snippet.language}
                                                </span>
                                                {snippet.tags?.slice(0, 2).map((tag: string) => (
                                                    <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                                <div className="flex items-center gap-6">
                                                    <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase italic">
                                                        <Star size={14} className="text-amber-500/50 group-hover:text-amber-400 transition-colors" /> {snippet.star_count || 0}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase italic">
                                                        <Users size={14} className="text-blue-500/50 group-hover:text-blue-400 transition-colors" /> {snippet.fork_count || 0}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">
                                                    {formatRelativeTime(snippet.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>

                        {/* Load More */}
                        {!isLoading && snippets?.length > 0 && (
                            <div className="mt-12 flex justify-center">
                                <button className="px-10 py-4 glass text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-[24px] hover:bg-white/10 transition-all border border-white/10 italic">
                                    Sync More Nodes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
