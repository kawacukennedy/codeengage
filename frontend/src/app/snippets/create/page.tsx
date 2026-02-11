'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    Share2,
    Settings,
    ChevronLeft,
    ChevronRight,
    FileCode,
    Brain,
    Layout,
    History,
    Terminal as TerminalIcon,
    Play,
    RotateCcw,
    Sparkles,
    Columns,
    PanelLeftClose,
    PanelRightClose,
    PanelBottomClose,
    Maximize2,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    X,
    Activity
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-ruby';
import { cn, fetchApi } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function SnippetEditor() {
    const router = useRouter();
    const { user } = useAuthStore();
    const {
        currentSnippet,
        updateCode,
        updateTitle,
        updateLanguage,
        panes,
        togglePane,
        resetEditor,
        executionResult,
        setExecutionResult,
        isRunning,
        setIsRunning
    } = useEditorStore();
    const { addToast } = useUIStore();

    const [isSaving, setIsSaving] = useState(false);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [aiInput, setAiInput] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        Prism.highlightAll();
    }, [currentSnippet.code, currentSnippet.language]);

    const handleRun = async () => {
        setIsRunning(true);
        setExecutionResult('> Compiling and preparing runtime...\n');

        try {
            const result = await fetchApi('/snippets/run', {
                method: 'POST',
                body: JSON.stringify({
                    code: currentSnippet.code,
                    language: currentSnippet.language
                })
            });
            setExecutionResult(result.output);
            addToast({ title: "Execution Success", message: `Result returned in ${result.duration}`, type: "success" });
        } catch (error) {
            setExecutionResult('> ERROR: Execution environment failed to respond.\nPlease check your connectivity or try again later.');
            addToast({ title: "Runtime Error", message: "Failed to connect to execution engine", type: "error" });
        } finally {
            setIsRunning(false);
        }
    };

    const fetchHistory = async () => {
        if (!currentSnippet.id) return;
        try {
            const data = await fetchApi(`/snippets/${currentSnippet.id}/versions`);
            setHistory(data);
            setShowHistory(true);
        } catch (error) {
            addToast({ title: "History Error", message: "Failed to fetch version history", type: "error" });
        }
    };

    const handleSave = async () => {
        if (!user) {
            router.push('/auth/login');
            return;
        }

        setIsSaving(true);
        try {
            const data = await fetchApi('/snippets', {
                method: 'POST',
                body: JSON.stringify({
                    ...currentSnippet,
                    description,
                    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                    visibility: 'public'
                })
            });
            addToast({ title: "Success", message: "Snippet saved to cloud", type: "success" });
            router.push(`/snippets/${data.id}`);
        } catch (error) {
            addToast({ title: "Error", message: "Failed to save snippet", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-300 transition-all duration-500">
            {/* Header: TitleInput, SaveStatus, ActionButtons */}
            <header className="h-14 border-b border-white/5 px-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
                            <FileCode size={16} className="text-white" />
                        </div>
                        <input
                            type="text"
                            value={currentSnippet.title}
                            onChange={(e) => updateTitle(e.target.value)}
                            className="bg-transparent text-white font-bold text-sm focus:outline-none w-64 border-b border-transparent focus:border-violet-500/50 transition-all placeholder:text-slate-600"
                            placeholder="Enter snippet title..."
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">
                        <CheckCircle2 size={12} /> Auto-saved
                    </div>
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <button className="p-2 text-slate-500 hover:text-white transition-colors"><Settings size={18} /></button>
                    <button className="p-2 text-slate-500 hover:text-white transition-colors" title="Toggle Layout"><Columns size={18} /></button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="ml-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-550 text-white text-xs font-black rounded-lg transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 uppercase tracking-widest disabled:opacity-50"
                    >
                        {isSaving ? <RotateCcw size={14} className="animate-spin" /> : <Save size={14} />}
                        {isSaving ? 'Saving' : 'Save'}
                    </button>
                </div>
            </header>

            {/* Workspace: Four-pane Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane: FileTree & Properties */}
                {panes.left && (
                    <aside className="w-64 border-r border-white/5 bg-slate-900/30 flex flex-col shrink-0 animate-in slide-in-from-left duration-300">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Explorer</span>
                            <button onClick={() => togglePane('left')} className="text-slate-600 hover:text-white transition-colors">
                                <PanelLeftClose size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-violet-400 font-bold bg-violet-500/5 p-2 rounded-lg border border-violet-500/10 cursor-pointer">
                                    <FileCode size={14} /> main.{currentSnippet.language.toLowerCase()}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                                    <FileCode size={14} /> config.json
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Properties</span>
                                <div className="space-y-3">
                                    <select
                                        value={currentSnippet.language}
                                        onChange={(e) => updateLanguage(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-violet-500/50"
                                    >
                                        {['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Ruby', 'Java'].map(l => (
                                            <option key={l} value={l} className="bg-slate-900">{l}</option>
                                        ))}
                                    </select>
                                    <textarea
                                        className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-400 resize-none h-24 focus:outline-none focus:border-violet-500/50"
                                        placeholder="Add description..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Center & Right Pannels */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 flex min-h-0">
                        {/* Center Pane: Editor */}
                        <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
                            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-black/20">
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleRun}
                                        disabled={isRunning}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest disabled:opacity-50"
                                    >
                                        <Play size={12} className={cn("text-emerald-500", isRunning && "animate-pulse")} />
                                        {isRunning ? 'Running...' : 'Run'}
                                    </button>
                                    <button
                                        onClick={fetchHistory}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                                    >
                                        <History size={12} /> History
                                    </button>
                                </div>
                                <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                                    L1, C1 • {currentSnippet.language}
                                </div>
                            </div>
                            <div className="flex-1 relative overflow-auto custom-scrollbar group">
                                <div className="absolute top-0 left-0 w-12 h-full bg-white/[0.01] pointer-events-none border-r border-white/5 z-10" />

                                <div className="relative min-h-full font-mono text-sm leading-relaxed p-6 pl-16">
                                    {/* Syntax Highlighting Layer */}
                                    <pre
                                        className={cn(`language-${currentSnippet.language.toLowerCase()} !bg-transparent !m-0 !p-0 pointer-events-none absolute inset-0 p-6 pl-16`)}
                                        aria-hidden="true"
                                    >
                                        <code className={`language-${currentSnippet.language.toLowerCase()} !bg-transparent`}>
                                            {currentSnippet.code + (currentSnippet.code.endsWith('\n') ? ' ' : '')}
                                        </code>
                                    </pre>

                                    {/* Input Layer */}
                                    <textarea
                                        className="absolute inset-0 w-full h-full bg-transparent p-6 pl-16 font-mono text-sm leading-relaxed text-transparent caret-white resize-none focus:outline-none selection:bg-violet-500/30 overflow-hidden whitespace-pre border-none outline-none"
                                        value={currentSnippet.code}
                                        onChange={(e) => updateCode(e.target.value)}
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        </main>

                        {/* Right Pane: Live Preview */}
                        {panes.right && (
                            <aside className="w-80 border-l border-white/5 bg-slate-900/30 flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic flex items-center gap-2">
                                        <Layout size={14} className="text-blue-400" /> Preview
                                    </span>
                                    <button onClick={() => togglePane('right')} className="text-slate-600 hover:text-white transition-colors">
                                        <PanelRightClose size={14} />
                                    </button>
                                </div>
                                <div className="flex-1 p-6 flex flex-col gap-6">
                                    <div className="flex-1 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-center p-8 text-center">
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center">
                                                <Activity size={32} className="text-slate-700" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Compiler ready</p>
                                        </div>
                                    </div>
                                    <div className="h-40 bg-slate-950 rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                                        <div className="p-3 bg-black/40 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <TerminalIcon size={12} /> Console
                                        </div>
                                        <div className="flex-1 p-3 font-mono text-[10px] text-emerald-400/80 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                                            {executionResult || '> Sunder Compiler v1.0.0 Ready\n> Waiting for execution...'}
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        )}
                    </div>

                    {/* Bottom Pane: AI Assistant & Problems */}
                    <footer className={cn(
                        "border-t border-white/5 transition-all duration-300 ease-in-out",
                        panes.bottom ? "h-64" : "h-10"
                    )}>
                        {!panes.bottom ? (
                            <div className="h-full flex items-center justify-between px-6 bg-slate-900/50">
                                <div className="flex gap-6">
                                    <button onClick={() => togglePane('bottom')} className="text-[10px] font-black text-slate-500 hover:text-violet-400 transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Sparkles size={12} fill="currentColor" /> AI Companion
                                    </button>
                                    <button className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                                        <AlertCircle size={12} /> 0 Problems
                                    </button>
                                </div>
                                <button className="text-slate-600 hover:text-white transition-colors">
                                    <Maximize2 size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col bg-slate-900">
                                <div className="px-6 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                                    <span className="text-xs font-black text-white uppercase italic flex items-center gap-2 tracking-widest">
                                        <Brain size={16} className="text-violet-400" /> Neural Assistant
                                    </span>
                                    <button onClick={() => togglePane('bottom')} className="p-1 hover:bg-white/5 rounded transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 flex">
                                    <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center shrink-0">
                                                <Sparkles size={16} className="text-violet-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-white font-bold">Sunder Engine</p>
                                                <p className="text-xs text-slate-400 leading-relaxed italic max-w-2xl">
                                                    I'm monitoring your code. You can ask me to optimize functions, write unit tests, or transform this {currentSnippet.language} code to another language.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-80 border-l border-white/5 p-4 flex flex-col gap-3 shrink-0 bg-black/10">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Actions</span>
                                        <button className="text-[10px] font-bold text-left px-3 py-2 bg-white/5 rounded-lg border border-white/5 hover:border-violet-500/30 transition-all uppercase tracking-widest">Optimize Speed</button>
                                        <button className="text-[10px] font-bold text-left px-3 py-2 bg-white/5 rounded-lg border border-white/5 hover:border-violet-500/30 transition-all uppercase tracking-widest">Generate Docs</button>
                                        <button className="text-[10px] font-bold text-left px-3 py-2 bg-white/5 rounded-lg border border-white/5 hover:border-emerald-500/30 transition-all uppercase tracking-widest">Add Tests</button>
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex gap-4">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder="Ask the neural assistant..."
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-violet-500/50"
                                            value={aiInput}
                                            onChange={(e) => setAiInput(e.target.value)}
                                        />
                                        <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={14} />
                                    </div>
                                    <button className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-550 transition-all">
                                        Execute
                                    </button>
                                </div>
                            </div>
                        )}
                    </footer>
                </div>
            </div>

            {/* History Drawer */}
            <AnimatePresence>
                {showHistory && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                            onClick={() => setShowHistory(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-96 bg-slate-900 border-l border-white/10 relative z-10 flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                                <div className="flex items-center gap-3">
                                    <History className="text-violet-400" size={18} />
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Version History</h3>
                                </div>
                                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {history.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-8">
                                        <History size={48} className="mb-4 text-slate-700" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No versions recorded yet</p>
                                    </div>
                                ) : (
                                    history.map((version, i) => (
                                        <div
                                            key={version.id}
                                            className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group"
                                            onClick={() => {
                                                updateCode(version.code);
                                                setShowHistory(false);
                                                addToast({ title: "Version Restored", message: `Rolled back to v${version.version_number}`, type: "success" });
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">v{version.version_number}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">{new Date(version.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 line-clamp-2 italic mb-3">
                                                {version.change_summary || "No description provided"}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black text-white">
                                                        {version.author?.username?.slice(0, 1).toUpperCase()}
                                                    </div>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{version.author?.username}</span>
                                                </div>
                                                <button className="text-[8px] font-black text-slate-600 group-hover:text-violet-400 uppercase tracking-widest">Restore</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
