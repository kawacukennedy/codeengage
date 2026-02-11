'use client';

import { useState, useEffect, useRef } from 'react';
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
import { cn, fetchApi, formatRelativeTime } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useAIStore } from '@/store/aiStore';
import { Markdown } from '@/components/Markdown';

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
    const { selectedLanguage, setLanguage } = useAIStore();

    const [isSaving, setIsSaving] = useState(false);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [aiInput, setAiInput] = useState('');
    const [aiResponse, setAiResponse] = useState<{ fullContent: string, code?: string } | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const [leftWidth, setLeftWidth] = useState(280);
    const [rightWidth, setRightWidth] = useState(320);
    const [bottomHeight, setBottomHeight] = useState(256);
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);
    const [isResizingBottom, setIsResizingBottom] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (highlightRef.current) {
            Prism.highlightElement(highlightRef.current.querySelector('code')!);
        }
    }, [currentSnippet.code, currentSnippet.language]);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (highlightRef.current) {
            highlightRef.current.scrollTop = e.currentTarget.scrollTop;
            highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    useEffect(() => {
        // Hide sidebars on mobile by default
        const isMobile = window.innerWidth < 1024;
        if (isMobile) {
            if (panes.left) togglePane('left');
            if (panes.right) togglePane('right');
        }
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingLeft) {
                const maxW = Math.min(480, window.innerWidth * 0.4);
                const newWidth = Math.max(160, Math.min(maxW, e.clientX));
                setLeftWidth(newWidth);
            }
            if (isResizingRight) {
                const maxW = Math.min(600, window.innerWidth * 0.5);
                const newWidth = Math.max(240, Math.min(maxW, window.innerWidth - e.clientX));
                setRightWidth(newWidth);
            }
            if (isResizingBottom) {
                const maxH = Math.min(600, window.innerHeight * 0.6);
                const newHeight = Math.max(120, Math.min(maxH, window.innerHeight - e.clientY));
                setBottomHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            setIsResizingLeft(false);
            setIsResizingRight(false);
            setIsResizingBottom(false);
        };

        if (isResizingLeft || isResizingRight || isResizingBottom) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = isResizingBottom ? 'row-resize' : 'col-resize';
        } else {
            document.body.style.cursor = 'default';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingLeft, isResizingRight, isResizingBottom]);

    const handleAIExecute = async (overridePrompt?: string) => {
        const prompt = overridePrompt || aiInput;
        if (!prompt && !overridePrompt) return;

        setAiInput('');
        addToast({ title: "Neural Processing", message: "Consulting Sunder AI...", type: "info" });

        try {
            const result = await fetchApi('/ai/pair', {
                method: 'POST',
                body: JSON.stringify({
                    code: currentSnippet.code,
                    task: prompt,
                    language: currentSnippet.language,
                    personality: 'educational',
                    options: { suggest_improvements: true, explain_changes: true }
                })
            });

            const content = result.response || result.explanation || '';
            setAiResponse({
                fullContent: content,
                code: result.suggested_code || undefined
            });

            addToast({ title: "Neural Response", message: "Companion updated with insights.", type: "success" });
        } catch (error) {
            addToast({ title: "AI Error", message: "Failed to reach neural engine", type: "error" });
        }
    };

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
            addToast({ title: "Execution Success", message: "Runtime results received", type: "success" });
        } catch (error) {
            setExecutionResult('> ERROR: Execution environment failed to respond.\n');
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

    const handleNewSnippet = () => {
        resetEditor();
        setAiResponse(null);
        setHistory([]);
        addToast({ title: "New Snippet", message: "Editor reset for new creation.", type: "success" });
    };

    const languages = [
        { id: 'typescript', name: 'TypeScript' },
        { id: 'javascript', name: 'JavaScript' },
        { id: 'rust', name: 'Rust' },
        { id: 'python', name: 'Python' },
        { id: 'go', name: 'Go' },
        { id: 'ruby', name: 'Ruby' }
    ];

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
            <style jsx global>{`
                pre[class*="language-"] {
                    padding: 0 !important;
                    margin: 0 !important;
                    background: transparent !important;
                }
                code[class*="language-"] {
                    padding: 0 !important;
                    background: transparent !important;
                    font-family: inherit !important;
                    font-size: inherit !important;
                    line-height: inherit !important;
                }
            `}</style>
            {/* Header */}
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
                            className="bg-transparent border-none text-sm font-bold text-white focus:outline-none placeholder:text-slate-600 w-48 lg:w-64"
                            placeholder="Untilted Snippet"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/5 rounded-xl">
                        <select
                            value={currentSnippet.language}
                            onChange={(e) => {
                                updateLanguage(e.target.value);
                                setLanguage(e.target.value);
                            }}
                            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-violet-400 outline-none cursor-pointer"
                        >
                            {languages.map(lang => (
                                <option key={lang.id} value={lang.id} className="bg-slate-900 text-white lowercase capitalize">{lang.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-6 w-px bg-white/5 hidden md:block" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewSnippet}
                            className="px-3 md:px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <RotateCcw size={14} className="md:w-4 md:h-4" />
                            <span className="hidden lg:inline">New</span>
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 md:px-6 py-2 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <Save size={14} className="md:w-4 md:h-4" />
                            <span className="hidden lg:inline">{isSaving ? 'Saving...' : 'Save Snippet'}</span>
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/5 hidden md:block" />

                    <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <Share2 size={18} />
                    </button>
                    <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <Settings size={18} />
                    </button>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <AnimatePresence>
                    {panes.left && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => togglePane('left')}
                                className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.aside
                                initial={{ x: -256 }}
                                animate={{ x: 0 }}
                                exit={{ x: -256 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                style={{ width: leftWidth }}
                                className="fixed md:relative inset-y-0 left-0 z-40 border-r border-white/5 bg-slate-900 md:bg-slate-900/30 backdrop-blur-3xl md:backdrop-blur-none flex flex-col shrink-0"
                            >
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
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* Left Resizer */}
                {panes.left && (
                    <div
                        onMouseDown={() => setIsResizingLeft(true)}
                        className="hidden md:flex relative w-1 items-center justify-center hover:bg-violet-500/50 cursor-col-resize z-50 transition-all active:bg-violet-500 group"
                    >
                        <div className="absolute inset-y-0 -left-2 -right-2 z-0" />
                        <div className="w-px h-8 bg-white/20 group-hover:bg-white/40" />
                    </div>
                )}

                {/* Editor Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
                    <main className="flex-1 flex flex-col min-w-0">
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
                                {currentSnippet.language}
                            </div>
                        </div>
                        <div className="flex-1 relative overflow-hidden group bg-black/20">
                            <div className="absolute top-0 left-0 w-12 h-full bg-white/[0.01] pointer-events-none border-r border-white/5 z-20" />

                            <div className="absolute inset-0 overflow-hidden custom-scrollbar">
                                <div className="relative min-h-full p-6 pl-16">
                                    <pre
                                        ref={highlightRef}
                                        aria-hidden="true"
                                        className={cn(
                                            `language-${currentSnippet.language.toLowerCase()} absolute inset-0 w-full h-full m-0 p-6 pl-16 pointer-events-none overflow-hidden bg-transparent font-mono text-xs md:text-sm leading-relaxed whitespace-pre`,
                                        )}
                                    >
                                        <code className={`language-${currentSnippet.language.toLowerCase()}`}>
                                            {currentSnippet.code + (currentSnippet.code.endsWith('\n') ? ' ' : '')}
                                        </code>
                                    </pre>
                                    <textarea
                                        ref={textareaRef}
                                        value={currentSnippet.code}
                                        onScroll={handleScroll}
                                        onChange={(e) => updateCode(e.target.value)}
                                        spellCheck={false}
                                        className="absolute inset-0 w-full h-full bg-transparent p-6 pl-16 font-mono text-xs md:text-sm leading-relaxed text-transparent caret-violet-400 focus:outline-none selection:bg-violet-500/30 whitespace-pre border-none outline-none z-10 overflow-auto custom-scrollbar"
                                        style={{
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Bottom Resizer */}
                    {panes.bottom && (
                        <div
                            onMouseDown={() => setIsResizingBottom(true)}
                            className="relative h-1 w-full flex items-center justify-center hover:bg-violet-500/50 cursor-row-resize z-50 transition-all active:bg-violet-500 group"
                        >
                            <div className="absolute inset-x-0 -top-2 -bottom-2 z-0" />
                            <div className="h-px w-8 bg-white/20 group-hover:bg-white/40" />
                        </div>
                    )}

                    {/* Bottom Pane Toggle */}
                    <footer className={cn(
                        "border-t border-white/5 transition-all duration-300 ease-in-out bg-slate-900",
                        panes.bottom ? "" : "h-10"
                    )} style={{ height: panes.bottom ? bottomHeight : 40 }}>
                        {!panes.bottom ? (
                            <div className="h-full flex items-center justify-between px-6 bg-slate-900/50">
                                <button onClick={() => togglePane('bottom')} className="text-[10px] font-black text-slate-500 hover:text-violet-400 transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles size={12} fill="currentColor" /> AI Companion
                                </button>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="px-6 py-3 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
                                    <span className="text-xs font-black text-white uppercase italic flex items-center gap-2 tracking-widest">
                                        <Brain size={16} className="text-violet-400" /> Neural Assistant
                                    </span>
                                    <button onClick={() => togglePane('bottom')} className="p-1 hover:bg-white/5 rounded transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center shrink-0">
                                            <Sparkles size={16} className="text-violet-400" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-xs text-white font-bold">Sunder Engine</p>
                                            {aiResponse ? (
                                                <div className="space-y-4">
                                                    <Markdown content={aiResponse.fullContent} className="!text-slate-400" />
                                                    {aiResponse.code && (
                                                        <div className="space-y-2">
                                                            <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-violet-300 overflow-x-auto whitespace-pre">
                                                                {aiResponse.code}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    updateCode(aiResponse.code!);
                                                                    addToast({ title: "Injected", message: "AI code applied to editor", type: "success" });
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-550 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-widest"
                                                            >
                                                                <CheckCircle2 size={12} /> Apply Changes
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 leading-relaxed italic">
                                                    Ask me to optimize your {currentSnippet.language} code.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                        {[
                                            { label: 'Optimize', icon: <Activity size={12} />, prompt: 'Optimize this code for performance and readability.' },
                                            { label: 'Debug', icon: <AlertCircle size={12} />, prompt: 'Find potential bugs or edge cases in this code.' },
                                            { label: 'Explain', icon: <MessageSquare size={12} />, prompt: 'Explain how this code works in detail.' },
                                            { label: 'Docs', icon: <FileCode size={12} />, prompt: 'Generate JSDoc style documentation for this code.' }
                                        ].map((action) => (
                                            <button
                                                key={action.label}
                                                onClick={() => handleAIExecute(action.prompt)}
                                                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white hover:bg-violet-500/10 hover:border-violet-500/20 transition-all uppercase tracking-widest text-left"
                                            >
                                                {action.icon} {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex gap-4 shrink-0">
                                    <input
                                        type="text"
                                        placeholder="Ask for magic..."
                                        className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none"
                                        value={aiInput}
                                        onChange={(e) => setAiInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAIExecute()}
                                    />
                                    <button
                                        onClick={() => handleAIExecute()}
                                        className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-550 transition-all shadow-lg shadow-violet-600/20"
                                    >
                                        Execute
                                    </button>
                                </div>
                            </div>
                        )}
                    </footer>
                </div>
                {/* Right Resizer */}
                {panes.right && (
                    <div
                        onMouseDown={() => setIsResizingRight(true)}
                        className="hidden md:flex relative w-1 items-center justify-center hover:bg-blue-500/50 cursor-col-resize z-50 transition-all active:bg-blue-500 group"
                    >
                        <div className="absolute inset-y-0 -left-2 -right-2 z-0" />
                        <div className="w-px h-8 bg-white/20 group-hover:bg-white/40" />
                    </div>
                )}

                {/* Right Sidebar */}
                <AnimatePresence>
                    {panes.right && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => togglePane('right')}
                                className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.aside
                                initial={{ x: 320 }}
                                animate={{ x: 0 }}
                                exit={{ x: 320 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                style={{ width: rightWidth }}
                                className="fixed md:relative inset-y-0 right-0 z-40 border-l border-white/5 bg-slate-900 md:bg-slate-900/30 backdrop-blur-3xl md:backdrop-blur-none flex flex-col shrink-0"
                            >
                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic flex items-center gap-2">
                                        <Layout size={14} className="text-blue-400" /> Preview
                                    </span>
                                    <button onClick={() => togglePane('right')} className="text-slate-600 hover:text-white transition-colors">
                                        <PanelRightClose size={14} />
                                    </button>
                                </div>
                                <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                                    <div className={cn(
                                        "flex-1 bg-slate-950 rounded-2xl border flex flex-col items-center justify-center p-8 text-center transition-all duration-500",
                                        executionResult ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5"
                                    )}>
                                        {executionResult ? (
                                            <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
                                                    <CheckCircle2 size={32} className="text-emerald-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black text-white uppercase tracking-widest">Execution Complete</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Runtime environment released.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 opacity-50">
                                                <Activity size={32} className="text-slate-700 animate-pulse mx-auto" />
                                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Standby for compilation</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="h-40 bg-slate-950 rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                                        <div className="p-3 bg-black/40 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <TerminalIcon size={12} /> Console
                                        </div>
                                        <div className="flex-1 p-3 font-mono text-[10px] text-emerald-400/80 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                                            {executionResult || '> Ready...'}
                                        </div>
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
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
                            className="w-96 max-w-full bg-slate-900 border-l border-white/10 relative z-10 flex flex-col shadow-2xl"
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
                                {history.map((version, i) => (
                                    <div
                                        key={version.id}
                                        className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group"
                                        onClick={() => {
                                            updateCode(version.code);
                                            setShowHistory(false);
                                            addToast({ title: "Restored", message: `v${version.version_number}`, type: "success" });
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">v{version.version_number}</span>
                                            <span className="text-[10px] text-slate-500 italic">{formatRelativeTime(version.created_at)}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 line-clamp-2 italic">{version.change_summary || "Autosave"}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
