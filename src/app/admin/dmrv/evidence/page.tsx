'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { useEffect, useState } from 'react';
import { Archive, MapPin, Calendar, User } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  WATERING: 'Watering', WEEDING: 'Weeding', FERTILIZER: 'Fertilizer',
  PEST: 'Pest Issue', DAMAGE: 'Damage', GENERAL: 'General Photo',
};

export default function EvidenceVaultPage() {
  const [tab, setTab]         = useState<'community'|'monitoring'>('community');
  const [updates, setUpdates] = useState<any[]>([]);
  const [visits, setVisits]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'community') {
      fetch('/api/admin/updates?status=APPROVED')
        .then(r => r.json()).then(d => setUpdates(d.updates || [])).finally(() => setLoading(false));
    } else {
      fetch('/api/admin/monitoring-visits?status=PUBLISHED')
        .then(r => r.json()).then(d => setVisits(d.visits || [])).finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-2">
          <Archive className="w-5 h-5 text-indigo-400"/>
          <h1 className="text-lg font-bold">Evidence Vault</h1>
          <span className="text-xs text-gray-500 ml-1">Approved community updates + published official monitoring — this is what donors can see</span>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab('community')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                tab === 'community' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
              Approved Community Updates
            </button>
            <button onClick={() => setTab('monitoring')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                tab === 'monitoring' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
              Published Official Monitoring
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : tab === 'community' ? (
            updates.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Archive className="w-12 h-12 mx-auto mb-4 text-indigo-400 opacity-40"/>
                <p className="text-gray-400 text-sm">No approved community updates yet.</p>
                <p className="text-gray-600 text-xs mt-2">Approve farmer updates in Community Updates to see them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {updates.map((u: any) => (
                  <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <img src={u.photoUrl} alt="" className="w-full h-32 object-cover"/>
                    <div className="p-3">
                      <div className="text-white text-xs font-semibold">{CATEGORY_LABELS[u.category] || u.category}</div>
                      <div className="text-gray-500 text-[10px] mt-1 flex items-center gap-1"><Calendar className="w-2.5 h-2.5"/> {new Date(u.submittedAt).toLocaleDateString('en-IN')}</div>
                      {u.gpsLatitude && (
                        <div className="text-gray-500 text-[10px] mt-0.5 flex items-center gap-1"><MapPin className="w-2.5 h-2.5"/> {u.gpsLatitude.toFixed(3)}, {u.gpsLongitude.toFixed(3)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            visits.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Archive className="w-12 h-12 mx-auto mb-4 text-indigo-400 opacity-40"/>
                <p className="text-gray-400 text-sm">No published monitoring visits yet.</p>
                <p className="text-gray-600 text-xs mt-2">Publish verified visits in Verify to see them here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((v: any) => (
                  <div key={v.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white text-sm">{v.site?.siteName}</div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">Published</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {new Date(v.visitDate).toLocaleDateString('en-IN')} · {v.treeSamples?.length || 0} trees sampled
                      {v.survivalPct != null && ` · ${v.survivalPct}% survival`}
                    </div>
                    {v.photos?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {v.photos.map((p: string, i: number) => (
                          <img key={i} src={p} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0"/>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </DMRVLayout>
  );
}
