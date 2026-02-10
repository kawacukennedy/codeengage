'use client';

import { Lock, Mail, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const { setUser, setToken } = useAuthStore();
    const [pin, setPin] = useState(['', '', '', '']);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchApi('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, pin: pin.join('') })
            });
            setUser(data.user);
            setToken(data.access_token);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newPin = [...pin];
        newPin[index] = value.slice(-1);
        setPin(newPin);

        if (value && index < 3) {
            document.getElementById(`pin-${index + 1}`)?.focus();
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-violet-600 blur-[100px] rounded-full" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="glass p-8 rounded-[32px] border border-white/5 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <Lock className="text-slate-950" size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Welcome Back</h1>
                        <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">Login with your PIN</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-900/50 border border-white/5 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all font-mono text-sm"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Security PIN</label>
                            <div className="flex gap-4 justify-between">
                                {[0, 1, 2, 3].map((i) => (
                                    <input
                                        key={i}
                                        id={`pin-${i}`}
                                        type="password"
                                        maxLength={1}
                                        className="w-16 h-20 bg-slate-900 border border-white/5 rounded-2xl text-center text-3xl font-mono text-white focus:outline-none focus:border-violet-500 transition-all shadow-inner"
                                        value={pin[i]}
                                        onChange={(e) => handlePinChange(i, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !pin[i] && i > 0) {
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
                            {isLoading ? 'Verifying...' : 'Unlock Dashboard'}
                        </button>
                    </form>
                    {error && <p className="mt-4 text-center text-red-400 text-xs font-bold uppercase tracking-tight">{error}</p>}

                    <div className="mt-8 text-center space-y-4">
                        <Link href="/auth/reset-pin" className="text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest block">
                            Forgot PIN? Use Password to Reset
                        </Link>
                        <div className="text-sm text-slate-400">
                            Don't have an account? <Link href="/auth/register" className="text-white font-bold hover:underline">Sign up</Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
