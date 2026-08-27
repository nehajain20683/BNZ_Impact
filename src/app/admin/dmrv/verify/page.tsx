'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { useEffect, useState } from 'react';
import { Shield, CheckCircle2, Send, Undo2, MapPin, TreePine } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted', VERIFIED: 'Verified', PUBLISHED: 'Published', SENT_BACK: 'Sent Back',
};
const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  VERIFIED:  'text-teal-400 bg-teal-500/10 border-teal-500/30',
  PUBLISHED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  SENT_BACK: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

export default function VerifyPage() {
  const [tab, setTab]         = useState<'SUBMITTED'|'VERIFIED'|'PUBLISHED'|'SENT_BACK'>('SUBMITTED');
  const [visits, setVisits]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/monitoring-visits?status=${tab}`);
    const data = await res.json();
    setVisits(data.visits || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tab]);

  async function act(id: string, action: 'VERIFY'|'PUBLISH'|'SEND_BACK') {
    const res = await fetch(`/api/admin/monitoring-visits/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed'); return; }
    showToast(action === 'PUBLISH' ? 'Published — now donor-visible ✓' : action === 'VERIFY' ? 'Verified ✓' : 'Sent back to field officer');
    load();
  }

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-400"/>
          <h1 className="text-lg font-bold">Verify</h1>
          <span className="text-xs text-gray-500 ml-1">Official monitoring — only Published visits become donor-visible</span>
        </div>

        {toast && <div className="fixed top-4 right-4 bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            {(['SUBMITTED','VERIFIED','PUBLISHED','SENT_BACK'] as const).map(s => (
              <button key={s} onClick={() => setTab(s)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  tab === s ? STATUS_COLOR[s] : 'text-gray-400 bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : visits.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-teal-400 opacity-40"/>
              <p className="text-gray-400 text-sm">Nothing in {STATUS_LABEL[tab].toLowerCase()} right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((v: any) => (
                <div key={v.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white text-sm">{v.site?.siteName}</div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {new Date(v.visitDate).toLocaleDateString('en-IN')} · {v.treeSamples?.length || 0} trees sampled
                        {v.survivalPct != null && ` · ${v.survivalPct}% survival`}
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[v.status] || STATUS_COLOR.SUBMITTED}`}>
                      {STATUS_LABEL[v.status] || v.status}
                    </span>
                  </div>

                  {v.treeSamples?.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {v.treeSamples.slice(0, 8).map((s: any) => (
                        <div key={s.id} className="flex-shrink-0 bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[10px]">
                          <div className="flex items-center gap-1 text-gray-300"><TreePine className="w-3 h-3"/> {s.species || s.treeId || 'Sample'}</div>
                          <div className="text-gray-500 mt-0.5">{s.health} {s.height ? `· ${s.height}cm` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {v.gpsLat && (
                    <div className="flex items-center gap-1 text-gray-500 text-[10px] mt-2">
                      <MapPin className="w-3 h-3"/> {v.gpsLat.toFixed(4)}, {v.gpsLng.toFixed(4)}
                    </div>
                  )}

                  {tab === 'SUBMITTED' && (
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => act(v.id, 'VERIFY')}
                        className="flex items-center gap-1 text-xs font-semibold text-teal-400 border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5"/> Verify
                      </button>
                      <button onClick={() => act(v.id, 'SEND_BACK')}
                        className="flex items-center gap-1 text-xs font-semibold text-rose-400 border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 rounded-lg">
                        <Undo2 className="w-3.5 h-3.5"/> Send Back
                      </button>
                    </div>
                  )}
                  {tab === 'VERIFIED' && (
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => act(v.id, 'PUBLISH')}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                        <Send className="w-3.5 h-3.5"/> Publish to Donors
                      </button>
                      <button onClick={() => act(v.id, 'SEND_BACK')}
                        className="flex items-center gap-1 text-xs font-semibold text-rose-400 border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 rounded-lg">
                        <Undo2 className="w-3.5 h-3.5"/> Send Back
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DMRVLayout>
  );
}
