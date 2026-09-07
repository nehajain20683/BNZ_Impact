'use client';
// src/components/admin/SamplingDesignPanel.tsx
// Self-contained, same pattern as EngineConfigPanel — fetches and manages
// its own state so wiring it into the (already large) site detail page is
// one clean insertion point.
import { useEffect, useState } from 'react';
import { Grid3x3, Sparkles } from 'lucide-react';

const METHODS = [
  { value: 'RANDOM', label: 'Random', note: 'Simple random sample across every tree on the site.' },
  { value: 'STRATIFIED', label: 'Stratified by Species', note: 'Proportional sample from each species — a species that\'s 60% of the site contributes 60% of the sample.' },
  { value: 'PLOT_BASED', label: 'Plot-Based', note: 'Selects representative land parcels and fully samples every tree within them.' },
];

export default function SamplingDesignPanel({ siteId }: { siteId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('STRATIFIED');
  const [targetPct, setTargetPct] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/sites/${siteId}/sampling-plan`);
    const data = await res.json();
    setPlans(data.plans || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [siteId]);

  async function generate() {
    setGenerating(true);
    setError('');
    const res = await fetch(`/api/admin/sites/${siteId}/sampling-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, targetPct }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) { setError(data.error || 'Failed to generate plan'); return; }
    load();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Grid3x3 className="w-4 h-4 text-gray-500"/>
        <h3 className="font-bold text-gray-900 text-sm">Sampling Design</h3>
      </div>
      <p className="text-gray-400 text-xs -mt-3">
        Per-tree monitoring stays available and is unaffected by this — use these when 100% per-tree monitoring becomes operationally impractical for a large enough site.
      </p>

      <div className="grid sm:grid-cols-3 gap-2">
        {METHODS.map(m => (
          <button key={m.value} onClick={() => setMethod(m.value)}
            className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              method === m.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="font-semibold text-gray-800">{m.label}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{m.note}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Target sample</label>
        <input type="number" min={1} max={100} value={targetPct}
          onChange={e => setTargetPct(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))}
          className="w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm"/>
        <span className="text-xs text-gray-500">%</span>
        <button onClick={generate} disabled={generating}
          className="ml-auto flex items-center gap-1.5 bg-[var(--admin-primary)] text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-60">
          <Sparkles className="w-3.5 h-3.5"/> {generating ? 'Generating…' : 'Generate Plan'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">Generated Plans</h4>
        {loading ? (
          <p className="text-gray-400 text-xs">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="text-gray-400 text-xs">No sampling plan generated for this site yet.</p>
        ) : (
          <div className="space-y-2">
            {plans.map((p: any) => (
              <div key={p.id} className="bg-gray-50 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{p.method.replace(/_/g, ' ')} · {p.targetPct}%</span>
                  <span className="text-gray-400">{new Date(p.generatedAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="text-gray-500 mt-1">
                  {p.sampleSize} of {p.totalPopulation} trees sampled ({p.plots.length} {p.method === 'PLOT_BASED' ? 'land parcel(s)' : p.method === 'STRATIFIED' ? 'species stratum/strata' : 'group'} selected)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
