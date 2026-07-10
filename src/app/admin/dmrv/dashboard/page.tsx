'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { useState } from 'react';
import { Activity, TreePine, MapPin, TrendingUp, AlertTriangle,
         CheckCircle2, Leaf, Shield, BarChart2, Clock, Eye, Zap,
         ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';

const KPI = [
  { label:'Total Projects',         value:'3',      sub:'2 active',       icon: MapPin,       color:'text-blue-400',   bg:'bg-blue-500/10',  border:'border-blue-500/20',  trend:'+1', up:true },
  { label:'Trees Monitored',        value:'11,500', sub:'of 15,000 planted', icon: TreePine,    color:'text-emerald-400', bg:'bg-emerald-500/10',border:'border-emerald-500/20', trend:'+2.1k', up:true },
  { label:'Geo-tagged',             value:'9,847',  sub:'85.6% coverage', icon: MapPin,       color:'text-cyan-400',   bg:'bg-cyan-500/10',  border:'border-cyan-500/20',  trend:'+340', up:true },
  { label:'Active Sites',           value:'3',      sub:'Thane, Palghar', icon: Radio,        color:'text-violet-400', bg:'bg-violet-500/10',border:'border-violet-500/20',trend:'live', up:true },
  { label:'Avg Survival Rate',      value:'87.3%',  sub:'+2.1% vs last month', icon: TrendingUp, color:'text-green-400', bg:'bg-green-500/10', border:'border-green-500/20',  trend:'+2.1%', up:true },
  { label:'Mortality Rate',         value:'12.7%',  sub:'Gap filling needed', icon: AlertTriangle, color:'text-amber-400', bg:'bg-amber-500/10', border:'border-amber-500/20', trend:'-0.3%', up:false },
  { label:'Pending Verifications',  value:'14',     sub:'3 urgent',       icon: Shield,       color:'text-rose-400',   bg:'bg-rose-500/10',  border:'border-rose-500/20',  trend:'-5', up:false },
  { label:'Carbon Estimated',       value:'2,337',  sub:'tCO₂e sequestered', icon: Leaf,      color:'text-lime-400',   bg:'bg-lime-500/10',  border:'border-lime-500/20',  trend:'+187', up:true },
  { label:'Registry Readiness',     value:'72%',    sub:'Verra VCS ready', icon: CheckCircle2, color:'text-teal-400',  bg:'bg-teal-500/10',  border:'border-teal-500/20',  trend:'+8%', up:true },
  { label:'Evidence Completeness',  value:'81%',    sub:'4 gaps identified', icon: BarChart2,  color:'text-indigo-400', bg:'bg-indigo-500/10',border:'border-indigo-500/20',trend:'+5%', up:true },
];

const ACTIVITY = [
  { time:'2m ago',  event:'Geo-tagged photos uploaded', who:'Field Officer Rajan', project:'Adinath Green Kshetra', type:'photo', color:'text-emerald-400' },
  { time:'14m ago', event:'Monitoring visit logged',    who:'Priya Sharma',         project:'Adinath Green Kshetra', type:'monitor', color:'text-blue-400' },
  { time:'1h ago',  event:'AI Alert: Mortality spike detected', who:'System',      project:'Phase 2 Nashik',        type:'alert', color:'text-amber-400' },
  { time:'2h ago',  event:'Satellite imagery processed', who:'Auto-sync',          project:'Kalyan Phase 1',        type:'satellite', color:'text-violet-400' },
  { time:'3h ago',  event:'Carbon estimate updated',    who:'Carbon Engine',        project:'Adinath Green Kshetra', type:'carbon', color:'text-lime-400' },
  { time:'5h ago',  event:'Verification checkpoint passed', who:'Auditor Mehta',   project:'Kalyan Phase 1',        type:'verify', color:'text-teal-400' },
];

const SITES = [
  { name:'Adinath Green Kshetra', loc:'Chafe, Thane', trees:5000, planted:4500, survival:91, health:'GOOD',   phase:'MONITORING' },
  { name:'Kalyan Phase 1',        loc:'Kalyan, Thane', trees:4000, planted:3800, survival:84, health:'WARN',   phase:'GAP_FILLING' },
  { name:'Phase 2 Nashik',        loc:'Nashik, MH',   trees:6000, planted:3200, survival:76, health:'ALERT',  phase:'PLANTATION' },
];

const SCHEDULE = [
  { project:'Adinath Green Kshetra', type:'Monthly Survey',       due:'Tomorrow',  officer:'Rajan P.',   status:'SCHEDULED' },
  { project:'Kalyan Phase 1',        type:'Gap Fill Assessment',  due:'3 days',    officer:'Priya S.',   status:'DUE_SOON' },
  { project:'Phase 2 Nashik',        type:'Drone Survey',         due:'5 days',    officer:'Amit K.',    status:'SCHEDULED' },
  { project:'Adinath Green Kshetra', type:'Quarterly Carbon Audit', due:'12 days', officer:'CA Mehta',   status:'PLANNED' },
];

const HEALTH_COLOR: Record<string,string> = {
  GOOD: 'bg-emerald-500', WARN: 'bg-amber-500', ALERT: 'bg-rose-500'
};
const HEALTH_TEXT: Record<string,string> = {
  GOOD: 'text-emerald-400', WARN: 'text-amber-400', ALERT: 'text-rose-400'
};

// Minimal India-like SVG map placeholder with site dots
function IndiaMap({ sites }: { sites: typeof SITES }) {
  return (
    <div className="relative w-full h-56 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 300 320" className="w-full h-full opacity-20 absolute inset-0">
        <path d="M150,20 L200,40 L240,80 L250,130 L230,180 L200,220 L170,260 L150,300 L130,260 L100,220 L70,180 L50,130 L60,80 L100,40 Z"
          fill="none" stroke="#6ee7b7" strokeWidth="1.5"/>
      </svg>
      {/* Site dots positioned on map */}
      <div className="absolute" style={{top:'42%',left:'55%'}}>
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute"/>
          <div className="w-3 h-3 rounded-full bg-emerald-500 relative"/>
          <div className="absolute left-4 top-0 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-[10px] text-emerald-300 whitespace-nowrap">Adinath • 91%</div>
        </div>
      </div>
      <div className="absolute" style={{top:'47%',left:'52%'}}>
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping absolute"/>
          <div className="w-3 h-3 rounded-full bg-amber-500 relative"/>
        </div>
      </div>
      <div className="absolute" style={{top:'35%',left:'48%'}}>
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute"/>
          <div className="w-3 h-3 rounded-full bg-rose-500 relative"/>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Healthy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>Warning</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>Alert</span>
      </div>
      <div className="absolute top-3 right-3 text-[10px] text-gray-500">Maharashtra · 3 sites</div>
    </div>
  );
}

// Mini spark-line chart using SVG
function SparkLine({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * h}
        r="2.5" fill={color}/>
    </svg>
  );
}

