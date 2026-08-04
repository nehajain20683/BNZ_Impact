'use client';
// src/app/farmer/register/page.tsx
// Bilingual (English/Hindi) 8-step land owner registration
// Fully tenant-aware: branding, orgId, farmer ID prefix all from org config
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import {
  Shield, User, Landmark, MapPin, Users,
  TreePine, UserCheck, FileCheck, ChevronRight,
  ChevronLeft, CheckCircle, Loader2
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
type Step = 1|2|3|4|5|6|7|8;

const STEPS = [
  { step:1, en:'Verify Mobile',    hi:'मोबाइल सत्यापन',  icon: Shield },
  { step:2, en:'Personal Details', hi:'व्यक्तिगत विवरण',  icon: User },
  { step:3, en:'Bank Details',     hi:'बैंक विवरण',       icon: Landmark },
  { step:4, en:'Land Details',     hi:'भूमि विवरण',       icon: MapPin },
  { step:5, en:'Ownership',        hi:'स्वामित्व',        icon: Users },
  { step:6, en:'Plantation',       hi:'वृक्षारोपण',       icon: TreePine },
  { step:7, en:'Nominee',          hi:'नामांकित व्यक्ति', icon: UserCheck },
  { step:8, en:'Consent',          hi:'सहमति',            icon: FileCheck },
];

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 bg-white";
const STATES = ['Maharashtra','Gujarat','Rajasthan','Madhya Pradesh','Karnataka','Tamil Nadu','Uttar Pradesh','Goa'];

function BiLabel({ en, hi, req }: { en: string; hi: string; req?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {en}{req && <span className="text-red-500 ml-0.5">*</span>}
      <span className="text-gray-400 font-normal ml-1.5 text-xs">/ {hi}</span>
    </label>
  );
}

export default function FarmerRegisterPage() {
  const org    = useOrgConfig();

  const router = useRouter();

  const [step, setStep]           = useState<Step>(1);
  const [farmerId, setFarmerId]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState('');
  const [errors, setErrors]       = useState<Record<string,string>>({});

  // Step 1 — OTP
  const [mobile, setMobile]       = useState('');
  const [otp, setOtp]             = useState('');
  const [otpSent, setOtpSent]     = useState(false);

  // Step 2 — Personal
  const [personal, setPersonal]   = useState({
    fullName:'', dob:'', gender:'', aadhaar:'', pan:'',
    fatherName:'', occupation:'', alternateMobile:'', email:'',
  });

  // Step 3 — Bank
  const [bank, setBank]           = useState({
    bankName:'', accountNumber:'', ifscCode:'', bankAccountName:'',
  });

  // Step 4 — Land
  const [land, setLand]           = useState({
    surveyGutNumber:'', khataNumber:'', areaAcres:'', areaOfferedAcres:'',
    landType:'', village:'', taluka:'', district:'', state:'Maharashtra', pincode:'',
    gpsLatitude:'', gpsLongitude:'', waterAvailability:'', securityStatus:'',
  });

  // Step 5 — Ownership
  const [ownership, setOwnership] = useState({ ownershipType:'sole', jointOwnerCount:'' });

  // Step 6 — Plantation
  const [plantation, setPlantation] = useState({ plantationPreference:'', speciesOther:'' });
  const [species, setSpecies]       = useState<string[]>([]);

  // Step 7 — Nominee
  const [nominee, setNominee]     = useState({
    nomineeName:'', nomineeRelation:'', nomineeDob:'',
    nomineeMobile:'', nomineeAddress:'', nomineeAadhaar:'',
  });

  // Step 8 — Consent
  const [consent, setConsent]     = useState(false);

  const pct = Math.round((step / 8) * 100);
  const primaryColor = org.primaryColor || '#2d5a1b';

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  // ── Step 1: Send OTP ──────────────────────────────────────────
  async function sendOtp() {
    if (!mobile || mobile.length < 10) { setErrors({ mobile: 'Enter valid 10-digit mobile' }); return; }
    setLoading(true); setErrors({});
    const res  = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, action: 'send' }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) { setOtpSent(true); showToast('OTP sent to +91 ' + mobile); }
    else setErrors({ mobile: data.error || 'Failed to send OTP' });
  }

  async function verifyOtp() {
    if (!otp || otp.length !== 6) { setErrors({ otp: 'Enter 6-digit OTP' }); return; }
    setLoading(true); setErrors({});
    const res  = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp, action: 'verify' }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setFarmerId(data.farmerId);
      localStorage.setItem('farmerId', data.farmerId);
      localStorage.setItem('farmerMobile', `+91${mobile}`);
      if (data.isProfileComplete) { router.push('/farmer/dashboard'); return; }
      setStep(2);
    } else setErrors({ otp: data.error || 'Invalid OTP' });
  }

  // ── Step 2-7: Save profile data ──────────────────────────────
  async function saveStep(nextStep: Step) {
    if (!farmerId) return;
    setLoading(true);

    const payload: any = { farmerId };
    if (step === 2) Object.assign(payload, personal);
    if (step === 3) Object.assign(payload, bank);
    if (step === 4) Object.assign(payload, {
      ...land,
      gpsLatitude:      land.gpsLatitude  ? parseFloat(land.gpsLatitude)  : undefined,
      gpsLongitude:     land.gpsLongitude ? parseFloat(land.gpsLongitude) : undefined,
      areaAcres:        land.areaAcres    ? parseFloat(land.areaAcres)    : undefined,
      areaOfferedAcres: land.areaOfferedAcres ? parseFloat(land.areaOfferedAcres) : undefined,
    });
    if (step === 5) Object.assign(payload, {
      ...ownership,
      jointOwnerCount: ownership.jointOwnerCount ? parseInt(ownership.jointOwnerCount) : undefined,
    });
    if (step === 6) Object.assign(payload, { plantationPreference: plantation.plantationPreference || undefined, speciesPreference: species });
    if (step === 7) Object.assign(payload, nominee);
    payload.registrationStep = nextStep - 1;

    const res  = await fetch('/api/farmer/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success || data.farmer) setStep(nextStep);
    else showToast(data.error || 'Save failed');
  }

  // ── Step 4: Save land separately ─────────────────────────────
  async function saveLandAndNext() {
    if (!land.areaAcres || parseFloat(land.areaAcres) <= 0) {
      setErrors({ areaAcres: 'Enter a valid area' }); return;
    }
    setLoading(true); setErrors({});
    // Save land parcel
    await fetch('/api/farmer/land', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId,
        ...land,
        gpsLatitude:  land.gpsLatitude  ? parseFloat(land.gpsLatitude)  : undefined,
        gpsLongitude: land.gpsLongitude ? parseFloat(land.gpsLongitude) : undefined,
        areaAcres:    land.areaAcres    ? parseFloat(land.areaAcres)    : undefined,
      }),
    }).catch(() => {});
    // Save profile step
    await fetch('/api/farmer/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, registrationStep: 4 }),
    }).catch(() => {});
    setLoading(false);
    setStep(5);
  }

  // ── Step 8: Complete registration ────────────────────────────
  async function completeRegistration() {
    if (!consent) { setErrors({ consent: 'Please accept the terms' }); return; }
    setLoading(true);
    await fetch('/api/farmer/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, registrationStep: 8, status: 'DOCUMENTS_PENDING', ...nominee }),
    });
    setLoading(false);
    router.push('/farmer/dashboard?registered=1');
  }

  async function captureGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      setLand(l => ({ ...l, gpsLatitude: lat, gpsLongitude: lng }));
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const addr = (await res.json()).address || {};
        setLand(l => ({
          ...l,
          village:  addr.village || addr.hamlet || l.village,
          taluka:   addr.county  || l.taluka,
          district: addr.state_district || l.district,
          state:    addr.state   || l.state,
          pincode:  addr.postcode|| l.pincode,
        }));
        showToast('GPS captured ✓');
      } catch {}
    });
  }

  const focusStyle = { '--tw-ring-color': primaryColor } as any;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: primaryColor }}>
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}

      {/* Header — tenant branded */}
      <div className="text-white px-4 py-4 sticky top-0 z-40" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded-lg object-contain bg-white/20 p-0.5"/>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {org.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-sm">{org.loaded ? org.name : 'Loading...'}</div>
              <div className="text-white/70 text-[10px]">Land Owner Registration / भूमि स्वामी पंजीकरण</div>
            </div>
          </div>
          <div className="text-right text-xs text-white/80">
            <div>Progress</div>
            <div className="font-bold text-white">{pct}%</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-xl mx-auto mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }}/>
        </div>
      </div>

      {/* Step tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="max-w-xl mx-auto flex px-2">
          {STEPS.map(s => {
            const done    = s.step < step;
            const current = s.step === step;
            // Allow free navigation if farmerId exists (after OTP verified)
            const canNav  = !!farmerId;
            return (
              <button key={s.step}
                onClick={() => canNav && setStep(s.step as Step)}
                disabled={!canNav}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 text-center transition-colors text-[10px] font-medium border-b-2 ${
                  canNav ? 'cursor-pointer' : 'cursor-default'
                } ${current ? 'border-current' : 'border-transparent'} ${
                  done ? 'text-green-600' : current ? '' : 'text-gray-300'
                }`}
                style={current ? { color: primaryColor, borderColor: primaryColor } : {}}>
                <s.icon className="w-3.5 h-3.5 mb-0.5"/>
                <span className="hidden sm:block">{s.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">

          {/* ── STEP 1: Verify Mobile ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl text-gray-900">Verify Mobile / मोबाइल सत्यापन</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your mobile number to get started</p>
              </div>
              <div>
                <BiLabel en="Mobile Number" hi="मोबाइल नंबर" req/>
                <div className="flex gap-2">
                  <div className="border border-gray-200 rounded-xl px-3 py-3 text-gray-500 text-sm font-medium bg-gray-50">+91</div>
                  <input type="tel" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g,'').slice(0,10))}
                    className={inp + (errors.mobile ? ' border-red-400' : '')} placeholder="98765 43210" maxLength={10}/>
                </div>
                {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
              </div>
              {!otpSent ? (
                <button onClick={sendOtp} disabled={loading}
                  className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                  Send OTP / OTP भेजें
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <BiLabel en="Enter OTP" hi="OTP दर्ज करें" req/>
                    <input type="tel" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                      className={inp + (errors.otp ? ' border-red-400' : '')} placeholder="6-digit OTP" maxLength={6}/>
                    {errors.otp && <p className="text-red-500 text-xs mt-1">{errors.otp}</p>}
                  </div>
                  <button onClick={verifyOtp} disabled={loading}
                    className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}>
                    Verify & Continue / सत्यापित करें
                  </button>
                  <button onClick={() => setOtpSent(false)} className="w-full text-sm text-gray-400 hover:text-gray-600">
                    ← Change number
                  </button>
                </div>
              )}
              <p className="text-center text-xs text-gray-400">
                Already registered?{' '}
                <a href="/farmer/login" className="font-bold" style={{ color: primaryColor }}>Login here</a>
              </p>
            </div>
          )}

          {/* ── STEP 2: Personal Details ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Personal Details / व्यक्तिगत विवरण</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { k:'fullName',    en:'Full Name',        hi:'पूरा नाम',           req:true },
                  { k:'fatherName',  en:"Father's Name",    hi:'पिता का नाम',        req:true },
                  { k:'dob',         en:'Date of Birth',    hi:'जन्म तिथि',          req:true, type:'date' },
                  { k:'aadhaar',     en:'Aadhaar Number',   hi:'आधार नंबर',          req:true },
                  { k:'pan',         en:'PAN Number',       hi:'पैन नंबर' },
                  { k:'occupation',  en:'Occupation',       hi:'व्यवसाय' },
                  { k:'alternateMobile', en:'Alternate Mobile', hi:'वैकल्पिक मोबाइल' },
                  { k:'email',       en:'Email',            hi:'ईमेल',               type:'email' },
                ].map(f => (
                  <div key={f.k}>
                    <BiLabel en={f.en} hi={f.hi} req={f.req}/>
                    {f.k === 'gender' ? (
                      <select value={(personal as any)[f.k]} onChange={e => setPersonal(p => ({ ...p, [f.k]: e.target.value }))} className={inp}>
                        <option value="">Select</option>
                        <option value="MALE">Male / पुरुष</option>
                        <option value="FEMALE">Female / महिला</option>
                        <option value="OTHER">Other / अन्य</option>
                      </select>
                    ) : (
                      <input type={f.type || 'text'} value={(personal as any)[f.k]}
                        onChange={e => setPersonal(p => ({ ...p, [f.k]: e.target.value }))}
                        className={inp}/>
                    )}
                  </div>
                ))}
                <div>
                  <BiLabel en="Gender" hi="लिंग" req/>
                  <select value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))} className={inp}>
                    <option value="">Select / चुनें</option>
                    <option value="MALE">Male / पुरुष</option>
                    <option value="FEMALE">Female / महिला</option>
                    <option value="OTHER">Other / अन्य</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Bank Details ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Bank Details / बैंक विवरण</h2>
              <p className="text-sm text-gray-500">For future payments / भविष्य के भुगतान के लिए</p>
              {[
                { k:'bankAccountName', en:'Account Holder Name', hi:'खाताधारक का नाम' },
                { k:'bankName',        en:'Bank Name',           hi:'बैंक का नाम' },
                { k:'accountNumber',   en:'Account Number',      hi:'खाता नंबर' },
                { k:'ifscCode',        en:'IFSC Code',           hi:'IFSC कोड' },
              ].map(f => (
                <div key={f.k}>
                  <BiLabel en={f.en} hi={f.hi}/>
                  <input value={(bank as any)[f.k]}
                    onChange={e => setBank(b => ({ ...b, [f.k]: e.target.value }))}
                    className={inp}/>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 4: Land Details ── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Land Details / भूमि विवरण</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k:'surveyGutNumber', en:'Survey/Gut Number', hi:'सर्वे नंबर', span:1 },
                  { k:'khataNumber',     en:'Khata Number',      hi:'खाता नंबर',  span:1 },
                  { k:'areaAcres',       en:'Total Area (Acres)',hi:'कुल क्षेत्र', span:1, req:true, type:'number' },
                  { k:'areaOfferedAcres',en:'Area Offered',      hi:'प्रस्तावित',  span:1, type:'number' },
                ].map(f => (
                  <div key={f.k} className={f.span === 2 ? 'col-span-2' : ''}>
                    <BiLabel en={f.en} hi={f.hi} req={f.req}/>
                    <input type={f.type || 'text'} value={(land as any)[f.k]}
                      onChange={e => { setLand(l => ({ ...l, [f.k]: e.target.value })); if (f.k==='areaAcres') setErrors(er => ({ ...er, areaAcres:'' })); }}
                      className={inp + (f.k==='areaAcres' && errors.areaAcres ? ' border-red-400' : '')}/>
                    {f.k==='areaAcres' && errors.areaAcres && <p className="text-red-500 text-xs mt-1">{errors.areaAcres}</p>}
                  </div>
                ))}
              </div>
              <div>
                <BiLabel en="Land Type" hi="भूमि प्रकार"/>
                <select value={land.landType} onChange={e => setLand(l => ({ ...l, landType: e.target.value }))} className={inp}>
                  <option value="">Select / चुनें</option>
                  {['AGRICULTURAL','PRIVATE','WASTELAND','AGROFORESTRY','ORCHARD'].map(t => (
                    <option key={t} value={t}>{t.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
              <button onClick={captureGPS}
                className="w-full border-2 border-dashed border-gray-200 text-gray-500 py-3 rounded-xl text-sm hover:border-gray-300 flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4"/> Capture GPS / GPS कैप्चर करें
              </button>
              {land.gpsLatitude && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-500">
                  📍 {land.gpsLatitude}, {land.gpsLongitude}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k:'village',  en:'Village', hi:'गांव' },
                  { k:'taluka',   en:'Taluka',  hi:'तालुका' },
                  { k:'district', en:'District',hi:'जिला' },
                  { k:'pincode',  en:'Pincode', hi:'पिन कोड' },
                ].map(f => (
                  <div key={f.k}>
                    <BiLabel en={f.en} hi={f.hi}/>
                    <input value={(land as any)[f.k]} onChange={e => setLand(l => ({ ...l, [f.k]: e.target.value }))} className={inp}/>
                  </div>
                ))}
              </div>
              <div>
                <BiLabel en="State" hi="राज्य"/>
                <select value={land.state} onChange={e => setLand(l => ({ ...l, state: e.target.value }))} className={inp}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── STEP 5: Ownership ── */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Ownership / स्वामित्व</h2>
              <div className="flex gap-4">
                {[{v:'sole',en:'Sole / एकल'},{v:'joint',en:'Joint / संयुक्त'}].map(o => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" value={o.v} checked={ownership.ownershipType === o.v}
                      onChange={() => setOwnership(p => ({ ...p, ownershipType: o.v }))}
                      className="accent-current" style={{ accentColor: primaryColor }}/>
                    {o.en}
                  </label>
                ))}
              </div>
              {ownership.ownershipType === 'joint' && (
                <div>
                  <BiLabel en="Number of Joint Owners" hi="संयुक्त स्वामियों की संख्या"/>
                  <input type="number" value={ownership.jointOwnerCount}
                    onChange={e => setOwnership(p => ({ ...p, jointOwnerCount: e.target.value }))}
                    className={inp} placeholder="e.g. 2"/>
                  <p className="text-amber-600 text-xs mt-1">NOC can be uploaded later from your dashboard</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: Plantation Preference ── */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Plantation / वृक्षारोपण</h2>
              <div>
                <BiLabel en="Species Preference" hi="पसंदीदा प्रजातियाँ"/>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['Neem / नीम','Mango / आम','Bamboo / बांस','Peepal / पीपल','Teak / सागवान','Mixed / मिश्रित','Others / अन्य'].map(s => (
                    <button key={s} type="button"
                      onClick={() => setSpecies(sp => sp.includes(s) ? sp.filter(x=>x!==s) : [...sp,s])}
                      className={`px-3 py-1.5 rounded-full text-xs border-2 transition-colors ${
                        species.includes(s) ? 'text-white border-current' : 'border-gray-200 text-gray-600'
                      }`}
                      style={species.includes(s) ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 7: Nominee ── */}
          {step === 7 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Nominee / नामांकित</h2>
              {[
                { k:'nomineeName',     en:'Nominee Name',     hi:'नामांकित का नाम' },
                { k:'nomineeRelation', en:'Relation',         hi:'संबंध' },
                { k:'nomineeMobile',   en:'Nominee Mobile',   hi:'मोबाइल', type:'tel' },
                { k:'nomineeDob',      en:'Date of Birth',    hi:'जन्म तिथि', type:'date' },
                { k:'nomineeAddress',  en:'Address',          hi:'पता' },
                { k:'nomineeAadhaar',  en:'Aadhaar Number',   hi:'आधार नंबर' },
              ].map(f => (
                <div key={f.k}>
                  <BiLabel en={f.en} hi={f.hi}/>
                  <input type={f.type || 'text'} value={(nominee as any)[f.k]}
                    onChange={e => setNominee(n => ({ ...n, [f.k]: e.target.value }))}
                    className={inp}/>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 8: Consent ── */}
          {step === 8 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl text-gray-900">Consent / सहमति</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2 max-h-48 overflow-y-auto border">
                <p className="font-semibold text-gray-800">Terms and Conditions / नियम और शर्तें</p>
                <p>I hereby declare that all information provided is true and correct. I agree to participate in the plantation programme under <strong>{org.loaded ? org.name : '...'}</strong> and authorize the organisation to use my land for tree plantation as agreed.</p>
                <p>मैं एतद्द्वारा घोषणा करता/करती हूँ कि प्रदान की गई सभी जानकारी सत्य एवं सही है। मैं <strong>{org.loaded ? org.name : '...'}</strong> के अंतर्गत वृक्षारोपण कार्यक्रम में भाग लेने के लिए सहमत हूँ।</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4" style={{ accentColor: primaryColor }}/>
                <span className="text-sm text-gray-700">
                  I agree to all terms and conditions / मैं सभी नियमों और शर्तों से सहमत हूँ
                </span>
              </label>
              {errors.consent && <p className="text-red-500 text-xs">{errors.consent}</p>}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => (s - 1) as Step)}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl text-sm hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4"/> Back
            </button>
          )}
          {step < 8 && (
            <button
              onClick={() => step === 4 ? saveLandAndNext() : saveStep((step + 1) as Step)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
              Next / आगे <ChevronRight className="w-4 h-4"/>
            </button>
          )}
          {step === 8 && (
            <button onClick={completeRegistration} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
              Complete Registration / पंजीकरण पूर्ण करें
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Progress auto-saved · Save Draft
        </p>
      </div>
    </div>
  );
}
