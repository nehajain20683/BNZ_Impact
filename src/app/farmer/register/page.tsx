'use client';
// Farmer Registration — 8 step, auto-save, tenant-branded, no mandatory fields except mobile
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import {
  Shield, User, Landmark, MapPin, Users, TreePine,
  UserCheck, FileCheck, ChevronRight, ChevronLeft,
  CheckCircle, Loader2, Eye, EyeOff, AlertCircle
} from 'lucide-react';

type Step = 1|2|3|4|5|6|7|8;

const STEPS = [
  { step:1, en:'Verify Mobile',    hi:'मोबाइल सत्यापन',  icon: Shield },
  { step:2, en:'Personal Details', hi:'व्यक्तिगत विवरण', icon: User },
  { step:3, en:'Bank Details',     hi:'बैंक विवरण',      icon: Landmark },
  { step:4, en:'Land Details',     hi:'भूमि विवरण',      icon: MapPin },
  { step:5, en:'Ownership',        hi:'स्वामित्व',       icon: Users },
  { step:6, en:'Plantation',       hi:'वृक्षारोपण',      icon: TreePine },
  { step:7, en:'Nominee',          hi:'नामांकित',        icon: UserCheck },
  { step:8, en:'Consent',          hi:'सहमति',           icon: FileCheck },
];

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white";
const STATES = ['Maharashtra','Gujarat','Rajasthan','Madhya Pradesh','Karnataka','Tamil Nadu','Uttar Pradesh','Goa','Delhi','Punjab'];
const REQUIRED_FIELDS: Record<number, string[]> = {
  2: ['fullName'],      // Step 2: full name required
  8: [],               // Step 8: consent checkbox required (handled separately)
};

function BiLabel({ en, hi, required }: { en: string; hi: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {en}{required && <span className="text-red-400 ml-0.5">*</span>}
      <span className="text-gray-400 font-normal ml-1.5 text-xs">/ {hi}</span>
    </label>
  );
}

