'use client';
// src/app/officer/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Lock } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';

export default function FieldOfficerLoginPage() {
  const org = useOrgConfig();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) { setError('Enter your email/mobile and password'); return; }
    setLoading(true);

    const isEmail = identifier.includes('@');
    const res = await fetch('/api/field-officer/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEmail ? { email: identifier.trim(), password } : { mobile: identifier.trim(), password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Login failed'); return; }
    localStorage.setItem('officerId', data.officerId);
    localStorage.setItem('officerName', data.officerName);
    localStorage.setItem('officerToken', data.token);
    router.push('/officer/dashboard');
  }

  return (
    <div className="min-h-screen bg-sage-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {org.logoUrl ? (
            <OrgLogo src={org.logoUrl} alt={org.name} size="2xl" className="rounded-2xl mx-auto mb-4 shadow-lg"/>
          ) : (
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
              {org.name?.charAt(0) || 'F'}
            </div>
          )}
          <h1 className="font-display text-2xl text-sage-950">Field Officer Portal</h1>
          <p className="text-sage-500 text-sm mt-1">{org.loaded ? org.name : ''}</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-sage-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1">Email or Mobile</label>
            <div className="relative">
              <User className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input value={identifier} onChange={e => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-300"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-300"/>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60">
            <LogIn className="w-4 h-4"/> {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="text-center text-sage-400 text-xs">
            Field Officer accounts are created by your administrator. Contact them if you don't have login details.
          </p>
        </form>
      </div>
    </div>
  );
}
