'use client';
// /farmer/land — Add land parcel with photo + KML upload
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { MapPin, Upload, X, Image, FileText, ChevronLeft, CheckCircle, Loader2 } from 'lucide-react';

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white";
const STATES = ['Maharashtra','Gujarat','Rajasthan','Madhya Pradesh','Karnataka','Tamil Nadu','Uttar Pradesh','Goa','Delhi','Punjab'];
const ACCEPTED_IMAGE = ['image/jpeg','image/jpg','image/png'];

function ImageUpload({ label, hi, onChange, preview, onRemove }: any) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} <span className="text-gray-400 font-normal text-xs">/ {hi}</span>
        <span className="text-gray-400 font-normal text-xs ml-1">(JPG/PNG only)</span>
      </label>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img src={preview} alt={label} className="w-full h-48 object-cover"/>
          <button onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
            <X className="w-3.5 h-3.5"/>
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-colors">
          <Image className="w-8 h-8 text-gray-300"/>
          <span className="text-sm text-gray-400">Click to upload photo</span>
          <span className="text-xs text-gray-300">JPG or PNG, max 5MB</span>
        </button>
      )}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!ACCEPTED_IMAGE.includes(file.type)) { alert('Only JPG/PNG allowed'); return; }
          if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB'); return; }
          const reader = new FileReader();
          reader.onload = () => onChange(reader.result as string, file);
          reader.readAsDataURL(file);
        }}/>
    </div>
  );
}

function KMLUpload({ onChange, file, onRemove }: any) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        KML File <span className="text-gray-400 font-normal text-xs">/ KML फ़ाइल</span>
        <span className="text-gray-400 font-normal text-xs ml-1">(JPG/PNG of KML map)</span>
      </label>
      {file ? (
        <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl p-3">
          {file.preview ? (
            <img src={file.preview} alt="KML" className="w-16 h-16 object-cover rounded-lg border"/>
          ) : (
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600"/>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size/1024).toFixed(0)} KB</p>
          </div>
          <button onClick={onRemove} className="text-red-400 hover:text-red-600 p-1">
            <X className="w-4 h-4"/>
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-colors">
          <FileText className="w-7 h-7 text-gray-300"/>
          <span className="text-sm text-gray-400">Upload KML map image</span>
          <span className="text-xs text-gray-300">JPG or PNG of map screenshot</span>
        </button>
      )}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!ACCEPTED_IMAGE.includes(f.type)) { alert('Only JPG/PNG allowed'); return; }
          if (f.size > 5*1024*1024) { alert('File too large. Max 5MB'); return; }
          const reader = new FileReader();
          reader.onload = () => onChange({ name: f.name, size: f.size, preview: reader.result as string });
          reader.readAsDataURL(f);
        }}/>
    </div>
  );
}

