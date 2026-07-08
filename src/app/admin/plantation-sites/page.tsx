'use client';
// src/app/admin/plantation-sites/page.tsx — Plantation Sites List + Create
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, TreePine, MapPin, Users, Leaf, X, ChevronRight } from 'lucide-react';

const PHASES = ['PLANNING','LAND_PREPARATION','PIT_DIGGING','PLANTATION','GAP_FILLING','MONITORING','COMPLETED'];
const PHASE_COLORS: Record<string,string> = {
  PLANNING:'bg-gray-100 text-gray-700', LAND_PREPARATION:'bg-blue-100 text-blue-700',
  PIT_DIGGING:'bg-amber-100 text-amber-700', PLANTATION:'bg-green-100 text-green-700',
  GAP_FILLING:'bg-teal-100 text-teal-700', MONITORING:'bg-purple-100 text-purple-700',
  COMPLETED:'bg-emerald-100 text-emerald-800',
};
const STATES = ['Maharashtra','Gujarat','Rajasthan','Madhya Pradesh','Karnataka','Uttar Pradesh'];
const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400";

function CreateSiteModal({ onClose, onSave }: any) {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm] = useState({
    siteName:'', internalRef:'', description:'', state:'Maharashtra',
    district:'', taluka:'', village:'', gpsLatitude:'', gpsLongitude:'',
    totalPlannedArea:'', currentPhase:'PLANNING',
    plantationPartner:'', implementingAgency:'', fieldOfficerId:'',
    nursery:'', carbonConsultant:'', auditor:'',
    plantationSeason:'Kharif 2026', startDate:'', endDate:'',
    totalFarmers:'', plannedArea:'', plannedTrees:'',
    estimatedCarbon:'', estimatedCredits:'', expectedSurvival:'85', budget:'',
  });
  const [speciesRows, setSpeciesRows] = useState([
    { species:'', plannedQty:'', nurserySource:'', expectedSurvival:'85', carbonFactor:'', remarks:'' }
  ]);

  const f = (k: string) => (e: any) => setForm(p=>({...p,[k]:e.target.value}));

  async function handleCreate() {
    if (!form.siteName) { setError('Site name required'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/admin/plantation-sites', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form,
        speciesPlans: speciesRows.filter(r=>r.species&&r.plannedQty),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave(data.site);
    else setError(data.error || 'Failed');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl my-4">
        <div className="bg-forest-950 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Create Plantation Site</h3>
            <p className="text-forest-400 text-xs">Step {step} of 4</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-forest-400 hover:text-white"/></button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-gray-100">
          {['Basic Info','Plantation Details','Targets','Species Plan'].map((t,i)=>(
            <button key={t} onClick={()=>setStep(i+1)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${step===i+1?'border-b-2 border-sage-600 text-sage-700':'text-gray-400 hover:text-gray-600'}`}>
              {i+1}. {t}
            </button>
          ))}
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Plantation Site Name *</label>
                <input value={form.siteName} onChange={f('siteName')} className={inp} placeholder="e.g. Adinath Green Kshetra"/>
              </div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Internal Reference</label>
                <input value={form.internalRef} onChange={f('internalRef')} className={inp} placeholder="JGL-2026-01"/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Current Phase</label>
                <select value={form.currentPhase} onChange={f('currentPhase')} className={inp}>
                  {PHASES.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
                </select></div>
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <textarea value={form.description} onChange={f('description')} className={inp} rows={2}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">State</label>
                <select value={form.state} onChange={f('state')} className={inp}>
                  {STATES.map(s=><option key={s} value={s}>{s}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">District</label>
                <input value={form.district} onChange={f('district')} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Taluka</label>
                <input value={form.taluka} onChange={f('taluka')} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Village</label>
                <input value={form.village} onChange={f('village')} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">GPS Latitude</label>
                <input type="number" step="any" value={form.gpsLatitude} onChange={f('gpsLatitude')} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">GPS Longitude</label>
                <input type="number" step="any" value={form.gpsLongitude} onChange={f('gpsLongitude')} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Total Planned Area (Acres)</label>
                <input type="number" value={form.totalPlannedArea} onChange={f('totalPlannedArea')} className={inp}/></div>
            </div>
          )}

          {/* Step 2: Plantation Details */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Plantation Partner','plantationPartner','e.g. BNZ Green Technologies'],
                ['Implementing Agency','implementingAgency','NGO / Agency name'],
                ['Nursery','nursery','Nursery name/source'],
                ['Carbon Consultant','carbonConsultant','Consultant name'],
                ['Auditor','auditor','Audit agency'],
                ['Plantation Season','plantationSeason','Kharif 2026'],
              ].map(([l,k,p])=>(
                <div key={k as string}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
                  <input value={(form as any)[k as string]} onChange={f(k as string)} className={inp} placeholder={p as string}/>
                </div>
              ))}
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={f('startDate')} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">End Date</label>
                <input type="date" value={form.endDate} onChange={f('endDate')} className={inp}/></div>
            </div>
          )}

          {/* Step 3: Targets */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Total Farmers','totalFarmers','50'],
                ['Planned Area (Acres)','plannedArea','100'],
                ['Planned Trees','plannedTrees','80000'],
                ['Estimated Carbon (tCO₂)','estimatedCarbon','2000'],
                ['Estimated Carbon Credits','estimatedCredits','2000'],
                ['Expected Survival %','expectedSurvival','85'],
                ['Budget (₹)','budget','5000000'],
              ].map(([l,k,p])=>(
                <div key={k as string}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
                  <input type="number" value={(form as any)[k as string]} onChange={f(k as string)} className={inp} placeholder={p as string}/>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Species Plan */}
          {step === 4 && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Total planned qty must equal planned trees</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>{['Species','Qty','Nursery','Survival %','Carbon Factor','Remarks',''].map(h=>(
                      <th key={h} className="px-2 py-2 text-left font-medium text-gray-500">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {speciesRows.map((row,i)=>(
                      <tr key={i} className="border-t">
                        {(['species','plannedQty','nurserySource','expectedSurvival','carbonFactor','remarks'] as const).map(k=>(
                          <td key={k} className="px-1 py-1">
                            <input value={row[k]} onChange={e=>setSpeciesRows(rows=>rows.map((r,j)=>j===i?{...r,[k]:e.target.value}:r))}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sage-400"
                              placeholder={k==='species'?'Neem / Mango…':k==='expectedSurvival'?'85':k==='plannedQty'?'1000':''}/>
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <button onClick={()=>setSpeciesRows(rows=>rows.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={()=>setSpeciesRows(r=>[...r,{species:'',plannedQty:'',nurserySource:'',expectedSurvival:'85',carbonFactor:'',remarks:''}])}
                className="mt-3 text-sage-600 text-xs font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3"/> Add Species
              </button>
              {speciesRows.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Total planned: <strong>{speciesRows.reduce((s,r)=>s+(parseInt(r.plannedQty)||0),0).toLocaleString('en-IN')}</strong>
                  {form.plannedTrees && <> / {parseInt(form.plannedTrees).toLocaleString('en-IN')} planned</>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40">← Back</button>
          <div className="flex gap-3">
            {step < 4 ? (
              <button onClick={()=>setStep(s=>s+1)} className="bg-sage-700 text-white px-5 py-2 rounded-xl text-sm font-bold">Next →</button>
            ) : (
              <button onClick={handleCreate} disabled={loading}
                className="bg-sage-700 hover:bg-sage-800 text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60">
                {loading ? 'Creating…' : '✓ Create Plantation Site'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlantationSitesPage() {
  const [sites, setSites]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [phase, setPhase]       = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]       = useState('');

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (phase)  p.set('phase', phase);
    const res  = await fetch(`/api/admin/plantation-sites?${p}`);
    const data = await res.json();
    setSites(data.sites || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalTrees   = sites.reduce((s,x)=>s+(x.plannedTrees||0),0);
  const totalPlanted = sites.reduce((s,x)=>s+(x.treesPlanted||0),0);
  const totalArea    = sites.reduce((s,x)=>s+(x.totalPlannedArea||0),0);

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">✓ {toast}</div>
      )}
      {showCreate && (
        <CreateSiteModal onClose={()=>setShowCreate(false)} onSave={(site:any)=>{setShowCreate(false);setToast(`Site "${site.siteName}" created`);load();}}/>
      )}

      {/* Header */}
      <div className="bg-forest-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-forest-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></Link>
          <div>
            <div className="font-display text-lg">Plantation Sites</div>
            <div className="text-forest-400 text-xs">JITO Green Legacy — Master Project</div>
          </div>
        </div>
        <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 bg-sage-600 hover:bg-sage-700 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4"/> Create Plantation Site
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { l:'Total Sites',    v: sites.length,            icon: Leaf },
            { l:'Total Area',     v:`${totalArea.toFixed(1)} ac`, icon: MapPin },
            { l:'Planned Trees',  v: totalTrees.toLocaleString('en-IN'), icon: TreePine },
            { l:'Trees Planted',  v: totalPlanted.toLocaleString('en-IN'), icon: TreePine },
          ].map(s=>(
            <div key={s.l} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-2xl font-black text-gray-900">{s.v}</div>
              <div className="text-gray-500 text-sm">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-sm flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()}
              placeholder="Search by name, district, village…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"/>
          </div>
          <select value={phase} onChange={e=>setPhase(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="">All Phases</option>
            {PHASES.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
          </select>
          <button onClick={load} className="bg-forest-700 text-white font-bold px-4 py-2 rounded-xl text-sm">Apply</button>
          <button onClick={()=>{setSearch('');setPhase('');setTimeout(load,0);}} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm">Reset</button>
        </div>

        {/* Sites grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading sites…</div>
        ) : sites.length === 0 ? (
          <div className="text-center py-16">
            <TreePine className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
            <p className="text-gray-500 mb-2">No plantation sites yet</p>
            <button onClick={()=>setShowCreate(true)} className="text-sage-700 font-semibold hover:underline text-sm">Create your first site →</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sites.map((site:any)=>(
              <Link key={site.id} href={`/admin/plantation-sites/${site.id}`}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-sage-700 transition-colors">{site.siteName}</div>
                    <div className="text-gray-400 text-xs font-mono">{site.siteCode}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PHASE_COLORS[site.currentPhase]||'bg-gray-100 text-gray-600'}`}>
                    {site.currentPhase?.replace(/_/g,' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <MapPin className="w-3 h-3"/> {[site.village,site.district,site.state].filter(Boolean).join(', ')||'—'}
                </div>
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{(site.treesPlanted||0).toLocaleString('en-IN')} planted</span>
                    <span>{(site.plannedTrees||0).toLocaleString('en-IN')} planned</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sage-600 rounded-full" style={{width:`${site.plannedTrees?Math.min(100,(site.treesPlanted||0)/site.plannedTrees*100):0}%`}}/>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{site._count?.landAssignments||0}</div>
                    <div className="text-gray-400">Farmers</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{site.totalPlannedArea||'—'} ac</div>
                    <div className="text-gray-400">Area</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{site.survivalRate ? `${site.survivalRate}%` : '—'}</div>
                    <div className="text-gray-400">Survival</div>
                  </div>
                </div>
                {site.plantationPartner && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">{site.plantationPartner}</div>
                )}
                <div className="flex items-center justify-end mt-2 text-sage-600 text-xs font-medium group-hover:gap-2 gap-1 transition-all">
                  View Site <ChevronRight className="w-3.5 h-3.5"/>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
