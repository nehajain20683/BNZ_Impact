'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { useState, useEffect } from 'react';
import { Activity, TreePine, MapPin, TrendingUp, AlertTriangle,
         CheckCircle, Leaf, Shield, BarChart2, Zap, Radio } from 'lucide-react';

export default function DMRVDashboard() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const s   = data?.stats || {};
  const pct = s.plannedTrees > 0 ? Math.round((s.treesPlanted / s.plannedTrees) * 100) : 0;
  const estimatedCarbon = Math.round((s.treesPlanted||0) * 0.022 * 0.87 * 25);

  const KPI = [
    { label:'Active Sites',       value: s.siteCount||0,                              icon: MapPin,        color:'text-blue-400',    bg:'bg-blue-500/10',    border:'border-blue-500/20' },
    { label:'Trees Monitored',    value: (s.treesPlanted||0).toLocaleString('en-IN'), icon: TreePine,      color:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/20' },
    { label:'Trees Planned',      value: (s.plannedTrees||0).toLocaleString('en-IN'), icon: BarChart2,     color:'text-teal-400',    bg:'bg-teal-500/10',    border:'border-teal-500/20' },
    { label:'Land Owners',        value: s.farmerCount||0,                            icon: Activity,      color:'text-violet-400',  bg:'bg-violet-500/10',  border:'border-violet-500/20' },
    { label:'Carbon Est. tCO₂e',  value: estimatedCarbon.toLocaleString('en-IN'),     icon: Leaf,          color:'text-lime-400',    bg:'bg-lime-500/10',    border:'border-lime-500/20' },
    { label:'Avg Survival Est.',  value: '87%',                                       icon: TrendingUp,    color:'text-green-400',   bg:'bg-green-500/10',   border:'border-green-500/20' },
    { label:'Verifications',      value: 0,                                           icon: Shield,        color:'text-rose-400',    bg:'bg-rose-500/10',    border:'border-rose-500/20' },
    { label:'Monitoring Active',  value: s.siteCount||0,                              icon: Radio,         color:'text-cyan-400',    bg:'bg-cyan-500/10',    border:'border-cyan-500/20' },
    { label:'Evidence Complete',  value: '—',                                         icon: CheckCircle,   color:'text-indigo-400',  bg:'bg-indigo-500/10',  border:'border-indigo-500/20' },
    { label:'Registry Readiness', value: '—',                                         icon: AlertTriangle, color:'text-amber-400',   bg:'bg-amber-500/10',   border:'border-amber-500/20' },
  ];

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400"/>
              <h1 className="text-lg font-bold text-white">Digital MRV</h1>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">Trust Engine</span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">Live data · Your organisation only</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> Live
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-5 gap-3">
            {KPI.map(k => (
              <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-3.5`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`}/>
                <div className={`text-xl font-black ${k.color} leading-none`}>
                  {loading ? '—' : k.value}
                </div>
                <div className="text-gray-300 text-xs font-semibold mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {!loading && s.plannedTrees > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-sm">Plantation Progress</h3>
                <span className="text-emerald-400 text-sm font-bold">{pct}%</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                  style={{ width:`${pct}%` }}/>
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-600">
                <span>{(s.treesPlanted||0).toLocaleString('en-IN')} planted</span>
                <span>{(s.plannedTrees||0).toLocaleString('en-IN')} planned</span>
              </div>
            </div>
          )}

          {/* Sites table */}
          {!loading && data?.recentSites?.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <h3 className="font-semibold text-white text-sm">Plantation Sites</h3>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-800/50">
                  <tr>{['Site','District','Phase','Planted','Progress'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {data.recentSites.map((site: any) => {
                    const p = site.plannedTrees > 0 ? Math.round((site.treesPlanted/site.plannedTrees)*100) : 0;
                    return (
                      <tr key={site.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-gray-200 font-semibold">{site.siteName}</td>
                        <td className="px-4 py-3 text-gray-400">{site.district||'—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                            {site.currentPhase?.replace(/_/g,' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold">
                          {(site.treesPlanted||0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{width:`${p}%`}}/>
                            </div>
                            <span className="text-gray-400 text-[10px]">{p}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !data?.recentSites?.length && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <Zap className="w-10 h-10 text-gray-700 mx-auto mb-3"/>
              <p className="text-gray-400 text-sm">No plantation sites yet for this organisation</p>
              <a href="/admin/plantation-sites" className="text-emerald-400 text-xs hover:underline mt-1 inline-block">
                Create first plantation site →
              </a>
            </div>
          )}
        </div>
      </div>
    </DMRVLayout>
  );
}
