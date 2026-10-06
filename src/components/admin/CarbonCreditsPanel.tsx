'use client';
// src/components/admin/CarbonCreditsPanel.tsx
// The real Carbon Credit Lifecycle UI, closing the last Tier 2 gap. Same
// self-contained pattern as SamplingDesignPanel/RegistryReadinessPanel.
import { useEffect, useState } from 'react';
import { Coins, Plus, Send } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600', ISSUED: 'bg-blue-100 text-blue-700',
  LISTED: 'bg-amber-100 text-amber-700', SOLD: 'bg-emerald-100 text-emerald-700',
  TRANSFERRED: 'bg-purple-100 text-purple-700', RETIRED: 'bg-gray-800 text-white',
};
const NEXT_STEPS: Record<string, string[]> = {
  PENDING: ['ISSUED'], ISSUED: ['LISTED', 'SOLD'], LISTED: ['SOLD'],
  SOLD: ['TRANSFERRED', 'RETIRED'], TRANSFERRED: ['RETIRED'], RETIRED: [],
};

export default function CarbonCreditsPanel({ siteId }: { siteId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [farmerId, setFarmerId] = useState('');
  const [vintageYear, setVintageYear] = useState(String(new Date().getFullYear()));
  const [creditsIssued, setCreditsIssued] = useState('');
  const [registry, setRegistry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [transitionFields, setTransitionFields] = useState<any>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/sites/${siteId}/carbon-credits`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, [siteId]);

  async function createCredit() {
    if (!farmerId) { setError('Select a farmer'); return; }
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/sites/${siteId}/carbon-credits`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, vintageYear, creditsIssued, registry }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed'); return; }
    setShowCreate(false);
    setFarmerId(''); setCreditsIssued(''); setRegistry('');
    load();
  }

  async function transition(creditId: string, status: string) {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/sites/${siteId}/carbon-credits/${creditId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...transitionFields }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed'); return; }
    setTransitioningId(null);
    setTransitionFields({});
    load();
  }

  if (loading) return <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-400">Loading carbon credits…</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-gray-500"/>
          <h3 className="font-bold text-gray-900 text-sm">Carbon Credits</h3>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl px-3 py-1.5">
          <Plus className="w-3.5 h-3.5"/> New Credit Record
        </button>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'Issued (tCO2e)', value: data.summary.totalIssued },
            { label: 'Sold (tCO2e)', value: data.summary.totalSold },
            { label: 'Retired (tCO2e)', value: data.summary.totalRetired },
            { label: 'Revenue Shared', value: `₹${data.summary.totalRevenueShared.toLocaleString('en-IN')}` },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl py-3">
              <div className="font-display text-lg text-gray-900">{typeof s.value === 'number' ? s.value.toFixed(1) : s.value}</div>
              <div className="text-gray-400 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {showCreate && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <select value={farmerId} onChange={e => setFarmerId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select farmer whose land generated this credit…</option>
            {data?.eligibleFarmers?.map((f: any) => <option key={f.id} value={f.id}>{f.fullName} ({f.village})</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Vintage year" value={vintageYear} onChange={e => setVintageYear(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            <input type="number" placeholder="Credits (tCO2e)" value={creditsIssued} onChange={e => setCreditsIssued(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            <input placeholder="Registry (e.g. Verra)" value={registry} onChange={e => setRegistry(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
          </div>
          <button onClick={createCredit} disabled={saving} className="text-xs font-semibold bg-[var(--admin-primary)] text-white px-4 py-2 rounded-lg disabled:opacity-60">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {data?.credits?.length === 0 && <p className="text-gray-400 text-xs text-center py-4">No carbon credit records yet.</p>}
        {data?.credits?.map((c: any) => (
          <div key={c.id} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">{c.farmer?.fullName}</span>
                <span className="text-gray-400 text-xs ml-2">{c.vintageYear} · {c.registry || 'Registry TBD'} · {c.creditsIssued ?? '—'} tCO2e</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}>{c.status}</span>
            </div>

            {transitioningId === c.id ? (
              <div className="mt-2 space-y-2">
                {NEXT_STEPS[c.status]?.includes('SOLD') && (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Credits sold" onChange={e => setTransitionFields({ ...transitionFields, creditsSold: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"/>
                    <input type="number" placeholder="Revenue shared (₹)" onChange={e => setTransitionFields({ ...transitionFields, revenueShared: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"/>
                  </div>
                )}
                {NEXT_STEPS[c.status]?.includes('RETIRED') && (
                  <input placeholder="Retirement reason" onChange={e => setTransitionFields({ ...transitionFields, retirementReason: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"/>
                )}
                <div className="flex gap-2 flex-wrap">
                  {NEXT_STEPS[c.status]?.map(next => (
                    <button key={next} onClick={() => transition(c.id, next)} disabled={saving} className="text-[11px] font-semibold bg-[var(--admin-primary)] text-white px-3 py-1.5 rounded-lg disabled:opacity-60">
                      Confirm → {next}
                    </button>
                  ))}
                  <button onClick={() => setTransitioningId(null)} className="text-[11px] text-gray-500 px-2 py-1.5">Cancel</button>
                </div>
              </div>
            ) : NEXT_STEPS[c.status]?.length > 0 && (
              <button onClick={() => setTransitioningId(c.id)} className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 mt-2">
                <Send className="w-3 h-3"/> Advance status
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
