'use client';
// src/app/admin/plantation-sites/[id]/page.tsx — Site Detail: 5-tab enterprise dashboard
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, TreePine, MapPin, Users, Leaf, CheckCircle,
         Activity, BarChart2, FileText, X, Edit, ChevronDown } from 'lucide-react';

const PHASES = ['PLANNING','LAND_PREPARATION','PIT_DIGGING','PLANTATION','GAP_FILLING','MONITORING','COMPLETED'];
const ACTIVITY_TYPES = ['PIT_DIGGING','SAPLING_DELIVERY','PLANTATION','IRRIGATION','FERTILIZER',
                        'WEEDING','GAP_FILLING','MONITORING','SURVIVAL_SURVEY'];
const LAND_STAGES = ['ASSIGNED','SURVEY_COMPLETED','DOCS_VERIFIED','LAND_APPROVED',
  'ASSIGNED_TO_SITE','PIT_DIGGING','SAPLINGS_DELIVERED','PLANTATION_COMPLETED',
  'MONITORING','GAP_FILLING','CARBON_ELIGIBLE','VERIFIED','CREDITS_ISSUED'];
const PHASE_COLORS: Record<string,string> = {
  PLANNING:'bg-gray-100 text-gray-700', LAND_PREPARATION:'bg-blue-100 text-blue-700',
  PIT_DIGGING:'bg-amber-100 text-amber-700', PLANTATION:'bg-green-100 text-green-700',
  GAP_FILLING:'bg-teal-100 text-teal-700', MONITORING:'bg-purple-100 text-purple-700',
  COMPLETED:'bg-emerald-100 text-emerald-800',
};

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400";

