'use client';
import { useState, useEffect } from 'react';
import { withSuperAdmin } from '@/components/superadmin/withSuperAdmin';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

const inp = "w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-gray-600";
const PLANS = ['STARTER', 'PRO', 'ENTERPRISE'];

function EditOrgPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [org, setOrg]         = useState<any>(null);
  const [form, setForm]       = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [error, setError]     = useState('');

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  useEffect(() => {
    fetch(`/api/superadmin/orgs/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.org) {
          setOrg(d.org);
          setForm({
            name:                d.org.name               || '',
            email:               d.org.email              || '',
            phone:               d.org.phone              || '',
            website:             d.org.website            || '',
            address:             d.org.address            || '',
            primary_color:       d.org.primary_color      || '#2d5a1b',
            farmer_id_prefix:    d.org.farmer_id_prefix   || '',
            donation_ref_prefix: d.org.donation_ref_prefix|| '',
            tree_price:          String(d.org.tree_price  || 500),
            org_80g_number:      d.org.org_80g_number     || '',
            custom_domain:       d.org.custom_domain      || '',
            plan:                d.org.plan               || 'STARTER',
            active:              d.org.active             ?? true,
          });
        } else {
          setError('Organisation not found');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [params.id]);

  async function handleSave() {
    setSaving(true); setError('');
    const res  = await fetch(`/api/superadmin/orgs/${params.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, tree_price: parseInt(form.tree_price) }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) showToast('Saved successfully ✓');
    else setError(data.error || 'Failed to save');
  }

  async function handleDeactivate() {
    if (params.id === 'org_jito_mumbai') { setError('Cannot deactivate primary organisation'); return; }
    if (!confirm(`${form.active ? 'Deactivate' : 'Activate'} ${org?.name}?`)) return;
    const res  = await fetch(`/api/superadmin/orgs/${params.id}`, {
      method:  form.active ? 'DELETE' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: !form.active }),
    });
    const data = await res.json();
    if (data.success) {
      setForm((p: any) => ({ ...p, active: !p.active }));
      showToast(`Organisation ${form.active ? 'deactivated' : 'activated'} ✓`);
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sadmin/orgs')}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4"/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{org?.name}</h1>
            <p className="text-gray-500 text-xs font-mono">{org?.slug} · {org?.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDeactivate}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
              form.active
                ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}>
            <Trash2 className="w-3.5 h-3.5"/>
            {form.active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-60">
            <Save className="w-3.5 h-3.5"/>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0"/> {error}
        </div>
      )}

      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-6 ${
        form.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${form.active ? 'bg-emerald-400' : 'bg-rose-400'}`}/>
        {form.active ? 'Active' : 'Inactive'}
      </div>

      <div className="space-y-5">
        {/* Identity */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3">Organisation Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Organisation Name</label>
              <input value={form.name} onChange={f('name')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={f('email')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone</label>
              <input value={form.phone} onChange={f('phone')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Website</label>
              <input value={form.website} onChange={f('website')} className={inp} placeholder="https://"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Custom Domain</label>
              <input value={form.custom_domain} onChange={f('custom_domain')} className={inp} placeholder="trees.org.com"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Address</label>
              <input value={form.address} onChange={f('address')} className={inp}/>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3">Branding & Plan</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.primary_color} onChange={f('primary_color')}
                  className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 p-0.5"/>
                <input value={form.primary_color} onChange={f('primary_color')} className={inp}/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Plan</label>
              <select value={form.plan} onChange={f('plan')} className={inp}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Platform config */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3">Platform Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Farmer ID Prefix <span className="text-gray-600">e.g. JGL, ROT</span>
              </label>
              <input value={form.farmer_id_prefix} onChange={f('farmer_id_prefix')} className={inp} placeholder="JGL"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Donation Ref Prefix <span className="text-gray-600">e.g. JITO, ROTARY</span>
              </label>
              <input value={form.donation_ref_prefix} onChange={f('donation_ref_prefix')} className={inp} placeholder="JITO"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Tree Price (₹)</label>
              <input type="number" value={form.tree_price} onChange={f('tree_price')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">80G Registration Number</label>
              <input value={form.org_80g_number} onChange={f('org_80g_number')} className={inp}/>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3 mb-4">Branding Preview</h2>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-700"
            style={{ borderColor: form.primary_color + '40' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: form.primary_color }}>
              {form.name?.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-white text-sm">{form.name || 'Organisation Name'}</div>
              <div className="text-gray-400 text-xs">{form.email || 'email@org.com'}</div>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ backgroundColor: form.primary_color + '20', color: form.primary_color }}>
                {form.plan}
              </span>
            </div>
          </div>
        </div>

        {/* Save button at bottom too */}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4"/>
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}

export default withSuperAdmin(EditOrgPage);
