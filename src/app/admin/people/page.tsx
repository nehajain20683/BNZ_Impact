'use client';
// src/app/admin/people/page.tsx
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, TreePine, Search, Plus, Filter, Download,
  ChevronLeft, Edit, Trash2, Eye, RefreshCw, Lock,
  Unlock, UserCheck, UserX, Shield, MoreVertical, X,
  CheckCircle, Clock, AlertCircle, XCircle
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────
type Tab = 'farmers' | 'users';

const FARMER_STATUS_COLORS: Record<string, string> = {
  REGISTERED:           'bg-blue-100 text-blue-700',
  DOCUMENTS_PENDING:    'bg-amber-100 text-amber-700',
  DOCUMENTS_VERIFIED:   'bg-teal-100 text-teal-700',
  INSPECTION_PENDING:   'bg-orange-100 text-orange-700',
  INSPECTION_COMPLETED: 'bg-cyan-100 text-cyan-700',
  APPROVED:             'bg-green-100 text-green-700',
  ACTIVE:               'bg-emerald-100 text-emerald-700',
  SUSPENDED:            'bg-red-100 text-red-700',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:     'bg-purple-100 text-purple-700',
  ADMIN:           'bg-indigo-100 text-indigo-700',
  FIELD_OFFICER:   'bg-blue-100 text-blue-700',
  PROJECT_MANAGER: 'bg-teal-100 text-teal-700',
  DATA_ENTRY:      'bg-gray-100 text-gray-700',
  AUDITOR:         'bg-amber-100 text-amber-700',
  DONOR:           'bg-green-100 text-green-700',
};

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40";

