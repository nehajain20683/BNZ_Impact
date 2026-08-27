'use client';
// src/app/admin/impact-metrics/page.tsx
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import { Plus, Trash2, X, Leaf } from 'lucide-react';

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40";

export default function AdminImpactMetricsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [sites, setSites]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [recording, setRecording] = useState<any>(null); // metric being recorded a value for
  const [valueForm, setValueForm] = useState({ siteId: '', value: '', period: '', notes: '' });
  const [values, setValues]   = useState<any[]>([]);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const [mRes, sRes, vRes] = await Promise.all([
      fetch('/api/admin/impact-metrics'),
      fetch('/api/admin/plantation-sites'),
      fetch('/api/admin/impact-metrics/values'),
    ]);
    const [mData, sData, vData] = await Promise.all([mRes.json(), sRes.json(), vRes.json()]);
    setMetrics(mData.metrics || []);
    setSites(sData.sites || []);
    setValues(vData.values || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setError('');
    setEditing({ name: '', unit: '', icon: '🌿', color: '#2d5a1b', description: '', calculationType: 'SITE_PROPORTIONAL', active: true });
  }

  async function handleSaveMetric() {
    setError('');
    const isNew = !editing.id;
    const url    = isNew ? '/api/admin/impact-metrics' : `/api/admin/impact-metrics/${editing.id}`;
    const method = isNew ? 'POST' : 'PATCH';
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to save'); return; }
    showToast(isNew ? 'Metric created ✓' : 'Saved ✓');
    setEditing(null);
    load();
  }

  async function handleToggleActive(m: any) {
    await fetch(`/api/admin/impact-metrics/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !m.active }),
    });
    load();
  }

  async function handleDeleteMetric(m: any) {
    if (!confirm(`Delete "${m.name}"? This also deletes all recorded values for it.`)) return;
    await fetch(`/api/admin/impact-metrics/${m.id}`, { method: 'DELETE' });
    showToast('Metric deleted');
    load();
  }

  function openRecord(m: any) {
    setError('');
    setValueForm({ siteId: sites[0]?.id || '', value: '', period: '', notes: '' });
    setRecording(m);
  }

  async function handleRecordValue() {
    setError('');
    if (!valueForm.siteId || !valueForm.value) { setError('Site and value are required'); return; }
    const res = await fetch('/api/admin/impact-metrics/values', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metricId: recording.id, ...valueForm }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to record'); return; }
    showToast('Value recorded ✓');
    setRecording(null);
    load();
  }

  async function handleDeleteValue(id: string) {
    if (!confirm('Delete this recorded value?')) return;
    await fetch(`/api/admin/impact-metrics/values?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <PageHeader title="Impact Metrics" subtitle="Define impact metrics beyond CO₂ and record their values per plantation site">
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-[var(--admin-primary)] hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4"/> New Metric
        </button>
      </PageHeader>

      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="p-6 space-y-6">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : metrics.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
            No impact metrics defined yet. CO₂ is already shown automatically everywhere — use "New Metric" to add
            things like groundwater recharged, jobs created, or a biodiversity index. A metric only appears to
            donors once you've recorded at least one value for it.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(m => {
              const metricValues = values.filter(v => v.metricId === m.id);
              return (
                <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{m.icon}</span>
                    <div className="font-bold text-gray-900 text-sm">{m.name}</div>
                    {!m.active && <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inactive</span>}
                  </div>
                  <div className="text-gray-400 text-xs mb-2">{m.unit} · {m.calculationType === 'PER_TREE' ? 'Per tree' : 'Site proportional'}</div>
                  {m.description && <p className="text-gray-500 text-xs mb-3">{m.description}</p>}

                  <div className="text-xs text-gray-500 mb-3">
                    {metricValues.length === 0
                      ? <span className="text-amber-600">No values recorded yet — hidden from donors</span>
                      : `${metricValues.length} value${metricValues.length===1?'':'s'} recorded`}
                  </div>

                  {metricValues.length > 0 && (
                    <div className="space-y-1 mb-3 max-h-28 overflow-y-auto">
                      {metricValues.map(v => (
                        <div key={v.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                          <span className="text-gray-600">{v.site?.siteName || '—'}: <strong>{v.value.toLocaleString('en-IN')}</strong>{v.period ? ` (${v.period})` : ''}</span>
                          <button onClick={() => handleDeleteValue(v.id)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button onClick={() => openRecord(m)} className="flex-1 text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-1.5">
                      Record Value
                    </button>
                    <button onClick={() => setEditing(m)} className="flex-1 text-xs font-semibold border border-gray-200 hover:border-[var(--admin-primary)] rounded-lg py-1.5">
                      Edit
                    </button>
                    <button onClick={() => handleToggleActive(m)} className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5">
                      {m.active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => handleDeleteMetric(m)} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/Create metric modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editing.id ? 'Edit Metric' : 'New Impact Metric'}</h2>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Metric Name *</label>
                <input value={editing.name} onChange={e => setEditing((p: any) => ({ ...p, name: e.target.value }))} className={inp} placeholder="e.g. Groundwater Recharged"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
                  <input value={editing.unit} onChange={e => setEditing((p: any) => ({ ...p, unit: e.target.value }))} className={inp} placeholder="e.g. litres/year"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icon (emoji)</label>
                  <input value={editing.icon} onChange={e => setEditing((p: any) => ({ ...p, icon: e.target.value }))} className={inp} placeholder="💧"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={editing.description || ''} onChange={e => setEditing((p: any) => ({ ...p, description: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                <input type="color" value={editing.color} onChange={e => setEditing((p: any) => ({ ...p, color: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">How should a donor's share be calculated?</label>
                <select value={editing.calculationType} onChange={e => setEditing((p: any) => ({ ...p, calculationType: e.target.value }))} className={inp}>
                  <option value="SITE_PROPORTIONAL">Site proportional — value is recorded per site; each donor gets a share based on their trees at that site (e.g. groundwater recharged)</option>
                  <option value="PER_TREE">Per tree — value is a flat rate multiplied by each donor's tree count (e.g. CO₂)</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={handleSaveMetric} className="px-5 py-2 text-sm font-semibold bg-[var(--admin-primary)] hover:opacity-90 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Record value modal */}
      {recording && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Record: {recording.name}</h2>
              <button onClick={() => setRecording(null)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plantation Site *</label>
                <select value={valueForm.siteId} onChange={e => setValueForm(p => ({ ...p, siteId: e.target.value }))} className={inp}>
                  <option value="">Select a site…</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Value ({recording.unit}) *</label>
                <input type="number" value={valueForm.value} onChange={e => setValueForm(p => ({ ...p, value: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Period (optional)</label>
                <input value={valueForm.period} onChange={e => setValueForm(p => ({ ...p, period: e.target.value }))} className={inp} placeholder="e.g. 2026 or Q1 2026"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea rows={2} value={valueForm.notes} onChange={e => setValueForm(p => ({ ...p, notes: e.target.value }))} className={inp}/>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setRecording(null)} className="px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={handleRecordValue} className="px-5 py-2 text-sm font-semibold bg-[var(--admin-primary)] hover:opacity-90 text-white rounded-lg">Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
