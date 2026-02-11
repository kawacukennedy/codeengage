'use client';

import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ProtectedRoute from '../auth/ProtectedRoute';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-[#0f172a] overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <Navbar />
                    <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-950/20">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
