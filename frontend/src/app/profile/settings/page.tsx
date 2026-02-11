'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Settings,
    Bell,
    Shield,
    Eye,
    Moon,
    Sun,
    Monitor,
    Lock,
    Key,
    UserMinus,
    ChevronRight,
    ArrowUpRight,
    Mail,
    Smartphone,
    Languages,
    Database,
    Cloud,
    AlertTriangle
} from 'lucide-react';
import { cn, fetchApi } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
    const [theme, setTheme] = useState('dark');
    const queryClient = useQueryClient();
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        collaboration: true,
        newsletter: false
    });

    const { data: apiKeys, isLoading: isLoadingKeys } = useQuery({
        queryKey: ['api-keys'],
        queryFn: () => fetchApi('/profiles/api-keys')
    });

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleGenerateKey = async () => {
        try {
            await fetchApi('/profiles/api-keys', {
                method: 'POST',
                body: JSON.stringify({ label: `Key ${new Date().toLocaleDateString()}` })
            });
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        } catch (error) {
            console.error('Failed to generate key', error);
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        try {
            await fetchApi(`/profiles/api-keys/${keyId}`, { method: 'DELETE' });
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        } catch (error) {
            console.error('Failed to revoke key', error);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-slate-800/10 border border-slate-700/20">
                            <Settings className="text-slate-400" size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">
                            System <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500">Preferences</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 font-medium tracking-tight">Configure your Sunder environment and security protocols.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Navigation Sidebar */}
                    <div className="space-y-2">
                        {[
                            { id: 'appearance', label: 'Appearance', icon: Sun },
                            { id: 'notifications', label: 'Echos', icon: Bell },
                            { id: 'security', label: 'Encryption', icon: Lock },
                            { id: 'data', label: 'Neural Data', icon: Database },
                            { id: 'danger', label: 'Void Zone', icon: AlertTriangle, color: 'text-error-400' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group",
                                    item.id === 'appearance'
                                        ? "bg-white/5 text-white border border-white/10"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                                )}
                            >
                                <item.icon size={14} className={item.color || "text-inherit"} />
                                {item.label}
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>

                    {/* Settings Content */}
                    <div className="md:col-span-3 space-y-10">
                        {/* Appearance Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Sun className="text-slate-500" size={18} />
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Appearance</h2>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Theme Protocol</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { id: 'light', icon: Sun, label: 'Luminescence' },
                                            { id: 'dark', icon: Moon, label: 'Dark Matter' },
                                            { id: 'system', icon: Monitor, label: 'Host Default' }
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                className={cn(
                                                    "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all group relative overflow-hidden",
                                                    theme === t.id
                                                        ? "bg-white/5 border-violet-500/50 text-white"
                                                        : "bg-transparent border-white/5 text-slate-500 hover:border-white/10"
                                                )}
                                            >
                                                {theme === t.id && (
                                                    <div className="absolute inset-0 bg-violet-600/5 blur-xl" />
                                                )}
                                                <t.icon size={24} className={cn("transition-transform group-hover:scale-110", theme === t.id ? "text-violet-400" : "text-slate-600")} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-4 border-t border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-white uppercase tracking-tight italic">Compact Mode</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Reduce spacing across the entire dashboard.</p>
                                    </div>
                                    <button className="w-12 h-6 rounded-full bg-white/5 border border-white/10 relative transition-colors hover:border-violet-500/30">
                                        <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-slate-600" />
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Notifications Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Bell className="text-slate-500" size={18} />
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Neural Echos</h2>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl space-y-6">
                                {[
                                    { id: 'email', label: 'Email Transmissions', desc: 'Critical alerts and session summaries.', icon: Mail },
                                    { id: 'push', label: 'Push Pulses', desc: 'Real-time notifications in your browser.', icon: Smartphone },
                                    { id: 'collaboration', label: 'Collaboration Invites', desc: 'When team members request your input.', icon: Eye }
                                ].map((n) => (
                                    <div key={n.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-white/5 text-slate-500">
                                                <n.icon size={16} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-white uppercase tracking-tight italic">{n.label}</p>
                                                <p className="text-[10px] text-slate-500 font-medium">{n.desc}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleNotification(n.id as keyof typeof notifications)}
                                            className={cn(
                                                "w-12 h-6 rounded-full relative transition-all duration-300 border",
                                                notifications[n.id as keyof typeof notifications]
                                                    ? "bg-violet-600 border-violet-500"
                                                    : "bg-white/5 border-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm",
                                                notifications[n.id as keyof typeof notifications]
                                                    ? "left-7 bg-white"
                                                    : "left-1 bg-slate-600"
                                            )} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Data Section */}
                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600/20 to-transparent border border-white/10 flex items-center justify-between group overflow-hidden relative">
                            <Cloud className="absolute -right-4 -bottom-4 text-indigo-500/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <Languages size={28} />
                                </div>
                                <div className="space-y-1" >
                                    <h3 className="text-lg font-black text-white uppercase italic tracking-widest">Global Language</h3>
                                    <p className="text-[10px] text-indigo-200/50 font-black uppercase tracking-[0.2em]">English (Digital Standard)</p>
                                </div>
                            </div>
                            <button className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20 relative z-10">
                                Change Context
                            </button>
                        </div>

                        {/* API Keys Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Key className="text-slate-500" size={18} />
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">API Protocol</h2>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-tight italic">Secrets & Integrations</h3>
                                        <p className="text-[10px] text-slate-500 font-medium">Manage your cryptographic keys for API access.</p>
                                    </div>
                                    <button
                                        onClick={handleGenerateKey}
                                        className="px-6 py-2.5 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-violet-500/20"
                                    >
                                        Generate New Key
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {isLoadingKeys ? (
                                        <div className="p-4 bg-white/5 rounded-xl animate-pulse h-16" />
                                    ) : apiKeys?.length > 0 ? (
                                        apiKeys.map((apiKey: any) => (
                                            <div key={apiKey.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{apiKey.label}</p>
                                                    <code className="text-[10px] text-violet-400 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                                                        {apiKey.key.replace(/(.{10}).*(.{4})/, '$1****************$2')}
                                                    </code>
                                                </div>
                                                <button
                                                    onClick={() => handleRevokeKey(apiKey.id)}
                                                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                    title="Revoke Key"
                                                >
                                                    <Lock size={14} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No active protocols found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
