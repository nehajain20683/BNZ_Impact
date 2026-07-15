'use client';
// src/app/superadmin/page.tsx — Superadmin dashboard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Plus, Users, TreePine, DollarSign, Globe,
  Settings, CheckCircle, XCircle, ExternalLink, Shield, X
} from 'lucide-react';

const PLANS = ['STARTER', 'PRO', 'ENTERPRISE'];
const PLAN_COLOR: Record<string, string> = {
  STARTER:    'bg-gray-100 text-gray-600',
  PRO:        'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

const EMPTY_FORM = {
  name:'', slug:'', email:'', phone:'', website:'', address:'',
  primaryColor:'#2d5a1b', farmerIdPrefix:'', donationRefPrefix:'',
  treePrice:'500', org80gNumber:'', customDomain:'', plan:'STARTER',
};

function CreateOrgModal({ onClose, onSave }: any) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Auto-generate prefix from slug
  function handleSlugChange(val: string) {
    const slug = val.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setForm(p => ({
      ...p,
      slug,
      farmerIdPrefix:    p.farmerIdPrefix    || slug.toUpperCase().slice(0, 4),
      donationRefPrefix: p.donationRefPrefix || slug.toUpperCase().slice(0, 6),
    }));
  }

  async function handleSave() {
    if (!form.name || !form.slug) { setError('Name and slug are required'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/superadmin/orgs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave(data.org);
    else setError(data.error || 'Failed to create');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl my-4">
        <div className="bg-indigo-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="font-bold text-lg">Create New Organization</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-indigo-300 hover:text-white"/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Organisation Name *</label>
              <input value={form.name} onChange={f('name')} className={inp}
                placeholder="e.g. Rotary Club Mumbai North"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Slug * <span className="font-normal text-gray-400">(used in URL)</span>
              </label>
              <input value={form.slug} onChange={e => handleSlugChange(e.target.value)}
                className={inp} placeholder="rotary-mumbai-north"/>
              {form.slug && (
                <p className="text-xs text-indigo-500 mt-1">
                  URL: {form.slug}.bnzgreen.io
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Plan</label>
              <select value={form.plan} onChange={f('plan')} className={inp}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
              <input type="email" value={form.email} onChange={f('email')} className={inp}
                placeholder="contact@rotarymumbai.org"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Phone</label>
              <input value={form.phone} onChange={f('phone')} className={inp}
                placeholder="+91 98765 43210"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Website</label>
              <input value={form.website} onChange={f('website')} className={inp}
                placeholder="https://rotarymumbai.org"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Custom Domain</label>
              <input value={form.customDomain} onChange={f('customDomain')} className={inp}
                placeholder="trees.rotarymumbai.org"/>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">Branding & Configuration</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Primary Color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.primaryColor}
                    onChange={f('primaryColor')}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                  <input value={form.primaryColor} onChange={f('primaryColor')} className={inp}
                    placeholder="#2d5a1b"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Tree Price (₹)</label>
                <input type="number" value={form.treePrice} onChange={f('treePrice')} className={inp}
                  placeholder="500"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Farmer ID Prefix <span className="font-normal text-gray-400">e.g. ROT</span>
                </label>
                <input value={form.farmerIdPrefix} onChange={f('farmerIdPrefix')} className={inp}
                  placeholder="ROT"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Donation Ref Prefix <span className="font-normal text-gray-400">e.g. ROTARY</span>
                </label>
                <input value={form.donationRefPrefix} onChange={f('donationRefPrefix')} className={inp}
                  placeholder="ROTARY"/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">80G Registration Number</label>
                <input value={form.org80gNumber} onChange={f('org80gNumber')} className={inp}
                  placeholder="AABCT3518Q20231"/>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Creating…' : '✓ Create Organisation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditOrgModal({ org, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name:               org.name               || '',
    primary_color:      org.primary_color       || '#2d5a1b',
    email:              org.email               || '',
    phone:              org.phone               || '',
    website:            org.website             || '',
    farmer_id_prefix:   org.farmer_id_prefix    || '',
    donation_ref_prefix:org.donation_ref_prefix || '',
    tree_price:         String(org.tree_price   || 500),
    org_80g_number:     org.org_80g_number      || '',
    custom_domain:      org.custom_domain       || '',
    plan:               org.plan                || 'STARTER',
    active:             org.active              ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSave() {
    setLoading(true); setError('');
    const res  = await fetch(`/api/superadmin/orgs/${org.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tree_price: parseInt(form.tree_price) }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave();
    else setError(data.error || 'Failed');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-4">
        <div className="bg-gray-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="font-bold">Edit — {org.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white"/></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200">{error}</div>}
          {[
            { k:'name',               l:'Organisation Name',   t:'text' },
            { k:'email',              l:'Email',               t:'email' },
            { k:'phone',              l:'Phone',               t:'tel' },
            { k:'website',            l:'Website',             t:'url' },
            { k:'custom_domain',      l:'Custom Domain',       t:'text' },
            { k:'farmer_id_prefix',   l:'Farmer ID Prefix',    t:'text' },
            { k:'donation_ref_prefix',l:'Donation Ref Prefix', t:'text' },
            { k:'tree_price',         l:'Tree Price (₹)',       t:'number' },
            { k:'org_80g_number',     l:'80G Registration No.',t:'text' },
          ].map(field => (
            <div key={field.k}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{field.l}</label>
              <input type={field.t} value={(form as any)[field.k]}
                onChange={f(field.k)} className={inp}/>
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input type="color" value={form.primary_color} onChange={f('primary_color')}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
              <input value={form.primary_color} onChange={f('primary_color')} className={inp}/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Plan</label>
            <select value={form.plan} onChange={f('plan')} className={inp}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
              className="w-4 h-4 accent-indigo-600"/>
            <label className="text-sm text-gray-700">Active (visible to users)</label>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Saving…' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperadminPage() {
  const router = useRouter();
  const [orgs, setOrgs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg]   = useState<any>(null);
  const [toast, setToast]       = useState('');
  const [error, setError]       = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res  = await fetch('/api/superadmin/orgs');
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setOrgs(data.orgs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(org: any) {
    if (org.id === 'org_jito_mumbai') { showToast('Cannot deactivate primary org'); return; }
    await fetch(`/api/superadmin/orgs/${org.id}`, {
      method: org.active ? 'DELETE' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !org.active }),
    });
    showToast(`${org.name} ${org.active ? 'deactivated' : 'activated'}`);
    load();
  }

  const totalDonations = orgs.reduce((s, o) => s + (o._counts?.donations || 0), 0);
  const totalFarmers   = orgs.reduce((s, o) => s + (o._counts?.farmers   || 0), 0);
  const totalSites     = orgs.reduce((s, o) => s + (o._counts?.sites     || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}
      {showCreate && (
        <CreateOrgModal
          onClose={() => setShowCreate(false)}
          onSave={(org: any) => { setShowCreate(false); showToast(`${org.name} created ✓`); load(); }}
        />
      )}
      {editOrg && (
        <EditOrgModal
          org={editOrg}
          onClose={() => setEditOrg(null)}
          onSave={() => { setEditOrg(null); showToast('Saved ✓'); load(); }}
        />
      )}

      {/* Header */}
      <div className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-300"/>
          <div>
            <div className="font-bold text-lg">Superadmin</div>
            <div className="text-indigo-400 text-xs">BNZ Green Technologies · SaaS Control Panel</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-indigo-400 hover:text-white text-sm">
            → JITO Admin
          </Link>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4"/> New Organisation
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Platform stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label:'Total Organisations', value: orgs.length,                  icon: Building2,  color:'text-indigo-600', bg:'bg-indigo-50' },
            { label:'Active Orgs',          value: orgs.filter(o=>o.active).length, icon: CheckCircle, color:'text-green-600',  bg:'bg-green-50' },
            { label:'Total Donations',       value: totalDonations,             icon: DollarSign, color:'text-emerald-600', bg:'bg-emerald-50' },
            { label:'Land Owners',           value: totalFarmers,               icon: Users,      color:'text-blue-600',   bg:'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-gray-200 p-5 shadow-sm`}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`}/>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-gray-600 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Org list */}
        {error === 'Unauthorized' ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-12 text-center">
            <Shield className="w-12 h-12 text-red-300 mx-auto mb-3"/>
            <p className="text-red-700 font-semibold">Access Denied</p>
            <p className="text-red-500 text-sm mt-1">You need SUPER_ADMIN role to access this page.</p>
            <p className="text-gray-400 text-xs mt-3">
              Run this in Supabase SQL Editor:<br/>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your@email.com';
              </code>
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">All Organisations</h2>
              <span className="text-gray-400 text-sm">{orgs.length} tenants</span>
            </div>
            {loading ? (
              <div className="py-16 text-center text-gray-400">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Organisation','Slug / Domain','Plan','Donations','Farmers','Sites','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(org => (
                    <tr key={org.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: org.primary_color || '#2d5a1b' }}>
                            {org.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{org.name}</div>
                            <div className="text-gray-400 text-xs">{org.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-500">{org.slug}</div>
                        {org.custom_domain && (
                          <div className="text-xs text-indigo-500 flex items-center gap-0.5 mt-0.5">
                            <Globe className="w-3 h-3"/> {org.custom_domain}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${PLAN_COLOR[org.plan] || PLAN_COLOR.STARTER}`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{org._counts?.donations || 0}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{org._counts?.farmers   || 0}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{org._counts?.sites     || 0}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(org)}
                          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                            org.active
                              ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                              : 'bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700'
                          }`}>
                          {org.active
                            ? <><CheckCircle className="w-3 h-3"/> Active</>
                            : <><XCircle className="w-3 h-3"/> Inactive</>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setEditOrg(org)}
                            className="flex items-center gap-1 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg">
                            <Settings className="w-3 h-3"/> Edit
                          </button>
                          {org.slug !== 'jito-mumbai' && (
                            <a href={`https://${org.slug}.bnzgreen.io`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 hover:bg-gray-100 px-2 py-1 rounded-lg">
                              <ExternalLink className="w-3 h-3"/> Visit
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700">
          <p className="font-semibold mb-1">How to grant SUPER_ADMIN access</p>
          <p className="text-xs text-indigo-600">Run in Supabase SQL Editor:</p>
          <code className="text-xs bg-white border border-indigo-200 block mt-2 p-2 rounded-lg font-mono">
            UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your@email.com';
          </code>
        </div>

      </div>
    </div>
  );
}