const carbonData = [180,210,245,290,340,410,490,580,680,800,940,1100,1290,1490,1710,1960,2230,2337];
const survivalData = [82,83,84,84,85,85,86,86,87,87,87,87,87,87,88,88,87,87];
const monitoringData = [4,6,8,5,9,11,8,12,10,14,11,15,13,16,14,18,15,17];

export default function DMRVDashboard() {
  const [activeTab, setActiveTab] = useState<'carbon'|'survival'|'monitoring'>('carbon');

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        {/* Header */}
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400"/>
              <h1 className="text-lg font-bold text-white">Digital MRV</h1>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">Trust Engine</span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">JITO Green Legacy · Mumbai Zone · Updated 2 min ago</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              Live Monitoring Active
            </div>
            <select className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg focus:outline-none">
              <option>All Projects</option>
              <option>Adinath Green Kshetra</option>
              <option>Kalyan Phase 1</option>
              <option>Phase 2 Nashik</option>
            </select>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* KPI Grid */}
          <div className="grid grid-cols-5 gap-3">
            {KPI.map(k => (
              <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-3.5`}>
                <div className="flex items-start justify-between mb-2">
                  <k.icon className={`w-4 h-4 ${k.color}`}/>
                  <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${k.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {k.up ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                    {k.trend}
                  </span>
                </div>
                <div className={`text-xl font-black ${k.color} leading-none`}>{k.value}</div>
                <div className="text-gray-300 text-xs font-semibold mt-0.5">{k.label}</div>
                <div className="text-gray-500 text-[10px] mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Row 2: Map + Chart + Activity */}
          <div className="grid grid-cols-12 gap-4">

            {/* India Map */}
            <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">Plantation Sites</h3>
                <span className="text-[10px] text-gray-500">Maharashtra</span>
              </div>
              <IndiaMap sites={SITES}/>
              <div className="mt-3 space-y-2">
                {SITES.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${HEALTH_COLOR[s.health]}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 truncate">{s.name}</div>
                    </div>
                    <div className={`text-xs font-bold ${HEALTH_TEXT[s.health]}`}>{s.survival}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-sm">Trend Analysis</h3>
                <div className="flex gap-1">
                  {[{k:'carbon',l:'Carbon'},{k:'survival',l:'Survival'},{k:'monitoring',l:'Monitoring'}].map(t => (
                    <button key={t.k} onClick={() => setActiveTab(t.k as any)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        activeTab === t.k ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-500 hover:text-gray-300'
                      }`}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Chart area */}
              <div className="h-40 flex items-end gap-1">
                {(activeTab === 'carbon' ? carbonData : activeTab === 'survival' ? survivalData : monitoringData).map((v, i) => {
                  const data = activeTab === 'carbon' ? carbonData : activeTab === 'survival' ? survivalData : monitoringData;
                  const max  = Math.max(...data);
                  const pct  = (v / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 transition-colors rounded-sm cursor-pointer"
                        style={{ height: `${pct}%` }}
                        title={String(v)}/>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-600">
                <span>Jun '25</span><span>Dec '25</span><span>Jun '26</span>
              </div>
              <div className="mt-3 flex gap-4 text-xs">
                {activeTab === 'carbon' && <>
                  <div><span className="text-gray-500">Current</span> <span className="text-emerald-400 font-bold">2,337 tCO₂e</span></div>
                  <div><span className="text-gray-500">10yr Projected</span> <span className="text-white font-bold">41,200 tCO₂e</span></div>
                </>}
                {activeTab === 'survival' && <>
                  <div><span className="text-gray-500">Current</span> <span className="text-emerald-400 font-bold">87.3%</span></div>
                  <div><span className="text-gray-500">Target</span> <span className="text-white font-bold">90%</span></div>
                </>}
                {activeTab === 'monitoring' && <>
                  <div><span className="text-gray-500">This month</span> <span className="text-emerald-400 font-bold">17 visits</span></div>
                  <div><span className="text-gray-500">Overdue</span> <span className="text-rose-400 font-bold">2</span></div>
                </>}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                  Live Activity
                </h3>
              </div>
              <div className="space-y-2.5">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="flex gap-3 group">
                    <div className={`w-1.5 flex-shrink-0 mt-1.5 h-1.5 rounded-full ${a.color.replace('text','bg')}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 leading-tight">{a.event}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{a.who} · {a.project}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Project Health + Monitoring Schedule */}
          <div className="grid grid-cols-12 gap-4">

            {/* Project Health */}
            <div className="col-span-8 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Project Health Overview</h3>
                <span className="text-[10px] text-gray-500">3 active projects</span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-800/50">
                  <tr>
                    {['Project','Location','Planted','Survival','Phase','Health Score','Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SITES.map((s, i) => (
                    <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{s.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{s.loc}</td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{s.planted.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-gray-500">of {s.trees.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden w-16">
                            <div className={`h-full rounded-full ${s.survival >= 85 ? 'bg-emerald-500' : s.survival >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{width:`${s.survival}%`}}/>
                          </div>
                          <span className={`font-bold ${s.survival >= 85 ? 'text-emerald-400' : s.survival >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>{s.survival}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">
                          {s.phase.replace('_',' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <SparkLine data={[s.survival-5,s.survival-3,s.survival-2,s.survival-1,s.survival]} color={s.health==='GOOD'?'#34d399':s.health==='WARN'?'#f59e0b':'#f43f5e'}/>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/admin/dmrv/monitor`}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-lg">
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Monitoring Schedule */}
            <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">Upcoming Monitoring</h3>
                <Clock className="w-4 h-4 text-gray-500"/>
              </div>
              <div className="space-y-3">
                {SCHEDULE.map((s, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${
                    s.status === 'DUE_SOON' ? 'bg-amber-500/5 border-amber-500/20' :
                    s.status === 'SCHEDULED' ? 'bg-blue-500/5 border-blue-500/20' :
                    'bg-gray-800 border-gray-700'
                  }`}>
                    <div className="text-xs font-semibold text-white mb-0.5">{s.type}</div>
                    <div className="text-[10px] text-gray-400">{s.project}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-gray-500">{s.officer}</span>
                      <span className={`text-[10px] font-semibold ${
                        s.status === 'DUE_SOON' ? 'text-amber-400' :
                        s.status === 'SCHEDULED' ? 'text-blue-400' : 'text-gray-400'
                      }`}>Due in {s.due}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DMRVLayout>
  );
}
