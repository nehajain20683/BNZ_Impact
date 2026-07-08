'use client';
// src/app/farmer/land/page.tsx — Add land parcel (no OTP required, uses existing session)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Save, AlertCircle, CheckCircle } from 'lucide-react';

const LAND_TYPES = ['AGRICULTURAL','PRIVATE','WASTELAND','AGROFORESTRY','ORCHARD','COMMUNITY'];
const INDIAN_STATES = ['Maharashtra','Gujarat','Rajasthan','Madhya Pradesh','Uttar Pradesh',
  'Karnataka','Tamil Nadu','Kerala','Andhra Pradesh','Telangana'];
const SPECIES = ['Neem / नीम','Mango / आम','Bamboo / बांस','Peepal / पीपल',
  'Sagwan / सागवान','Fruit Trees / फलदार वृक्ष','Mixed Native Species / मिश्रित देशी','Others / अन्य'];

const inp = "w-full border border-sage-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white";

function BiLabel({ en, hi, required }: { en: string; hi: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-sage-800 mb-1">
      {en}{required && <span className="text-red-500 ml-0.5">*</span>}
      <span className="text-sage-400 font-normal ml-1.5 text-xs">/ {hi}</span>
    </label>
  );
}

export default function AddLandPage() {
  const router  = useRouter();
  const [farmerId, setFarmerId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [errors, setErrors]     = useState<Record<string,string>>({});
  const [land, setLand] = useState({
    surveyGutNumber:'', khataNumber:'', areaAcres:'', areaOfferedAcres:'',
    areaOfferedUnit:'acres', landType:'', gpsLatitude:'', gpsLongitude:'',
    village:'', taluka:'', district:'', state:'Maharashtra', pincode:'',
    waterAvailability:'', securityStatus:'',
    ownershipType:'sole', jointOwnerCount:'',
    plantationPreference:'', speciesOther:'',
  });
  const [species, setSpecies] = useState<string[]>([]);

  useEffect(() => {
    const id = localStorage.getItem('farmerId');
    if (!id) { router.push('/farmer/login'); return; }
    setFarmerId(id);
  }, []);

  async function captureGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      setLand(l => ({ ...l, gpsLatitude: lat, gpsLongitude: lng }));
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const addr = data.address || {};
        setLand(l => ({
          ...l,
          village:  addr.village || addr.hamlet || addr.suburb || l.village,
          taluka:   addr.county || l.taluka,
          district: addr.state_district || addr.county || l.district,
          state:    addr.state || l.state,
          pincode:  addr.postcode || l.pincode,
        }));
        setToast('GPS captured and location auto-filled ✓');
        setTimeout(() => setToast(''), 3000);
      } catch {}
    });
  }

  async function handleSave() {
    const errs: Record<string,string> = {};
    if (!land.areaAcres || parseFloat(land.areaAcres) <= 0)
      errs.areaAcres = 'Please enter an area greater than zero.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const res  = await fetch('/api/farmer/land', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId,
        ...land,
        speciesPreference: species,
        gpsLatitude:      land.gpsLatitude      ? parseFloat(land.gpsLatitude)      : undefined,
        gpsLongitude:     land.gpsLongitude     ? parseFloat(land.gpsLongitude)     : undefined,
        areaAcres:        land.areaAcres        ? parseFloat(land.areaAcres)        : undefined,
        areaOfferedAcres: land.areaOfferedAcres ? parseFloat(land.areaOfferedAcres) : undefined,
        jointOwnerCount:  land.jointOwnerCount  ? parseInt(land.jointOwnerCount)    : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setToast('Land parcel added successfully!');
      setTimeout(() => router.push('/farmer/dashboard'), 1500);
    } else {
      setErrors({ save: data.error || 'Failed to save land.' });
    }
  }

  if (!farmerId) return <div className="min-h-screen flex items-center justify-center text-sage-600">Loading…</div>;

  return (
    <div className="min-h-screen bg-sage-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}

      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <MapPin className="w-5 h-5 text-sage-300"/>
          <div>
            <div className="font-bold text-sm">Add Land Parcel / भूमि पार्सल जोड़ें</div>
            <div className="text-sage-300 text-xs">JITO Green Legacy</div>
          </div>
          <button onClick={() => router.push('/farmer/dashboard')} className="ml-auto text-sage-400 hover:text-white text-sm">← Back</button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {errors.save && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/> {errors.save}
          </div>
        )}

        {/* Land Details */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm space-y-4">
          <h2 className="font-display text-lg text-sage-950">Land Details / भूमि विवरण</h2>

          <div>
            <BiLabel en="Survey / Gut Number" hi="सर्वे नंबर / गट नंबर"/>
            <input value={land.surveyGutNumber} onChange={e => setLand(l=>({...l,surveyGutNumber:e.target.value}))} className={inp} placeholder="e.g. 354/2k"/>
          </div>
          <div>
            <BiLabel en="Khata Number" hi="खाता नंबर"/>
            <input value={land.khataNumber} onChange={e => setLand(l=>({...l,khataNumber:e.target.value}))} className={inp}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <BiLabel en="Total Area (Acres)" hi="कुल क्षेत्र (एकड़)" required/>
              <input type="number" step="0.01" value={land.areaAcres}
                onChange={e => { setLand(l=>({...l,areaAcres:e.target.value})); setErrors(er=>({...er,areaAcres:''})); }}
                className={errors.areaAcres ? inp.replace('border-sage-200','border-red-400') : inp} placeholder="e.g. 2.5"/>
              {land.areaAcres && <p className="text-sage-400 text-xs mt-1">= {(parseFloat(land.areaAcres)*0.404686).toFixed(3)} hectares</p>}
              {errors.areaAcres && <p className="text-red-500 text-xs mt-1">{errors.areaAcres}</p>}
            </div>
            <div>
              <BiLabel en="Area Offered for Project" hi="परियोजना हेतु भूमि"/>
              <div className="flex gap-2">
                <input type="number" step="0.01" value={land.areaOfferedAcres}
                  onChange={e => setLand(l=>({...l,areaOfferedAcres:e.target.value}))} className={inp + ' flex-1'} placeholder="0.0"/>
                <select value={land.areaOfferedUnit} onChange={e => setLand(l=>({...l,areaOfferedUnit:e.target.value}))}
                  className="border border-sage-200 rounded-xl px-2 text-sm bg-white">
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <BiLabel en="Land Type" hi="भूमि प्रकार"/>
            <select value={land.landType} onChange={e => setLand(l=>({...l,landType:e.target.value}))} className={inp}>
              <option value="">Select / चुनें</option>
              {LAND_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>

          <div>
            <BiLabel en="Water Availability" hi="जल उपलब्धता"/>
            <select value={land.waterAvailability} onChange={e => setLand(l=>({...l,waterAvailability:e.target.value}))} className={inp}>
              <option value="">Select / चुनें</option>
              <option value="RAIN_FED">Rain Fed / वर्षा आधारित</option>
              <option value="IRRIGATED">Irrigated / सिंचित</option>
              <option value="BOREWELL">Borewell / बोरवेल</option>
              <option value="CANAL">Canal / नहर</option>
              <option value="RIVER">River / नदी</option>
              <option value="OTHER">Other / अन्य</option>
            </select>
          </div>

          <div>
            <BiLabel en="Land Security / Fencing" hi="भूमि सुरक्षा / बाड़"/>
            <select value={land.securityStatus} onChange={e => setLand(l=>({...l,securityStatus:e.target.value}))} className={inp}>
              <option value="">Select / चुनें</option>
              <option value="FENCED">Fully Fenced / पूर्ण बाड़</option>
              <option value="PARTIALLY_FENCED">Partially Fenced / आंशिक बाड़</option>
              <option value="UNFENCED">Unfenced / बिना बाड़</option>
              <option value="WALL">Compound Wall / दीवार</option>
              <option value="OTHER">Other / अन्य</option>
            </select>
          </div>
        </div>

        {/* GPS + Location */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm space-y-4">
          <h2 className="font-display text-lg text-sage-950">Location / स्थान</h2>
          <button onClick={captureGPS}
            className="w-full border-2 border-dashed border-sage-300 text-sage-600 py-3 rounded-xl text-sm font-medium hover:bg-sage-50 flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4"/> Capture GPS / GPS कैप्चर करें
          </button>
          {land.gpsLatitude && (
            <div className="bg-sage-50 rounded-xl p-3 text-xs text-sage-600 font-mono">
              📍 {land.gpsLatitude}, {land.gpsLongitude}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[{k:'village',en:'Village',hi:'गांव'},{k:'taluka',en:'Taluka',hi:'तालुका'},
              {k:'district',en:'District',hi:'जिला'},{k:'pincode',en:'Pincode',hi:'पिन कोड'}].map(f=>(
              <div key={f.k}>
                <BiLabel en={f.en} hi={f.hi}/>
                <input value={(land as any)[f.k]} onChange={e=>setLand(l=>({...l,[f.k]:e.target.value}))} className={inp}/>
              </div>
            ))}
          </div>
          <div>
            <BiLabel en="State" hi="राज्य"/>
            <select value={land.state} onChange={e=>setLand(l=>({...l,state:e.target.value}))} className={inp}>
              {INDIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Ownership */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm space-y-4">
          <h2 className="font-display text-lg text-sage-950">Ownership / स्वामित्व</h2>
          <div className="flex gap-4">
            {[{v:'sole',en:'Sole / एकल'},{v:'joint',en:'Joint / संयुक्त'}].map(o=>(
              <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm text-sage-700">
                <input type="radio" value={o.v} checked={land.ownershipType===o.v}
                  onChange={()=>setLand(l=>({...l,ownershipType:o.v}))} className="accent-sage-700"/>
                {o.en}
              </label>
            ))}
          </div>
          {land.ownershipType === 'joint' && (
            <div>
              <BiLabel en="Number of Joint Owners" hi="संयुक्त स्वामियों की संख्या"/>
              <input type="number" value={land.jointOwnerCount}
                onChange={e=>setLand(l=>({...l,jointOwnerCount:e.target.value}))} className={inp} placeholder="e.g. 2"/>
              <p className="text-amber-600 text-xs mt-1">NOC can be uploaded later from your dashboard.</p>
            </div>
          )}
        </div>

        {/* Species preference */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm space-y-4">
          <h2 className="font-display text-lg text-sage-950">Species Preference / पसंदीदा प्रजातियाँ</h2>
          <div className="flex flex-wrap gap-2">
            {SPECIES.map(s=>(
              <button key={s} onClick={()=>setSpecies(sp=>sp.includes(s)?sp.filter(x=>x!==s):[...sp,s])}
                className={`px-3 py-1.5 rounded-full text-xs border-2 transition-colors ${
                  species.includes(s) ? 'bg-sage-700 text-white border-sage-700' : 'border-sage-200 text-sage-600 hover:border-sage-400'
                }`}>
                {s}
              </button>
            ))}
          </div>
          {species.some(s=>s.startsWith('Others')) && (
            <div>
              <BiLabel en="Specify species" hi="प्रजाति बताएं"/>
              <input value={land.speciesOther} onChange={e=>setLand(l=>({...l,speciesOther:e.target.value}))} className={inp}/>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={loading}
          className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 text-base">
          <Save className="w-5 h-5"/> {loading ? 'Saving…' : 'Save Land Parcel / भूमि सहेजें'}
        </button>
      </div>
    </div>
  );
}
