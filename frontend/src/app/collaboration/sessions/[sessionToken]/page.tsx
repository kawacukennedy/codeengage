'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Users,
    MessageSquare,
    Code2,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Settings,
    LogOut,
    Send,
    Circle,
    Hash,
    MoreVertical,
    Share2,
    Shield
} from 'lucide-react';
import { cn, fetchApi } from '@/lib/utils';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useAuthStore } from '@/store/authStore';

export default function CollaborationSession() {
    const params = useParams();
    const router = useRouter();
    const { sessionToken } = params;
    const { user } = useAuthStore();
    const {
        participants,
        chatMessages,
        connectionStatus,
        addChatMessage,
        setParticipants,
        setConnectionStatus
    } = useCollaborationStore();

    const [message, setMessage] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        if (!sessionToken) return;

        setConnectionStatus('connecting');

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Fallback to localhost:5001 if API_URL is not set, matching backend config
        const wsUrl = `${protocol}//${window.location.hostname}:5001/collaboration/${sessionToken}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WS] Connected to Session');
            setConnectionStatus('connected');
            setParticipants(prev => {
                if (prev.some(p => p.user_id === user?.id)) return prev;
                return [...prev, { user_id: user?.id, username: user?.username, role: 'participant' }];
            });
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'chat') {
                    addChatMessage(data);
                } else if (data.type === 'sys') {
                    console.info('[WS System]', data.message);
                }
            } catch (err) {
                console.error('[WS] Error parsing message', err);
            }
        };

        ws.onclose = () => {
            console.log('[WS] Disconnected');
            setConnectionStatus('disconnected');
        };

        ws.onerror = () => {
            setConnectionStatus('error');
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [sessionToken, user?.id]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !socket || socket.readyState !== WebSocket.OPEN) return;

        const payload = {
            type: 'chat',
            user: user?.display_name || user?.username || 'Anonymous',
            text: message,
            userId: user?.id
        };

        socket.send(JSON.stringify(payload));
        addChatMessage(payload); // Add locally for immediate feedback
        setMessage('');
    };

    return (
        <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-300">
            {/* Header */}
            <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                            <Users className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white uppercase tracking-wider italic">Session: {params.sessionToken?.toString().slice(0, 8)}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{connectionStatus}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-950/50 rounded-xl p-1 border border-white/5">
                        <button
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            className={cn("p-2 rounded-lg transition-all", audioEnabled ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300")}
                        >
                            {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>
                        <button
                            onClick={() => setVideoEnabled(!videoEnabled)}
                            className={cn("p-2 rounded-lg transition-all", videoEnabled ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300")}
                        >
                            {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                        </button>
                    </div>
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <button className="px-4 py-2 glass hover:bg-white/10 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest flex items-center gap-2">
                        <Share2 size={14} /> Invite
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 border border-red-500/20"
                    >
                        <LogOut size={14} /> Leave
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor Area */}
                <main className="flex-1 flex flex-col bg-slate-950 border-r border-white/5 relative">
                    <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-black/20 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <div className="flex gap-4">
                            <span className="text-white italic">Multi-Cursor Enabled</span>
                        </div>
                        <div>L1, C1 • TypeScript</div>
                    </div>
                    <div className="flex-1 font-mono text-sm p-8 text-slate-400">
                        {/* Placeholder for real-time editor */}
                        <div className="space-y-2">
                            <p><span className="text-violet-400">import</span> &#123; useState &#125; <span className="text-violet-400">from</span> <span className="text-emerald-400">'react'</span>;</p>
                            <p className="relative">
                                <span className="text-violet-400">const</span> <span className="text-blue-400">CollaborationApp</span> = () =&gt; &#123;
                                <span className="absolute left-[34ch] top-0 w-[2px] h-5 bg-violet-400 animate-pulse">
                                    <span className="absolute -top-4 left-0 bg-violet-400 text-white text-[8px] px-1 rounded lowercase whitespace-nowrap">{user?.display_name || 'you'}</span>
                                </span>
                            </p>
                            <p className="pl-4 relative">
                                <span className="text-violet-400">const</span> [state, setState] = useState([]);
                                <span className="absolute left-[12ch] top-0 w-[2px] h-5 bg-emerald-400">
                                    <span className="absolute -top-4 left-0 bg-emerald-400 text-white text-[8px] px-1 rounded lowercase whitespace-nowrap italic">sarah_dev</span>
                                </span>
                            </p>
                            <p className="pl-4">console.log(<span className="text-emerald-400">'Ready to sync...'</span>);</p>
                            <p>&#125;;</p>
                        </div>
                    </div>
                    {/* Recording Status Overlay */}
                    <div className="absolute bottom-6 right-6 px-4 py-2 glass rounded-full flex items-center gap-3 border border-red-500/20">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Recording Session</span>
                    </div>
                </main>

                {/* Collaboration Sidebar */}
                <aside className="w-96 flex flex-col bg-slate-900/50 backdrop-blur-md">
                    {/* Participants List */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                <Shield size={14} className="text-slate-700" /> Active Pulse
                            </h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {participants.map((p, i) => (
                                <div key={p.user_id || i} className={cn(
                                    "flex items-center gap-3 p-2 rounded-xl border transition-all group",
                                    p.user_id === user?.id
                                        ? "bg-white/5 border-white/10"
                                        : "hover:bg-white/5 border-transparent grayscale hover:grayscale-0"
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm italic",
                                        p.role === 'host' ? "bg-violet-500" : "bg-emerald-500"
                                    )}>
                                        {(p.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className={cn(
                                            "text-xs font-bold uppercase tracking-tight italic",
                                            p.user_id === user?.id ? "text-white" : "text-slate-400 group-hover:text-white"
                                        )}>
                                            {p.username} {p.user_id === user?.id && '(You)'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.role === 'host' ? 'Synthesizing...' : 'Watching...'}</p>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        p.user_id === user?.id ? "bg-emerald-500" : "bg-slate-800 group-hover:bg-emerald-500"
                                    )} />
                                </div>
                            ))}
                        </div>

                        {/* Chat Section */}
                        <div className="flex-1 flex flex-col border-t border-white/5 min-h-0">
                            <div className="p-4 border-b border-white/5 bg-black/10">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <MessageSquare size={14} className="text-violet-400" /> Live Commms
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={cn(
                                        "flex flex-col gap-1 max-w-[85%]",
                                        msg.userId === user?.id ? "ml-auto items-end" : "items-start"
                                    )}>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{msg.user}</span>
                                        <div className={cn(
                                            "px-4 py-2 rounded-2xl text-xs leading-relaxed",
                                            msg.userId === user?.id ? "bg-violet-600 text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-slate-300 rounded-tl-none"
                                        )}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Chat Input */}
                            <form onSubmit={handleSendMessage} className="p-4 bg-slate-950/80 border-t border-white/5 flex gap-3">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Broadcast signal..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-violet-500/50"
                                />
                                <button type="submit" className="p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-550 transition-all active:scale-90">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
