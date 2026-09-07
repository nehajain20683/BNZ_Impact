'use client';
// src/components/superadmin/EngineConfigPanel.tsx
// Self-contained: fetches and saves its own state independently of the
// parent org-detail page, so wiring it in is a single clean insertion
// point rather than threading new state through an already-long page.
import { useEffect, useState } from 'react';
import { Settings2, CheckCircle } from 'lucide-react';

const ENGINE_TYPES = [
  { value: 'CSR_PLANTATION',  label: 'CSR Plantation', note: 'The only engine type with a confirmed real tenant today' },
  { value: 'NGO_MONITORING',  label: 'NGO Monitoring' },
  { value: 'CARBON_DEVELOPER', label: 'Carbon Developer' },
  { value: 'GOVERNMENT',      label: 'Government / Afforestation' },
  { value: 'AGROFORESTRY',    label: 'Agroforestry / Farmer Revenue' },
  { value: 'CORPORATE_ESG',   label: 'Corporate Environmental / ESG', note: 'Second engine type — workflow steps defined, execution features not yet built' },
];

export default function EngineConfigPanel({ orgId }: { orgId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [stepsLoading, setStepsLoading] = useState(true);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/superadmin/orgs/${orgId}/engine-config`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, [orgId]);

  // Configurable Workflow Framework — the step list shown below is driven
  // by whichever engine type is currently selected, fetched live rather
  // than a fixed array, so selecting Corporate ESG genuinely shows a
  // different step sequence instead of the plantation phases relabeled.
  useEffect(() => {
    if (!data?.config?.engineType) return;
    setStepsLoading(true);
    fetch(`/api/admin/workflow-steps?engineType=${data.config.engineType}`)
      .then(r => r.json())
      .then(d => setWorkflowSteps(d.steps || []))
      .finally(() => setStepsLoading(false));
  }, [data?.config?.engineType]);

  async function updateEngineType(engineType: string) {
    setSaving('engineType');
    await fetch(`/api/superadmin/orgs/${orgId}/engine-config`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineType }),
    });
    setSaving(null);
    showToast('Engine type updated');
    load();
  }

  async function toggleRequiredPhase(phase: string) {
    const current: string[] = data.config.requiredPhases || [];
    const next = current.includes(phase) ? current.filter((p: string) => p !== phase) : [...current, phase];
    setSaving('phases');
    await fetch(`/api/superadmin/orgs/${orgId}/engine-config`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requiredPhases: next }),
    });
    setSaving(null);
    load();
  }

  async function toggleModule(moduleKey: string, enabled: boolean) {
    setSaving(moduleKey);
    await fetch(`/api/superadmin/orgs/${orgId}/engine-config`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleKey, enabled }),
    });
    setSaving(null);
    load();
  }

  async function updateMonitoringInterval(days: number) {
    setSaving('interval');
    await fetch(`/api/superadmin/orgs/${orgId}/engine-config`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultMonitoringIntervalDays: days }),
    });
    setSaving(null);
    showToast('Monitoring interval updated');
    load();
  }

  if (loading || !data) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-400">Loading engine configuration…</div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 relative">
      {toast && <div className="absolute top-4 right-4 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg">{toast}</div>}

      <div className="flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-gray-500"/>
        <h3 className="font-bold text-gray-900 text-sm">Engine Configuration</h3>
      </div>
      <p className="text-gray-400 text-xs -mt-4">
        Phase 0B of the frozen dMRV architecture spec — configuration, not a workflow rewrite. Existing plantation-phase behavior is unchanged unless a phase is explicitly marked required below.
      </p>

      {/* Layer 1 — Engine Type */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-2">Engine Type</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {ENGINE_TYPES.map(t => (
            <button key={t.value} onClick={() => updateEngineType(t.value)} disabled={saving === 'engineType'}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                data.config.engineType === t.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="font-semibold text-gray-800">{t.label}</div>
              {t.note && <div className="text-[11px] text-gray-400 mt-0.5">{t.note}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Layer 2 — Feature Modules */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-2">Feature Modules</label>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {data.modules.map((m: any) => (
            <label key={m.key} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={m.enabled} disabled={saving === m.key}
                onChange={e => toggleModule(m.key, e.target.checked)} className="rounded"/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{m.label}</div>
                {m.description && <div className="text-[11px] text-gray-400">{m.description}</div>}
              </div>
              {m.enabled && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0"/>}
            </label>
          ))}
        </div>
      </div>

      {/* Phase 2 — Monitoring cadence */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Default Monitoring Interval</label>
        <p className="text-gray-400 text-[11px] mb-2">
          How often a site should be visited before it shows as overdue on the officer dashboard. A specific site can be given its own cadence later if one genuinely needs a different schedule — this is the org-wide default every site uses until then.
        </p>
        <div className="flex items-center gap-2">
          <input type="number" min={1} defaultValue={data.config.defaultMonitoringIntervalDays || 30}
            onBlur={e => { const v = parseInt(e.target.value, 10); if (v > 0) updateMonitoringInterval(v); }}
            disabled={saving === 'interval'}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm"/>
          <span className="text-sm text-gray-500">days</span>
        </div>
      </div>

      {/* Layer 3 — Required Steps, driven by the Configurable Workflow
          Framework rather than a fixed array. Changes based on whichever
          engine type is selected above. */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Required Steps</label>
        <p className="text-gray-400 text-[11px] mb-2">
          Which steps in this engine's workflow are mandatory (not skippable) for this tenant. Unchecked steps can be skipped — for CSR Plantation, the underlying phase list itself is unchanged; this only controls what's enforced.
        </p>
        {stepsLoading ? (
          <p className="text-gray-400 text-xs">Loading steps for this engine type…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {workflowSteps.map((step: any) => {
              const required = (data.config.requiredPhases || []).includes(step.stepKey);
              return (
                <button key={step.stepKey} onClick={() => toggleRequiredPhase(step.stepKey)} disabled={saving === 'phases'}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    required ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {step.stepLabel} {required ? '· Required' : '· Optional'}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
