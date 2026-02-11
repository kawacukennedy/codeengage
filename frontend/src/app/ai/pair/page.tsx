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
import { Markdown } from '@/components/Markdown';

export default function AIPairPage() {
    const { user } = useAuthStore();
    const {
        isProcessing,
        history,
        personality,
        setPersonality,
        selectedLanguage,
        setLanguage,
        addMessage,
        pairWithAI,
        suggestions,
        setSuggestions
    } = useAIStore();

    const [input, setInput] = useState('');
    const [currentCode, setCurrentCode] = useState('');
    const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const languages = [
        { id: 'typescript', name: 'TypeScript', icon: 'TS', boilerplate: '// TypeScript Neural Workspace\n\nfunction main() {\n  console.log("Hello, Sunder!");\n}\n\nmain();' },
        { id: 'rust', name: 'Rust', icon: 'RS', boilerplate: '// Rust Neural Workspace\n\nfn main() {\n    println!("Hello, Sunder!");\n}' },
        { id: 'python', name: 'Python', icon: 'PY', boilerplate: '# Python Neural Workspace\n\ndef main():\n    print("Hello, Sunder!")\n\nif __name__ == "__main__":\n    main()' },
        { id: 'go', name: 'Go', icon: 'GO', boilerplate: '// Go Neural Workspace\n\npackage main\n\nimport "fmt"\n\nfunction main() {\n    fmt.Println("Hello, Sunder!")\n}' }
    ];

    useEffect(() => {
        if (!currentCode) {
            const lang = languages.find(l => l.id === selectedLanguage) || languages[0];
            setCurrentCode(lang.boilerplate);
        }
    }, []);

    const handleNewFile = () => {
        const lang = languages.find(l => l.id === selectedLanguage) || languages[0];
        setCurrentCode(lang.boilerplate);
        setPendingSuggestion(null);
        addMessage('assistant', `Acknowledged. Initialized new ${lang.name} workspace for you.`);
    };

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

            if (response.suggested_code && response.suggested_code !== currentCode) {
                setPendingSuggestion(response.suggested_code);
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
                            {['helpful', 'educational', 'critical', 'concise'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPersonality(p as any)}
                                    className={cn(
                                        "px-2.5 md:px-3 py-1.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all",
                                        personality === p
                                            ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center p-1 bg-slate-900/50 border border-white/5 rounded-2xl shrink-0 ml-2">
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="bg-transparent border-none text-[8px] md:text-[9px] font-black uppercase tracking-widest text-violet-400 outline-none px-2 cursor-pointer"
                            >
                                {languages.map(lang => (
                                    <option key={lang.id} value={lang.id} className="bg-slate-900 text-white lowercase capitalize">{lang.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="h-8 w-px bg-white/5 mx-1 md:mx-2 hidden sm:block" />
                        <button
                            onClick={handleNewFile}
                            className="p-2 md:p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0 flex items-center gap-2 group"
                        >
                            <FileCode size={16} className="md:w-[18px] md:h-[18px] group-hover:text-emerald-400" />
                            <span className="text-[8px] font-black uppercase tracking-widest hidden md:inline">New File</span>
                        </button>
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
                    <div className="col-span-1 lg:col-span-7 flex flex-col gap-4 md:gap-6 h-full min-h-[500px] lg:min-h-0">
                        <div className="flex-1 p-4 sm:p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-slate-900/60 border border-white/5 backdrop-blur-3xl relative group overflow-hidden flex flex-col">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                            <div className="relative z-10 flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-4 md:mb-6">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <FileCode size={16} className="md:w-[18px] md:h-[18px]" />
                                        <span className="text-[10px] md:text-xs font-mono">neural_workspace.rs</span>
                                    </div>
                                    {pendingSuggestion && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full animate-pulse">
                                            <Sparkles size={10} className="text-violet-400" />
                                            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">AI Suggestion Pending</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 relative min-h-0">
                                    <textarea
                                        value={pendingSuggestion || currentCode}
                                        onChange={(e) => {
                                            if (pendingSuggestion) {
                                                // If they type while suggestion is active, we discard suggestion or merge. 
                                                // For simplicity, let's say they're editing the suggestion if they type.
                                                setPendingSuggestion(null);
                                            }
                                            setCurrentCode(e.target.value);
                                        }}
                                        spellCheck={false}
                                        className={cn(
                                            "w-full h-full bg-transparent font-mono text-xs md:text-sm text-slate-300 outline-none resize-none custom-scrollbar leading-relaxed selection:bg-violet-500/30",
                                            pendingSuggestion && "text-violet-300/60 italic"
                                        )}
                                    />
                                    {pendingSuggestion && (
                                        <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
                                            <div className="px-4 py-2 bg-slate-900/80 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl flex items-center gap-4 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">Apply Suggested Changes?</p>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setPendingSuggestion(null)}
                                                        className="px-3 py-1 rounded-lg bg-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-white"
                                                    >
                                                        Discard
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCurrentCode(pendingSuggestion);
                                                            setPendingSuggestion(null);
                                                        }}
                                                        className="px-3 py-1 rounded-lg bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest"
                                                    >
                                                        Accept (Tab)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-0 pt-4 md:pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        <div className="flex items-center gap-1.5"><Activity size={10} className="md:w-3 md:h-3" /> {currentCode.length} bytes</div>
                                        <div className="flex items-center gap-1.5"><Command size={10} className="md:w-3 md:h-3" /> Shortcuts Active</div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => setCurrentCode('')}
                                            className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-xl bg-white/5 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                                        >
                                            Clear
                                        </button>
                                        <button className="flex-1 sm:flex-none px-4 md:px-6 py-1.5 md:py-2 rounded-xl bg-violet-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:scale-105 transition-all">
                                            Export
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Neural Chat Interface - Full width on mobile, sidebar on lg+ */}
                    <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 md:gap-6 min-h-[500px] lg:min-h-0">
                        <div className="flex-1 p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl flex flex-col relative group overflow-hidden">
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-24 md:pb-32">
                                {history.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 md:p-8 space-y-3 md:space-y-4 opacity-40">
                                        <Cpu size={32} className="text-violet-400 md:w-10 md:h-10" />
                                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Neural Link Established</p>
                                        <p className="text-[10px] md:text-xs font-medium italic">Begin typing to synchronize context...</p>
                                    </div>
                                )}
                                {history.map((msg, i) => (
                                    <div key={i} className="space-y-1 md:space-y-2">
                                        {msg.role === 'user' ? (
                                            <div className="p-3 md:p-4 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-medium leading-relaxed bg-white/5 border border-white/10 text-white rounded-br-none whitespace-pre-wrap">
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl md:rounded-2xl rounded-tl-none p-3 md:p-4">
                                                <Markdown content={msg.content} />
                                            </div>
                                        )}
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
