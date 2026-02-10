'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Mail, ShieldCheck, ChevronLeft, Terminal } from 'lucide-react';
import { cn, fetchApi } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function ResetPinPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPin, setNewPin] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPin.join('').length !== 4) {
            setError('Please enter a 4-digit security PIN');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await fetchApi('/auth/reset-pin', {
                method: 'POST',
                body: JSON.stringify({ email, password, newPin: newPin.join('') })
            });
            setSuccess(true);
            setTimeout(() => router.push('/auth/login'), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const pin = [...newPin];
        pin[index] = value.slice(-1);
        setNewPin(pin);

        if (value && index < 3) {
            document.getElementById(`pin-${index + 1}`)?.focus();
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none text-red-500">
                <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-red-600 blur-[100px] rounded-full opacity-10" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block mb-6 text-white bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                        <Terminal size={24} />
                    </Link>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Reset Security PIN</h1>
                    <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">Verify with your account password</p>
                </div>

                <div className="glass p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
                    {success ? (
                        <div className="py-12 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-emerald-600/20 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                <ShieldCheck className="text-emerald-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">PIN Reset Successfully</h2>
                            <p className="text-slate-500 mt-2">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-12 py-4 bg-slate-900/50 border border-white/5 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all font-mono text-sm"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Account Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-12 py-4 bg-slate-900/50 border border-white/5 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all font-mono text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">New 4-Digit PIN</label>
                                <div className="flex gap-4 justify-between">
                                    {[0, 1, 2, 3].map((i) => (
                                        <input
                                            key={i}
                                            id={`pin-${i}`}
                                            type="password"
                                            maxLength={1}
                                            className="w-16 h-20 bg-slate-900 border border-white/5 rounded-2xl text-center text-3xl font-mono text-white focus:outline-none focus:border-violet-500 transition-all shadow-inner"
                                            value={newPin[i]}
                                            onChange={(e) => handlePinChange(i, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !newPin[i] && i > 0) {
                                                    document.getElementById(`pin-${i - 1}`)?.focus();
                                                }
                                            }}
                                            required
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black transition-all shadow-xl shadow-white/10 uppercase tracking-widest disabled:opacity-50"
                            >
                                {isLoading ? 'Processing...' : 'Reset Security PIN'}
                            </button>

                            {error && <p className="text-center text-red-500 text-xs font-bold uppercase">{error}</p>}
                        </form>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <Link href="/auth/login" className="text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <ChevronLeft size={16} /> Back to Login
                    </Link>
                </div>
            </div>
        </main>
    );
}
