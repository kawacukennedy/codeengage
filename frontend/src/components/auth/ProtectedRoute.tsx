'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !token) {
            router.push('/auth/login');
        }
    }, [token, isLoading, router]);

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!token) return null;

    return <>{children}</>;
}