export default function FarmerLandPage() {
  const org    = useOrgConfig();
  const router = useRouter();
  const primaryColor = org.primaryColor || '#2d5a1b';

  const [form, setForm] = useState({
    surveyGutNumber:'', khataNumber:'', areaAcres:'', areaOfferedAcres:'',
    landType:'', village:'', taluka:'', district:'', state:'Maharashtra', pincode:'',
    gpsLatitude:'', gpsLongitude:'', waterAvailability:'', securityStatus:'',
  });

  const [landPhoto, setLandPhoto] = useState<string|null>(null);
  const [kmlFile, setKmlFile]     = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const farmerId = typeof window !== 'undefined' ? localStorage.getItem('farmerId') : '';

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function captureGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      setForm(p => ({ ...p, gpsLatitude: lat, gpsLongitude: lng }));
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const addr = (await res.json()).address || {};
        setForm(p => ({
          ...p,
          village:  addr.village || addr.hamlet || p.village,
          taluka:   addr.county  || p.taluka,
          district: addr.state_district || p.district,
          state:    addr.state   || p.state,
          pincode:  addr.postcode|| p.pincode,
        }));
      } catch {}
    });
  }

  async function handleSubmit() {
    if (!farmerId) { setError('Session expired. Please login again.'); return; }
    setLoading(true); setError('');
    const res = await fetch('/api/farmer/land', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId,
        ...form,
        gpsLatitude:      form.gpsLatitude      ? parseFloat(form.gpsLatitude)      : undefined,
        gpsLongitude:     form.gpsLongitude     ? parseFloat(form.gpsLongitude)     : undefined,
        areaAcres:        form.areaAcres        ? parseFloat(form.areaAcres)        : undefined,
        areaOfferedAcres: form.areaOfferedAcres ? parseFloat(form.areaOfferedAcres) : undefined,
        landPhotoBase64:  landPhoto,
        kmlPhotoBase64:   kmlFile?.preview,
        kmlFileName:      kmlFile?.name,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success || data.land) {
      setSuccess(true);
      setTimeout(() => router.push('/farmer/dashboard'), 1500);
    } else {
      setError(data.error || 'Failed to save land. Try again.');
    }
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: primaryColor }}/>
        <h2 className="text-xl font-bold text-gray-900">Land Added!</h2>
        <p className="text-gray-500 text-sm mt-1">Redirecting to dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white px-4 py-4 sticky top-0 z-40" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/farmer/dashboard')} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="font-bold text-sm">{org.loaded ? org.name : ''}</div>
            <div className="text-white/70 text-xs">Add Land Parcel / भूमि पार्सल जोड़ें</div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">{error}</div>
        )}

        {/* Land details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Land Details / भूमि विवरण</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k:'surveyGutNumber', en:'Survey/Gut No.',  hi:'सर्वे नंबर' },
              { k:'khataNumber',     en:'Khata Number',    hi:'खाता नंबर' },
              { k:'areaAcres',       en:'Area (Acres)',    hi:'क्षेत्र', type:'number' },
              { k:'areaOfferedAcres',en:'Area Offered',    hi:'प्रस्तावित', type:'number' },
            ].map(fl => (
              <div key={fl.k}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{fl.en} / {fl.hi}</label>
                <input type={fl.type||'text'} value={(form as any)[fl.k]} onChange={f(fl.k)} className={inp}/>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Land Type / भूमि प्रकार</label>
            <select value={form.landType} onChange={f('landType')} className={inp}>
              <option value="">Select</option>
              {['AGRICULTURAL','PRIVATE','WASTELAND','AGROFORESTRY','ORCHARD'].map(t => (
                <option key={t} value={t}>{t.replace('_',' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Location / स्थान</h2>
          <button onClick={captureGPS}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:bg-gray-50">
            <MapPin className="w-4 h-4"/> Capture GPS / GPS कैप्चर करें
          </button>
          {form.gpsLatitude && (
            <div className="bg-green-50 rounded-xl p-2 text-xs font-mono text-green-700 text-center">
              📍 {form.gpsLatitude}, {form.gpsLongitude}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { k:'village', en:'Village', hi:'गांव' },
              { k:'taluka',  en:'Taluka',  hi:'तालुका' },
              { k:'district',en:'District',hi:'जिला' },
              { k:'pincode', en:'Pincode', hi:'पिन कोड' },
            ].map(fl => (
              <div key={fl.k}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{fl.en} / {fl.hi}</label>
                <input value={(form as any)[fl.k]} onChange={f(fl.k)} className={inp}/>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">State / राज्य</label>
            <select value={form.state} onChange={f('state')} className={inp}>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Photos / फ़ोटो</h2>
          <ImageUpload
            label="Land Photo"
            hi="भूमि फ़ोटो"
            preview={landPhoto}
            onChange={(base64: string) => setLandPhoto(base64)}
            onRemove={() => setLandPhoto(null)}
          />
          <KMLUpload
            file={kmlFile}
            onChange={(f: any) => setKmlFile(f)}
            onRemove={() => setKmlFile(null)}
          />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
          style={{ backgroundColor: primaryColor }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
          Save Land Parcel / भूमि पार्सल सहेजें
        </button>
      </div>
    </div>
  );
}
