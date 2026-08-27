'use client';
import { useState, useEffect } from 'react';
import { withSuperAdmin } from '@/components/superadmin/withSuperAdmin';
import { Plus, Settings, Globe, CheckCircle, XCircle, Search, X } from 'lucide-react';

const PLANS = ['STARTER','PRO','ENTERPRISE'];
const inp = "w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

function CreateModal({ onClose, onSave }: any) {
  const [form, setForm] = useState({
    name:'', slug:'', email:'', phone:'', primaryColor:'#2d5a1b',
    farmerIdPrefix:'', donationRefPrefix:'', treePrice:'500',
    org80gNumber:'', customDomain:'', plan:'STARTER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  function handleSlug(val: string) {
    const slug = val.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setForm(p => ({
      ...p, slug,
      farmerIdPrefix:    p.farmerIdPrefix    || slug.toUpperCase().slice(0,4),
      donationRefPrefix: p.donationRefPrefix || slug.toUpperCase().slice(0,6),
    }));
  }

  async function save() {
    if (!form.name || !form.slug) { setError('Name and slug required'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/superadmin/orgs', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave();
    else setError(data.error || 'Failed');
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-xl w-full shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-bold text-white">Create New Organisation</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-400 mb-1">Organisation Name *</label>
              <input value={form.name} onChange={f('name')} className={inp} placeholder="Rotary Club Mumbai"/></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Slug *</label>
              <input value={form.slug} onChange={e => handleSlug(e.target.value)} className={inp} placeholder="rotary-mumbai"/>
              {form.slug && <p className="text-xs text-emerald-500 mt-1">{form.slug}.bnzgreen.io</p>}</div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Plan</label>
              <select value={form.plan} onChange={f('plan')} className={inp}>
                {PLANS.map(p=><option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={f('email')} className={inp}/></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
              <input value={form.phone} onChange={f('phone')} className={inp}/></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.primaryColor} onChange={f('primaryColor')} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 p-0.5"/>
                <input value={form.primaryColor} onChange={f('primaryColor')} className={inp}/>
              </div></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Tree Price (₹)</label>
              <input type="number" value={form.treePrice} onChange={f('treePrice')} className={inp}/></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Farmer ID Prefix</label>
              <input value={form.farmerIdPrefix} onChange={f('farmerIdPrefix')} className={inp} placeholder="ROT"/></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Donation Ref Prefix</label>
              <input value={form.donationRefPrefix} onChange={f('donationRefPrefix')} className={inp} placeholder="ROTARY"/></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">Custom Domain</label>
              <input value={form.customDomain} onChange={f('customDomain')} className={inp} placeholder="trees.rotary.org"/></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1">80G Number</label>
              <input value={form.org80gNumber} onChange={f('org80gNumber')} className={inp}/></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-800">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Creating…' : '✓ Create Organisation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrgsPage() {
  const [orgs, setOrgs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]       = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res  = await fetch('/api/superadmin/orgs');
    const data = await res.json();
    setOrgs(data.orgs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(org: any) {
    if (org.slug === 'bnz-green' && org.active) { showToast('Cannot deactivate primary org'); return; }
    await fetch(`/api/superadmin/orgs/${org.id}`, {
      method: 'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ active: !org.active }),
    });
    showToast(`${org.name} ${org.active ? 'deactivated' : 'activated'}`); load();
  }

  const filtered = orgs.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const PLAN_COLOR: Record<string,string> = {
    STARTER:'text-gray-400 bg-gray-800 border-gray-700',
    PRO:'text-blue-400 bg-blue-500/10 border-blue-500/20',
    ENTERPRISE:'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm">✓ {toast}</div>
      )}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); showToast('Organisation created'); load(); }}/>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Organisations</h1>
          <p className="text-gray-400 text-sm">{orgs.length} tenants registered</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4"/> New Organisation
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organisations…"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"/>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/60">
            <tr>{['Organisation','Plan','Donations','Farmers','Sites','Color','Status','Actions'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading…</td></tr>
            ) : filtered.map(org => (
              <tr key={org.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: org.primary_color || '#2d5a1b' }}>
                      {org.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-100 text-xs">{org.name}</div>
                      <div className="text-gray-500 text-[10px] font-mono">{org.slug}</div>
                      {org.custom_domain && (
                        <a href={`https://${org.custom_domain}`} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5">
                          <Globe className="w-2.5 h-2.5"/> {org.custom_domain}
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_COLOR[org.plan]||PLAN_COLOR.STARTER}`}>{org.plan}</span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs font-semibold">{org._counts?.donations||0}</td>
                <td className="px-4 py-3 text-gray-300 text-xs font-semibold">{org._counts?.farmers  ||0}</td>
                <td className="px-4 py-3 text-gray-300 text-xs font-semibold">{org._counts?.sites    ||0}</td>
                <td className="px-4 py-3">
                  <div className="w-5 h-5 rounded-md border border-gray-600" style={{ backgroundColor: org.primary_color || '#2d5a1b' }}/>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(org)}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${
                      org.active ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    }`}>
                    {org.active ? <><CheckCircle className="w-3 h-3"/>Active</> : <><XCircle className="w-3 h-3"/>Inactive</>}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <a href={`/sadmin/orgs/${org.id}`}
                    className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded-lg hover:bg-emerald-500/20">
                    <Settings className="w-3 h-3"/> Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default withSuperAdmin(OrgsPage);
