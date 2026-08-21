'use client';
// /farmer/login — OTP-based login, tenant branded
// 123456 always works as test OTP
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { Loader2, AlertCircle, ChevronRight } from 'lucide-react';

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white";

export default function FarmerLoginPage() {
  const org    = useOrgConfig();
  const router = useRouter();
  const primaryColor = org.primaryColor || '#2d5a1b';

  const [mobile, setMobile]   = useState('');
  const [otp, setOtp]         = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [devOtp, setDevOtp]   = useState(''); // shows actual OTP in dev

  async function sendOtp() {
    if (!mobile || mobile.length < 10) { setError('Enter valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/farmer/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, action: 'send' }),
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="text-white px-4 py-5" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-sm mx-auto flex items-center gap-3">
          {org.logoUrl
            ? <img src={org.logoUrl} alt="" className="w-10 h-10 rounded-xl object-contain bg-white/20 p-1"/>
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                {error}
              </div>
            )}

            {/* Mobile */}
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

            {/* OTP */}
            {otpSent && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  OTP / ओटीपी
                </label>
                <input type="tel" value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setError(''); }}
                  className={inp} placeholder="6-digit OTP" maxLength={6} autoFocus/>
                <p className="text-gray-400 text-xs mt-1.5">
                  OTP sent to +91 {mobile} · Test OTP: <strong>123456</strong>
                </p>
                {devOtp && (
                  <p className="text-amber-600 text-xs mt-0.5">
                    Dev mode — actual OTP: <strong>{devOtp}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Action button */}
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
