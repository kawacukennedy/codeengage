'use client';

import {
    Search,
    Filter,
    MoreHorizontal,
    ShieldAlert
} from 'lucide-react';
import { cn, fetchApi } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function AdminUsers() {
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: () => fetchApi('/admin/metrics').then(data => {
            // This is a bit of a hack since the spec doesn't have a dedicated /admin/users list,
            // but in a real app we'd have it. Let's assume fetchApi('/users') works or we use existing metrics data.
            // For now, let's keep the /users assumption or mock if needed.
            return fetchApi('/admin/audit').then(logs => {
                // Better approach: fetch all users from a generic endpoint if available
                return fetchApi('/profiles').then(profiles => profiles);
            });
        })
    });

    const handleToggleSuspension = async (userId: string, currentStatus: boolean) => {
        try {
            await fetchApi(`/admin/users/${userId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ is_suspended: !currentStatus })
            });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    return (
        <div className="glass rounded-[48px] border border-white/5 overflow-hidden bg-slate-950/20 shadow-2xl">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-6">
                    <div className="relative group w-96">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input
                            type="text"
                            placeholder="Search user entities..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all font-medium"
                        />
                    </div>
                    <button className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-slate-500 hover:text-white transition-all">
                        <Filter size={20} />
                    </button>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all">Moderate All</button>
                    <button className="px-8 py-3 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-white/10 transition-all hover:bg-slate-200 italic">Export Audit</button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5">
                        <tr className="border-b border-white/5">
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity Signature</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Tier</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Temporal Origin</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Intervention</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-10 py-6 bg-white/[0.01]" />
                                </tr>
                            ))
                        ) : (
                            users?.filter((u: any) => u.username.toLowerCase().includes(search.toLowerCase())).map((user: any) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-white italic">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white uppercase tracking-tight">{user.username}</p>
                                                <p className="text-[10px] text-slate-500 font-bold lowercase tracking-wide italic">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="px-3 py-1 bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                            {user.achievement_points > 1000 ? 'Pro Elite' : 'Standard'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]",
                                                user.is_suspended ? "bg-red-500" : "bg-emerald-500"
                                            )} />
                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                                {user.is_suspended ? 'Suspended' : 'Authorized'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-[10px] text-slate-500 font-mono">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <button
                                            onClick={() => handleToggleSuspension(user.id, user.is_suspended)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                                                user.is_suspended ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                            )}
                                        >
                                            {user.is_suspended ? 'Reactivate' : 'Suspend'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