export default function FarmerRegisterPage() {
  const org    = useOrgConfig();
  const router = useRouter();

  const [step, setStep]         = useState<Step>(1);
  const [farmerId, setFarmerId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [errors, setErrors]     = useState<Record<string,string>>({});

  // Step 1
  const [mobile, setMobile]     = useState('');
  const [otp, setOtp]           = useState('');
  const [otpSent, setOtpSent]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [createPassword, setCreatePassword] = useState('');

  // Step 2 — Personal
  const [personal, setPersonal] = useState({
    fullName:'', fatherName:'', dob:'', gender:'',
    aadhaarNumber:'', panNumber:'', occupation:'', alternateMobile:'', email:'',
  });

  // Step 3 — Bank
  const [bank, setBank]         = useState({
    bankAccountName:'', bankName:'', accountNumber:'', ifscCode:'',
  });

  // Step 4 — Land
  const [land, setLand]         = useState({
    surveyGutNumber:'', khataNumber:'', areaAcres:'', areaOfferedAcres:'',
    landType:'', village:'', taluka:'', district:'', state:'Maharashtra', pincode:'',
    gpsLatitude:'', gpsLongitude:'', waterAvailability:'', securityStatus:'',
  });

  // Step 5 — Ownership
  const [ownership, setOwnership] = useState({ ownershipType:'sole', jointOwnerCount:'' });

  // Step 6 — Plantation
  const [species, setSpecies]   = useState<string[]>([]);

  // Step 7 — Nominee
  const [nominee, setNominee]   = useState({
    nomineeName:'', nomineeRelation:'', nomineeDob:'',
    nomineeMobile:'', nomineeAddress:'', nomineeAadhaar:'',
  });

  // Step 8
  const [consent, setConsent]   = useState(false);

  const pct          = Math.round((step / 8) * 100);
  const primaryColor = org.primaryColor || '#2d5a1b';

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  // ── Auto-save on field change ─────────────────────────────────
  const autoSave = useCallback(async (data: any) => {
    if (!farmerId) return;
    setSaving(true);
    await fetch('/api/farmer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, ...data }),
    }).catch(() => {});
    setSaving(false);
  }, [farmerId]);

  // Debounced auto-save for text fields
  useEffect(() => {
    if (!farmerId || step !== 2) return;
    const t = setTimeout(() => autoSave(personal), 1500);
    return () => clearTimeout(t);
  }, [personal, farmerId, step]);

  useEffect(() => {
    if (!farmerId || step !== 3) return;
    const t = setTimeout(() => autoSave(bank), 1500);
    return () => clearTimeout(t);
  }, [bank, farmerId, step]);

  useEffect(() => {
    if (!farmerId || step !== 7) return;
    const t = setTimeout(() => autoSave({
      ...nominee,
      nomineeDob: nominee.nomineeDob || null,
    }), 1500);
    return () => clearTimeout(t);
  }, [nominee, farmerId, step]);

  // ── Step 1: OTP ───────────────────────────────────────────────
  async function sendOtp() {
    if (!mobile || mobile.length < 10) { setErrors({ mobile: 'Enter valid 10-digit mobile number' }); return; }
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
    if (!otp || otp.length < 4) { setErrors({ otp: 'Enter the OTP you received' }); return; }
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
      // Save password if provided
      if (createPassword) {
        await fetch('/api/farmer/set-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmerId: data.farmerId, password: createPassword }),
        }).catch(() => {});
      }
      if (data.isProfileComplete) { router.push('/farmer/dashboard'); return; }
      setStep(2);
    } else setErrors({ otp: data.error || 'Incorrect OTP. Try again.' });
  }

  // ── Validate current step before advancing ────────────────────
  function validateStep(s: Step): boolean {
    const errs: Record<string,string> = {};
    if (s === 2 && !personal.fullName.trim()) {
      errs.fullName = 'Please enter your full name to continue';
    }
    if (s === 8 && !consent) {
      errs.consent = 'Please accept the terms to complete registration';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save step and advance ─────────────────────────────────────
  async function saveAndNext() {
    if (!validateStep(step)) return;
    setLoading(true);
    const payload: any = { farmerId, registrationStep: step };

    if (step === 2) Object.assign(payload, personal);
    if (step === 3) Object.assign(payload, bank);
    if (step === 5) Object.assign(payload, ownership);
    if (step === 6) Object.assign(payload, { speciesPreference: species });
    if (step === 7) Object.assign(payload, {
      ...nominee,
      nomineeDob: nominee.nomineeDob || null,
    });

    await fetch('/api/farmer/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    setLoading(false);
    setStep(s => Math.min(8, s + 1) as Step);
  }

  // ── Step 4: save land + advance ───────────────────────────────
  async function saveLandAndNext() {
    setLoading(true);
    if (land.areaAcres) {
      await fetch('/api/farmer/land', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId, ...land,
          gpsLatitude:  land.gpsLatitude  ? parseFloat(land.gpsLatitude)  : undefined,
          gpsLongitude: land.gpsLongitude ? parseFloat(land.gpsLongitude) : undefined,
          areaAcres:    land.areaAcres    ? parseFloat(land.areaAcres)    : undefined,
          areaOfferedAcres: land.areaOfferedAcres ? parseFloat(land.areaOfferedAcres) : undefined,
        }),
      }).catch(() => {});
    }
    await fetch('/api/farmer/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, registrationStep: 4 }),
    }).catch(() => {});
    setLoading(false);
    setStep(5);
  }

  // ── Complete registration ─────────────────────────────────────
  async function complete() {
    if (!consent) { setErrors({ consent: 'Please accept the terms to complete registration' }); return; }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ backgroundColor: primaryColor }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="text-white sticky top-0 z-40" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {org.logoUrl
              ? <img src={org.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/20 p-0.5"/>
              : <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">{(org.name||'G').charAt(0)}</div>
            }
            <div>
              <div className="font-bold text-sm">{org.loaded ? org.name : ''}</div>
              <div className="text-white/70 text-[10px]">Land Owner Registration / भूमि स्वामी पंजीकरण</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-white/60 text-[10px]">Saving…</span>}
            <div className="text-right text-xs text-white/80">
              <div>Progress</div>
              <div className="font-bold">{pct}%</div>
            </div>
          </div>
        </div>
        <div className="h-1 bg-white/20 mx-4 mb-2 rounded-full overflow-hidden max-w-xl mx-auto">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }}/>
        </div>
      </div>

      {/* Step tabs */}
      <div className="bg-white border-b overflow-x-auto sticky top-[72px] z-30">
        <div className="max-w-xl mx-auto flex px-2">
          {STEPS.map(s => {
            const done    = s.step < step;
            const current = s.step === step;
            const canNav  = !!farmerId;
            return (
              <button key={s.step}
                onClick={() => canNav && setStep(s.step as Step)}
                disabled={!canNav}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 text-center text-[10px] font-medium border-b-2 transition-colors ${
                  current ? '' : 'border-transparent'
                } ${done ? 'text-green-600' : current ? '' : 'text-gray-300'} ${canNav ? 'cursor-pointer' : 'cursor-default'}`}
                style={current ? { color: primaryColor, borderColor: primaryColor } : {}}>
                <s.icon className="w-3.5 h-3.5 mb-0.5"/>
                <span className="hidden sm:block">{s.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl text-gray-900">Verify Mobile / मोबाइल सत्यापन</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your mobile number to get started</p>
              </div>
              <div>
                <BiLabel en="Mobile Number" hi="मोबाइल नंबर" required/>
                <div className="flex gap-2">
                  <div className="border border-gray-200 rounded-xl px-3 py-3 text-gray-500 text-sm bg-gray-50 font-medium">+91</div>
                  <input type="tel" value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/g,'').slice(0,10)); setErrors({}); }}
                    className={inp + (errors.mobile ? ' border-red-300 bg-red-50' : '')}
                    placeholder="98765 43210" maxLength={10}/>
                </div>
                {errors.mobile && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.mobile}
                  </p>
                )}
              </div>

              {/* Create password */}
              <div>
                <BiLabel en="Create Password (Optional)" hi="पासवर्ड बनाएं (वैकल्पिक)"/>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    className={inp + ' pr-10'} placeholder="For future password-based login"/>
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-1">Optional — you can always login with OTP instead</p>
              </div>

              {!otpSent ? (
                <button onClick={sendOtp} disabled={loading}
                  className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                  Send OTP / OTP भेजें
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <BiLabel en="Enter OTP" hi="OTP दर्ज करें" required/>
                    <input type="tel" value={otp}
                      onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setErrors({}); }}
                      className={inp + (errors.otp ? ' border-red-300 bg-red-50' : '')}
                      placeholder="6-digit OTP" maxLength={6}/>
                    {errors.otp && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3"/> {errors.otp}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">Test OTP: use <strong>123456</strong></p>
                  </div>
                  <button onClick={verifyOtp} disabled={loading}
                    className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}>
                    Verify & Continue / सत्यापित करें
                  </button>
                  <button onClick={() => { setOtpSent(false); setErrors({}); }}
                    className="w-full text-sm text-gray-400 hover:text-gray-600">
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

          {/* ── STEP 2: Personal ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Personal Details / व्यक्तिगत विवरण</h2>
              <div>
                <BiLabel en="Full Name" hi="पूरा नाम" required/>
                <input value={personal.fullName}
                  onChange={e => { setPersonal(p => ({ ...p, fullName: e.target.value })); setErrors({}); }}
                  className={inp + (errors.fullName ? ' border-red-300 bg-red-50' : '')}
                  placeholder="As per Aadhaar card"/>
                {errors.fullName && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.fullName}
                  </p>
                )}
              </div>
              {[
                { k:'fatherName',     en:"Father's Name",  hi:'पिता का नाम' },
                { k:'occupation',     en:'Occupation',     hi:'व्यवसाय' },
                { k:'alternateMobile',en:'Alternate Mobile',hi:'वैकल्पिक मोबाइल', type:'tel' },
                { k:'email',          en:'Email',          hi:'ईमेल', type:'email' },
                { k:'aadhaarNumber',   en:'Aadhaar Number', hi:'आधार नंबर' },
                { k:'panNumber',       en:'PAN Number',     hi:'पैन नंबर' },
              ].map(f => (
                <div key={f.k}>
                  <BiLabel en={f.en} hi={f.hi}/>
                  <input type={f.type || 'text'} value={(personal as any)[f.k]}
                    onChange={e => setPersonal(p => ({ ...p, [f.k]: e.target.value }))}
                    className={inp}/>
                </div>
              ))}
              <div>
                <BiLabel en="Gender" hi="लिंग"/>
                <select value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))} className={inp}>
                  <option value="">Select / चुनें</option>
                  <option value="MALE">Male / पुरुष</option>
                  <option value="FEMALE">Female / महिला</option>
                  <option value="OTHER">Other / अन्य</option>
                </select>
              </div>
              <div>
                <BiLabel en="Date of Birth" hi="जन्म तिथि"/>
                <input type="date" value={personal.dob}
                  onChange={e => setPersonal(p => ({ ...p, dob: e.target.value }))} className={inp}/>
              </div>
            </div>
          )}

          {/* ── STEP 3: Bank ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Bank Details / बैंक विवरण</h2>
              <p className="text-sm text-gray-400">For future payments — can be filled later</p>
              {[
                { k:'bankAccountName', en:'Account Holder Name', hi:'खाताधारक का नाम' },
                { k:'bankName',        en:'Bank Name',           hi:'बैंक का नाम' },
                { k:'accountNumber',   en:'Account Number',      hi:'खाता नंबर' },
                { k:'ifscCode',        en:'IFSC Code',           hi:'IFSC कोड' },
              ].map(f => (
                <div key={f.k}>
                  <BiLabel en={f.en} hi={f.hi}/>
                  <input value={(bank as any)[f.k]}
                    onChange={e => setBank(b => ({ ...b, [f.k]: e.target.value }))} className={inp}/>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 4: Land ── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Land Details / भूमि विवरण</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k:'surveyGutNumber', en:'Survey/Gut No.',   hi:'सर्वे नंबर' },
                  { k:'khataNumber',     en:'Khata Number',     hi:'खाता नंबर' },
                  { k:'areaAcres',       en:'Total Area (Acres)',hi:'कुल क्षेत्र', type:'number' },
                  { k:'areaOfferedAcres',en:'Area Offered',     hi:'प्रस्तावित',  type:'number' },
                ].map(f => (
                  <div key={f.k}>
                    <BiLabel en={f.en} hi={f.hi}/>
                    <input type={f.type||'text'} value={(land as any)[f.k]}
                      onChange={e => setLand(l => ({ ...l, [f.k]: e.target.value }))} className={inp}/>
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
                <div className="bg-green-50 rounded-xl p-3 text-xs font-mono text-green-700">
                  📍 {land.gpsLatitude}, {land.gpsLongitude}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k:'village', en:'Village', hi:'गांव' },
                  { k:'taluka',  en:'Taluka',  hi:'तालुका' },
                  { k:'district',en:'District',hi:'जिला' },
                  { k:'pincode', en:'Pincode', hi:'पिन कोड' },
                ].map(f => (
                  <div key={f.k}>
                    <BiLabel en={f.en} hi={f.hi}/>
                    <input value={(land as any)[f.k]}
                      onChange={e => setLand(l => ({ ...l, [f.k]: e.target.value }))} className={inp}/>
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
                    <input type="radio" value={o.v} checked={ownership.ownershipType===o.v}
                      onChange={() => setOwnership(p => ({ ...p, ownershipType: o.v }))}
                      style={{ accentColor: primaryColor }}/>
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
                  <p className="text-amber-600 text-xs mt-1">NOC can be uploaded from your dashboard later</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: Plantation ── */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Plantation / वृक्षारोपण</h2>
              <BiLabel en="Species Preference (Optional)" hi="पसंदीदा प्रजातियाँ"/>
              <div className="flex flex-wrap gap-2">
                {['Neem / नीम','Mango / आम','Bamboo / बांस','Peepal / पीपल','Teak / सागवान','Mixed / मिश्रित','Others / अन्य'].map(s => (
                  <button key={s} type="button"
                    onClick={() => setSpecies(sp => sp.includes(s) ? sp.filter(x=>x!==s) : [...sp,s])}
                    className={`px-3 py-1.5 rounded-full text-xs border-2 transition-colors ${species.includes(s) ? 'text-white border-current' : 'border-gray-200 text-gray-600'}`}
                    style={species.includes(s) ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-gray-400 text-xs">You can skip this — it can be updated later</p>
            </div>
          )}

          {/* ── STEP 7: Nominee ── */}
          {step === 7 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Nominee / नामांकित</h2>
              <p className="text-gray-400 text-sm">All fields optional — can be filled later from your dashboard</p>
              {[
                { k:'nomineeName',     en:'Nominee Name',   hi:'नामांकित का नाम' },
                { k:'nomineeRelation', en:'Relation',       hi:'संबंध' },
                { k:'nomineeMobile',   en:'Mobile',         hi:'मोबाइल', type:'tel' },
                { k:'nomineeAddress',  en:'Address',        hi:'पता' },
                { k:'nomineeAadhaar',  en:'Aadhaar',        hi:'आधार नंबर' },
              ].map(f => (
                <div key={f.k}>
                  <BiLabel en={f.en} hi={f.hi}/>
                  <input type={f.type||'text'} value={(nominee as any)[f.k]}
                    onChange={e => setNominee(n => ({ ...n, [f.k]: e.target.value }))} className={inp}/>
                </div>
              ))}
              <div>
                <BiLabel en="Date of Birth" hi="जन्म तिथि"/>
                <input type="date" value={nominee.nomineeDob}
                  onChange={e => setNominee(n => ({ ...n, nomineeDob: e.target.value }))} className={inp}/>
              </div>
            </div>
          )}

          {/* ── STEP 8: Consent ── */}
          {step === 8 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl text-gray-900">Consent / सहमति</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2 max-h-48 overflow-y-auto border border-gray-100">
                <p className="font-semibold text-gray-800">Terms and Conditions / नियम और शर्तें</p>
                <p>I hereby declare that all information provided is true and correct. I agree to participate in the plantation programme under <strong>{org.loaded ? org.name : '...'}</strong> and authorize the organisation to use my land for tree plantation as agreed.</p>
                <p>मैं एतद्द्वारा घोषणा करता/करती हूँ कि प्रदान की गई सभी जानकारी सत्य एवं सही है। मैं <strong>{org.loaded ? org.name : '...'}</strong> के अंतर्गत वृक्षारोपण कार्यक्रम में भाग लेने के लिए सहमत हूँ।</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                <input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setErrors({}); }}
                  className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: primaryColor }}/>
                <span className="text-sm text-gray-700">
                  I agree to all terms and conditions / मैं सभी नियमों और शर्तों से सहमत हूँ <span className="text-red-400">*</span>
                </span>
              </label>
              {errors.consent && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3"/> {errors.consent}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => (s-1) as Step)}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl text-sm hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4"/> Back
            </button>
          )}
          {step < 8 ? (
            <button
              onClick={() => step === 4 ? saveLandAndNext() : saveAndNext()}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
              Save & Next / सहेजें <ChevronRight className="w-4 h-4"/>
            </button>
          ) : (
            <button onClick={complete} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
              Complete Registration
            </button>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">Progress auto-saved · Save Draft</p>
      </div>
    </div>
  );
}
