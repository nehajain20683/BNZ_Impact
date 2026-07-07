'use client';
// src/app/farmer/register/page.tsx — Land Owner Registration (bilingual, multi-step)
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ChevronLeft, ChevronRight, Leaf, MapPin, User,
         Building2, TreePine, FileText, Shield, Users, Save, AlertCircle } from 'lucide-react';

// ── Types ────────────────────────────────────────────────
type StepId = 1|2|3|4|5|6|7|8;
interface StepConfig { id: StepId; en: string; hi: string; icon: any }

// ── Constants ────────────────────────────────────────────
const STEPS: StepConfig[] = [
  { id:1, en:'Verify Mobile',      hi:'मोबाइल सत्यापन',    icon: Shield },
  { id:2, en:'Personal Details',   hi:'व्यक्तिगत विवरण',   icon: User },
  { id:3, en:'Bank Details',       hi:'बैंक विवरण',         icon: Building2 },
  { id:4, en:'Land Details',       hi:'भूमि विवरण',         icon: MapPin },
  { id:5, en:'Ownership',          hi:'स्वामित्व',           icon: Users },
  { id:6, en:'Plantation',         hi:'रोपण प्राथमिकता',   icon: TreePine },
  { id:7, en:'Nominee',            hi:'नामांकित व्यक्ति',   icon: FileText },
  { id:8, en:'Consent',            hi:'सहमति',               icon: Leaf },
];

const SPECIES = ['Neem / नीम','Mango / आम','Bamboo / बांस','Peepal / पीपल',
                 'Sagwan / सागवान','Fruit Trees / फलदार वृक्ष','Mixed Native Species / मिश्रित देशी प्रजातियाँ','Others / अन्य'];
const LAND_TYPES = ['AGRICULTURAL','PRIVATE','WASTELAND','AGROFORESTRY','ORCHARD','COMMUNITY'];
const PLANTATION_TYPES = ['AGROFORESTRY','MIYAWAKI','NATIVE_FOREST','FRUIT_TREES','BAMBOO','MIXED_SPECIES'];
const INDIAN_STATES = ['Maharashtra','Gujarat','Rajasthan','Madhya Pradesh','Uttar Pradesh',
  'Karnataka','Tamil Nadu','Kerala','Andhra Pradesh','Telangana','West Bengal','Bihar','Odisha'];

// ── Styles ───────────────────────────────────────────────
const inp = "w-full border border-sage-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white transition-colors";
const inpErr = "w-full border-2 border-red-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-red-50 transition-colors";
const lbl = "block text-sm font-semibold text-sage-800 mb-1";

