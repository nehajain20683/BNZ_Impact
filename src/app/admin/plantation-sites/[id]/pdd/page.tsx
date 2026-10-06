'use client';
// src/app/admin/plantation-sites/[id]/pdd/page.tsx
// The real PDD editor, closing the gap deliberately left as a
// lightweight 2-field draft in Registry Readiness. Full field set,
// version history, and a real status stepper enforcing the registry
// workflow state machine from registry-workflow.ts.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, CheckCircle2, Circle, Plus, Clock } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', VALIDATION: 'Validation',
  CLARIFICATION: 'Clarification Requested', VERIFICATION: 'Verification', ISSUED: 'Issued',
};
const STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'VALIDATION', 'VERIFICATION', 'ISSUED'];

const FIELD_GROUPS = [
  { title: 'Project Overview', fields: [
    { key: 'registryType', label: 'Registry Type', type: 'select', options: ['VERRA_VCS', 'GOLD_STANDARD', 'ICR', 'INTERNAL_CSR'] },
    { key: 'projectDescription', label: 'Project Description', type: 'textarea' },
  ]},
  { title: 'Baseline & Additionality', fields: [
    { key: 'baselineScenario', label: 'Baseline Scenario', type: 'textarea', hint: 'What would have happened to this land without the project?' },
    { key: 'additionalityJustification', label: 'Additionality Justification', type: 'textarea', hint: 'Why wouldn\'t this project have happened anyway, without carbon financing?' },
    { key: 'leakageAssessment', label: 'Leakage Assessment', type: 'textarea', hint: 'Could this project cause emissions to shift elsewhere (e.g. deforestation displaced to a nearby area)?' },
  ]},
  { title: 'Permanence & Monitoring', fields: [
    { key: 'permanencePlan', label: 'Permanence Plan', type: 'textarea' },
    { key: 'monitoringMethodology', label: 'Monitoring Methodology', type: 'textarea' },
  ]},
  { title: 'Stakeholders', fields: [
    { key: 'stakeholderConsultation', label: 'Stakeholder Consultation', type: 'textarea', hint: 'Evidence that affected communities/land owners were consulted' },
  ]},
];

