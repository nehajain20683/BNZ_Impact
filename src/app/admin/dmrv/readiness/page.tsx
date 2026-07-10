'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { CheckCircle2, AlertCircle, Clock, ArrowRight, Trophy } from 'lucide-react';

const SCORES = [
  { label:'Measurement',        score:88, target:100, gaps:['NDVI drone survey pending','Soil pH not updated for Phase 2'], color:'#34d399', icon:'📐' },
  { label:'Monitoring',         score:82, target:100, gaps:['2 monitoring visits overdue','Mortality tracking gap at Nashik'], color:'#60a5fa', icon:'📡' },
  { label:'Reporting',          score:75, target:100, gaps:['Q2 Carbon Monitoring Report not generated','Registry format not exported'], color:'#a78bfa', icon:'📋' },
  { label:'Verification',       score:71, target:100, gaps:['Satellite verification pending','3 field surveys need officer sign-off'], color:'#f59e0b', icon:'✅' },
  { label:'Evidence Completeness',score:81,target:100, gaps:['KML files missing for 2 parcels','14 activities lack geo-tags'], color:'#f472b6', icon:'🗄️' },
  { label:'Carbon Readiness',   score:68, target:100, gaps:['Biomass allometry factors not set','Permanence buffer calculation pending'], color:'#34d399', icon:'🌿' },
  { label:'Registry Readiness', score:55, target:100, gaps:['PDD document not submitted','VVB not engaged yet','MRV plan not formalized'], color:'#fb923c', icon:'📦' },
];

const REGISTRY_CHECKS = [
  { check:'Project Documentation (PDD)', status:'IN_PROGRESS', registry:'Verra VCS' },
  { check:'Baseline Scenario Defined',   status:'DONE',        registry:'Verra VCS' },
  { check:'Additionality Demonstrated',  status:'DONE',        registry:'Verra VCS' },
  { check:'MRV Plan Submitted',          status:'PENDING',     registry:'Verra VCS' },
  { check:'Validated by VVB',            status:'PENDING',     registry:'Verra VCS' },
  { check:'Geo-referenced Boundaries',   status:'DONE',        registry:'Gold Standard' },
  { check:'SDG Impact Assessment',       status:'IN_PROGRESS', registry:'Gold Standard' },
  { check:'Stakeholder Consultation',    status:'PENDING',     registry:'Gold Standard' },
];

const STATUS_CFG: Record<string,{label:string;color:string;dot:string}> = {
  DONE:        { label:'Complete',    color:'text-emerald-400', dot:'bg-emerald-400' },
  IN_PROGRESS: { label:'In Progress', color:'text-amber-400',   dot:'bg-amber-400' },
  PENDING:     { label:'Pending',     color:'text-rose-400',    dot:'bg-rose-400' },
};

// Circular progress SVG
function CircularProgress({ score, size=160 }: { score: number; size?: number }) {
  const r   = (size - 24) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1f2937" strokeWidth="14"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={score >= 80 ? '#34d399' : score >= 60 ? '#f59e0b' : '#f43f5e'}
        strokeWidth="14" strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2 - 8} textAnchor="middle" fill="white" fontSize="28" fontWeight="900">{score}</text>
      <text x={size/2} y={size/2 + 14} textAnchor="middle" fill="#9ca3af" fontSize="11">/ 100</text>
    </svg>
  );
}

export default function ReadinessPage() {
  const overall = Math.round(SCORES.reduce((s, x) => s + x.score, 0) / SCORES.length);
  const registryReady = overall >= 90;

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400"/> dMRV Readiness
            </h1>
            <p className="text-gray-400 text-xs">Executive readiness score · Registry-ready assessment</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${
            registryReady ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {registryReady ? <Trophy className="w-4 h-4"/> : <Clock className="w-4 h-4"/>}
            Registry Ready: {registryReady ? 'YES' : 'NOT YET'}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Hero score */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center gap-12">
            <div className="flex-shrink-0">
              <CircularProgress score={overall} size={180}/>
            </div>
            <div className="flex-1">
              <div className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Overall dMRV Score</div>
              <div className="text-5xl font-black text-white mb-2">{overall}<span className="text-2xl text-gray-500">/100</span></div>
              <p className="text-gray-400 text-sm mb-4">
                Your project is <strong className="text-amber-400">{100 - overall} points</strong> away from full dMRV readiness.
                Complete the recommendations below to achieve registry submission.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[
                  { label:'Verra VCS', score:'55%', color:'text-amber-400' },
                  { label:'Gold Standard', score:'61%', color:'text-amber-400' },
                  { label:'ICR', score:'48%', color:'text-rose-400' },
                  { label:'Article 6', score:'42%', color:'text-rose-400' },
                ].map(r => (
                  <div key={r.label} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-center">
                    <div className="text-[10px] text-gray-500">{r.label}</div>
                    <div className={`text-lg font-black ${r.color}`}>{r.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Individual scores */}
          <div className="grid grid-cols-7 gap-3">
            {SCORES.map(s => {
              const pct = s.score;
              const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#f59e0b' : '#f43f5e';
              const r = 32, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
              return (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <svg width="80" height="80" className="mx-auto mb-2">
                    <circle cx="40" cy="40" r={r} fill="none" stroke="#1f2937" strokeWidth="8"/>
                    <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
                      strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
                      transform="rotate(-90 40 40)"/>
                    <text x="40" y="40" textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="16" fontWeight="900">{pct}</text>
                  </svg>
                  <div className="text-[11px] font-semibold text-gray-300 leading-tight">{s.label}</div>
                  <div className="text-[10px] text-gray-600 mt-1">{s.gaps.length} gap{s.gaps.length !== 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>

          {/* Gaps & recommendations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <h3 className="font-semibold text-white text-sm">Gaps to Close</h3>
                <p className="text-gray-500 text-xs">Complete these to reach 100%</p>
              </div>
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                {SCORES.flatMap(s => s.gaps.map(g => ({ gap: g, module: s.label, icon: s.icon }))).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200">{item.gap}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{item.icon} {item.module}</p>
                    </div>
                    <button className="text-[10px] text-emerald-400 hover:underline flex-shrink-0 flex items-center gap-0.5">
                      Fix <ArrowRight className="w-3 h-3"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Registry checklist */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <h3 className="font-semibold text-white text-sm">Registry Submission Checklist</h3>
                <p className="text-gray-500 text-xs">Verra VCS + Gold Standard requirements</p>
              </div>
              <div className="p-4 space-y-2">
                {REGISTRY_CHECKS.map((c, i) => {
                  const cfg = STATUS_CFG[c.status];
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200">{c.check}</p>
                        <p className="text-[10px] text-gray-500">{c.registry}</p>
                      </div>
                      <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DMRVLayout>
  );
}
