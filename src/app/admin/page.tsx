'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreePine, Users, DollarSign, Leaf, MapPin, Activity, BarChart2 } from 'lucide-react';



const PHASE_COLORS: Record<string,string> = {
  PLANNING:'bg-gray-100 text-gray-600', LAND_PREPARATION:'bg-blue-100 text-blue-700',
  PIT_DIGGING:'bg-amber-100 text-amber-700', PLANTATION:'bg-green-100 text-green-700',
  GAP_FILLING:'bg-teal-100 text-teal-700', MONITORING:'bg-purple-100 text-purple-700',
  COMPLETED:'bg-emerald-100 text-emerald-800',
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats]               = useState<any>(null);
  const [recentDonations, setDonations] = useState<any[]>([]);
  const [recentSites, setSites]         = useState<any[]>([]);
  const [activeOrg, setActiveOrg]       = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const role         = (session?.user as any)?.role;
  const isAllowed    = ['ADMIN','SUPER_ADMIN'].includes(role);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!isAllowed) { router.push('/'); return; }
    loadDashboard();
  }, [status, role]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [dashRes, orgRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/switch-org'),
      ]);
      const dashData = await dashRes.json();
      const orgData  = await orgRes.json();
      if (dashData.error) { setError(dashData.error); setLoading(false); return; }
      setStats(dashData.stats);
      setDonations(dashData.recentDonations || []);
      setSites(dashData.recentSites || []);
      if (orgData.activeOrg) setActiveOrg(orgData.activeOrg);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-8 h-8 text-[var(--admin-primary)]/50 mx-auto mb-3 animate-pulse"/>
          <p className="text-gray-500 text-sm">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Dashboard Error</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={loadDashboard} className="bg-[var(--admin-primary)] text-white px-4 py-2 rounded-xl text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="min-h-screen bg-gray-50">


      <div className="max-w-7xl mx-auto px-4 py-8">
        {isSuperAdmin && activeOrg && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <div className="w-5 h-5 rounded-md" style={{ backgroundColor: activeOrg.primary_color || '#2d5a1b' }}/>
            <p className="text-indigo-700 text-sm font-semibold">Viewing: <span className="font-bold">{activeOrg.name}</span></p>
            <p className="text-indigo-400 text-xs ml-auto">Use the org switcher to change</p>
          </div>
        )}

        <h1 className="font-display text-2xl text-gray-900 mb-6">Dashboard Overview</h1>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Donations & Fundraising</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: DollarSign, label:'Total Revenue',   value:`₹${(s.totalAmount||0).toLocaleString('en-IN')}`, bg:'bg-green-500' },
            { icon: TreePine,   label:'Trees Sponsored', value:(s.totalTrees||0).toLocaleString(),               bg:'bg-emerald-500' },
            { icon: Users,      label:'Paid Donations',  value:(s.totalDonations||0).toLocaleString(),           bg:'bg-blue-500' },
            { icon: Leaf,       label:'Land Owners',     value:(s.farmerCount||0).toLocaleString(),              bg:'bg-lime-500' },
          ].map(({ icon: Icon, label, value, bg }) => (
            <div key={label} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}><Icon className="w-5 h-5 text-white"/></div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-gray-500 text-sm">{label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Plantation Operations</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: MapPin,    label:'Plantation Sites', value: s.siteCount||0,                             bg:'bg-[var(--admin-primary)]' },
            { icon: TreePine,  label:'Trees Planted',    value:(s.treesPlanted||0).toLocaleString('en-IN'), bg:'bg-green-600' },
            { icon: BarChart2, label:'Total Planned',    value:(s.plannedTrees||0).toLocaleString('en-IN'), bg:'bg-teal-600' },
            { icon: Activity,  label:'Farmers Assigned', value:(s.assignmentCount||0).toLocaleString(),     bg:'bg-indigo-500' },
          ].map(({ icon: Icon, label, value, bg }) => (
            <div key={label} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}><Icon className="w-5 h-5 text-white"/></div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-gray-500 text-sm">{label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Quick Access</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { href:'/admin/donations',        icon:'💰', label:'Donations',        desc:'All transactions',          color:'bg-green-50  text-green-700  border-green-100' },
            { href:'/admin/plantation-sites', icon:'🌳', label:'Plantation Sites', desc:'Sites, phases, activities', color:'bg-[var(--admin-primary)]/10   text-[var(--admin-primary)]   border-[var(--admin-primary)]/20' },
            { href:'/admin/farmers',          icon:'🌾', label:'Land Owners',      desc:'Registrations & docs',      color:'bg-lime-50   text-lime-700   border-lime-100' },
            { href:'/admin/dmrv/dashboard',   icon:'⚡', label:'Digital MRV',      desc:'Trust Engine · dMRV',       color:'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { href:'/admin/people',           icon:'👥', label:'People',           desc:'Farmers & users',           color:'bg-indigo-50 text-indigo-700 border-indigo-100' },
            { href:'/admin/logs',             icon:'📋', label:'Activity Logs',    desc:'All system actions',        color:'bg-amber-50  text-amber-700  border-amber-100' },
            ...(isSuperAdmin ? [{ href:'/sadmin', icon:'⚙️', label:'Superadmin', desc:'Manage organisations', color:'bg-purple-50 text-purple-700 border-purple-100' }] : []),
          ].map(l => (
            <Link key={l.href+l.label} href={l.href}
              className={`${l.color} border rounded-xl p-4 hover:shadow-md transition-shadow flex items-start gap-3`}>
              <span className="text-2xl">{l.icon}</span>
              <div>
                <div className="font-semibold text-sm">{l.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{l.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><TreePine className="w-4 h-4 text-[var(--admin-primary)]"/> Active Plantation Sites</h2>
              <Link href="/admin/plantation-sites" className="text-xs text-[var(--admin-primary)] hover:underline">View all →</Link>
            </div>
            {recentSites.length === 0 ? (
              <div className="text-center py-8"><p className="text-gray-400 text-sm">No sites yet for this organisation</p></div>
            ) : (
              <div className="divide-y">
                {recentSites.map((site: any) => {
                  const pct = site.plannedTrees > 0 ? Math.round((site.treesPlanted/site.plannedTrees)*100) : 0;
                  return (
                    <Link key={site.id} href={`/admin/plantation-sites/${site.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      <div className="w-8 h-8 bg-[var(--admin-primary)]/15 rounded-lg flex items-center justify-center flex-shrink-0"><TreePine className="w-4 h-4 text-[var(--admin-primary)]"/></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{site.siteName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-20"><div className="h-full bg-[var(--admin-primary)] rounded-full" style={{width:`${pct}%`}}/></div>
                          <span className="text-gray-400 text-xs">{pct}% · {site.district||'—'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PHASE_COLORS[site.currentPhase]||'bg-gray-100 text-gray-600'}`}>{site.currentPhase?.replace(/_/g,' ')}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-600"/> Recent Donations</h2>
              <Link href="/admin/donations" className="text-xs text-[var(--admin-primary)] hover:underline">View all →</Link>
            </div>
            <div className="divide-y">
              {recentDonations.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-xs font-bold">{d.numberOfTrees}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{d.donorName}</div>
                    <div className="text-gray-400 text-xs">{d.campaign?.name} · {new Date(d.createdAt).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-900 text-sm">₹{d.amount?.toLocaleString('en-IN')}</div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${d.paymentStatus==='COMPLETED'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                      {d.paymentStatus==='COMPLETED'?'Paid':d.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
              {recentDonations.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No donations yet for this organisation</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
