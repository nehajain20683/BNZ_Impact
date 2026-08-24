'use client';
// src/app/admin/users/page.tsx
// User management for tenant admins
// ADMIN sees only their org's users
// SUPER_ADMIN sees users of the currently selected org
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, X, Shield, User,
  Edit2, Trash2, CheckCircle, Mail, Phone,
  Copy, Eye, EyeOff
} from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

// SUPER_ADMIN is intentionally excluded — it is a single, fixed identity
// (sadmin@bnzgreen.io) and can never be assigned from tenant user management.
const ROLES = ['DONOR', 'ADMIN'];
const ROLE_COLOR: Record<string,string> = {
  DONOR:       'bg-gray-100 text-gray-600',
  ADMIN:       'bg-blue-100 text-blue-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
};

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40";

function InviteModal({ onClose, onSave }: any) {
  const [form, setForm] = useState({ name:'', email:'', mobile:'', role:'DONOR', password:'' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [created, setCreated]   = useState<any>(null);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!form.name || !form.email) { setError('Name and email required'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/admin/users', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) { setCreated(data); }
    else setError(data.error || 'Failed');
  }

  if (created) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
        <div className="text-center mb-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2"/>
          <h3 className="font-bold text-gray-900 text-lg">User Created!</h3>
          <p className="text-gray-500 text-sm">{created.user.name} can now log in</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-semibold">{created.user.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Temp Password</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[var(--admin-primary)]">{created.tempPassword}</span>
              <button onClick={() => navigator.clipboard.writeText(created.tempPassword)}
                className="text-gray-400 hover:text-gray-600">
                <Copy className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLOR[created.user.role]}`}>
              {created.user.role}
            </span>
          </div>
        </div>
        <p className="text-amber-600 text-xs text-center mb-4">
          ⚠️ Share these credentials with the user. Password should be changed on first login.
        </p>
        <button onClick={() => { onSave(); onClose(); }}
          className="w-full bg-[var(--admin-primary)] text-white font-bold py-2.5 rounded-xl text-sm">
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="bg-[var(--admin-primary)] text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="font-bold">Add New User</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white/50 hover:text-white"/></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
            <input value={form.name} onChange={f('name')} className={inp} placeholder="John Doe"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
            <input type="email" value={form.email} onChange={f('email')} className={inp} placeholder="john@org.com"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
            <input value={form.mobile} onChange={f('mobile')} className={inp} placeholder="+91 98765 43210"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
            <select value={form.role} onChange={f('role')} className={inp}>
              <option value="DONOR">DONOR — Can donate and view dashboard</option>
              <option value="ADMIN">ADMIN — Full admin panel access</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Password <span className="font-normal text-gray-400">(leave blank for Welcome@123)</span>
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={f('password')} className={inp + ' pr-10'} placeholder="Welcome@123"/>
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[var(--admin-primary)] hover:opacity-90 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Creating…' : '+ Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRoleModal({ user, onClose, onSave }: any) {
  const [role, setRole]     = useState(user.role);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res  = await fetch('/api/admin/users', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: user.id, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-5">
        <h3 className="font-bold text-gray-900 mb-1">Change Role</h3>
        <p className="text-gray-500 text-sm mb-4">{user.name} · {user.email}</p>
        <select value={role} onChange={e => setRole(e.target.value)} className={inp + ' mb-4'}>
          <option value="DONOR">DONOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[var(--admin-primary)] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router   = useRouter();
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser]   = useState<any>(null);
  const [toast, setToast]         = useState('');
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!['ADMIN','SUPER_ADMIN'].includes(role)) { router.push('/'); return; }
    load();
  }, [status, role]);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res  = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  async function removeUser(user: any) {
    if (!confirm(`Remove ${user.name} from this organisation?`)) return;
    const res  = await fetch('/api/admin/users', {
      method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    if (data.success) { showToast(`${user.name} removed`); load(); }
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleCount = (r: string) => users.filter(u => u.role === r).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--admin-primary)] text-white px-5 py-3 rounded-xl shadow-lg text-sm">✓ {toast}</div>
      )}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSave={() => { load(); showToast('User created ✓'); }}/>}
      {editUser  && <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onSave={() => { setEditUser(null); load(); showToast('Role updated ✓'); }}/>}

      <PageHeader title="User Management" subtitle={`${users.length} users in this organisation`}>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-[var(--admin-primary)] hover:opacity-90 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4"/> Add User
        </button>
      </PageHeader>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label:'Total Users', value: users.length,          icon: Users,  color:'text-blue-600',   bg:'bg-blue-50' },
            { label:'Admins',      value: roleCount('ADMIN'),     icon: Shield, color:'text-[var(--admin-primary)]',   bg:'bg-[var(--admin-primary)]/10' },
            { label:'Donors',      value: roleCount('DONOR'),     icon: User,   color:'text-green-600',  bg:'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-gray-200 p-4 flex items-center gap-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`}/>
              <div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-gray-500 text-sm">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40 bg-white"/>
        </div>

        {/* Users table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['User','Email','Mobile','Role','Joined','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading users…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  {search ? 'No users match your search' : 'No users yet — click Add User to get started'}
                </td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--admin-primary)]/15 flex items-center justify-center text-[var(--admin-primary)] font-bold text-xs flex-shrink-0">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-semibold text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${user.email}`} className="text-gray-600 hover:text-[var(--admin-primary)] flex items-center gap-1">
                      <Mail className="w-3 h-3"/> {user.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.mobile ? (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {user.mobile}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${ROLE_COLOR[user.role] || ROLE_COLOR.DONOR}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditUser(user)}
                        className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg">
                        <Edit2 className="w-3 h-3"/> Role
                      </button>
                      <button onClick={() => removeUser(user)}
                        className="flex items-center gap-1 text-xs text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg">
                        <Trash2 className="w-3 h-3"/> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">Adding new users</p>
          <p className="text-xs text-blue-600">
            Use <strong>Add User</strong> above to create an account for a team member and assign
            their role. They'll be added directly to your organisation and can sign in right away
            with the credentials you set.
          </p>
        </div>
      </div>
    </div>
  );
}
