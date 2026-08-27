'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { useState, useEffect } from 'react';
import { Camera, MapPin, Plane, Satellite, Beaker, Upload, CheckCircle2, Plus, Eye, X, Trash2, Loader2 } from 'lucide-react';

const STATUS_COLOR: Record<string,string> = {
  VERIFIED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  PUBLISHED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  SUBMITTED:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
  SENT_BACK:   'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

const HEALTH_OPTIONS = ['HEALTHY', 'STRESSED', 'DISEASED', 'DEAD'];
const emptySample = () => ({ treeId: '', species: '', height: '', diameter: '', health: 'HEALTHY', survived: true, notes: '' });

function UploadBox({ label, accept }: { label: string; accept: string }) {
  return (
    <label className="border-2 border-dashed border-gray-700 hover:border-emerald-500/50 bg-gray-800/50 hover:bg-emerald-500/5 rounded-xl p-4 text-center cursor-pointer transition-all block">
      <Upload className="w-5 h-5 text-gray-500 mx-auto mb-1.5"/>
      <div className="text-xs text-gray-300 font-medium">{label}</div>
      <div className="text-[10px] text-gray-600 mt-0.5">{accept}</div>
      <input type="file" className="hidden"/>
    </label>
  );
}

export default function MeasurePage() {
  const [activeSection, setActiveSection] = useState('surveys');
  const [visits, setVisits]     = useState<any[]>([]);
  const [sites, setSites]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [gpsStatus, setGpsStatus] = useState<'idle'|'capturing'|'captured'>('idle');

  const [form, setForm] = useState({
    siteId: '', visitDate: new Date().toISOString().slice(0,10),
    gpsLat: '', gpsLng: '', recommendations: '', diseaseNotes: '',
    samples: [emptySample()],
  });

  async function load() {
    setLoading(true);
    const [vRes, sRes] = await Promise.all([
      fetch('/api/admin/monitoring-visits'),
      fetch('/api/admin/plantation-sites'),
    ]);
    const [vData, sData] = await Promise.all([vRes.json(), sRes.json()]);
    setVisits(vData.visits || []);
    setSites(sData.sites || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function captureGPS() {
    if (!navigator.geolocation) return;
    setGpsStatus('capturing');
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(p => ({ ...p, gpsLat: String(pos.coords.latitude), gpsLng: String(pos.coords.longitude) }));
      setGpsStatus('captured');
    }, () => setGpsStatus('idle'));
  }

  function updateSample(i: number, key: string, value: any) {
    setForm(p => {
      const samples = [...p.samples];
      samples[i] = { ...samples[i], [key]: value };
      return { ...p, samples };
    });
  }
  function addSample() { setForm(p => ({ ...p, samples: [...p.samples, emptySample()] })); }
  function removeSample(i: number) { setForm(p => ({ ...p, samples: p.samples.filter((_, idx) => idx !== i) })); }

  async function submitVisit() {
    setError('');
    if (!form.siteId) { setError('Select a plantation site'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/monitoring-visits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: form.siteId, visitDate: form.visitDate,
        gpsLat: form.gpsLat ? parseFloat(form.gpsLat) : undefined,
        gpsLng: form.gpsLng ? parseFloat(form.gpsLng) : undefined,
        recommendations: form.recommendations || undefined,
        diseaseNotes: form.diseaseNotes || undefined,
        treeSamples: form.samples.filter(s => s.species || s.treeId).map(s => ({
          ...s, height: s.height ? parseFloat(s.height) : undefined,
          diameter: s.diameter ? parseFloat(s.diameter) : undefined,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Failed to save visit'); return; }
    setShowForm(false);
    setForm({ siteId: '', visitDate: new Date().toISOString().slice(0,10), gpsLat: '', gpsLng: '', recommendations: '', diseaseNotes: '', samples: [emptySample()] });
    load();
  }

  const sections = [
    { id:'surveys',   label:'Monitoring Visits',  icon: CheckCircle2 },
    { id:'evidence',  label:'Plantation Evidence', icon: Camera },
    { id:'drone',     label:'Drone Surveys',       icon: Plane },
    { id:'satellite', label:'Satellite Data',      icon: Satellite },
    { id:'soil',      label:'Soil Data',           icon: Beaker },
  ];

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Measure</h1>
            <p className="text-gray-500 text-xs mt-0.5">Sampling-based field monitoring — official dMRV evidence</p>
          </div>
          {activeSection === 'surveys' && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-semibold">
              <Plus className="w-3.5 h-3.5"/> New Monitoring Visit
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Section tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeSection === s.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 bg-gray-800 border border-gray-700 hover:border-gray-600'
                }`}>
                <s.icon className="w-3.5 h-3.5"/> {s.label}
              </button>
            ))}
          </div>

          {/* Monitoring Visits — real data */}
          {activeSection === 'surveys' && (
            <div className="space-y-4">
              {loading ? (
                <p className="text-gray-500 text-sm">Loading…</p>
              ) : visits.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center text-gray-500 text-sm">
                  No monitoring visits recorded yet. Click "New Monitoring Visit" to log a sampling-based visit.
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800/60">
                      <tr>{['Site','Date','Trees Sampled','Survival','Avg Height','GPS','Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {visits.map((v: any) => (
                        <tr key={v.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-semibold text-white">{v.site?.siteName}</td>
                          <td className="px-4 py-3 text-gray-400">{new Date(v.visitDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 text-gray-300">{v.treeSamples?.length || 0} trees</td>
                          <td className="px-4 py-3 text-gray-300">{v.survivalPct != null ? `${v.survivalPct}%` : '—'}</td>
                          <td className="px-4 py-3 text-gray-300">{v.avgHeight != null ? `${Math.round(v.avgHeight)}cm` : '—'}</td>
                          <td className="px-4 py-3">{v.gpsLat ? <span className="text-emerald-400 text-[10px]">✓ GPS</span> : <span className="text-rose-400 text-[10px]">Missing</span>}</td>
                          <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[v.status] || STATUS_COLOR.SUBMITTED}`}>{v.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Plantation Evidence */}
          {activeSection === 'evidence' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <UploadBox label="Geo-tagged Photos" accept="JPG · PNG · HEIC"/>
                <UploadBox label="Videos" accept="MP4 · MOV"/>
                <UploadBox label="GeoJSON / KML" accept=".geojson · .kml · .kmz"/>
                <UploadBox label="Survey Reports" accept="PDF · DOCX"/>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
                See the <a href="/admin/dmrv/evidence" className="text-emerald-400 underline">Evidence Vault</a> for real community-update and monitoring photos.
              </div>
            </div>
          )}

          {/* Drone Surveys */}
          {activeSection === 'drone' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-white">Upload Drone Survey</h3>
                <div className="grid grid-cols-2 gap-3">
                  <UploadBox label="Drone Images" accept="JPG · TIF · RAW"/>
                  <UploadBox label="Orthomosaic Maps" accept="GeoTIFF · JP2"/>
                  <UploadBox label="NDVI Images" accept="TIF · PNG"/>
                  <UploadBox label="Flight Logs" accept="GPX · CSV · KML"/>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[['Coverage Area','5.2 acres'],['Flight Date','08 Jul 2026'],['Pilot','Aerial Solutions Pvt'],['Resolution','2.5 cm/px']].map(([l,v])=>(
                    <div key={l} className="bg-gray-800 rounded-xl p-3">
                      <div className="text-gray-500 text-[10px]">{l}</div>
                      <div className="text-white font-semibold mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Last Drone Survey — Adinath</h3>
                <div className="h-52 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700">
                  <div className="text-center">
                    <Plane className="w-8 h-8 text-gray-600 mx-auto mb-2"/>
                    <p className="text-gray-500 text-xs">NDVI Map Preview</p>
                    <p className="text-gray-600 text-[10px]">Upload drone imagery to view</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
                  {[['NDVI Avg','0.68 (Good)'],['Canopy','61%'],['Anomalies','3 spots']].map(([l,v])=>(
                    <div key={l} className="bg-gray-800 rounded-xl p-2">
                      <div className="text-[10px] text-gray-500">{l}</div>
                      <div className="text-emerald-400 font-bold text-xs">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Satellite */}
          {activeSection === 'satellite' && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { source:'Sentinel-2', date:'05 Jul 2026', ndvi:'0.71', canopy:'63%', change:'Improving', status:'VERIFIED' },
                { source:'MODIS',      date:'01 Jul 2026', ndvi:'0.68', canopy:'61%', change:'Stable',    status:'VERIFIED' },
                { source:'Landsat 9',  date:'28 Jun 2026', ndvi:'0.65', canopy:'59%', change:'Improving', status:'PENDING' },
              ].map(s => (
                <div key={s.source} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Satellite className="w-4 h-4 text-violet-400"/>
                      <span className="font-semibold text-white text-sm">{s.source}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                  </div>
                  <div className="h-32 bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                    <p className="text-gray-600 text-xs">Satellite Image Preview</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[['Date',s.date],['NDVI',s.ndvi],['Canopy',s.canopy],['Change',s.change]].map(([l,v])=>(
                      <div key={l}><span className="text-gray-500">{l}: </span><span className="text-white font-medium">{v}</span></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Soil */}
          {activeSection === 'soil' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-white">Soil Sample Data</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:'Soil Type', value:'Black Cotton Soil', icon:'🌑' },
                    { label:'Organic Carbon', value:'1.8%', icon:'🌿' },
                    { label:'pH Level', value:'6.8 (Neutral)', icon:'⚗️' },
                    { label:'Moisture', value:'34%', icon:'💧' },
                    { label:'Nitrogen (N)', value:'280 kg/ha', icon:'🧪' },
                    { label:'Phosphorus (P)', value:'18 kg/ha', icon:'🧪' },
                  ].map(d => (
                    <div key={d.label} className="bg-gray-800 rounded-xl p-3">
                      <div className="text-lg mb-1">{d.icon}</div>
                      <div className="text-[10px] text-gray-500">{d.label}</div>
                      <div className="text-white font-semibold text-xs mt-0.5">{d.value}</div>
                    </div>
                  ))}
                </div>
                <UploadBox label="Upload Soil Report (PDF)" accept="PDF · CSV"/>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Soil Health Score</h3>
                <div className="text-center py-6">
                  <div className="text-6xl font-black text-emerald-400">78</div>
                  <div className="text-gray-400 text-sm mt-1">/ 100 Soil Health Score</div>
                  <div className="text-emerald-300 text-xs mt-1 bg-emerald-500/10 inline-block px-3 py-1 rounded-full border border-emerald-500/20">
                    Good — Suitable for Agroforestry
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {[['Organic Matter','72%'],['Nutrient Availability','81%'],['Water Retention','76%'],['Microbial Activity','82%']].map(([l,v])=>(
                    <div key={l}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{l}</span><span className="text-white">{v}</span></div>
                      <div className="h-1.5 bg-gray-700 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{width:v}}/></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Monitoring Visit — sampling-based, not every tree required */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-bold text-white">New Monitoring Visit</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl p-3">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Plantation Site *</label>
                  <select value={form.siteId} onChange={e => setForm(p => ({ ...p, siteId: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Select a site…</option>
                    {sites.map((s: any) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Visit Date</label>
                  <input type="date" value={form.visitDate} onChange={e => setForm(p => ({ ...p, visitDate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"/>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-400">GPS Location</label>
                  <button onClick={captureGPS} type="button" disabled={gpsStatus === 'capturing'}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline disabled:opacity-60">
                    {gpsStatus === 'capturing' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <MapPin className="w-3.5 h-3.5"/>}
                    Detect Automatically
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={form.gpsLat} onChange={e => setForm(p => ({ ...p, gpsLat: e.target.value }))}
                    placeholder="Latitude" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"/>
                  <input type="number" value={form.gpsLng} onChange={e => setForm(p => ({ ...p, gpsLng: e.target.value }))}
                    placeholder="Longitude" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"/>
                </div>
                <p className="text-gray-600 text-[11px] mt-1">Detected automatically when available — you can still type or correct it manually.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Disease / Issues</label>
                <textarea rows={2} value={form.diseaseNotes} onChange={e => setForm(p => ({ ...p, diseaseNotes: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Recommendations / Notes</label>
                <textarea rows={2} value={form.recommendations} onChange={e => setForm(p => ({ ...p, recommendations: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"/>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-400">Tree Samples (sampling-based — not every tree required)</label>
                  <button type="button" onClick={addSample} className="text-emerald-400 text-xs font-semibold">+ Add tree</button>
                </div>
                <div className="space-y-2">
                  {form.samples.map((s, i) => (
                    <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 grid grid-cols-6 gap-2 items-center">
                      <input value={s.treeId} onChange={e => updateSample(i, 'treeId', e.target.value)}
                        placeholder="Tree ID" className="col-span-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"/>
                      <input value={s.species} onChange={e => updateSample(i, 'species', e.target.value)}
                        placeholder="Species" className="col-span-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"/>
                      <input type="number" value={s.height} onChange={e => updateSample(i, 'height', e.target.value)}
                        placeholder="Height cm" className="col-span-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"/>
                      <input type="number" value={s.diameter} onChange={e => updateSample(i, 'diameter', e.target.value)}
                        placeholder="Diam cm" className="col-span-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"/>
                      <select value={s.health} onChange={e => updateSample(i, 'health', e.target.value)}
                        className="col-span-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white">
                        {HEALTH_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <div className="col-span-1 flex items-center justify-between gap-1">
                        <label className="flex items-center gap-1 text-[10px] text-gray-400">
                          <input type="checkbox" checked={s.survived} onChange={e => updateSample(i, 'survived', e.target.checked)}/>
                          Alive
                        </label>
                        <button type="button" onClick={() => removeSample(i)} className="text-rose-400"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-2 sticky bottom-0 bg-gray-900">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-400">Cancel</button>
              <button onClick={submitVisit} disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-gray-950 rounded-lg disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Monitoring Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DMRVLayout>
  );
}
