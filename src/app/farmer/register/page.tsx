'use client';
// Farmer Registration — 8 step, auto-save, tenant-branded, no mandatory fields except mobile
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';
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

function FarmerRegisterForm() {
  const org    = useOrgConfig();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep]         = useState<Step>(1);
  const [farmerId, setFarmerId] = useState('');
  const [currentLandId, setCurrentLandId] = useState(''); // set once Step 4 creates the land — Step 5 (ownership) attaches to this specific parcel
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [errors, setErrors]     = useState<Record<string,string>>({});
  const [resuming, setResuming] = useState(true); // true while we check for an existing session
  const [isEditMode, setIsEditMode] = useState(false); // true once we've detected an existing farmer — locks name/mobile

  // Step 1
  const [mobile, setMobile]     = useState('');
  const [otp, setOtp]           = useState('');
  const [otpSent, setOtpSent]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [authMode, setAuthMode] = useState<'otp'|'password'>('otp');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [accountExists, setAccountExists] = useState(false);

  // Step 2 — Personal
  const [personal, setPersonal] = useState({
    fullName:'', fatherName:'', dob:'', gender:'',
    aadhaarNumber:'', panNumber:'', occupation:'', farmingExperience:'', alternateMobile:'', email:'',
  });

  // Step 3 — Bank
  const [bank, setBank]         = useState({
    bankAccountName:'', bankName:'', accountNumber:'', ifscCode:'',
  });

  // Step 4 — Land
  const [land, setLand]         = useState({
    surveyGutNumber:'', khataNumber:'', areaAcres:'', areaOfferedAcres:'',
    landType:'', currentLandUse:'', village:'', taluka:'', district:'', state:'Maharashtra', pincode:'',
    gpsLatitude:'', gpsLongitude:'', waterAvailability:'', securityStatus:'',
  });

  // Step 5 — Ownership
  const [ownership, setOwnership] = useState({ ownershipType:'sole', jointOwnerCount:'' });

  // Step 6 — Plantation
  const [species, setSpecies]   = useState<string[]>([]);
  const [plantationPreference, setPlantationPreference] = useState('');
  const [plantationTypeOtherText, setPlantationTypeOtherText] = useState('');
  const [targetTreeCount, setTargetTreeCount] = useState('');

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

  // ── Resume/edit mode: if the farmer is already logged in (e.g. clicked
  // "Edit Profile" from the dashboard), load their existing data instead of
  // starting a brand-new registration. This is the root-cause fix for
  // Edit Profile incorrectly behaving like a fresh registration. ──────────
  useEffect(() => {
    const existingId = typeof window !== 'undefined' ? localStorage.getItem('farmerId') : null;
    if (!existingId) { setResuming(false); return; }

    fetch(`/api/farmer/profile?farmerId=${existingId}`)
      .then(r => r.json())
      .then(data => {
        const f = data.farmer;
        if (!f) { setResuming(false); return; }

        setFarmerId(existingId);
        setMobile((f.mobile || '').replace('+91', ''));
        setPersonal({
          fullName: f.fullName === 'Pending' ? '' : (f.fullName || ''),
          fatherName: f.fatherName || '', dob: f.dateOfBirth ? f.dateOfBirth.slice(0,10) : '',
          gender: f.gender || '', aadhaarNumber: f.aadhaarNumber || '', panNumber: f.panNumber || '',
          occupation: f.occupation || '', farmingExperience: f.farmingExperience || '', alternateMobile: f.alternateMobile || '', email: f.email || '',
        });
        setBank({
          bankAccountName: f.bankAccountName || '', bankName: f.bankName || '',
          accountNumber: f.accountNumber || '', ifscCode: f.ifscCode || '',
        });
        setOwnership({ ownershipType: 'sole', jointOwnerCount: '' });
        // Pre-load the farmer's first land so Step 5 (ownership) edits the
        // right record instead of having nowhere valid to save to.
        fetch(`/api/farmer/land?farmerId=${existingId}`)
          .then(r => r.json())
          .then(landData => {
            const firstLand = landData.lands?.[0];
            if (firstLand) {
              setCurrentLandId(firstLand.id);
              setOwnership({
                ownershipType: firstLand.ownershipType || 'sole',
                jointOwnerCount: firstLand.jointOwnerCount ? String(firstLand.jointOwnerCount) : '',
              });
            }
          })
          .catch(() => {});
        setSpecies(Array.isArray(f.speciesPreference) ? f.speciesPreference : []);
        setNominee({
          nomineeName: f.nomineeName || '', nomineeRelation: f.nomineeRelation || '',
          nomineeDob: f.nomineeDob ? f.nomineeDob.slice(0,10) : '', nomineeMobile: f.nomineeMobile || '',
          nomineeAddress: f.nomineeAddress || '', nomineeAadhaar: f.nomineeAadhaar || '',
        });
        setConsent(true); // already consented at original registration

        // Only "genuinely new" farmers (fullName still 'Pending') should be
        // able to set their own name — an existing farmer editing their
        // profile must go through Admin to change name/mobile.
        setIsEditMode(f.fullName !== 'Pending' && !!f.fullName);

        // Land into personal-details tab by default, or a specific section
        // if the dashboard linked here with ?step=N — tabs remain freely
        // navigable either way.
        const requestedStep = parseInt(searchParams.get('step') || '');
        setStep((requestedStep >= 1 && requestedStep <= 8 ? requestedStep : 2) as Step);
        setResuming(false);
      })
      .catch(() => setResuming(false));
  }, []);

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
    setLoading(true); setErrors({}); setAccountExists(false);
    const res  = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, action: 'send', purpose: 'register' }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) { setOtpSent(true); showToast('OTP sent to +91 ' + mobile); }
    else if (data.code === 'ACCOUNT_EXISTS') { setAccountExists(true); }
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
      if (data.isProfileComplete) { router.push('/farmer/dashboard'); return; }
      setStep(2);
    } else setErrors({ otp: data.error || 'Incorrect OTP. Try again.' });
  }

  async function registerWithPassword() {
    setErrors({}); setAccountExists(false);
    if (!mobile || mobile.length < 10) { setErrors({ mobile: 'Enter valid 10-digit mobile number' }); return; }
    if (!regPassword || regPassword.length < 6) { setErrors({ password: 'Password must be at least 6 characters' }); return; }
    if (regPassword !== regPasswordConfirm) { setErrors({ password: 'Passwords do not match' }); return; }

    setLoading(true);
    const res  = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password: regPassword, action: 'register_password' }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setFarmerId(data.farmerId);
      localStorage.setItem('farmerId', data.farmerId);
      localStorage.setItem('farmerMobile', `+91${mobile}`);
      setStep(2);
    } else if (data.code === 'ACCOUNT_EXISTS') {
      setAccountExists(true);
    } else {
      setErrors({ password: data.error || 'Failed to create account' });
    }
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

    // Ownership is a property of the LAND, not the farmer — route it to
    // the land record Step 4 just created instead of the farmer's own
    // profile (which has no ownershipType/jointOwnerCount fields at all).
    if (step === 5) {
      if (currentLandId) {
        await fetch('/api/farmer/land', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landId: currentLandId, farmerId, ...ownership }),
        }).catch(() => {});
      }
      await fetch('/api/farmer/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId, registrationStep: step }),
      }).catch(() => {});
      setLoading(false);
      setStep(s => Math.min(8, s + 1) as Step);
      return;
    }

    // Plantation preferences (species, type, estimated count) are all LAND
    // fields, not farmer fields — same reasoning as ownership above. This
    // was previously sent to /api/farmer/profile, which has no matching
    // columns on the Farmer model at all; the request would have failed
    // silently every time (caught by .catch(() => {}) below), meaning
    // species preference has likely never actually saved during
    // registration up to this point.
    if (step === 6) {
      if (currentLandId) {
        await fetch('/api/farmer/land', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            landId: currentLandId, farmerId,
            speciesPreference: species, plantationPreference: plantationPreference || undefined,
            plantationTypeOtherText: plantationPreference === 'OTHER' ? plantationTypeOtherText : undefined,
            targetTreeCount: targetTreeCount || undefined,
          }),
        }).catch(() => {});
      }
      await fetch('/api/farmer/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId, registrationStep: step }),
      }).catch(() => {});
      setLoading(false);
      setStep(s => Math.min(8, s + 1) as Step);
      return;
    }

    const payload: any = { farmerId, registrationStep: step };

    if (step === 2) Object.assign(payload, personal);
    if (step === 3) Object.assign(payload, bank);
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
      const res = await fetch('/api/farmer/land', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId, ...land,
          gpsLatitude:  land.gpsLatitude  ? parseFloat(land.gpsLatitude)  : undefined,
          gpsLongitude: land.gpsLongitude ? parseFloat(land.gpsLongitude) : undefined,
          areaAcres:    land.areaAcres    ? parseFloat(land.areaAcres)    : undefined,
          areaOfferedAcres: land.areaOfferedAcres ? parseFloat(land.areaOfferedAcres) : undefined,
        }),
      }).then(r => r.json()).catch(() => null);
      // Capture the created land's id — Step 5 (ownership) needs to attach
      // to this specific parcel, not the farmer's profile.
      if (res?.land?.id) setCurrentLandId(res.land.id);
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

  if (resuming) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400"/>
      </div>
    );
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
              ? <OrgLogo src={org.logoUrl} alt="" size="sm" badge/>
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

              {accountExists ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
                    An account already exists with this mobile number.
                  </div>
                  <a href="/farmer/login"
                    className="block w-full text-center text-white font-bold py-3.5 rounded-xl text-sm"
                    style={{ backgroundColor: primaryColor }}>
                    Login with OTP
                  </a>
                  <a href="/farmer/login?mode=password"
                    className="block w-full text-center font-bold py-3.5 rounded-xl text-sm border-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}>
                    Login with Password
                  </a>
                  <button onClick={() => { setAccountExists(false); setMobile(''); }}
                    className="w-full text-sm text-gray-400 hover:text-gray-600">
                    ← Use a different number
                  </button>
                </div>
              ) : (
                <>
                  {/* OTP / Password toggle — only one method visible at a time */}
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    {(['otp','password'] as const).map(mode => (
                      <button key={mode} type="button"
                        onClick={() => { setAuthMode(mode); setErrors({}); setOtpSent(false); }}
                        className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
                          authMode === mode ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                        style={authMode === mode ? { color: primaryColor } : {}}>
                        Continue with {mode === 'otp' ? 'OTP' : 'Password'}
                      </button>
                    ))}
                  </div>

                  <div>
                    <BiLabel en="Mobile Number" hi="मोबाइल नंबर" required/>
                    <div className="flex gap-2">
                      <div className="border border-gray-200 rounded-xl px-3 py-3 text-gray-500 text-sm bg-gray-50 font-medium">+91</div>
                      <input type="tel" value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/g,'').slice(0,10)); setErrors({}); }}
                        className={inp + (errors.mobile ? ' border-red-300 bg-red-50' : '')}
                        placeholder="98765 43210" maxLength={10} disabled={otpSent}/>
                    </div>
                    {errors.mobile && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3"/> {errors.mobile}
                      </p>
                    )}
                  </div>

                  {authMode === 'otp' ? (
                    !otpSent ? (
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
                          {process.env.NODE_ENV !== 'production' && (
                            <p className="text-gray-400 text-xs mt-1">Test OTP (dev only): use <strong>123456</strong></p>
                          )}
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
                    )
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <BiLabel en="Password" hi="पासवर्ड" required/>
                        <div className="relative">
                          <input type={showPw ? 'text' : 'password'} value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            className={inp + ' pr-10' + (errors.password ? ' border-red-300 bg-red-50' : '')}
                            placeholder="Min 6 characters"/>
                          <button type="button" onClick={() => setShowPw(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                          </button>
                        </div>
                      </div>
                      <div>
                        <BiLabel en="Confirm Password" hi="पासवर्ड की पुष्टि करें" required/>
                        <input type={showPw ? 'text' : 'password'} value={regPasswordConfirm}
                          onChange={e => setRegPasswordConfirm(e.target.value)}
                          className={inp + (errors.password ? ' border-red-300 bg-red-50' : '')}
                          placeholder="Re-enter password"/>
                        {errors.password && (
                          <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3"/> {errors.password}
                          </p>
                        )}
                      </div>
                      <button onClick={registerWithPassword} disabled={loading}
                        className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                        style={{ backgroundColor: primaryColor }}>
                        {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                        Create Account / खाता बनाएं
                      </button>
                    </div>
                  )}
                  <p className="text-center text-xs text-gray-400">
                    Already registered?{' '}
                    <a href="/farmer/login" className="font-bold" style={{ color: primaryColor }}>Login here</a>
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: Personal ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gray-900">Personal Details / व्यक्तिगत विवरण</h2>
              <div>
                <BiLabel en="Full Name" hi="पूरा नाम" required/>
                <input value={personal.fullName} disabled={isEditMode}
                  onChange={e => { setPersonal(p => ({ ...p, fullName: e.target.value })); setErrors({}); }}
                  className={inp + (errors.fullName ? ' border-red-300 bg-red-50' : '') + (isEditMode ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : '')}
                  placeholder="As per Aadhaar card"/>
                {isEditMode && (
                  <p className="text-gray-400 text-xs mt-1.5">Name changes require Admin approval — contact your field officer.</p>
                )}
                {errors.fullName && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.fullName}
                  </p>
                )}
              </div>
              <div>
                <BiLabel en="Mobile Number" hi="मोबाइल नंबर"/>
                <div className="flex gap-2">
                  <div className="border border-gray-200 rounded-xl px-3 py-3 text-gray-500 text-sm bg-gray-50 font-medium">+91</div>
                  <input value={mobile} disabled className={inp + ' bg-gray-100 text-gray-500 cursor-not-allowed'}/>
                </div>
                {isEditMode && (
                  <p className="text-gray-400 text-xs mt-1.5">Mobile number changes require Admin approval — contact your field officer.</p>
                )}
              </div>
              {[
                { k:'fatherName',     en:"Father's Name",  hi:'पिता का नाम' },
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
                <BiLabel en="Occupation" hi="व्यवसाय"/>
                <select value={personal.occupation} onChange={e => setPersonal(p => ({ ...p, occupation: e.target.value }))} className={inp}>
                  <option value="">Select / चुनें</option>
                  <option value="Farmer">Farmer / किसान</option>
                  <option value="Landowner">Landowner (non-farming) / भूमि स्वामी</option>
                  <option value="Both">Both / दोनों</option>
                  <option value="Other">Other / अन्य</option>
                </select>
              </div>
              {personal.occupation === 'Farmer' || personal.occupation === 'Both' ? (
                <div>
                  <BiLabel en="Farming Experience (years)" hi="कृषि अनुभव (वर्ष)"/>
                  <input type="number" min="0" value={personal.farmingExperience}
                    onChange={e => setPersonal(p => ({ ...p, farmingExperience: e.target.value }))} className={inp}/>
                </div>
              ) : null}
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
              <div>
                <BiLabel en="Current Land Use" hi="भूमि का वर्तमान उपयोग"/>
                <select value={land.currentLandUse} onChange={e => setLand(l => ({ ...l, currentLandUse: e.target.value }))} className={inp}>
                  <option value="">Select / चुनें</option>
                  {['Fallow / परती', 'Under Cultivation / कृषि योग्य', 'Grazing Land / चारागाह', 'Barren / बंजर', 'Orchard / बाग़', 'Other / अन्य'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <button onClick={captureGPS}
                className="w-full border-2 border-dashed border-gray-200 text-gray-500 py-3 rounded-xl text-sm hover:border-gray-300 flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4"/> Detect GPS Automatically / GPS का पता लगाएं
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Latitude</label>
                  <input type="number" value={land.gpsLatitude} onChange={e => setLand(l => ({ ...l, gpsLatitude: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Longitude</label>
                  <input type="number" value={land.gpsLongitude} onChange={e => setLand(l => ({ ...l, gpsLongitude: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300"/>
                </div>
              </div>
              <p className="text-gray-400 text-xs -mt-2">Detected automatically when available — you can also type or correct it yourself.</p>
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
              <h2 className="font-display text-xl text-gray-900">Plantation / वृक्षारोपण विवरण</h2>

              <BiLabel en="Proposed Plantation Type" hi="प्रस्तावित वृक्षारोपण प्रकार"/>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'AGROFORESTRY',   en: 'Agroforestry',    hi: 'कृषि वानिकी' },
                  { v: 'MIYAWAKI',       en: 'Miyawaki Forest', hi: 'मियावाकी वन' },
                  { v: 'NATIVE_FOREST',  en: 'Native Forest',   hi: 'देशी वन' },
                  { v: 'FRUIT_TREES',    en: 'Fruit Plantation',hi: 'फल वृक्षारोपण' },
                  { v: 'BAMBOO',         en: 'Bamboo',          hi: 'बांस' },
                  { v: 'MIXED_SPECIES',  en: 'Mixed Plantation',hi: 'मिश्रित वृक्षारोपण' },
                  { v: 'OTHER',          en: 'Other',           hi: 'अन्य' },
                ].map(o => (
                  <button key={o.v} type="button" onClick={() => setPlantationPreference(o.v)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border-2 text-left transition-colors ${plantationPreference === o.v ? 'text-white border-current' : 'border-gray-200 text-gray-600'}`}
                    style={plantationPreference === o.v ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${plantationPreference === o.v ? 'border-white bg-white/30' : 'border-gray-300'}`}/>
                    <span>{o.en} <span className="opacity-70">/ {o.hi}</span></span>
                  </button>
                ))}
              </div>
              {plantationPreference === 'OTHER' && (
                <input value={plantationTypeOtherText} onChange={e => setPlantationTypeOtherText(e.target.value)}
                  placeholder="Please describe / कृपया वर्णन करें" className={inp}/>
              )}

              <div>
                <BiLabel en="Estimated Number of Trees" hi="प्रस्तावित वृक्षों की संख्या"/>
                <input type="number" value={targetTreeCount} onChange={e => setTargetTreeCount(e.target.value)}
                  placeholder="e.g. 500" className={inp}/>
              </div>

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

export default function FarmerRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"/>}>
      <FarmerRegisterForm/>
    </Suspense>
  );
}
