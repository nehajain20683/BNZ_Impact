'use client';
// src/app/(superadmin)/sadmin/page.tsx — BNZ Control Panel Dashboard
import { useState, useEffect } from 'react';
import { withSuperAdmin } from '@/components/superadmin/withSuperAdmin';
import {
  Building2, Users, DollarSign, TreePine, TrendingUp,
  Activity, ArrowUpRight, ArrowDownRight, Globe,
  CheckCircle, XCircle, Clock, Zap
} from 'lucide-react';

function SuperAdminDashboard() {
  const [orgs, setOrgs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/superadmin/orgs')
      .then(r => r.json())
      .then(d => { setOrgs(d.orgs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalDonations = orgs.reduce((s, o) => s + (o._counts?.donations || 0), 0);
  const totalFarmers   = orgs.reduce((s, o) => s + (o._counts?.farmers   || 0), 0);
  const totalSites     = orgs.reduce((s, o) => s + (o._counts?.sites     || 0), 0);
  const activeOrgs     = orgs.filter(o => o.active).length;

  const KPI = [
    { label:'Total Tenants',    value: orgs.length,    sub:'Organisations', icon: Building2,  color:'text-blue-400',    bg:'bg-blue-500/10',    border:'border-blue-500/20',    trend:'+1', up:true },
    { label:'Active Tenants',   value: activeOrgs,     sub:'Running',       icon: CheckCircle,color:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/20', trend:'100%', up:true },
    { label:'Total Donations',  value: totalDonations, sub:'Transactions',  icon: DollarSign, color:'text-green-400',   bg:'bg-green-500/10',   border:'border-green-500/20',   trend:'+12', up:true },
    { label:'Land Owners',      value: totalFarmers,   sub:'Registered',    icon: Users,      color:'text-violet-400',  bg:'bg-violet-500/10',  border:'border-violet-500/20',  trend:'+3', up:true },
    { label:'Plantation Sites', value: totalSites,     sub:'Active',        icon: TreePine,   color:'text-lime-400',    bg:'bg-lime-500/10',    border:'border-lime-500/20',    trend:'+1', up:true },
    { label:'Platform Health',  value: '99.9%',        sub:'Uptime',        icon: Activity,   color:'text-teal-400',    bg:'bg-teal-500/10',    border:'border-teal-500/20',    trend:'+0.1%', up:true },
  ];

  const PLAN_COLOR: Record<string,string> = {
    STARTER:'bg-gray-800 text-gray-400', PRO:'bg-blue-500/15 text-blue-400', ENTERPRISE:'bg-purple-500/15 text-purple-400'
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Control Panel</h1>
          <p className="text-gray-400 text-sm mt-0.5">BNZ Green Technologies · SaaS Platform Overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          All systems operational
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI.map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <k.icon className={`w-4 h-4 ${k.color}`}/>
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${k.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {k.up ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}{k.trend}
              </span>
            </div>
            <div className={`text-2xl font-black ${k.color} leading-none`}>
              {loading ? '—' : k.value}
            </div>
            <div className="text-gray-300 text-xs font-semibold mt-0.5">{k.label}</div>
            <div className="text-gray-600 text-[10px]">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tenant table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400"/> Tenant Organisations
          </h2>
          <a href="/sadmin/orgs"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            Manage all <ArrowUpRight className="w-3 h-3"/>
          </a>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading tenants…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                {['Organisation','Slug','Plan','Donations','Farmers','Sites','Status','Domain'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org, i) => (
                <tr key={org.id} className={`border-t border-gray-800 hover:bg-gray-800/30 transition-colors`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: org.primary_color || '#2d5a1b' }}>
                        {org.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-100 text-xs">{org.name}</div>
                        <div className="text-gray-500 text-[10px]">{org.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{org.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_COLOR[org.plan] || PLAN_COLOR.STARTER}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-semibold">{org._counts?.donations || 0}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-semibold">{org._counts?.farmers   || 0}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-semibold">{org._counts?.sites     || 0}</td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${org.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {org.active
                        ? <><CheckCircle className="w-3 h-3"/> Active</>
                        : <><XCircle className="w-3 h-3"/> Inactive</>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {org.custom_domain ? (
                      <a href={`https://${org.custom_domain}`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5">
                        <Globe className="w-3 h-3"/> {org.custom_domain}
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-600">{org.slug}.bnzgreen.io</span>
                    )}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-600">No tenants yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Platform info */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Next.js', value:'14.2.18', icon:'⚡', desc:'Framework' },
          { label:'Supabase', value:'PostgreSQL', icon:'🗄️', desc:'Database' },
          { label:'Vercel', value:'Edge Network', icon:'▲', desc:'Hosting' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-gray-200 text-xs font-semibold">{s.label}</div>
              <div className="text-emerald-400 text-xs font-bold">{s.value}</div>
              <div className="text-gray-600 text-[10px]">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default withSuperAdmin(SuperAdminDashboard);
