'use client';
// src/app/farmer/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Phone, Lock, CheckCircle, ArrowLeft, Leaf } from 'lucide-react';

type Screen = 'login' | 'otp' | 'forgot_mobile' | 'forgot_otp' | 'forgot_reset' | 'success';

const inputCls = "w-full border border-sage-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white";

export default function FarmerLoginPage() {
  const router = useRouter();
  const [screen, setScreen]     = useState<Screen>('login');
  const [mobile, setMobile]     = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [devOtp, setDevOtp]     = useState('');

  async function callAPI(body: object) {
    const res = await fetch('/api/farmer/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, mobile }),
    });
    return res.json();
  }

  function saveSession(data: any) {
    localStorage.setItem('farmerToken', data.token);
    localStorage.setItem('farmerId', data.farmerId);
    localStorage.setItem('farmerName', data.farmerName || '');
  }

  // ── Password Login ──────────────────────────────────────
  async function handlePasswordLogin() {
    if (!mobile || !password) { setError('Enter mobile and password'); return; }
    setLoading(true); setError('');
    const data = await callAPI({ action: 'password', password });
    setLoading(false);
    if (data.success) { saveSession(data); router.push('/farmer/dashboard'); }
    else setError(data.error || 'Login failed');
  }

  // ── Send OTP for login ──────────────────────────────────
  async function handleSendLoginOTP() {
    if (!mobile) { setError('Enter mobile number'); return; }
    setLoading(true); setError('');
    const data = await callAPI({ action: 'otp_send' });
    setLoading(false);
    if (data.success) { if (data.devOtp) setDevOtp(data.devOtp); setScreen('otp'); }
    else setError(data.error || 'Failed to send OTP');
  }

  // ── Verify OTP for login ────────────────────────────────
  async function handleVerifyLoginOTP() {
    setLoading(true); setError('');
    const data = await callAPI({ action: 'otp_verify', otp });
    setLoading(false);
    if (data.success) { saveSession(data); router.push('/farmer/dashboard'); }
    else setError(data.error || 'Invalid OTP');
  }

  // ── Forgot: send OTP ────────────────────────────────────
  async function handleForgotSend() {
    if (!mobile) { setError('Enter mobile number'); return; }
    setLoading(true); setError('');
    const data = await callAPI({ action: 'forgot_send' });
    setLoading(false);
    if (data.success) { if (data.devOtp) setDevOtp(data.devOtp); setScreen('forgot_otp'); }
    else setError(data.error || 'Failed to send OTP');
  }

  // ── Forgot: verify OTP ──────────────────────────────────
  async function handleForgotVerify() {
    setLoading(true); setError('');
    const data = await callAPI({ action: 'forgot_verify', otp });
    setLoading(false);
    if (data.success) setScreen('forgot_reset');
    else setError(data.error || 'Invalid OTP');
  }

  // ── Forgot: reset password ──────────────────────────────
  async function handleForgotReset() {
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw.length < 8)    { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    const data = await callAPI({ action: 'reset', otp, newPassword: newPw });
    setLoading(false);
    if (data.success) setScreen('success');
    else setError(data.error || 'Failed to reset password');
  }

  return (
    <div className="min-h-screen bg-sage-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-sage-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white"/>
            </div>
            <span className="font-display font-bold text-sage-900">JITO Green Legacy</span>
          </div>
          <p className="text-sage-500 text-sm">Land Owner Portal / भूमि स्वामी पोर्टल</p>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-6 shadow-sm">

          {/* ── Login Screen ── */}
          {screen === 'login' && (
            <>
              <h2 className="font-display text-xl text-sage-950 mb-4">Land Owner Login / भूमि स्वामी लॉगिन</h2>
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-3">{error}</div>}

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-1">Mobile Number</label>
                  <div className="flex gap-2">
                    <span className="border border-sage-200 rounded-xl px-3 py-3 text-sm text-sage-500 bg-sage-50">+91</span>
                    <input type="tel" maxLength={10} placeholder="98765 43210"
                      value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/,''))}
                      className={inputCls + " flex-1"}/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-1">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="Your password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && handlePasswordLogin()}
                      className={inputCls + " pr-10"}/>
                    <button onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400">
                      {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={handlePasswordLogin} disabled={loading}
                className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl disabled:opacity-60 mb-2">
                {loading ? 'Signing in...' : 'Login'}
              </button>

              <button onClick={handleSendLoginOTP} disabled={loading}
                className="w-full border-2 border-sage-300 text-sage-700 hover:bg-sage-50 font-semibold py-3 rounded-xl mb-3">
                Login with OTP
              </button>

              <div className="flex justify-between text-xs">
                <button onClick={() => { setScreen('forgot_mobile'); setError(''); }}
                  className="text-sage-500 hover:text-sage-700 hover:underline">
                  Forgot Password?
                </button>
                <Link href="/farmer/register" className="text-sage-600 font-semibold hover:underline">
                  Register Land / भूमि पंजीकरण
                </Link>
              </div>
            </>
          )}

          {/* ── OTP Login Screen ── */}
          {screen === 'otp' && (
            <>
              <button onClick={() => { setScreen('login'); setOtp(''); setDevOtp(''); }}
                className="flex items-center gap-1 text-sage-500 text-sm mb-4 hover:text-sage-700">
                <ArrowLeft className="w-4 h-4"/> Back
              </button>
              <h2 className="font-display text-xl text-sage-950 mb-1">Enter OTP</h2>
              <p className="text-sage-500 text-sm mb-3">Sent to +91 {mobile}</p>
              {devOtp && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-center mb-3">
                  <div className="text-amber-600 text-xs mb-1">Dev OTP</div>
                  <div className="text-amber-800 text-3xl font-mono font-bold tracking-widest">{devOtp}</div>
                </div>
              )}
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-3">{error}</div>}
              <input type="number" maxLength={6} placeholder="• • • • • •"
                value={otp} onChange={e => setOtp(e.target.value)}
                className={inputCls + " text-center text-3xl tracking-widest font-mono mb-4"}/>
              <button onClick={handleVerifyLoginOTP} disabled={loading || otp.length!==6}
                className="w-full bg-sage-700 text-white font-bold py-3 rounded-xl disabled:opacity-60 mb-2">
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button onClick={handleSendLoginOTP} className="w-full text-sage-500 text-xs hover:underline">
                Resend OTP
              </button>
            </>
          )}

          {/* ── Forgot: Enter Mobile ── */}
          {screen === 'forgot_mobile' && (
            <>
              <button onClick={() => { setScreen('login'); setError(''); }}
                className="flex items-center gap-1 text-sage-500 text-sm mb-4 hover:text-sage-700">
                <ArrowLeft className="w-4 h-4"/> Back to Login
              </button>
              <h2 className="font-display text-xl text-sage-950 mb-1">Forgot Password</h2>
              <p className="text-sage-500 text-sm mb-4">Enter your registered mobile number</p>
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-3">{error}</div>}
              <div className="flex gap-2 mb-4">
                <span className="border border-sage-200 rounded-xl px-3 py-3 text-sm text-sage-500 bg-sage-50">+91</span>
                <input type="tel" maxLength={10} placeholder="98765 43210"
                  value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/,''))}
                  className={inputCls + " flex-1"}/>
              </div>
              <button onClick={handleForgotSend} disabled={loading || !mobile}
                className="w-full bg-sage-700 text-white font-bold py-3 rounded-xl disabled:opacity-60">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          )}

          {/* ── Forgot: Enter OTP ── */}
          {screen === 'forgot_otp' && (
            <>
              <h2 className="font-display text-xl text-sage-950 mb-1">Verify OTP</h2>
              <p className="text-sage-500 text-sm mb-3">Sent to +91 {mobile}</p>
              {devOtp && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-center mb-3">
                  <div className="text-amber-600 text-xs mb-1">Dev OTP</div>
                  <div className="text-amber-800 text-3xl font-mono font-bold tracking-widest">{devOtp}</div>
                </div>
              )}
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-3">{error}</div>}
              <input type="number" maxLength={6} placeholder="• • • • • •"
                value={otp} onChange={e => setOtp(e.target.value)}
                className={inputCls + " text-center text-3xl tracking-widest font-mono mb-4"}/>
              <button onClick={handleForgotVerify} disabled={loading || otp.length!==6}
                className="w-full bg-sage-700 text-white font-bold py-3 rounded-xl disabled:opacity-60 mb-2">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button onClick={handleForgotSend} className="w-full text-sage-500 text-xs hover:underline">
                Resend OTP
              </button>
            </>
          )}

          {/* ── Forgot: New Password ── */}
          {screen === 'forgot_reset' && (
            <>
              <h2 className="font-display text-xl text-sage-950 mb-4">Set New Password</h2>
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-3">{error}</div>}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-1">New Password</label>
                  <input type="password" placeholder="Min 8 characters"
                    value={newPw} onChange={e => setNewPw(e.target.value)} className={inputCls}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-1">Confirm Password</label>
                  <input type="password" placeholder="Repeat password"
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls}/>
                  {confirmPw && newPw !== confirmPw && (
                    <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
              <button onClick={handleForgotReset}
                disabled={loading || !newPw || newPw !== confirmPw}
                className="w-full bg-sage-700 text-white font-bold py-3 rounded-xl disabled:opacity-60">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}

          {/* ── Success ── */}
          {screen === 'success' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-green-600"/>
              </div>
              <h2 className="font-display text-xl text-sage-950 mb-2">Password Updated!</h2>
              <p className="text-sage-500 text-sm mb-5">You can now login with your new password.</p>
              <button onClick={() => { setScreen('login'); setOtp(''); setNewPw(''); setConfirmPw(''); }}
                className="w-full bg-sage-700 text-white font-bold py-3 rounded-xl">
                Back to Login
              </button>
            </div>
          )}

        </div>

        <p className="text-center text-sage-400 text-xs mt-4">
          JITO Green Legacy · Land Owner Portal / भूमि स्वामी पोर्टल · Mumbai Zone
        </p>
      </div>
    </div>
  );
}
