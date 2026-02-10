'use client';

import { useState, useEffect } from 'react';
import {
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    User,
    Mail,
    Lock,
    Sparkles,
    Monitor,
    ShieldCheck,
    ArrowRight,
    Terminal
} from 'lucide-react';
import Link from 'next/link';
import { cn, fetchApi } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function Register() {
    const router = useRouter();
    const { setUser, setToken } = useAuthStore();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        displayName: '',
        aiModel: 'balanced',
        theme: 'dark'
    });

    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const nextStep = () => {
        if (step === 1) {
            if (!formData.username || !formData.email || !formData.password) {
                setError('All fields are required');
                return;
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }
        }
        setError(null);
        setStep(s => Math.min(s + 1, 4));
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);

    const handleRegister = async () => {
        if (isLoading || cooldown > 0) return;

        const pin = verificationCode.slice(0, 4).join('');
        if (pin.length < 4) {
            setError('Please enter a 4-digit security PIN');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await fetchApi('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ ...formData, pin })
            });

            setStep(4);
        } catch (err: any) {
            setError(err.message);
            if (err.message.includes('wait')) {
                const match = err.message.match(/(\d+)/);
                if (match) setCooldown(parseInt(match[1]));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newCode = [...verificationCode];
        newCode[index] = value.slice(-1);
        setVerificationCode(newCode.slice(0, 4)); // Force 4 digits

        // Auto-focus next input
        if (value && index < 3) {
            const nextInput = document.getElementById(`code-${index + 1}`);
            nextInput?.focus();
        }
    };

    const steps = [
        { id: 1, title: 'Credentials', icon: Lock },
        { id: 2, title: 'Preferences', icon: Sparkles },
        { id: 3, title: 'Security PIN', icon: ShieldCheck },
        { id: 4, title: 'Success', icon: CheckCircle2 },
    ];

    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

            <div className="w-full max-w-xl relative z-10">
                <div className="text-center mb-6">
                    <Link href="/" className="inline-block mb-6">
                        <div className="w-10 h-10 bg-white rounded-[15px] flex items-center justify-center shadow-2xl shadow-white/10">
                            <Terminal className="text-slate-950" size={24} />
                        </div>
                    </Link>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
                        {step === 4 ? 'Registration Complete' : 'Create Account'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-xs font-bold uppercase tracking-widest">
                        {step === 4 ? 'Neural Link Established' : `Step ${step} of 3: ${steps[step - 1].title}`}
                    </p>
                </div>

                {/* Progress Stepper */}
                {step < 4 && (
                    <div className="flex items-center justify-between mb-8 px-8 relative">
                        <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2" />
                        {steps.slice(0, 3).map((s) => (
                            <div key={s.id} className="relative z-10">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                                    step >= s.id ? "bg-white text-slate-950 shadow-xl shadow-white/20" : "bg-slate-900 text-slate-600 border border-white/5"
                                )}>
                                    <s.icon size={18} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="glass p-6 md:p-8 rounded-[32px] border border-white/5 shadow-2xl space-y-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="text"
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono text-sm"
                                            placeholder="Your unique handle"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="email"
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono text-sm"
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="password"
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono text-sm"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Display Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-6 text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono text-sm"
                                        placeholder="Publicly visible name"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">AI Assistant Focus</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Balanced', 'Creative', 'Technical', 'Concise'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setFormData({ ...formData, aiModel: mode.toLowerCase() })}
                                                className={cn(
                                                    "py-3 rounded-xl border transition-all text-sm font-bold",
                                                    formData.aiModel === mode.toLowerCase() ? "bg-violet-600/20 border-violet-500/50 text-white" : "bg-slate-900/50 border-white/5 text-slate-500"
                                                )}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-6 space-y-6 animate-in fade-in zoom-in-95 duration-700">
                            <div className="w-16 h-16 bg-emerald-600/20 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                <ShieldCheck className="text-emerald-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Set your Login PIN</h2>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                                Create a 4-digit security PIN for daily access to your dashboard.
                            </p>
                            <div className="flex gap-3 justify-center">
                                {[0, 1, 2, 3].map((i) => (
                                    <input
                                        key={i}
                                        id={`code-${i}`}
                                        type="password"
                                        maxLength={1}
                                        className="w-12 h-16 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-center text-2xl font-mono text-white focus:outline-none focus:border-violet-500/50 transition-all shadow-inner"
                                        value={verificationCode[i] || ''}
                                        onChange={(e) => handleCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !verificationCode[i] && i > 0) {
                                                document.getElementById(`code-${i - 1}`)?.focus();
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="text-center py-10 space-y-8 animate-in fade-in zoom-in-95 duration-1000">
                            {/* Neural Link Pulse Animation */}
                            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping duration-[3s]" />
                                <div className="absolute inset-2 bg-emerald-500/10 rounded-full animate-pulse" />
                                <div className="relative w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                    <CheckCircle2 className="text-slate-950" size={40} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Neural Uplink Online</span>
                                </div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Welcome Agent</h1>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                                    Your secure identity has been cryptographically verified and stored.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-2xl border border-white/5 mx-auto max-w-sm">
                                <div className="text-left space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                                    <p className="text-sm font-bold text-white">Active</p>
                                </div>
                                <div className="text-left space-y-1 border-l border-white/5 pl-4">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Access</p>
                                    <p className="text-sm font-bold text-white uppercase">PIN Verified</p>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push('/auth/login')}
                                className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-white/10 uppercase tracking-widest flex items-center justify-center gap-3 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                Enter Dashboard <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" size={20} />
                            </button>
                        </div>
                    ) || (
                            <div className="flex gap-4 pt-4">
                                {step > 1 && step < 4 && (
                                    <button
                                        onClick={prevStep}
                                        className="px-6 py-4 border border-white/10 text-slate-400 hover:text-white font-bold rounded-xl hover:bg-white/5 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <ChevronLeft size={18} /> Back
                                    </button>
                                )}
                                {step < 4 && (
                                    <button
                                        disabled={isLoading || cooldown > 0}
                                        onClick={step === 1 || step === 2 ? nextStep : handleRegister}
                                        className="flex-1 py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all shadow-xl shadow-white/10 uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                                <span>Processing</span>
                                            </div>
                                        ) : cooldown > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <Lock size={16} className="animate-pulse" />
                                                <span>Wait {cooldown}s</span>
                                            </div>
                                        ) : (step === 3 ? 'Complete Setup' : 'Continue')}
                                        {step < 3 && !isLoading && cooldown === 0 && <ChevronRight size={18} />}
                                    </button>
                                )}
                            </div>
                        )}
                    {error && <p className="text-center text-red-400 text-xs font-bold uppercase tracking-tight">{error}</p>}
                </div>

                <p className="text-center mt-6 text-slate-500 text-sm">
                    Already have an account? <Link href="/auth/login" className="text-white font-bold hover:underline">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
