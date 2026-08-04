'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Activity, Clock, User } from 'lucide-react';

export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!['ADMIN','SUPER_ADMIN'].includes(role)) { router.push('/'); return; }
    fetch('/api/admin/logs')
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, role]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Activity className="w-5 h-5 text-amber-600"/>
        <div>
          <h1 className="font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-400 text-xs">All actions in this organisation</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Action','Details','Actor','Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">Loading logs…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">No activity logs yet</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                    {typeof log.details === 'object' ? JSON.stringify(log.details).slice(0,80) : log.details || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs flex items-center gap-1">
                    <User className="w-3 h-3"/> {log.actorRole}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3"/>
                      {new Date(log.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