// ── Modals ───────────────────────────────────────────────
function DeleteModal({ type, name, onConfirm, onClose }: any) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600"/>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Delete {type === 'farmer' ? 'Farmer' : 'User'}</h3>
            <p className="text-gray-500 text-sm">{name}</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          {type === 'user'
            ? 'Deleting a user will revoke access to the platform. Continue?'
            : 'Are you sure you want to delete this farmer? This action can be reversed by an admin.'}
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for deletion" className={inputCls}/>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onSave }: any) {
  const [form, setForm] = useState({ name:'', email:'', mobile:'', password:'', role:'DONOR' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [strength, setStrength] = useState(0);

  function calcStrength(pw: string) {
    let s = 0;
    if (pw.length >= 8)      s++;
    if (/[A-Z]/.test(pw))    s++;
    if (/[a-z]/.test(pw))    s++;
    if (/\d/.test(pw))       s++;
    if (/[@$!%*?&]/.test(pw))s++;
    return s;
  }

  async function handleSave() {
    setLoading(true); setError('');
    const res  = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave();
    else setError(data.error || 'Failed to create user');
  }

  // SUPER_ADMIN is intentionally excluded — it is a single, fixed identity
  // (sadmin@bnzgreen.io) and can never be assigned from tenant user management.
  const ROLES = ['DONOR','ADMIN','FIELD_OFFICER','DATA_ENTRY','PROJECT_MANAGER','AUDITOR'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Add New User</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>}
        <div className="space-y-3">
          {[
            { key:'name',   label:'Full Name *',    type:'text',     ph:'Full name' },
            { key:'email',  label:'Email *',        type:'email',    ph:'email@example.com' },
            { key:'mobile', label:'Mobile',         type:'tel',      ph:'+91 98765 43210' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type={f.type} placeholder={f.ph} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} className={inputCls}/>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" placeholder="Min 8 chars, uppercase, number, special"
              value={form.password}
              onChange={e => { setForm(p=>({...p,password:e.target.value})); setStrength(calcStrength(e.target.value)); }}
              className={inputCls}/>
            {form.password && (
              <div className="mt-1.5 flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= strength
                    ? strength <= 2 ? 'bg-red-400' : strength <= 3 ? 'bg-amber-400' : 'bg-green-500'
                    : 'bg-gray-200'}`}/>
                ))}
                <span className="text-xs text-gray-400 ml-1">
                  {strength <= 2 ? 'Weak' : strength <= 3 ? 'Fair' : 'Strong'}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))} className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={loading || !form.name || !form.email || !form.password}
            className="flex-1 bg-[var(--admin-primary)] hover:opacity-90 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60">
            {loading ? 'Saving...' : 'Save User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onSave }: any) {
  const [pw, setPw]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleReset() {
    setLoading(true); setError('');
    const res  = await fetch('/api/admin/users', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, action: 'reset_password', newPassword: pw }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave();
    else setError(data.error || 'Failed');
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
        <h3 className="font-bold text-gray-900 mb-1">Reset Password</h3>
        <p className="text-gray-500 text-sm mb-4">{user.name} · {user.email}</p>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">{error}</div>}
        <input type="password" placeholder="New password" value={pw}
          onChange={e => setPw(e.target.value)} className={inputCls + " mb-4"}/>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl">Cancel</button>
          <button onClick={handleReset} disabled={loading || !pw}
            className="flex-1 bg-[var(--admin-primary)] text-white font-semibold py-2.5 rounded-xl disabled:opacity-60">
            {loading ? 'Resetting...' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
export default function PeopleManagementPage() {
  const [tab, setTab]           = useState<Tab>('farmers');
  const [farmers, setFarmers]   = useState<any[]>([]);
  const [users, setUsers]       = useState<any[]>([]);
  const [stats, setStats]       = useState<any>({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [toast, setToast]       = useState('');

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [showAddUser, setShowAddUser]   = useState(false);
  const [resetUser, setResetUser]       = useState<any>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === 'farmers') {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/admin/farmers?${params}`);
      const d   = await res.json();
      setFarmers(d.farmers || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } else {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/admin/users?${params}`);
      const d   = await res.json();
      setUsers(d.users || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    }
    setLoading(false);
  }, [tab, search, filter, page]);

  useEffect(() => { load(); }, [load]);

  // Load stats
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/farmers?page=1').then(r=>r.json()),
      fetch('/api/admin/users?page=1').then(r=>r.json()),
    ]).then(([f, u]) => setStats({
      totalFarmers: f.total || 0,
      totalUsers:   u.total || 0,
    })).catch(() => {});
  }, []);

  async function handleDelete(reason: string) {
    if (!deleteTarget) return;
    const endpoint = deleteTarget.type === 'farmer' ? '/api/admin/farmers' : '/api/admin/users';
    const idKey    = deleteTarget.type === 'farmer' ? 'farmerId' : 'userId';
    await fetch(endpoint, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [idKey]: deleteTarget.id, reason }),
    });
    setDeleteTarget(null);
    showToast(`${deleteTarget.type === 'farmer' ? 'Farmer' : 'User'} deleted`);
    load();
  }

  async function handleFarmerStatus(farmerId: string, status: string) {
    await fetch('/api/admin/farmers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, status }),
    });
    showToast('Status updated');
    load();
  }

  async function handleUserAction(userId: string, action: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    showToast('Updated');
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-[var(--admin-primary)] text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      {/* Modals */}
      {deleteTarget && (
        <DeleteModal type={deleteTarget.type} name={deleteTarget.name}
          onConfirm={handleDelete} onClose={() => setDeleteTarget(null)}/>
      )}
      {showAddUser && (
        <AddUserModal onClose={() => setShowAddUser(false)} onSave={() => { setShowAddUser(false); showToast('User created'); load(); }}/>
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)}
          onSave={() => { setResetUser(null); showToast('Password reset'); }}/>
      )}

      {/* Header */}
      <div className="bg-[var(--admin-primary)] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-white/50 hover:text-white"><ChevronLeft className="w-5 h-5"/></Link>
          <span className="font-display text-lg">People Management</span>
        </div>
        <Link href="/admin/logs" className="text-white/50 hover:text-white text-sm">Activity Logs →</Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: TreePine, label:'Total Farmers', value: stats.totalFarmers || 0, color:'bg-green-50 text-green-700' },
            { icon: Users,    label:'Total Users',   value: stats.totalUsers   || 0, color:'bg-blue-50 text-blue-700'  },
            { icon: CheckCircle, label:'Active Users', value:'—', color:'bg-emerald-50 text-emerald-700' },
            { icon: Shield,   label:'Admins',        value:'—', color:'bg-purple-50 text-purple-700'   },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 border border-current/10`}>
              <s.icon className="w-5 h-5 mb-2 opacity-70"/>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs mt-0.5 opacity-70">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div className="flex gap-2 mb-5">
          {(['farmers','users'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); setFilter(''); setPage(1); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                tab === t ? 'bg-[var(--admin-primary)] text-white shadow-sm' : 'bg-white border border-[var(--admin-primary)]/25 text-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/10'
              }`}>
              {t === 'farmers' ? <TreePine className="w-4 h-4"/> : <Users className="w-4 h-4"/>}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Search + filter + actions */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input
              type="text" placeholder={`Search ${tab}...`}
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40"
            />
          </div>
          <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none min-w-[140px]">
            <option value="">All Status</option>
            {tab === 'farmers' ? (
              <>
                <option value="REGISTERED">Registered</option>
                <option value="DOCUMENTS_PENDING">Documents Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </>
            ) : (
              <>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="locked">Locked</option>
              </>
            )}
          </select>
          {tab === 'users' && (
            <button onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 bg-[var(--admin-primary)] hover:opacity-90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">
              <Plus className="w-4 h-4"/> Add User
            </button>
          )}
          {tab === 'farmers' && (
            <Link href="/farmer/register"
              className="flex items-center gap-2 bg-[var(--admin-primary)] hover:opacity-90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">
              <Plus className="w-4 h-4"/> Add Farmer
            </Link>
          )}
          <a href={`/api/admin/export-csv?type=${tab}`}
            className="flex items-center gap-2 border border-[var(--admin-primary)]/40 text-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/10 font-semibold px-4 py-2.5 rounded-xl text-sm">
            <Download className="w-4 h-4"/> Export
          </a>
          <button onClick={load} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500"/>
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : tab === 'farmers' ? (
              /* ── FARMERS TABLE ── */
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Farmer','Mobile','Village','Land Area','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {farmers.map(f => (
                    <tr key={f.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{f.fullName}</div>
                        <div className="text-gray-400 text-xs font-mono">{f.id.slice(0,8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{f.mobile}</td>
                      <td className="px-4 py-3 text-gray-600">{f.village || f.district || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.lands?.reduce((s: number, l: any) => s + (l.areaAcres||0), 0).toFixed(1)} ac
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${FARMER_STATUS_COLORS[f.status] || 'bg-gray-100 text-gray-700'}`}>
                          {f.status?.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/farmers/${f.id}`}
                            className="p-1.5 rounded-lg hover:bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] transition-colors" title="View">
                            <Eye className="w-4 h-4"/>
                          </Link>
                          <select
                            value={f.status}
                            onChange={e => handleFarmerStatus(f.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                            title="Change status">
                            {['REGISTERED','DOCUMENTS_PENDING','DOCUMENTS_VERIFIED','INSPECTION_PENDING','INSPECTION_COMPLETED','APPROVED','ACTIVE','SUSPENDED'].map(s => (
                              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setDeleteTarget({ type:'farmer', id:f.id, name:f.fullName })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {farmers.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No farmers found</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* ── USERS TABLE ── */
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['User','Email','Mobile','Role','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.name || '—'}</div>
                        <div className="text-gray-400 text-xs font-mono">{u.id.slice(0,8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.mobile || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                          {u.role?.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            u.isLocked   ? 'bg-red-100 text-red-700'    :
                            u.isActive   ? 'bg-green-100 text-green-700' :
                                           'bg-gray-100 text-gray-500'
                          }`}>
                            {u.isLocked ? '🔒 Locked' : u.isActive ? '● Active' : '○ Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleUserAction(u.id, 'toggle_active')}
                            className={`p-1.5 rounded-lg transition-colors ${u.isActive ? 'hover:bg-orange-50 text-orange-500' : 'hover:bg-green-50 text-green-600'}`}
                            title={u.isActive ? 'Deactivate' : 'Activate'}>
                            {u.isActive ? <UserX className="w-4 h-4"/> : <UserCheck className="w-4 h-4"/>}
                          </button>
                          <button onClick={() => handleUserAction(u.id, 'toggle_lock')}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                            title={u.isLocked ? 'Unlock' : 'Lock'}>
                            {u.isLocked ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                          </button>
                          <button onClick={() => setResetUser(u)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Reset Password">
                            <RefreshCw className="w-4 h-4"/>
                          </button>
                          <button onClick={() => setDeleteTarget({ type:'user', id:u.id, name:`${u.name} (${u.email})` })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">{total} total records</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
