'use client';
// src/app/admin/certificates/page.tsx
// Cross-farmer status view for Plantation Certificates specifically —
// generated, shared, farmer's signed copy received, admin approved.
// The per-farmer "Documents Sent" tab already shows this, but only one
// farmer at a time; this is the single-screen version across all of them.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/admin/PageHeader';
import { Eye, CheckCircle, Clock, FileCheck, Send } from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  SHARED:       { color: 'bg-amber-100 text-amber-700',  icon: Send,       label: 'Sent — Awaiting Farmer' },
  ACKNOWLEDGED: { color: 'bg-blue-100 text-blue-700',     icon: Clock,      label: 'Farmer Reviewed' },
  SIGNED:       { color: 'bg-teal-100 text-teal-700',     icon: FileCheck,  label: 'Signed Copy Received' },
  COMPLETED:    { color: 'bg-green-100 text-green-700',   icon: CheckCircle,label: 'Approved' },
};

const TABS = [
  { key: '', label: 'All' },
  { key: 'SHARED', label: 'Awaiting Farmer' },
  { key: 'SIGNED', label: 'Needs Your Approval' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function AdminCertificatesPage() {
  const [tab, setTab] = useState('');
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/agreements?agreementType=PLANTATION_CERTIFICATE');
    const data = await res.json();
    setCerts(data.agreements || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    const res = await fetch('/api/admin/agreements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId: id, status: 'COMPLETED' }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to approve'); return; }
    showToast('Certificate approved ✓');
    load();
  }

  const filtered = tab ? certs.filter(c => c.status === tab) : certs;

  return (
    <div>
      <PageHeader title="Plantation Certificates" subtitle="Status across every farmer — generated, shared, signed, approved"/>

      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="p-6">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t.key ? 'bg-white shadow-sm text-[var(--admin-primary)]' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
            No certificates {tab ? `in "${TABS.find(t=>t.key===tab)?.label}"` : 'generated yet'}.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>{['Farmer','Generated','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.SHARED;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{c.farmer?.fullName}</div>
                        <div className="text-gray-400 text-xs">{c.farmer?.farmerIdGenerated || c.farmer?.mobile}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3"/> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <a href={`/api/farmer/agreements/${c.id}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-[var(--admin-primary)] hover:underline">
                            <Eye className="w-3 h-3"/> View
                          </a>
                          {c.signedPdfUrl && (
                            <a href={c.signedPdfUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-teal-600 hover:underline">
                              <FileCheck className="w-3 h-3"/> Signed Copy
                            </a>
                          )}
                          {c.status === 'SIGNED' && (
                            <button onClick={() => approve(c.id)}
                              className="flex items-center gap-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded-lg px-2 py-1">
                              <CheckCircle className="w-3 h-3"/> Approve
                            </button>
                          )}
                          <Link href={`/admin/farmers/${c.farmerId}`} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                            View Farmer →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
