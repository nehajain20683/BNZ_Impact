'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { useState } from 'react';
import { Camera, MapPin, Plane, Satellite, Beaker, Upload, CheckCircle2, Plus, Eye } from 'lucide-react';

const SURVEYS = [
  { id:'SRV-001', farmer:'Farmer 1', land:'Survey 35/2/k', officer:'Rajan P.', date:'08 Jul 2026', signed:true, photos:12, gps:true },
  { id:'SRV-002', farmer:'Ramesh Jain', land:'Survey 12/k', officer:'Priya S.', date:'07 Jul 2026', signed:true, photos:8, gps:true },
  { id:'SRV-003', farmer:'Sunil Mehta', land:'Survey 78/3', officer:'Amit K.', date:'05 Jul 2026', signed:false, photos:5, gps:false },
];

const EVIDENCE = [
  { id:'EV-001', type:'Geo-tagged Photo', species:'Mango', count:3000, lat:'19.2092', lng:'72.8738', ts:'08 Jul 2026 14:32', device:'Samsung S24', status:'VERIFIED' },
  { id:'EV-002', type:'Geo-tagged Photo', species:'Neem',  count:1000, lat:'19.2098', lng:'72.8741', ts:'08 Jul 2026 14:45', device:'Redmi 12', status:'VERIFIED' },
  { id:'EV-003', type:'Geo-tagged Photo', species:'Teak',  count:500,  lat:'19.2105', lng:'72.8729', ts:'08 Jul 2026 15:01', device:'Motorola G84', status:'PENDING' },
];

const STATUS_COLOR: Record<string,string> = {
  VERIFIED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  PENDING:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
  FAILED:   'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

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

  const sections = [
    { id:'surveys',   label:'Farmer Surveys',     icon: CheckCircle2 },
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
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400"/> Measure
            </h1>
            <p className="text-gray-400 text-xs">Capture digital evidence from field</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl">
            <Plus className="w-3.5 h-3.5"/> Log New Evidence
          </button>
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

          {/* Farmer Surveys */}
          {activeSection === 'surveys' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/60">
                    <tr>{['Survey ID','Farmer','Land','Field Officer','Date','Signed','Photos','GPS','Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {SURVEYS.map(s => (
                      <tr key={s.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono text-emerald-400 text-[11px]">{s.id}</td>
                        <td className="px-4 py-3 font-semibold text-white">{s.farmer}</td>
                        <td className="px-4 py-3 text-gray-400">{s.land}</td>
                        <td className="px-4 py-3 text-gray-300">{s.officer}</td>
                        <td className="px-4 py-3 text-gray-400">{s.date}</td>
                        <td className="px-4 py-3">{s.signed ? <span className="text-emerald-400 text-[10px] font-semibold">✓ Signed</span> : <span className="text-amber-400 text-[10px]">Pending</span>}</td>
                        <td className="px-4 py-3 text-gray-300">{s.photos} photos</td>
                        <td className="px-4 py-3">{s.gps ? <span className="text-emerald-400 text-[10px]">✓ GPS</span> : <span className="text-rose-400 text-[10px]">Missing</span>}</td>
                        <td className="px-4 py-3"><button className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1"><Eye className="w-3 h-3"/> View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/60">
                    <tr>{['Evidence ID','Type','Species','Count','GPS Coords','Timestamp','Device','Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {EVIDENCE.map(e => (
                      <tr key={e.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono text-emerald-400 text-[11px]">{e.id}</td>
                        <td className="px-4 py-3 text-gray-300">{e.type}</td>
                        <td className="px-4 py-3 font-semibold text-white">{e.species}</td>
                        <td className="px-4 py-3 text-white font-bold">{e.count.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-cyan-400">{e.lat}, {e.lng}</td>
                        <td className="px-4 py-3 text-gray-400">{e.ts}</td>
                        <td className="px-4 py-3 text-gray-500">{e.device}</td>
                        <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[e.status]}`}>{e.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    </DMRVLayout>
  );
}
