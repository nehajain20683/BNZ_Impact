'use client';
// src/app/auth/forgot-password/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters',          pass: password.length >= 8 },
    { label: 'Uppercase letter',        pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',        pass: /[a-z]/.test(password) },
    { label: 'Number',                  pass: /\d/.test(password) },
    { label: 'Special character (@$!%*?&)', pass: /[@$!%*?&]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const color = score <= 2 ? 'bg-red-400' : score <= 3 ? 'bg-amber-400' : 'bg-green-500';
  const label = score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : score === 5 ? 'Strong' : 'Good';

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= score ? color : 'bg-gray-200'}`}/>
        ))}
        <span className="text-xs text-gray-500 ml-1 w-12">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1 text-xs ${c.pass ? 'text-green-600' : 'text-gray-400'}`}>
            <span>{c.pass ? '✓' : '○'}</span> {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [devOtp, setDevOtp]     = useState('');

  async function callAPI(body: object) {
    const res  = await fetch('/api/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  // Step 1 — Send OTP
  async function handleSend() {
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true); setError('');
    const data = await callAPI({ action:'send', email });
    setLoading(false);
    if (data.success) {
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep(2);
    } else setError(data.error || 'Failed to send OTP');
  }

  // Step 2 — Verify OTP
  async function handleVerify() {
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    const data = await callAPI({ action:'verify', email, otp });
    setLoading(false);
    if (data.success) setStep(3);
    else setError(data.error || 'Invalid OTP');
  }

  // Step 3 — Reset Password
  async function handleReset() {
    if (!newPw || !confirmPw) { setError('Please fill both password fields'); return; }
    if (newPw !== confirmPw)  { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    const data = await callAPI({ action:'reset', email, otp, newPassword: newPw });
    setLoading(false);
    if (data.success) setStep(4);
    else setError(data.error || 'Failed to reset password');
  }

  return (
    <div className="min-h-screen bg-sage-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-sage-700 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🌳</span>
            </div>
            <span className="font-display font-bold text-sage-900 text-xl">BNZ Green Legacy</span>
          </div>
        </div>

        {/* Step indicators */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1,2,3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s < step  ? 'bg-sage-700 text-white' :
                  s === step ? 'bg-sage-700 text-white ring-4 ring-sage-200' :
                               'bg-gray-200 text-gray-500'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-sage-700' : 'bg-gray-200'}`}/>}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-sage-100 p-7 shadow-sm">

          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <>
              <h2 className="font-display text-2xl text-sage-950 mb-1">Forgot Password?</h2>
              <p className="text-sage-500 text-sm mb-6">Enter your email address and we'll send you an OTP to reset your password.</p>
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>}
              <label className="block text-sm font-medium text-sage-700 mb-1">Email Address</label>
              <div className="relative mb-5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input type="email" placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className={inputCls + " pl-9"}/>
              </div>
              <button onClick={handleSend} disabled={loading || !email}
                className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-xl disabled:opacity-60 transition-colors">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
              <div className="text-center mt-4">
                <Link href="/auth/login" className="text-sage-600 text-sm hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5"/> Back to Login
                </Link>
              </div>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <>
              <h2 className="font-display text-2xl text-sage-950 mb-1">Enter OTP</h2>
              <p className="text-sage-500 text-sm mb-2">We sent a 6-digit OTP to <strong>{email}</strong></p>
              {devOtp && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-center mb-4">
                  <div className="text-amber-600 text-xs font-semibold uppercase tracking-wide mb-1">Dev OTP</div>
                  <div className="text-amber-800 text-3xl font-mono font-bold tracking-widest">{devOtp}</div>
                </div>
              )}
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>}
              <label className="block text-sm font-medium text-sage-700 mb-1">6-Digit OTP</label>
              <input type="number" maxLength={6} placeholder="• • • • • •"
                value={otp} onChange={e => setOtp(e.target.value)}
                className={inputCls + " text-center text-3xl tracking-widest font-mono mb-5"}/>
              <button onClick={handleVerify} disabled={loading || otp.length !== 6}
                className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-xl disabled:opacity-60 mb-3">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button onClick={() => { setStep(1); setOtp(''); setDevOtp(''); }}
                className="w-full text-sage-500 text-sm hover:underline">
                Resend OTP / Change email
              </button>
            </>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 3 && (
            <>
              <h2 className="font-display text-2xl text-sage-950 mb-1">Set New Password</h2>
              <p className="text-sage-500 text-sm mb-5">Choose a strong password for your account.</p>
              {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>}

              <div className="mb-4">
                <label className="block text-sm font-medium text-sage-700 mb-1">New Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase, number, special"
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    className={inputCls + " pr-10"}/>
                  <button onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {newPw && <PasswordStrength password={newPw}/>}
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-sage-700 mb-1">Confirm Password</label>
                <input type="password" placeholder="Repeat new password"
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  className={inputCls}/>
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
                {confirmPw && newPw === confirmPw && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3"/> Passwords match
                  </p>
                )}
              </div>

              <button onClick={handleReset}
                disabled={loading || !newPw || newPw !== confirmPw}
                className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-xl disabled:opacity-60">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}

          {/* ── Step 4: Success ── */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600"/>
              </div>
              <h2 className="font-display text-2xl text-sage-950 mb-2">Password Updated!</h2>
              <p className="text-sage-500 text-sm mb-6">
                Your password has been successfully changed.<br/>You can now login with your new password.
              </p>
              <Link href="/auth/login"
                className="inline-block w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-xl text-center transition-colors">
                Back to Login
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