function BiLabel({ en, hi, required }: { en: string; hi: string; required?: boolean }) {
  return (
    <label className={lbl}>
      {en}{required && <span className="text-red-500 ml-0.5">*</span>}
      <span className="text-sage-400 font-normal ml-1.5 text-xs">/ {hi}</span>
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-600 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0"/>{msg}</p>;
}

// ── Main Component ───────────────────────────────────────
export default function LandOwnerRegisterPage() {
  const router = useRouter();
  const [step, setStep]       = useState<StepId>(1);
  const [completed, setCompleted] = useState<Set<StepId>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [toast, setToast]     = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [landId, setLandId]   = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp]   = useState('');
  const firstErrRef           = useRef<HTMLDivElement>(null);

  // ── Form state ───────────────────────────────────────
  const [mobile, setMobile]   = useState('');
  const [otp, setOtp]         = useState('');
  const [personal, setPersonal] = useState({
    fullName:'', fatherName:'', dateOfBirth:'', gender:'',
    aadhaarNumber:'', panNumber:'', email:'', alternateMobile:'',
    village:'', taluka:'', district:'', state:'', pincode:'',
    occupation:'', isFarmer: false, farmingExperience:'', password:'', confirmPw:'',
  });
  const [bank, setBank] = useState({ bankAccountName:'', bankName:'', accountNumber:'', ifscCode:'' });
  const [land, setLand] = useState({
    surveyGutNumber:'', khataNumber:'', areaAcres:'', areaOfferedAcres:'',
    areaOfferedUnit:'acres', landType:'', gpsLatitude:'', gpsLongitude:'',
    village:'', taluka:'', district:'', state:'', pincode:'',
  });
  const [ownership, setOwnership] = useState({ ownershipType:'sole', jointOwnerCount:'' });
  const [plantation, setPlantation] = useState({
    plantationPreference:'', speciesPreference:[] as string[],
    speciesOther:'', targetTreeCount:'', plantationStartDate:'',
  });
  const [nominee, setNominee] = useState({
    nomineeName:'', nomineeRelation:'', nomineeDob:'',
    nomineeMobile:'', nomineeAddress:'', nomineeAadhaar:'',
  });
  const [consent, setConsent] = useState(false);

  // Autosave draft every 30s
  useEffect(() => {
    const id = setInterval(() => {
      const draft = { step, personal, bank, land, ownership, plantation, nominee };
      localStorage.setItem('lo_draft', JSON.stringify(draft));
    }, 30000);
    return () => clearInterval(id);
  }, [step, personal, bank, land, ownership, plantation, nominee]);

  // Restore draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('lo_draft');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.personal?.fullName) setPersonal(p => ({ ...p, ...d.personal }));
        if (d.bank?.bankName) setBank(b => ({ ...b, ...d.bank }));
        if (d.land?.areaAcres) setLand(l => ({ ...l, ...d.land }));
        if (d.ownership) setOwnership(d.ownership);
        if (d.plantation) setPlantation(d.plantation);
        if (d.nominee?.nomineeName) setNominee(d.nominee);
      } catch {}
    }
    const id = localStorage.getItem('farmerId');
    if (id) setFarmerId(id);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function setErr(field: string, msg: string) {
    setErrors(e => ({ ...e, [field]: msg }));
  }
  function clearErr(field: string) {
    setErrors(e => { const n = {...e}; delete n[field]; return n; });
  }

  // ── GPS + Reverse Geocoding ──────────────────────────
  async function captureGPS() {
    if (!navigator.geolocation) { setErr('gps', 'GPS not available on this device.'); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      setLand(l => ({ ...l, gpsLatitude: lat, gpsLongitude: lng }));
      clearErr('gps');
      // Reverse geocode
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const addr = data.address || {};
        setLand(l => ({
          ...l,
          village:  addr.village || addr.hamlet || addr.suburb || l.village,
          taluka:   addr.county || addr.state_district || l.taluka,
          district: addr.state_district || addr.county || l.district,
          state:    addr.state || l.state,
          pincode:  addr.postcode || l.pincode,
        }));
        showToast('GPS captured and location auto-filled');
      } catch {
        showToast('GPS captured — please verify location fields');
      }
    }, () => setErr('gps', 'Could not get GPS location. Please enter coordinates manually.'));
  }

  function toggleSpecies(s: string) {
    setPlantation(p => ({
      ...p,
      speciesPreference: p.speciesPreference.includes(s)
        ? p.speciesPreference.filter(x => x !== s)
        : [...p.speciesPreference, s],
    }));
  }

  // ── Validation per step ──────────────────────────────
  function validateStep(s: StepId): boolean {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!mobile || mobile.length < 10) errs.mobile = 'Please enter a valid 10-digit mobile number.';
      if (!otpSent) errs.otpPending = 'Please verify your mobile number first.';
    }
    if (s === 2) {
      if (!personal.fullName.trim()) errs.fullName = 'Please enter your full name.';
      if (personal.aadhaarNumber && !/^\d{12}$/.test(personal.aadhaarNumber.replace(/\s/g,'')))
        errs.aadhaarNumber = 'Please enter a valid 12-digit Aadhaar number.';
      if (!personal.password || personal.password.length < 8)
        errs.password = 'Password must be at least 8 characters.';
      if (personal.password !== personal.confirmPw)
        errs.confirmPw = 'Passwords do not match.';
    }
    if (s === 4) {
      if (!land.areaAcres || parseFloat(land.areaAcres) <= 0)
        errs.areaAcres = 'Please enter an area greater than zero.';
      if (land.areaOfferedAcres && parseFloat(land.areaOfferedAcres) > parseFloat(land.areaAcres || '0'))
        errs.areaOfferedAcres = 'Area offered cannot exceed total area.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTimeout(() => firstErrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return false;
    }
    return true;
  }

  // ── OTP ─────────────────────────────────────────────
  async function sendOTP() {
    if (!mobile || mobile.length < 10) { setErr('mobile','Please enter a valid 10-digit mobile number.'); return; }
    clearErr('mobile'); setLoading(true);
    const res = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '+91' + mobile.replace(/^(\+91|91)/,'') }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) { setOtpSent(true); if (data.devOtp) setDevOtp(data.devOtp); }
    else setErr('mobile', data.error || 'Failed to send OTP. Please try again.');
  }

  async function verifyOTP() {
    setLoading(true);
    const res = await fetch('/api/farmer/otp', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '+91' + mobile.replace(/^(\+91|91)/,''), otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setFarmerId(data.farmerId);
      localStorage.setItem('farmerId', data.farmerId);
      localStorage.setItem('farmerToken', data.token);
      setCompleted(c => new Set([...c, 1 as StepId]));
      setStep(2);
    } else setErr('otp', data.error || 'Invalid OTP. Please check and try again.');
  }

  // ── Save each step ───────────────────────────────────
  async function saveStep(s: StepId) {
    if (!validateStep(s)) return;
    if (s === 1) { await verifyOTP(); return; }

    setLoading(true);
    try {
      if ([2,3,7].includes(s)) {
        const payload: any = {
          mobile: '+91' + mobile.replace(/^(\+91|91)/,''),
          ...personal,
          ...bank,
          ...nominee,
          registrationStep: s,
        };
        if (!payload.mobile && farmerId) payload.mobile = undefined;
        const res  = await fetch('/api/farmer/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) { setErr('save', data.error || 'Failed to save.'); setLoading(false); return; }
        if (data.farmerId) { setFarmerId(data.farmerId); localStorage.setItem('farmerId', data.farmerId); }
      }
      if ([4,5].includes(s) && farmerId) {
        const res  = await fetch('/api/farmer/land', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmerId,
            ...land,
            ...ownership,
            gpsLatitude:      land.gpsLatitude      ? parseFloat(land.gpsLatitude)      : undefined,
            gpsLongitude:     land.gpsLongitude     ? parseFloat(land.gpsLongitude)     : undefined,
            jointOwnerCount:  ownership.jointOwnerCount ? parseInt(ownership.jointOwnerCount) : undefined,
            areaAcres:        land.areaAcres        ? parseFloat(land.areaAcres)        : undefined,
            areaOfferedAcres: land.areaOfferedAcres ? parseFloat(land.areaOfferedAcres) : undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) { setErr('save', data.error || 'Failed to save land.'); setLoading(false); return; }
        if (data.landId) setLandId(data.landId);
      }
      clearErr('save');
      setCompleted(c => new Set([...c, s]));
      showToast('Saved successfully ✓');
      if (s < 8) setStep((s + 1) as StepId);
    } catch (e: any) {
      setErr('save', 'Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  // ── Final submit ─────────────────────────────────────
  async function submitRegistration() {
    if (!consent) { setErr('consent','Please accept the consent to complete registration.'); return; }
    setLoading(true);
    const res  = await fetch('/api/farmer/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '+91' + mobile.replace(/^(\+91|91)/,''),
        ...personal, ...bank, ...nominee,
        carbonConsent: true, registrationStep: 8,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      localStorage.removeItem('lo_draft');
      setCompleted(c => new Set([...c, 8 as StepId]));
      router.push('/farmer/dashboard?registered=1');
    } else setErr('consent', data.error || 'Submission failed.');
  }

  const totalSteps = STEPS.length;
  const progressPct = Math.round((completed.size / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-sage-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <Leaf className="w-6 h-6 text-sage-300"/>
          <div>
            <div className="font-bold text-sm">JITO Green Legacy</div>
            <div className="text-sage-300 text-xs">Land Owner Registration / भूमि स्वामी पंजीकरण</div>
          </div>
          {farmerId && (
            <div className="ml-auto text-right">
              <div className="text-sage-400 text-[10px]">Progress</div>
              <div className="text-sage-200 text-xs font-bold">{progressPct}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-sage-900">
        <div className="h-full bg-sage-400 transition-all duration-500" style={{ width: `${progressPct}%` }}/>
      </div>

      {/* Step navigation — ALL steps always clickable */}
      <div className="bg-white border-b border-sage-100 px-3 py-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max max-w-xl mx-auto">
          {STEPS.map(s => {
            const done = completed.has(s.id);
            const active = s.id === step;
            return (
              <button key={s.id} onClick={() => setStep(s.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  active ? 'bg-sage-700 text-white' :
                  done   ? 'bg-green-100 text-green-700' :
                           'text-sage-400 hover:text-sage-700 hover:bg-sage-50'
                }`}>
                {done ? <CheckCircle className="w-3 h-3"/> : <s.icon className="w-3 h-3"/>}
                {s.en}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">
        {/* Global save error */}
        {errors.save && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/> {errors.save}
          </div>
        )}

        {/* ── STEP 1: Mobile Verification ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm" ref={firstErrRef}>
            <h2 className="font-display text-xl text-sage-950 mb-1">Verify Mobile / मोबाइल सत्यापन</h2>
            <p className="text-sage-500 text-sm mb-5">Enter your mobile number to get started</p>

            {!otpSent ? (
              <>
                <BiLabel en="Mobile Number" hi="मोबाइल नंबर" required/>
                <div className="flex gap-2 mb-1">
                  <span className="border border-sage-200 rounded-xl px-3 py-3 text-sm text-sage-500 bg-sage-50">+91</span>
                  <input type="tel" maxLength={10} placeholder="98765 43210"
                    value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/,'')); clearErr('mobile'); }}
                    className={errors.mobile ? inpErr : inp + " flex-1"}/>
                </div>
                <FieldError msg={errors.mobile}/>
                <button onClick={sendOTP} disabled={loading}
                  className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-xl mt-4 disabled:opacity-60 transition-colors">
                  {loading ? 'Sending OTP…' : 'Send OTP / OTP भेजें'}
                </button>
                <p className="text-center text-sage-400 text-xs mt-3">
                  Already registered? <a href="/farmer/login" className="text-sage-700 font-semibold hover:underline">Login here</a>
                </p>
              </>
            ) : (
              <>
                <p className="text-sage-700 text-sm mb-3 text-center">OTP sent to +91 {mobile}</p>
                {devOtp && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-center mb-3">
                    <div className="text-amber-600 text-xs font-bold uppercase mb-1">Dev OTP</div>
                    <div className="text-amber-800 text-3xl font-mono font-bold tracking-widest">{devOtp}</div>
                  </div>
                )}
                <BiLabel en="Enter OTP" hi="OTP दर्ज करें" required/>
                <input type="number" maxLength={6} placeholder="• • • • • •"
                  value={otp} onChange={e => { setOtp(e.target.value); clearErr('otp'); }}
                  className={(errors.otp ? inpErr : inp) + " text-center text-2xl tracking-widest font-mono mb-1"}/>
                <FieldError msg={errors.otp}/>
                <button onClick={() => saveStep(1)} disabled={loading || otp.length !== 6}
                  className="w-full bg-sage-700 text-white font-bold py-3.5 rounded-xl mt-3 disabled:opacity-60">
                  {loading ? 'Verifying…' : 'Verify & Continue / सत्यापित करें'}
                </button>
                <button onClick={() => { setOtpSent(false); setOtp(''); setDevOtp(''); }}
                  className="w-full text-sage-500 text-xs mt-2 hover:underline">
                  Change number / नंबर बदलें
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 2: Personal Details ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm space-y-4" ref={firstErrRef}>
            <h2 className="font-display text-xl text-sage-950 mb-1">Personal Details / व्यक्तिगत विवरण</h2>
            {[
              { key:'fullName',    en:'Full Name',       hi:'पूरा नाम',       type:'text',  req:true },
              { key:'fatherName',  en:"Father's Name",   hi:'पिता का नाम',    type:'text',  req:false },
              { key:'dateOfBirth', en:'Date of Birth',   hi:'जन्म तिथि',      type:'date',  req:false },
              { key:'aadhaarNumber',en:'Aadhaar Number', hi:'आधार नंबर',       type:'text',  req:false },
              { key:'panNumber',   en:'PAN Number',      hi:'पैन नंबर',        type:'text',  req:false },
              { key:'email',       en:'Email',           hi:'ईमेल',            type:'email', req:false },
              { key:'alternateMobile',en:'Alt. Mobile',  hi:'वैकल्पिक मोबाइल', type:'tel',   req:false },
            ].map(f => (
              <div key={f.key}>
                <BiLabel en={f.en} hi={f.hi} required={f.req}/>
                <input type={f.type} value={(personal as any)[f.key]}
                  onChange={e => { setPersonal(p=>({...p,[f.key]:e.target.value})); clearErr(f.key); }}
                  className={errors[f.key] ? inpErr : inp}/>
                <FieldError msg={errors[f.key]}/>
              </div>
            ))}
            <div>
              <BiLabel en="Gender" hi="लिंग"/>
              <select value={personal.gender}
                onChange={e => setPersonal(p=>({...p,gender:e.target.value}))} className={inp}>
                <option value="">Select / चुनें</option>
                <option value="MALE">Male / पुरुष</option>
                <option value="FEMALE">Female / महिला</option>
                <option value="OTHER">Other / अन्य</option>
              </select>
            </div>
            <div className="border-t border-sage-100 pt-4">
              <h3 className="font-semibold text-sage-800 text-sm mb-3">Address / पता</h3>
              <div className="grid grid-cols-2 gap-3">
                {['village','taluka','district','pincode'].map(f => (
                  <div key={f}>
                    <BiLabel en={f.charAt(0).toUpperCase()+f.slice(1)}
                             hi={{village:'गांव',taluka:'तालुका',district:'जिला',pincode:'पिन कोड'}[f]!}/>
                    <input type="text" value={(personal as any)[f]}
                      onChange={e => setPersonal(p=>({...p,[f]:e.target.value}))} className={inp}/>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <BiLabel en="State" hi="राज्य"/>
                <select value={personal.state}
                  onChange={e => setPersonal(p=>({...p,state:e.target.value}))} className={inp}>
                  <option value="">Select / चुनें</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t border-sage-100 pt-4">
              <h3 className="font-semibold text-sage-800 text-sm mb-3">Occupation & Farming / व्यवसाय</h3>
              <div>
                <BiLabel en="Occupation" hi="व्यवसाय"/>
                <input type="text" placeholder="e.g. Farmer, Landowner, Business"
                  value={personal.occupation}
                  onChange={e => setPersonal(p=>({...p,occupation:e.target.value}))} className={inp}/>
              </div>
              <div className="mt-3">
                <BiLabel en="Are you a Farmer?" hi="क्या आप किसान हैं?"/>
                <div className="flex gap-4 mt-2">
                  {[{v:true,l:'Yes / हाँ'},{v:false,l:'No / नहीं'}].map(o => (
                    <label key={String(o.v)} className="flex items-center gap-2 cursor-pointer text-sm text-sage-700">
                      <input type="radio" checked={personal.isFarmer === o.v}
                        onChange={() => setPersonal(p=>({...p,isFarmer:o.v}))}
                        className="accent-sage-700"/>
                      {o.l}
                    </label>
                  ))}
                </div>
              </div>
              {personal.isFarmer && (
                <div className="mt-3">
                  <BiLabel en="Farming Experience (years)" hi="खेती का अनुभव (वर्ष)"/>
                  <input type="number" placeholder="e.g. 5"
                    value={personal.farmingExperience}
                    onChange={e => setPersonal(p=>({...p,farmingExperience:e.target.value}))} className={inp}/>
                </div>
              )}
            </div>
            <div className="border-t border-sage-100 pt-4">
              <h3 className="font-semibold text-sage-800 text-sm mb-3">Set Password / पासवर्ड सेट करें</h3>
              <div>
                <BiLabel en="Password" hi="पासवर्ड" required/>
                <input type="password" placeholder="Min 8 characters"
                  value={personal.password}
                  onChange={e => { setPersonal(p=>({...p,password:e.target.value})); clearErr('password'); }}
                  className={errors.password ? inpErr : inp}/>
                <FieldError msg={errors.password}/>
              </div>
              <div className="mt-3">
                <BiLabel en="Confirm Password" hi="पासवर्ड की पुष्टि करें" required/>
                <input type="password" placeholder="Repeat password"
                  value={personal.confirmPw}
                  onChange={e => { setPersonal(p=>({...p,confirmPw:e.target.value})); clearErr('confirmPw'); }}
                  className={errors.confirmPw ? inpErr : inp}/>
                <FieldError msg={errors.confirmPw}/>
              </div>
            </div>
            <button onClick={() => saveStep(2)} disabled={loading}
              className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4"/> {loading ? 'Saving…' : 'Save & Continue / सहेजें'}
            </button>
          </div>
        )}

        {/* ── STEP 3: Bank Details ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm space-y-4" ref={firstErrRef}>
            <h2 className="font-display text-xl text-sage-950 mb-1">Bank Details / बैंक विवरण</h2>
            <p className="text-sage-500 text-xs mb-4">For plantation incentives and carbon revenue payments</p>
            {[
              { key:'bankAccountName', en:'Account Holder Name', hi:'खाताधारक का नाम' },
              { key:'bankName',        en:'Bank Name',           hi:'बैंक का नाम' },
              { key:'accountNumber',   en:'Account Number',      hi:'खाता संख्या' },
              { key:'ifscCode',        en:'IFSC Code',           hi:'IFSC कोड' },
            ].map(f => (
              <div key={f.key}>
                <BiLabel en={f.en} hi={f.hi}/>
                <input type="text" value={(bank as any)[f.key]}
                  onChange={e => setBank(b=>({...b,[f.key]:e.target.value}))} className={inp}/>
              </div>
            ))}
            <button onClick={() => saveStep(3)} disabled={loading}
              className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4"/> {loading ? 'Saving…' : 'Save & Continue / सहेजें'}
            </button>
          </div>
        )}

        {/* ── STEP 4: Land Details ── */}
        {step === 4 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm space-y-4" ref={firstErrRef}>
            <h2 className="font-display text-xl text-sage-950 mb-1">Land Details / भूमि विवरण</h2>
            <div>
              <BiLabel en="Survey / Gut Number" hi="सर्वे नंबर / गट नंबर"/>
              <input type="text" placeholder="e.g. 123/1 or 45-A"
                value={land.surveyGutNumber}
                onChange={e => setLand(l=>({...l,surveyGutNumber:e.target.value}))} className={inp}/>
            </div>
            <div>
              <BiLabel en="Khata Number" hi="खाता नंबर"/>
              <input type="text" value={land.khataNumber}
                onChange={e => setLand(l=>({...l,khataNumber:e.target.value}))} className={inp}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <BiLabel en="Total Area (Acres)" hi="कुल क्षेत्र (एकड़)" required/>
                <input type="number" step="0.01" placeholder="e.g. 2.5"
                  value={land.areaAcres}
                  onChange={e => { setLand(l=>({...l,areaAcres:e.target.value})); clearErr('areaAcres'); }}
                  className={errors.areaAcres ? inpErr : inp}/>
                {land.areaAcres && (
                  <p className="text-sage-400 text-xs mt-1">= {(parseFloat(land.areaAcres)*0.404686).toFixed(3)} hectares</p>
                )}
                <FieldError msg={errors.areaAcres}/>
              </div>
              <div>
                <BiLabel en="Area Offered for Project" hi="परियोजना हेतु भूमि"/>
                <div className="flex gap-2">
                  <input type="number" step="0.01" placeholder="0.0"
                    value={land.areaOfferedAcres}
                    onChange={e => { setLand(l=>({...l,areaOfferedAcres:e.target.value})); clearErr('areaOfferedAcres'); }}
                    className={errors.areaOfferedAcres ? inpErr+' flex-1' : inp+' flex-1'}/>
                  <select value={land.areaOfferedUnit}
                    onChange={e => setLand(l=>({...l,areaOfferedUnit:e.target.value}))}
                    className="border border-sage-200 rounded-xl px-2 text-sm bg-white">
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                  </select>
                </div>
                <FieldError msg={errors.areaOfferedAcres}/>
              </div>
            </div>
            <div>
              <BiLabel en="Land Type" hi="भूमि प्रकार"/>
              <select value={land.landType}
                onChange={e => setLand(l=>({...l,landType:e.target.value}))} className={inp}>
                <option value="">Select / चुनें</option>
                {LAND_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            {/* GPS */}
            <div>
              <BiLabel en="GPS Location" hi="GPS स्थान"/>
              <button onClick={captureGPS}
                className="w-full border-2 border-dashed border-sage-300 text-sage-600 py-3 rounded-xl text-sm font-medium hover:bg-sage-50 flex items-center justify-center gap-2 mb-2">
                <MapPin className="w-4 h-4"/> Capture GPS / GPS कैप्चर करें
              </button>
              <FieldError msg={errors.gps}/>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input type="number" step="any" placeholder="Latitude / अक्षांश"
                  value={land.gpsLatitude}
                  onChange={e => setLand(l=>({...l,gpsLatitude:e.target.value}))} className={inp}/>
                <input type="number" step="any" placeholder="Longitude / देशांतर"
                  value={land.gpsLongitude}
                  onChange={e => setLand(l=>({...l,gpsLongitude:e.target.value}))} className={inp}/>
              </div>
            </div>
            {/* Location (auto-filled by GPS) */}
            <div className="border-t border-sage-100 pt-4">
              <p className="text-sage-500 text-xs mb-3">Auto-filled by GPS · editable / GPS द्वारा स्वतः भरा जाता है</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {k:'village',  en:'Village', hi:'गांव'},
                  {k:'taluka',   en:'Taluka',  hi:'तालुका'},
                  {k:'district', en:'District',hi:'जिला'},
                  {k:'pincode',  en:'Pincode', hi:'पिन कोड'},
                ].map(f => (
                  <div key={f.k}>
                    <BiLabel en={f.en} hi={f.hi}/>
                    <input type="text" value={(land as any)[f.k]}
                      onChange={e => setLand(l=>({...l,[f.k]:e.target.value}))} className={inp}/>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <BiLabel en="State" hi="राज्य"/>
                <select value={land.state}
                  onChange={e => setLand(l=>({...l,state:e.target.value}))} className={inp}>
                  <option value="">Select / चुनें</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => saveStep(4)} disabled={loading}
              className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4"/> {loading ? 'Saving…' : 'Save Land / भूमि सहेजें'}
            </button>
          </div>
        )}

        {/* ── STEP 5: Ownership ── */}
        {step === 5 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm space-y-4" ref={firstErrRef}>
            <h2 className="font-display text-xl text-sage-950 mb-1">Land Ownership / भूमि स्वामित्व</h2>
            <div>
              <BiLabel en="Ownership Type" hi="स्वामित्व प्रकार" required/>
              <div className="flex gap-4 mt-2">
                {[{v:'sole',en:'Sole Ownership',hi:'एकल स्वामित्व'},{v:'joint',en:'Joint Ownership',hi:'संयुक्त स्वामित्व'}].map(o => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm text-sage-700">
                    <input type="radio" value={o.v} checked={ownership.ownershipType === o.v}
                      onChange={() => setOwnership(p=>({...p,ownershipType:o.v}))}
                      className="accent-sage-700"/>
                    {o.en} / {o.hi}
                  </label>
                ))}
              </div>
            </div>
            {ownership.ownershipType === 'joint' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div>
                  <BiLabel en="Number of Joint Owners" hi="संयुक्त स्वामियों की संख्या"/>
                  <input type="number" min="1" placeholder="e.g. 2"
                    value={ownership.jointOwnerCount}
                    onChange={e => setOwnership(p=>({...p,jointOwnerCount:e.target.value}))} className={inp}/>
                </div>
                <div className="bg-white rounded-xl border border-amber-200 p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Joint Owner NOC / संयुक्त स्वामी NOC</p>
                  <a href="/templates/joint-owner-noc.pdf" download
                    className="inline-flex items-center gap-2 text-sage-600 hover:text-sage-800 text-sm font-medium border border-sage-200 rounded-lg px-3 py-2 hover:bg-sage-50 mb-3">
                    ⬇ Download NOC Format / NOC प्रारूप डाउनलोड करें
                  </a>
                  <p className="text-amber-600 text-xs italic">
                    NOC upload is <strong>optional</strong> during registration. You can upload it later from your dashboard.
                    / पंजीकरण के दौरान NOC अपलोड <strong>अनिवार्य नहीं है</strong>।
                  </p>
                </div>
              </div>
            )}
            <button onClick={() => saveStep(5)} disabled={loading}
              className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4"/> {loading ? 'Saving…' : 'Save & Continue / सहेजें'}
            </button>
          </div>
        )}

        {/* ── STEP 6: Plantation Preference ── */}
        {step === 6 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm space-y-4" ref={firstErrRef}>
            <h2 className="font-display text-xl text-sage-950 mb-1">Plantation Preference / रोपण प्राथमिकता</h2>
            <div>
              <BiLabel en="Plantation Type" hi="रोपण प्रकार"/>
              <select value={plantation.plantationPreference}
                onChange={e => setPlantation(p=>({...p,plantationPreference:e.target.value}))} className={inp}>
                <option value="">Select / चुनें</option>
                {PLANTATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <BiLabel en="Preferred Species" hi="पसंदीदा प्रजातियाँ"/>
              <div className="flex flex-wrap gap-2 mt-2">
                {SPECIES.map(s => {
                  const isOther = s.startsWith('Others');
                  return (
                    <button key={s} onClick={() => toggleSpecies(s)}
                      className={`px-3 py-1.5 rounded-full text-xs border-2 transition-colors ${
                        plantation.speciesPreference.includes(s)
                          ? 'bg-sage-700 text-white border-sage-700'
                          : 'border-sage-200 text-sage-600 hover:border-sage-400'
                      }`}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {plantation.speciesPreference.some(s => s.startsWith('Others')) && (
                <div className="mt-3">
                  <BiLabel en="Please specify species" hi="कृपया प्रजाति बताएं"/>
                  <input type="text" placeholder="Enter species name"
                    value={plantation.speciesOther}
                    onChange={e => setPlantation(p=>({...p,speciesOther:e.target.value}))} className={inp}/>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <BiLabel en="Number of Trees" hi="पेड़ों की संख्या"/>
                <input type="number" placeholder="Estimated count"
                  value={plantation.targetTreeCount}
                  onChange={e => setPlantation(p=>({...p,targetTreeCount:e.target.value}))} className={inp}/>
              </div>
              <div>
                <BiLabel en="Preferred Start Date" hi="पसंदीदा प्रारंभ तिथि"/>
                <input type="date" value={plantation.plantationStartDate}
                  onChange={e => setPlantation(p=>({...p,plantationStartDate:e.target.value}))} className={inp}/>
              </div>
            </div>
            <button onClick={() => saveStep(6)} disabled={loading}
              className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4"/> {loading ? 'Saving…' : 'Save & Continue / सहेजें'}
            </button>
          </div>
        )}

        {/* ── STEP 7: Nominee Details ── */}
        {step === 7 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm space-y-4" ref={firstErrRef}>
            <h2 className="font-display text-xl text-sage-950 mb-1">Nominee Details / नामांकित व्यक्ति</h2>
            <p className="text-sage-500 text-xs mb-2">All fields optional / सभी फ़ील्ड वैकल्पिक हैं</p>
            {[
              { k:'nomineeName',    en:'Nominee Name',         hi:'नामांकित का नाम' },
              { k:'nomineeRelation',en:'Relationship',         hi:'संबंध' },
              { k:'nomineeMobile',  en:'Mobile Number',        hi:'मोबाइल नंबर' },
              { k:'nomineeAddress', en:'Address',              hi:'पता' },
              { k:'nomineeAadhaar', en:'Aadhaar (Optional)',   hi:'आधार (वैकल्पिक)' },
            ].map(f => (
              <div key={f.k}>
                <BiLabel en={f.en} hi={f.hi}/>
                <input type="text" value={(nominee as any)[f.k]}
                  onChange={e => setNominee(n=>({...n,[f.k]:e.target.value}))} className={inp}/>
              </div>
            ))}
            <div>
              <BiLabel en="Date of Birth" hi="जन्म तिथि"/>
              <input type="date" value={nominee.nomineeDob}
                onChange={e => setNominee(n=>({...n,nomineeDob:e.target.value}))} className={inp}/>
            </div>
            <button onClick={() => saveStep(7)} disabled={loading}
              className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4"/> {loading ? 'Saving…' : 'Save & Continue / सहेजें'}
            </button>
          </div>
        )}

        {/* ── STEP 8: Consent ── */}
        {step === 8 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm" ref={firstErrRef}>
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🌱</div>
              <h2 className="font-display text-xl text-sage-950 mb-1">Carbon Project Consent / कार्बन परियोजना सहमति</h2>
            </div>
            <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 mb-5 text-sm text-sage-700 leading-relaxed">
              <p className="font-semibold text-sage-900 mb-2">Declaration of Participation / भागीदारी की घोषणा</p>
              <p>I voluntarily participate in carbon sequestration and environmental projects conducted under <strong>JITO Green Legacy</strong> and authorize monitoring including geo-tagged photography, satellite monitoring, and periodic field verification.</p>
              <p className="mt-2 text-sage-500 text-xs">मैं स्वेच्छा से JITO Green Legacy के अंतर्गत कार्बन परियोजनाओं में भाग लेता/लेती हूँ।</p>
              <p className="mt-2">I confirm that all information provided is true and correct to the best of my knowledge.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); clearErr('consent'); }}
                className="mt-0.5 w-5 h-5 accent-sage-700 flex-shrink-0"/>
              <span className="text-sm text-sage-800 font-medium">
                I agree / मैं सहमत हूँ <span className="text-red-500">*</span>
              </span>
            </label>
            <FieldError msg={errors.consent}/>

            {/* Registration summary */}
            {farmerId && (
              <div className="bg-sage-50 rounded-xl border border-sage-100 p-4 mb-4 text-sm space-y-1">
                <div className="font-semibold text-sage-800 mb-2">Registration Summary / पंजीकरण सारांश</div>
                <div className="flex justify-between"><span className="text-sage-500">Name / नाम</span><span className="font-medium text-sage-900">{personal.fullName}</span></div>
                <div className="flex justify-between"><span className="text-sage-500">Mobile / मोबाइल</span><span className="font-medium text-sage-900">+91 {mobile}</span></div>
                {land.areaAcres && <div className="flex justify-between"><span className="text-sage-500">Land Area / भूमि</span><span className="font-medium text-sage-900">{land.areaAcres} acres</span></div>}
                <div className="flex justify-between"><span className="text-sage-500">Completed Steps</span>
                  <span className="font-medium text-green-600">{completed.size}/{totalSteps}</span></div>
              </div>
            )}

            <button onClick={submitRegistration} disabled={loading || !consent}
              className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {loading ? 'Submitting…' : '✅ Complete Registration / पंजीकरण पूर्ण करें'}
            </button>
          </div>
        )}

        {/* Navigation row */}
        {step > 1 && step < 8 && (
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(s => (s - 1) as StepId)}
              className="flex-1 border border-sage-300 text-sage-700 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-sage-50">
              <ChevronLeft className="w-4 h-4"/> Back
            </button>
            <button onClick={() => setStep(s => (s + 1) as StepId)}
              className="flex-1 border border-sage-300 text-sage-700 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-sage-50">
              Skip <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        )}

        <p className="text-center text-sage-400 text-xs mt-4">
          Progress auto-saved · <button onClick={() => localStorage.setItem('lo_draft', JSON.stringify({ step, personal, bank, land, ownership, plantation, nominee }))} className="hover:underline">Save Draft</button>
        </p>
      </div>
    </div>
  );
}