export default function PlantationSiteDetailPage() {
  const { id } = useParams() as { id: string };
  const [site, setSite]       = useState<any>(null);
  const [dash, setDash]       = useState<any>(null);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard'|'farmers'|'activities'|'monitoring'|'documents'|'timeline'>('dashboard');
  const [toast, setToast]     = useState('');
  const [phaseEdit, setPhaseEdit] = useState(false);
  const [newPhase, setNewPhase]   = useState('');

  // Modals
  const [showAssign, setShowAssign]   = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [assignForm, setAssignForm]   = useState<any>({farmerId:'',landId:'',treesAssigned:'',plantationDate:'',remarks:''});
  const [activityForm, setActivityForm] = useState<any>({date:'',activityType:'PLANTATION',description:'',team:'',workers:'',treesPlanted:'',remarks:''});
  const [monitorForm, setMonitorForm] = useState<any>({visitDate:'',survivalCount:'',deadTrees:'',avgHeight:'',diseaseNotes:'',recommendations:'',gpsLat:'',gpsLng:''});
  const [farmerSearch, setFarmerSearch] = useState('');
  const [farmerResults, setFarmerResults] = useState<any[]>([]);

  function showToast(m: string) { setToast(m); setTimeout(()=>setToast(''),3000); }

  async function loadSite() {
    const [sRes, dRes] = await Promise.all([
      fetch(`/api/admin/plantation-sites/${id}`),
      fetch(`/api/admin/plantation-sites/${id}/dashboard`),
    ]);
    const sd = await sRes.json();
    const dd = await dRes.json();
    setSite(sd.site);
    setDash(dd);
    setFarmers(sd.site?.landAssignments || []);
    setNewPhase(sd.site?.currentPhase || 'PLANNING');
    setLoading(false);
  }

  useEffect(() => { loadSite(); }, [id]);

  async function searchFarmers() {
    if (farmerSearch.length < 2) return;
    const res  = await fetch(`/api/admin/farmers?q=${farmerSearch}&status=APPROVED`);
    const data = await res.json();
    setFarmerResults(data.farmers || []);
  }

  async function assignFarmer() {
    const res  = await fetch(`/api/admin/plantation-sites/${id}/assignments`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(assignForm),
    });
    const data = await res.json();
    if (data.success) { showToast('Farmer assigned ✓'); setShowAssign(false); setAssignForm({farmerId:'',landId:'',treesAssigned:'',plantationDate:'',remarks:''}); loadSite(); }
    else showToast('Error: ' + data.error);
  }

  async function logActivity() {
    const res  = await fetch(`/api/admin/plantation-sites/${id}/activities`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(activityForm),
    });
    const data = await res.json();
    if (data.success) { showToast('Activity logged ✓'); setShowActivity(false); loadSite(); }
    else showToast('Error: ' + data.error);
  }

  async function logMonitoring() {
    const res  = await fetch(`/api/admin/plantation-sites/${id}/monitoring`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(monitorForm),
    });
    const data = await res.json();
    if (data.success) { showToast('Monitoring logged ✓'); setShowMonitor(false); loadSite(); }
    else showToast('Error: ' + data.error);
  }

  async function updatePhase() {
    await fetch(`/api/admin/plantation-sites/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ currentPhase: newPhase }),
    });
    setPhaseEdit(false); showToast(`Phase updated to ${newPhase}`); loadSite();
  }

  async function updateStage(assignmentId: string, stage: string) {
    await fetch(`/api/admin/plantation-sites/${id}/assignments`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ assignmentId, stage }),
    });
    showToast('Stage updated ✓'); loadSite();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading site…</div>;
  if (!site)   return <div className="min-h-screen flex items-center justify-center text-gray-400">Site not found</div>;

  const pct = site.plannedTrees > 0 ? Math.round((site.treesPlanted||0) / site.plannedTrees * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">✓ {toast}</div>
      )}

      {/* Assign Farmer Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-900">Assign Farmer Land</h3>
              <button onClick={()=>setShowAssign(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Search Farmer *</label>
                <div className="flex gap-2">
                  <input value={farmerSearch} onChange={e=>setFarmerSearch(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&searchFarmers()}
                    placeholder="Name, Farmer ID, village…" className={inp}/>
                  <button onClick={searchFarmers} className="bg-sage-600 text-white px-3 py-2 rounded-xl text-sm">Search</button>
                </div>
                {farmerResults.length > 0 && (
                  <div className="border border-gray-200 rounded-xl mt-1 max-h-40 overflow-y-auto">
                    {farmerResults.map((f:any)=>(
                      <button key={f.id} onClick={()=>{
                        setAssignForm((p:any)=>({...p,farmerId:f.id,landId:f.lands?.[0]?.id||''}));
                        setFarmerResults([]);
                        setFarmerSearch(f.fullName);
                      }} className="w-full text-left px-3 py-2 hover:bg-sage-50 text-sm border-b last:border-0">
                        <div className="font-medium">{f.fullName}</div>
                        <div className="text-gray-400 text-xs">{f.farmerIdGenerated} · {f.village}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Trees to Assign *</label>
                <input type="number" value={assignForm.treesAssigned} onChange={e=>setAssignForm((p:any)=>({...p,treesAssigned:e.target.value}))} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Plantation Date</label>
                <input type="date" value={assignForm.plantationDate} onChange={e=>setAssignForm((p:any)=>({...p,plantationDate:e.target.value}))} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Remarks</label>
                <input value={assignForm.remarks} onChange={e=>setAssignForm((p:any)=>({...p,remarks:e.target.value}))} className={inp}/></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowAssign(false)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={assignFarmer} className="flex-1 bg-sage-700 text-white font-bold py-2.5 rounded-xl text-sm">✓ Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivity && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-900">Log Plantation Activity</h3>
              <button onClick={()=>setShowActivity(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Date *</label>
                <input type="date" value={activityForm.date} onChange={e=>setActivityForm((p:any)=>({...p,date:e.target.value}))} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Activity Type *</label>
                <select value={activityForm.activityType} onChange={e=>setActivityForm((p:any)=>({...p,activityType:e.target.value}))} className={inp}>
                  {ACTIVITY_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Team</label>
                <input value={activityForm.team} onChange={e=>setActivityForm((p:any)=>({...p,team:e.target.value}))} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Workers</label>
                <input type="number" value={activityForm.workers} onChange={e=>setActivityForm((p:any)=>({...p,workers:e.target.value}))} className={inp}/></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Farmer / Assignment <span className="text-gray-400">(optional)</span></label>
                <select value={activityForm.assignmentId} onChange={e=>setActivityForm((p:any)=>({...p,assignmentId:e.target.value}))} className={inp}>
                  <option value="">All / Site-wide</option>
                  {farmers.map((a:any)=>(
                    <option key={a.id} value={a.id}>{a.farmer?.fullName} — {a.treesAssigned} trees</option>
                  ))}
                </select></div>
              {activityForm.activityType === 'PLANTATION' && (
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Trees Planted</label>
                  <input type="number" value={activityForm.treesPlanted} onChange={e=>setActivityForm((p:any)=>({...p,treesPlanted:e.target.value}))} className={inp}/>
                  <p className="text-xs text-gray-400 mt-1">This will update the farmer's planted count automatically</p>
                </div>
              )}
              {activityForm.activityType === 'SURVIVAL_SURVEY' && (
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Trees Surviving</label>
                  <input type="number" value={activityForm.treesSurviving} onChange={e=>setActivityForm((p:any)=>({...p,treesSurviving:e.target.value}))} className={inp}/>
                </div>
              )}
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Description / Remarks</label>
                <textarea value={activityForm.description} onChange={e=>setActivityForm((p:any)=>({...p,description:e.target.value}))} className={inp} rows={2}/></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowActivity(false)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={logActivity} className="flex-1 bg-sage-700 text-white font-bold py-2.5 rounded-xl text-sm">✓ Log Activity</button>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Modal */}
      {showMonitor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-900">Log Monitoring Visit</h3>
              <button onClick={()=>setShowMonitor(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Visit Date *</label>
                <input type="date" value={monitorForm.visitDate} onChange={e=>setMonitorForm((p:any)=>({...p,visitDate:e.target.value}))} className={inp}/></div>
              {[['survivalCount','Survival Count','number'],['deadTrees','Dead Trees','number'],
                ['avgHeight','Avg Height (cm)','number'],['gpsLat','GPS Latitude','number'],['gpsLng','GPS Longitude','number']].map(([k,l,t])=>(
                <div key={k as string}><label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
                  <input type={t as string} value={monitorForm[k as string]} onChange={e=>setMonitorForm((p:any)=>({...p,[k]:e.target.value}))} className={inp}/></div>
              ))}
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Disease / Issues</label>
                <textarea value={monitorForm.diseaseNotes} onChange={e=>setMonitorForm((p:any)=>({...p,diseaseNotes:e.target.value}))} className={inp} rows={2}/></div>
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Recommendations</label>
                <textarea value={monitorForm.recommendations} onChange={e=>setMonitorForm((p:any)=>({...p,recommendations:e.target.value}))} className={inp} rows={2}/></div>
            </div>
            {monitorForm.survivalCount && site.treesPlanted && (
              <div className="mt-3 bg-sage-50 rounded-xl p-3 text-sm">
                <strong>Survival: {Math.round(parseInt(monitorForm.survivalCount)/site.treesPlanted*100)}%</strong>
                · Mortality: {Math.round((1-parseInt(monitorForm.survivalCount)/site.treesPlanted)*100)}%
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowMonitor(false)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={logMonitoring} className="flex-1 bg-sage-700 text-white font-bold py-2.5 rounded-xl text-sm">✓ Log Visit</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-forest-950 text-white px-6 py-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin/plantation-sites" className="text-forest-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></Link>
            <div>
              <div className="font-bold text-lg">{site.siteName}</div>
              <div className="text-forest-400 text-xs font-mono">{site.siteCode} · {[site.village,site.district,site.state].filter(Boolean).join(', ')}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phaseEdit ? (
              <div className="flex gap-2">
                <select value={newPhase} onChange={e=>setNewPhase(e.target.value)} className="text-xs border rounded-lg px-2 py-1 bg-white text-gray-700">
                  {PHASES.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
                </select>
                <button onClick={updatePhase} className="bg-green-600 text-white text-xs px-3 py-1 rounded-lg">Save</button>
                <button onClick={()=>setPhaseEdit(false)} className="bg-gray-600 text-white text-xs px-2 py-1 rounded-lg">✕</button>
              </div>
            ) : (
              <button onClick={()=>setPhaseEdit(true)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer ${PHASE_COLORS[site.currentPhase]||'bg-gray-100 text-gray-700'}`}>
                {site.currentPhase?.replace(/_/g,' ')} ✎
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="bg-forest-900 px-6 pb-4 max-w-screen-xl mx-auto">
        <div className="flex justify-between text-xs text-forest-400 mb-1">
          <span>{(site.treesPlanted||0).toLocaleString('en-IN')} trees planted</span>
          <span>{pct}% of {(site.plannedTrees||0).toLocaleString('en-IN')} planned</span>
        </div>
        <div className="h-2 bg-forest-800 rounded-full overflow-hidden">
          <div className="h-full bg-sage-500 rounded-full transition-all" style={{width:`${pct}%`}}/>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-5 overflow-x-auto">
          {[
            { id:'dashboard', label:'Dashboard',   icon: BarChart2 },
            { id:'farmers',   label:`Farmers (${farmers.length})`, icon: Users },
            { id:'activities',label:'Activities',  icon: Activity },
            { id:'monitoring',label:'Monitoring',  icon: Leaf },
            { id:'timeline',  label:'Timeline',    icon: CheckCircle },
            { id:'documents', label:'Documents',   icon: FileText },
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab===t.id ? 'bg-sage-700 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <t.icon className="w-3.5 h-3.5"/> {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && dash && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { l:'Total Area',       v:`${dash.summary.totalArea} ac` },
                { l:'Farmers',          v:dash.summary.totalFarmers },
                { l:'Planned Trees',    v:(dash.summary.plannedTrees||0).toLocaleString('en-IN') },
                { l:'Trees Planted',    v:(dash.summary.treesPlanted||0).toLocaleString('en-IN') },
                { l:'Survival',         v:`${dash.summary.survivalPct}%` },
                { l:'Est. Carbon tCO₂', v:dash.summary.estimatedCarbon||'—' },
                { l:'Carbon Credits',   v:dash.summary.carbonCredits||'—' },
                { l:'Partner',          v:dash.summary.partner },
                { l:'Activities',       v:dash.summary.activityCount },
                { l:'Monitoring Visits',v:dash.summary.monitoringCount },
              ].map(s=>(
                <div key={s.l} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                  <div className="font-black text-gray-900 text-lg leading-tight">{s.v}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Species breakdown */}
            {dash.speciesBreakdown?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Species Distribution</h3>
                <div className="space-y-2">
                  {dash.speciesBreakdown.map((s:any)=>(
                    <div key={s.species}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{s.species}</span>
                        <span>{s.planned.toLocaleString('en-IN')} ({s.pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sage-500 rounded-full" style={{width:`${s.pct}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GIS Summary — GPS from assigned farmers */}
            {dash.farmerProgress?.length > 0 && site.landAssignments?.some((a: any) => a.land?.gpsLatitude) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">📍 GIS Coverage — Assigned Land Parcels</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {site.landAssignments?.filter((a: any) => a.land?.gpsLatitude).map((a: any) => (
                    <div key={a.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs">
                      <div className="font-semibold text-blue-900 mb-1">{a.farmer?.fullName}</div>
                      <div className="font-mono text-blue-700">{a.land?.gpsLatitude?.toFixed(5)}, {a.land?.gpsLongitude?.toFixed(5)}</div>
                      <div className="text-blue-500 mt-1">{a.land?.areaAcres} acres · {a.land?.village}</div>
                      <a href={`https://www.google.com/maps?q=${a.land.gpsLatitude},${a.land.gpsLongitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline mt-1 inline-block">Open in Maps →</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Farmer progress table */}
            {dash.farmerProgress?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Farmer Progress</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Farmer','Assigned','Planted','Surviving','Stage'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {dash.farmerProgress.map((f:any,i:number)=>(
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{f.name}</td>
                        <td className="px-4 py-2 text-gray-600">{f.assigned}</td>
                        <td className="px-4 py-2 text-gray-600">{f.planted}</td>
                        <td className="px-4 py-2 text-green-600 font-semibold">{f.surviving}</td>
                        <td className="px-4 py-2">
                          <span className="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">{f.stage?.replace(/_/g,' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── FARMERS TAB ── */}
        {activeTab === 'farmers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Assigned Farmer Lands</h3>
              <button onClick={()=>setShowAssign(true)} className="flex items-center gap-1.5 bg-sage-700 text-white text-xs font-bold px-3 py-2 rounded-xl">
                <Plus className="w-3.5 h-3.5"/> Assign Farmer Land
              </button>
            </div>
            {farmers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3"/>
                <p className="text-gray-500 text-sm mb-2">No farmers assigned yet</p>
                <button onClick={()=>setShowAssign(true)} className="text-sage-600 text-sm font-semibold hover:underline">Assign your first farmer →</button>
              </div>
            ) : farmers.map((a:any)=>(
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{a.farmer?.fullName}</div>
                    <div className="text-gray-400 text-xs">{a.farmer?.farmerIdGenerated} · {a.farmer?.mobile}</div>
                    {a.land && <div className="text-gray-400 text-xs mt-0.5">Survey: {a.land.surveyGutNumber||'—'} · {a.land.areaAcres} acres · {a.land.village}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sage-700 text-sm">{a.treesAssigned} trees</div>
                    <select value={a.stage} onChange={e=>updateStage(a.id, e.target.value)}
                      className="mt-1 text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none">
                      {LAND_STAGES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-gray-400">Planted: </span><span className="font-medium">{a.treesPlanted}</span></div>
                  <div><span className="text-gray-400">Surviving: </span><span className="font-medium text-green-600">{a.treesSurviving}</span></div>
                  <div><span className="text-gray-400">Date: </span><span className="font-medium">{a.plantationDate?new Date(a.plantationDate).toLocaleDateString('en-IN'):'—'}</span></div>
                </div>
                {/* GIS Info from farmer land */}
                {a.land?.gpsLatitude && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-1 font-mono">
                      📍 {a.land.gpsLatitude?.toFixed(6)}, {a.land.gpsLongitude?.toFixed(6)}
                    </span>
                    <a href={`https://www.google.com/maps?q=${a.land.gpsLatitude},${a.land.gpsLongitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">View on Map →</a>
                  </div>
                )}
                {a.stageHistory?.[0] && (
                  <div className="mt-1 text-xs text-gray-400 italic">Last update: {a.stageHistory[0].stage?.replace(/_/g,' ')} · {new Date(a.stageHistory[0].date).toLocaleDateString('en-IN')}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── ACTIVITIES TAB ── */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="font-semibold text-gray-900">Plantation Activities</h3>
              <button onClick={()=>setShowActivity(true)} className="flex items-center gap-1.5 bg-sage-700 text-white text-xs font-bold px-3 py-2 rounded-xl">
                <Plus className="w-3.5 h-3.5"/> Log Activity
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['Date','Type','Description','Team','Workers','Trees','Remarks'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(site.activities||[]).map((a:any)=>(
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-2"><span className="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">{a.activityType?.replace(/_/g,' ')}</span></td>
                      <td className="px-4 py-2 text-gray-700">{a.description||'—'}</td>
                      <td className="px-4 py-2 text-gray-500">{a.team||'—'}</td>
                      <td className="px-4 py-2 text-gray-500">{a.workers||'—'}</td>
                      <td className="px-4 py-2 font-semibold text-green-700">{a.treesPlanted||'—'}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{a.remarks||'—'}</td>
                    </tr>
                  ))}
                  {!(site.activities?.length) && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No activities logged</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MONITORING TAB ── */}
        {activeTab === 'monitoring' && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="font-semibold text-gray-900">Monitoring Visits</h3>
              <button onClick={()=>setShowMonitor(true)} className="flex items-center gap-1.5 bg-sage-700 text-white text-xs font-bold px-3 py-2 rounded-xl">
                <Plus className="w-3.5 h-3.5"/> Log Visit
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['Date','Survival','Dead','Height','Survival %','Mortality %','GPS','Notes'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(site.monitoringVisits||[]).map((v:any)=>(
                    <tr key={v.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 text-xs">{new Date(v.visitDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-2 font-semibold text-green-700">{v.survivalCount??'—'}</td>
                      <td className="px-4 py-2 text-red-500">{v.deadTrees??'—'}</td>
                      <td className="px-4 py-2 text-gray-600">{v.avgHeight ? `${v.avgHeight} cm` : '—'}</td>
                      <td className="px-4 py-2"><span className={`font-bold ${(v.survivalPct||0)>=85?'text-green-600':'text-amber-600'}`}>{v.survivalPct ? `${v.survivalPct}%` : '—'}</span></td>
                      <td className="px-4 py-2 text-red-500">{v.mortalityPct ? `${v.mortalityPct}%` : '—'}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{v.gpsLat ? `${v.gpsLat?.toFixed(4)}, ${v.gpsLng?.toFixed(4)}` : '—'}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs max-w-[150px] truncate">{v.recommendations||v.diseaseNotes||'—'}</td>
                    </tr>
                  ))}
                  {!(site.monitoringVisits?.length) && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No monitoring visits</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 max-w-2xl">
            <h3 className="font-semibold text-gray-900">Project Timeline</h3>
            {(site.timelineEvents||[]).map((ev:any, i:number)=>(
              <div key={ev.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-sage-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i+1}</div>
                  {i < (site.timelineEvents||[]).length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1"/>}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 mb-2">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-gray-900 text-sm">{ev.title}</div>
                    <div className="text-gray-400 text-xs">{new Date(ev.eventDate).toLocaleDateString('en-IN')}</div>
                  </div>
                  {ev.description && <p className="text-gray-500 text-xs mt-1">{ev.description}</p>}
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">{ev.eventType?.replace(/_/g,' ')}</span>
                </div>
              </div>
            ))}
            {!(site.timelineEvents?.length) && <p className="text-gray-400 text-sm">No timeline events yet</p>}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Document Repository</h3>
              <p className="text-xs text-gray-400">Admin uploads site documents here. Farmer documents are uploaded by farmers.</p>
            </div>
            {[
              { key:'PLANTATION_PLAN',     label:'Plantation Plan',       who:'Admin' },
              { key:'FARMER_CONSENTS',     label:'Farmer Consents',       who:'Admin' },
              { key:'GPS_MAPS',            label:'GPS Maps / KML Files',  who:'Admin / Farmer' },
              { key:'NURSERY_BILLS',       label:'Nursery Bills',         who:'Admin' },
              { key:'SAPLING_CHALLANS',    label:'Sapling Delivery Challans', who:'Admin' },
              { key:'MONITORING_REPORTS',  label:'Monitoring Reports',    who:'Admin / Field Officer' },
              { key:'AUDIT_REPORTS',       label:'Audit Reports',         who:'Admin / Auditor' },
              { key:'CARBON_CALCULATIONS', label:'Carbon Calculations',   who:'Carbon Team' },
            ].map(folder=>{
              const docs = (site.siteDocuments||[]).filter((d:any)=>d.folder===folder.key);
              return (
                <div key={folder.key} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{folder.label}</h4>
                      <span className="text-gray-400 text-[10px]">Uploaded by: {folder.who}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{docs.length} files</span>
                      <label className="flex items-center gap-1 text-xs bg-sage-700 text-white px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-sage-800">
                        + Upload
                        <input type="file" accept="image/*,application/pdf,.kml,.kmz,.geojson,.xlsx,.csv" className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const res = await fetch(`/api/admin/plantation-sites/${id}/documents`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  folder: folder.key,
                                  fileName: file.name,
                                  fileUrl: reader.result,
                                  fileSize: file.size,
                                }),
                              });
                              const data = await res.json();
                              if (data.success) { showToast(`${file.name} uploaded ✓`); loadSite(); }
                              else showToast('Upload failed: ' + data.error);
                            };
                            reader.readAsDataURL(file);
                          }}/>
                      </label>
                    </div>
                  </div>
                  {docs.length > 0 ? (
                    <div className="space-y-1 mt-2">
                      {docs.map((d:any)=>(
                        <div key={d.id} className="flex items-center justify-between py-1.5 border-t border-gray-50 text-xs">
                          <div>
                            <span className="text-gray-700 font-medium">{d.fileName}</span>
                            {d.version > 1 && <span className="ml-1.5 text-gray-400">v{d.version}</span>}
                            <span className="text-gray-300 ml-2">{new Date(d.uploadedAt).toLocaleDateString('en-IN')}</span>
                          </div>
                          <div className="flex gap-2">
                            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="text-sage-600 hover:underline">View</a>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this document?')) return;
                                await fetch(`/api/admin/plantation-sites/${id}/documents`, {
                                  method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ documentId: d.id }),
                                });
                                showToast('Deleted'); loadSite();
                              }}
                              className="text-red-400 hover:text-red-600">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs mt-1">No documents yet — click Upload to add</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
