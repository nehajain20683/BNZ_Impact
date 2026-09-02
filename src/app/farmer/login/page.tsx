'use client';
// /farmer/login — OTP or Password login, tenant branded
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';
import { Loader2, AlertCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white";

function FarmerLoginInner() {
  const org    = useOrgConfig();
  const router = useRouter();
  const params = useSearchParams();
  const primaryColor = org.primaryColor || '#2d5a1b';

  const [mode, setMode] = useState<'otp'|'password'>(params.get('mode') === 'password' ? 'password' : 'otp');

  // OTP mode
  const [mobile, setMobile]   = useState('');
  const [otp, setOtp]         = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp]   = useState('');

  // Password mode
  const [pwMobile, setPwMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [noPassword, setNoPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function switchMode(m: 'otp'|'password') {
    setMode(m); setError(''); setNoPassword(false); setOtpSent(false);
  }

  async function sendOtp() {
    if (!mobile || mobile.length < 10) { setError('Enter valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, action: 'send', purpose: 'login' }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setOtpSent(true);
      if (data._testOtp) setDevOtp(data._testOtp);
    } else {
      setError(data.error || 'Could not send OTP. Try again.');
    }
  }

  async function verifyOtp() {
    if (!otp) { setError('Enter the OTP'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp, action: 'verify' }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.success) {
      localStorage.setItem('farmerId', data.farmerId);
      localStorage.setItem('farmerMobile', `+91${mobile}`);
      if (data.isProfileComplete) {
        router.push('/farmer/dashboard');
      } else {
        // Resume registration from where they left off
        router.push('/farmer/register');
      }
    } else {
      setError(data.error || 'Incorrect OTP. Try again.');
    }
  }

  async function loginWithPassword() {
    if (!pwMobile || pwMobile.length < 10) { setError('Enter valid 10-digit mobile number'); return; }
    if (!password) { setError('Enter your password'); return; }
    setLoading(true); setError(''); setNoPassword(false);
    const res  = await fetch('/api/farmer/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: pwMobile, password, action: 'password' }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.success) {
      localStorage.setItem('farmerId', data.farmerId);
      localStorage.setItem('farmerMobile', `+91${pwMobile}`);
      router.push('/farmer/dashboard');
    } else if (data.code === 'NO_PASSWORD') {
      setNoPassword(true);
    } else {
      setError(data.error || 'Incorrect password. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="text-white px-4 py-5" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-sm mx-auto flex items-center gap-3">
          {org.logoUrl
            ? <OrgLogo src={org.logoUrl} alt="" size="lg" className="rounded-xl bg-white/20 p-1"/>
            : <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">{(org.name||'G').charAt(0)}</div>
          }
          <div>
            <div className="font-bold">{org.loaded ? org.name : '...'}</div>
            <div className="text-white/70 text-xs">Land Owner Portal / भूमि स्वामी पोर्टल</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Login / लॉग इन</h1>
              <p className="text-gray-500 text-sm mt-1">Enter your registered mobile number</p>
            </div>

            {/* OTP / Password toggle — only one mode visible at a time */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(['otp','password'] as const).map(m => (
                <button key={m} type="button" onClick={() => switchMode(m)}
                  className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
                    mode === m ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  style={mode === m ? { color: primaryColor } : {}}>
                  {m === 'otp' ? 'OTP Login' : 'Password Login'}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                {error}
              </div>
            )}

            {noPassword && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-xl">
                No password has been set for this account. Continue with OTP or create a password.
                <button onClick={() => { setMobile(pwMobile); switchMode('otp'); }}
                  className="block mt-2 font-bold underline" style={{ color: primaryColor }}>
                  Continue with OTP →
                </button>
              </div>
            )}

            {mode === 'otp' ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mobile Number / मोबाइल नंबर
                  </label>
                  <div className="flex gap-2">
                    <div className="border border-gray-200 rounded-xl px-3 py-3 text-gray-500 text-sm bg-gray-50 font-medium flex-shrink-0">+91</div>
                    <input type="tel" value={mobile}
                      onChange={e => { setMobile(e.target.value.replace(/\D/g,'').slice(0,10)); setError(''); }}
                      className={inp} placeholder="98765 43210" maxLength={10}
                      disabled={otpSent}/>
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      OTP / ओटीपी
                    </label>
                    <input type="tel" value={otp}
                      onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setError(''); }}
                      className={inp} placeholder="6-digit OTP" maxLength={6} autoFocus/>
                    <p className="text-gray-400 text-xs mt-1.5">OTP sent to +91 {mobile}</p>
                    {process.env.NODE_ENV !== 'production' && (
                      <p className="text-amber-600 text-xs mt-0.5">
                        Dev mode — test OTP: <strong>123456</strong>{devOtp ? <> · actual OTP: <strong>{devOtp}</strong></> : null}
                      </p>
                    )}
                  </div>
                )}

                {!otpSent ? (
                  <button onClick={sendOtp} disabled={loading}
                    className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                    Send OTP / OTP भेजें
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button onClick={verifyOtp} disabled={loading}
                      className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor }}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <ChevronRight className="w-4 h-4"/>}
                      Login / लॉग इन
                    </button>
                    <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); setDevOtp(''); }}
                      className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                      ← Change number
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mobile Number / मोबाइल नंबर
                  </label>
                  <div className="flex gap-2">
                    <div className="border border-gray-200 rounded-xl px-3 py-3 text-gray-500 text-sm bg-gray-50 font-medium flex-shrink-0">+91</div>
                    <input type="tel" value={pwMobile}
                      onChange={e => { setPwMobile(e.target.value.replace(/\D/g,'').slice(0,10)); setError(''); setNoPassword(false); }}
                      className={inp} placeholder="98765 43210" maxLength={10}/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Password / पासवर्ड
                  </label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      className={inp + ' pr-10'} placeholder="Enter your password"/>
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                <button onClick={loginWithPassword} disabled={loading}
                  className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <ChevronRight className="w-4 h-4"/>}
                  Login / लॉग इन
                </button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            New here?{' '}
            <a href="/farmer/register" className="font-bold" style={{ color: primaryColor }}>
              Register as Land Owner →
            </a>
          </p>

          <p className="text-center text-xs text-gray-300 mt-3">
            {org.loaded ? org.name : ''} · Powered by BNZ Green Technologies
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FarmerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"/>}>
      <FarmerLoginInner/>
    </Suspense>
  );
}
