'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Cpu,
    Sparkles,
    Zap,
    History,
    Settings,
    Play,
    FileCode,
    BrainCircuit,
    Layers,
    Workflow,
    Code2,
    Activity,
    Command,
    ArrowUpRight,
    Maximize2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useAIStore } from '@/store/aiStore';
import { useAuthStore } from '@/store/authStore';

export default function AIPairPage() {
    const { user } = useAuthStore();
    const {
        isProcessing,
        history,
        personality,
        setPersonality,
        addMessage,
        pairWithAI,
        suggestions,
        setSuggestions
    } = useAIStore();

    const [input, setInput] = useState('');
    const [currentCode, setCurrentCode] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isProcessing) return;

        const currentInput = input;
        setInput('');
        addMessage('user', currentInput);

        try {
            const response = await pairWithAI(currentInput, currentCode);
            addMessage('assistant', response.response || response.explanation || 'No response received');

            if (response.suggested_code) {
                setCurrentCode(response.suggested_code);
            }
        } catch (error) {
            console.error('AI Pair error:', error);
            addMessage('assistant', 'I encountered an error while processing your request. Please try again.');
        }
    };

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-12rem)] flex flex-col gap-4 md:gap-6 max-w-[100rem] mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                            <BrainCircuit className="text-violet-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight italic">
                                Neural <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Pair Workspace</span>
                            </h1>
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    AI Online
                                </span>
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest italic truncate max-w-[120px] sm:max-w-none">
                                    {user?.display_name || user?.username}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide no-scrollbar w-full sm:w-auto">
                        <div className="flex items-center p-1 bg-slate-900/50 border border-white/5 rounded-2xl shrink-0">
                            {['helpful', 'educational'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPersonality(p as any)}
                                    className={cn(
                                        "px-3 md:px-4 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all",
                                        personality === p
                                            ? "bg-violet-600 text-white shadow-lg"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="h-8 w-px bg-white/5 mx-1 md:mx-2 hidden sm:block" />
                        <button className="p-2 md:p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
                            <History size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                        <button className="p-2 md:p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
                            <Settings size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                        <button className="px-4 md:px-6 py-2 md:py-3 rounded-2xl bg-violet-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-violet-500/20 flex items-center gap-2 shrink-0">
                            <Play size={14} fill="white" className="md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Run Context</span>
                        </button>
                    </div>
                </div>

                {/* Main Workspace Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 overflow-y-auto lg:overflow-hidden md:pr-2 custom-scrollbar">
                    {/* Left Sidebar: Context & Files - Hidden on mobile, shown on lg+ */}
                    <div className="hidden lg:flex lg:col-span-2 flex-col gap-4">
                        <div className="flex-1 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl flex flex-col gap-4 md:gap-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Knowledge Base</h3>
                            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                                {[
                                    { name: 'Auth Flow', icon: FileCode, type: 'active' },
                                    { name: 'DB Schema', icon: Layers, type: 'context' },
                                    { name: 'API Routes', icon: Workflow, type: 'context' },
                                    { name: 'Frontend Kit', icon: Code2, type: 'context' }
                                ].map((file) => (
                                    <button
                                        key={file.name}
                                        className={cn(
                                            "w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all group",
                                            file.type === 'active'
                                                ? "bg-violet-500/10 border border-violet-500/20 text-white"
                                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                        )}
                                    >
                                        <file.icon size={14} className={cn("md:w-4 md:h-4", file.type === 'active' ? 'text-violet-400' : 'text-slate-600')} />
                                        {file.name}
                                        {file.type === 'active' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] bg-indigo-600/10 border border-indigo-500/20 backdrop-blur-xl space-y-2 md:space-y-3">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Zap size={14} fill="currentColor" className="md:w-4 md:h-4" />
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Inference Boost</span>
                            </div>
                            <p className="text-[8px] md:text-[9px] text-indigo-200/50 font-bold uppercase tracking-widest leading-relaxed">Context window expanded to 128k tokens.</p>
                        </div>
                    </div>

                    {/* Middle: Code Editor Placeholder - Takes full width on mobile */}
                    <div className="col-span-1 lg:col-span-7 flex flex-col gap-4 md:gap-6">
                        <div className="flex-1 p-4 sm:p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-slate-900/60 border border-white/5 backdrop-blur-3xl relative group overflow-hidden min-h-[300px] md:min-h-[400px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center gap-2 text-slate-500 mb-4 md:mb-6">
                                    <FileCode size={16} className="md:w-[18px] md:h-[18px]" />
                                    <span className="text-[10px] md:text-xs font-mono">src/lib/neural_engine.rs</span>
                                </div>

                                <div className="flex-1 font-mono text-xs md:text-sm space-y-1 md:space-y-2 opacity-80 select-none overflow-y-auto custom-scrollbar">
                                    {[
                                        { l: '01', c: 'use neural::optimizer::*;', t: 'violet' },
                                        { l: '02', c: '', t: 'slate' },
                                        { l: '03', c: 'pub struct NeuralEngine {', t: 'violet', val: 'NeuralEngine' },
                                        { l: '04', c: '    context_window: usize,', t: 'cyan' },
                                        { l: '05', c: '    learning_rate: f64,', t: 'cyan' },
                                        { l: '06', c: '}', t: 'violet' },
                                    ].map((line, i) => (
                                        <div key={i} className="flex gap-2 md:gap-4">
                                            <span className="text-slate-700 w-6 md:w-8 text-right shrink-0 text-[10px] md:text-sm">{line.l}</span>
                                            <span className={cn(
                                                line.t === 'violet' ? 'text-violet-400' :
                                                    line.t === 'cyan' ? 'text-cyan-400' : 'text-slate-300'
                                            )}>{line.c}</span>
                                        </div>
                                    ))}

                                    <div className="flex gap-2 md:gap-4 bg-violet-500/10 border-y border-violet-500/20 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-1 mt-2 md:mt-4 animate-in fade-in duration-700">
                                        <span className="text-violet-500 w-6 md:w-8 text-right shrink-0 text-[10px] md:text-sm">07</span>
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={12} className="text-violet-400 md:w-[14px] md:h-[14px]" />
                                            <span className="text-violet-300 italic text-[10px] md:text-sm">AI is suggesting an implementation for the ForwardProp trait...</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-0 pt-4 md:pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        <div className="flex items-center gap-1.5"><Activity size={10} className="md:w-3 md:h-3" /> Syncing</div>
                                        <div className="flex items-center gap-1.5"><Command size={10} className="md:w-3 md:h-3" /> Shortcuts</div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <button className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-xl bg-white/5 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
                                            Reject <span className="hidden sm:inline">(Esc)</span>
                                        </button>
                                        <button className="flex-1 sm:flex-none px-4 md:px-6 py-1.5 md:py-2 rounded-xl bg-violet-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:scale-105 transition-all">
                                            Accept <span className="hidden sm:inline">(Tab)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Neural Chat Interface - Full width on mobile, sidebar on lg+ */}
                    <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 md:gap-6">
                        <div className="flex-1 p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl flex flex-col relative group min-h-[400px] md:min-h-[500px] lg:overflow-hidden">
                            <div className="space-y-4 md:space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4 md:pb-6">
                                {history.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 md:p-8 space-y-3 md:space-y-4 opacity-40">
                                        <Cpu size={32} className="text-violet-400 md:w-10 md:h-10" />
                                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Neural Link Established</p>
                                        <p className="text-[10px] md:text-xs font-medium italic">Begin typing to synchronize context...</p>
                                    </div>
                                )}
                                {history.map((msg, i) => (
                                    <div key={i} className="space-y-1 md:space-y-2">
                                        <div className={cn(
                                            "p-3 md:p-4 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-medium leading-relaxed whitespace-pre-wrap",
                                            msg.role === 'user'
                                                ? "bg-white/5 border border-white/10 text-white rounded-br-none"
                                                : "bg-violet-600/10 border border-violet-500/20 text-slate-300 rounded-tl-none font-sans"
                                        )}>
                                            {msg.content}
                                        </div>
                                        <span className={cn(
                                            "text-[7px] md:text-[8px] font-black uppercase tracking-widest italic ml-1",
                                            msg.role === 'user' ? "text-slate-500" : "text-violet-400"
                                        )}>
                                            {msg.role === 'user' ? 'Human Query' : 'Neural Response'}
                                        </span>
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4">
                                        <Loader2 size={14} className="text-violet-400 animate-spin md:w-4 md:h-4" />
                                        <span className="text-[9px] md:text-[10px] font-black text-violet-400 uppercase tracking-widest animate-pulse">Thinking...</span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="mt-auto space-y-3 md:space-y-4">
                                <form onSubmit={handleSendMessage} className="relative">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Command the Void..."
                                        rows={3}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl md:rounded-2xl px-3 md:px-4 py-3 md:py-4 text-[11px] md:text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none pr-10 md:pr-12"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isProcessing || !input.trim()}
                                        className="absolute right-2 md:right-3 bottom-2 md:bottom-3 p-1.5 md:p-2 rounded-lg md:rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/30 hover:scale-110 disabled:opacity-50 disabled:scale-100 transition-all"
                                    >
                                        <ArrowUpRight size={14} className="md:w-4 md:h-4" />
                                    </button>
                                </form>
                                <div className="flex flex-wrap gap-1.5 md:gap-2">
                                    {['Refactor', 'Document', 'Test', 'Explain'].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setInput(`/${tag} `)}
                                            className="px-2.5 md:px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
                                        >
                                            /{tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl flex items-center justify-between group">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                    <Zap size={14} fill="currentColor" className="md:w-4 md:h-4" />
                                </div>
                                <div>
                                    <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest">Low Latency</p>
                                    <p className="text-[7px] md:text-[8px] text-slate-500 font-bold uppercase tracking-widest">Edge-Optimized</p>
                                </div>
                            </div>
                            <Maximize2 size={14} className="text-slate-700 group-hover:text-white transition-colors cursor-pointer md:w-4 md:h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
