'use client';
// src/components/admin/RegistryReadinessPanel.tsx
// The real version of what /admin/dmrv/readiness faked — every number
// here comes from an actual database check, not a hardcoded constant.
// Self-contained, same pattern as SamplingDesignPanel/EngineConfigPanel.
import { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Circle, Plus } from 'lucide-react';

export default function RegistryReadinessPanel({ siteId }: { siteId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPddForm, setShowPddForm] = useState(false);
  const [showBaselineForm, setShowBaselineForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [registryType, setRegistryType] = useState('');
  const [baselineScenario, setBaselineScenario] = useState('');
  const [preExistingVegetation, setPreExistingVegetation] = useState('');
  const [landUseHistory, setLandUseHistory] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/sites/${siteId}/registry-readiness`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, [siteId]);

  async function submitPdd() {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/sites/${siteId}/registry-readiness`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'pdd', registryType, baselineScenario }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed'); return; }
    setShowPddForm(false);
    load();
  }

  async function submitBaseline() {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/sites/${siteId}/registry-readiness`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'baseline', preExistingVegetation, landUseHistory }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed'); return; }
    setShowBaselineForm(false);
    load();
  }

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-400">Loading registry readiness…</div>
  );

  if (!data?.enabled) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-gray-400"/>
          <h3 className="font-bold text-gray-900 text-sm">Registry Readiness</h3>
        </div>
        <p className="text-gray-400 text-xs">
          Not enabled for your organisation — this is opt-in, not assumed for every tenant. A Super Admin can turn on the PDD and Baseline Assessment modules in Engine Configuration if you're pursuing formal registry issuance.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-500"/>
          <h3 className="font-bold text-gray-900 text-sm">Registry Readiness</h3>
        </div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${data.score >= 80 ? 'bg-emerald-100 text-emerald-700' : data.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
          {data.score}/100
        </div>
      </div>
      <p className="text-gray-400 text-xs -mt-3">
        A readiness view, not a submission workflow — each check reflects real data on file for this site, nothing estimated.
      </p>

      <div className="space-y-2">
        {data.checks.map((c: any) => (
          <div key={c.key} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
            {c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0"/> : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0"/>}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800">{c.label}</div>
              <div className="text-[11px] text-gray-400">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {/* Lightweight PDD creation — a few core fields, not a full editor */}
      {data.pddEnabled && !data.pdd && (
        showPddForm ? (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-700">Start a Project Design Document</h4>
            <select value={registryType} onChange={e => setRegistryType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Registry type (optional for now)</option>
              <option value="VERRA_VCS">Verra VCS</option>
              <option value="GOLD_STANDARD">Gold Standard</option>
              <option value="ICR">ICR</option>
              <option value="INTERNAL_CSR">Internal / CSR only</option>
            </select>
            <textarea value={baselineScenario} onChange={e => setBaselineScenario(e.target.value)} rows={3}
              placeholder="Baseline scenario — what would have happened without this project?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            <div className="flex gap-2">
              <button onClick={submitPdd} disabled={saving} className="text-xs font-semibold bg-[var(--admin-primary)] text-white px-4 py-2 rounded-lg disabled:opacity-60">
                {saving ? 'Saving…' : 'Create Draft'}
              </button>
              <button onClick={() => setShowPddForm(false)} className="text-xs text-gray-500 px-3 py-2">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowPddForm(true)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl px-3 py-2">
            <Plus className="w-3.5 h-3.5"/> Start PDD
          </button>
        )
      )}

      {data.baselineEnabled && !data.baseline && (
        showBaselineForm ? (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-700">Record Baseline Assessment</h4>
            <textarea value={preExistingVegetation} onChange={e => setPreExistingVegetation(e.target.value)} rows={2}
              placeholder="Pre-existing vegetation before planting"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            <textarea value={landUseHistory} onChange={e => setLandUseHistory(e.target.value)} rows={2}
              placeholder="Land use history — how was this land used before?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            <div className="flex gap-2">
              <button onClick={submitBaseline} disabled={saving} className="text-xs font-semibold bg-[var(--admin-primary)] text-white px-4 py-2 rounded-lg disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Baseline'}
              </button>
              <button onClick={() => setShowBaselineForm(false)} className="text-xs text-gray-500 px-3 py-2">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowBaselineForm(true)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl px-3 py-2">
            <Plus className="w-3.5 h-3.5"/> Record Baseline
          </button>
        )
      )}
    </div>
  );
}