export default function PDDEditorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [showTransitionFor, setShowTransitionFor] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/sites/${id}/pdd`);
    const d = await res.json();
    setData(d);
    if (d.current) setForm(d.current);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/sites/${id}/pdd/${data.current.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed to save'); return; }
    showToast('Saved ✓');
    load();
  }

  async function transition(status: string) {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/sites/${id}/pdd/${data.current.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transition', status, note: transitionNote || undefined }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed to change status'); return; }
    setTransitionNote('');
    setShowTransitionFor(null);
    showToast(`Moved to ${STATUS_LABELS[status]} ✓`);
    load();
  }

  async function createNewVersion() {
    if (!confirm(`Create version ${(data.current.version || 1) + 1}, starting from the current content?`)) return;
    setSaving(true);
    const res = await fetch(`/api/admin/sites/${id}/pdd`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'new_version', basedOnId: data.current.id }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed to create new version'); return; }
    showToast(`Version ${d.pdd.version} created`);
    load();
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  if (!data?.enabled) {
    return (
      <div className="p-10 max-w-lg mx-auto text-center">
        <p className="text-gray-500 text-sm">The PDD module isn't enabled for your organisation. A Super Admin can turn it on in Engine Configuration.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-gray-600 underline">← Go back</button>
      </div>
    );
  }

  if (!data.current) {
    return (
      <div className="p-10 max-w-lg mx-auto text-center">
        <p className="text-gray-500 text-sm mb-4">No PDD started for this site yet.</p>
        <button onClick={async () => {
          const res = await fetch(`/api/admin/sites/${id}/pdd`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
          if (res.ok) load();
        }} className="bg-[var(--admin-primary)] text-white text-sm font-semibold px-4 py-2 rounded-xl">
          Start a Project Design Document
        </button>
      </div>
    );
  }

  const isDraft = data.current.status === 'DRAFT';
  const history = Array.isArray(data.current.statusHistory) ? data.current.statusHistory : [];
  const nextSteps: Record<string, string[]> = {
    DRAFT: ['SUBMITTED'], SUBMITTED: ['VALIDATION'], VALIDATION: ['CLARIFICATION', 'VERIFICATION'],
    CLARIFICATION: ['VALIDATION'], VERIFICATION: ['CLARIFICATION', 'ISSUED'], ISSUED: [],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5"/></button>
          <div>
            <h1 className="font-bold text-gray-900">Project Design Document</h1>
            <p className="text-gray-400 text-xs">Version {data.current.version} · {STATUS_LABELS[data.current.status]}</p>
          </div>
        </div>
        {data.versions.length > 1 && (
          <select value={data.current.id} onChange={e => { const v = data.versions.find((x: any) => x.id === e.target.value); if (v) { setForm(v); setData({ ...data, current: v }); } }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {data.versions.map((v: any) => <option key={v.id} value={v.id}>Version {v.version} ({STATUS_LABELS[v.status]})</option>)}
          </select>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Status stepper */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            {STATUS_ORDER.map((s, i) => {
              const currentIdx = STATUS_ORDER.indexOf(data.current.status);
              const done = i < currentIdx || (data.current.status === 'ISSUED' && s === 'ISSUED');
              const active = s === data.current.status;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? 'text-emerald-700' : done ? 'text-emerald-500' : 'text-gray-300'}`}>
                    {done || active ? <CheckCircle2 className="w-4 h-4"/> : <Circle className="w-4 h-4"/>}
                    {STATUS_LABELS[s]}
                  </div>
                  {i < STATUS_ORDER.length - 1 && <div className={`flex-1 h-px mx-2 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`}/>}
                </div>
              );
            })}
          </div>
          {data.current.status === 'CLARIFICATION' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 mb-3">
              Registry requested clarification — address the notes below, then move back to Validation once resolved.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {nextSteps[data.current.status]?.map(next => (
              showTransitionFor === next ? (
                <div key={next} className="w-full space-y-2 bg-gray-50 rounded-xl p-3">
                  <textarea value={transitionNote} onChange={e => setTransitionNote(e.target.value)} rows={2}
                    placeholder={`Note for moving to ${STATUS_LABELS[next]} (optional)`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  <div className="flex gap-2">
                    <button onClick={() => transition(next)} disabled={saving}
                      className="text-xs font-semibold bg-[var(--admin-primary)] text-white px-4 py-2 rounded-lg disabled:opacity-60">
                      Confirm → {STATUS_LABELS[next]}
                    </button>
                    <button onClick={() => setShowTransitionFor(null)} className="text-xs text-gray-500 px-3 py-2">Cancel</button>
                  </div>
                </div>
              ) : (
                <button key={next} onClick={() => setShowTransitionFor(next)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:border-gray-300">
                  <Send className="w-3.5 h-3.5"/> Move to {STATUS_LABELS[next]}
                </button>
              )
            ))}
            <button onClick={createNewVersion} disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl px-3 py-2 ml-auto">
              <Plus className="w-3.5 h-3.5"/> New Version
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {!isDraft && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            This version is {STATUS_LABELS[data.current.status]} and locked from editing. Create a new version to revise it.
          </div>
        )}

        {/* Content fields */}
        {FIELD_GROUPS.map(group => (
          <div key={group.title} className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">{group.title}</h3>
            <div className="space-y-4">
              {group.fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                  {f.hint && <p className="text-gray-400 text-[11px] mb-1">{f.hint}</p>}
                  {f.type === 'select' ? (
                    <select disabled={!isDraft} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400">
                      <option value="">Not set</option>
                      {f.options?.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                  ) : (
                    <textarea disabled={!isDraft} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"/>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {isDraft && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 bg-[var(--admin-primary)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60">
            <Save className="w-4 h-4"/> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-400"/>
              <h3 className="font-semibold text-gray-900 text-sm">Status History</h3>
            </div>
            <div className="space-y-2">
              {history.slice().reverse().map((h: any, i: number) => (
                <div key={i} className="text-xs border-l-2 border-gray-200 pl-3 py-1">
                  <span className="font-semibold text-gray-700">{STATUS_LABELS[h.status] || h.status}</span>
                  <span className="text-gray-400"> · {new Date(h.changedAt).toLocaleString('en-IN')}{h.changedBy ? ` · ${h.changedBy}` : ''}</span>
                  {h.note && <div className="text-gray-500 mt-0.5">{h.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
