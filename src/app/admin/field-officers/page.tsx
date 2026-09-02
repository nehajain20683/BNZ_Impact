'use client';
// src/app/admin/field-officers/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/admin/PageHeader';
import { Plus, X, Users, Power, KeyRound, BarChart2 } from 'lucide-react';

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40";

export default function FieldOfficersPage() {
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [toast, setToast]       = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/field-officers');
    const data = await res.json();
    setOfficers(data.officers || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(o: any) {
    const res = await fetch(`/api/admin/field-officers/${o.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !o.active }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to update'); return; }
    showToast(o.active ? 'Officer deactivated' : 'Officer activated ✓');
    load();
  }

  return (
    <div>
      <PageHeader title="Field Officers" subtitle="Manage accounts for staff who inspect land and capture plantation evidence">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[var(--admin-primary)] hover:opacity-90 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4"/> Add Field Officer
        </button>
      </PageHeader>

      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="p-6">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : officers.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
            <p className="text-gray-400 text-sm">No field officers yet — add your first one above.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>{['Name','Contact','Employee ID','District','Farmers Assigned','Last Login','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {officers.map((o: any) => (
                  <tr key={o.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{o.name}<div className="text-gray-400 text-xs">{o.designation || '—'}</div></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{o.email}<div>{o.mobile}</div></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{o.employeeId || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{o.district || '—'}{o.state ? `, ${o.state}` : ''}</td>
                    <td className="px-4 py-3 text-gray-700">{o._count?.farmers || 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {o.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs">
                        <Link href={`/admin/field-officers/${o.id}`} className="flex items-center gap-1 text-teal-600 hover:underline font-medium">
                          <BarChart2 className="w-3 h-3"/> View Metrics
                        </Link>
                        <button onClick={() => setResetTarget(o)} className="flex items-center gap-1 text-[var(--admin-primary)] hover:underline font-medium">
                          <KeyRound className="w-3 h-3"/> Reset Password
                        </button>
                        <button onClick={() => toggleActive(o)} className="flex items-center gap-1 text-gray-500 hover:underline font-medium">
                          <Power className="w-3 h-3"/> {o.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddOfficerModal onClose={() => setShowAdd(false)} onSaved={() => { load(); showToast('Field officer added ✓'); }}/>}
      {resetTarget && <ResetPasswordModal officer={resetTarget} onClose={() => setResetTarget(null)} onSaved={() => { setResetTarget(null); showToast('Password reset ✓'); }}/>}
    </div>
  );
}

function AddOfficerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name:'', email:'', mobile:'', password:'', employeeId:'', designation:'', district:'', state:'' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name || !form.email || !form.mobile || !form.password) { setError('Name, email, mobile and password are required'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/admin/field-officers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Failed to save'); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900">Add Field Officer</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-2.5">{error}</div>}
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className={inp}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
              <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className={inp}/></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Mobile *</label>
              <input value={form.mobile} onChange={e => setForm(p => ({...p, mobile: e.target.value}))} className={inp}/></div>
          </div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Password * <span className="text-gray-400">(min 6 characters)</span></label>
            <input type="text" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} className={inp}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Employee ID</label>
              <input value={form.employeeId} onChange={e => setForm(p => ({...p, employeeId: e.target.value}))} className={inp}/></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Designation</label>
              <input value={form.designation} onChange={e => setForm(p => ({...p, designation: e.target.value}))} className={inp}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 block mb-1">District</label>
              <input value={form.district} onChange={e => setForm(p => ({...p, district: e.target.value}))} className={inp}/></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">State</label>
              <input value={form.state} onChange={e => setForm(p => ({...p, state: e.target.value}))} className={inp}/></div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-[var(--admin-primary)] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {saving ? 'Saving…' : 'Add Officer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ officer, onClose, onSaved }: { officer: any; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSaving(true); setError('');
    const res = await fetch(`/api/admin/field-officers/${officer.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Failed to reset'); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-gray-900">Reset Password — {officer.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-2.5 mb-3">{error}</div>}
        <label className="text-xs font-medium text-gray-600 block mb-1">New Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} className={`${inp} mb-4`}/>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-[var(--admin-primary)] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {saving ? 'Saving…' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
}
