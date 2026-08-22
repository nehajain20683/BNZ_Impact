'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const org    = useOrgConfig();
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (['ADMIN','SUPER_ADMIN'].includes(role)) router.push('/admin');
      else router.push('/dashboard');
    }
  }, [status]);

  // Show error from URL params (NextAuth redirects errors here)
  useEffect(() => {
    const err = params.get('error');
    if (err === 'CredentialsSignin') setError('Invalid email or password');
  }, [params]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');

    const result = await signIn('credentials', {
      email, password, redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes('WRONG_ORG:')) {
        const orgName = result.error.split('WRONG_ORG:')[1];
        setError(`This account belongs to ${orgName}. Please use the correct portal.`);
      } else {
        setError('Invalid email or password');
      }
      return;
    }

    if (result?.ok) {
      const role = (session?.user as any)?.role;
      if (['ADMIN','SUPER_ADMIN'].includes(role)) router.push('/admin');
      else router.push('/dashboard');
    }
  }

  const primaryColor = org.primaryColor || '#2d5a1b';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name}
              className="w-16 h-16 rounded-2xl object-contain mx-auto mb-4 shadow-lg"/>
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
              style={{ backgroundColor: primaryColor }}>
              {(org.name || 'B').charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {org.loaded ? org.name : 'Loading…'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': primaryColor } as any}
                  placeholder="you@example.com"/>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2"
                  placeholder="••••••••"/>
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: primaryColor }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin"/> Signing in…</>
                : <><LogIn className="w-4 h-4"/> Sign In</>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
            <a href="/auth/forgot-password"
              className="text-sm hover:underline block"
              style={{ color: primaryColor }}>
              Forgot your password?
            </a>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          {org.loaded ? org.name : ''} · Powered by BNZ Green Technologies
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400"/>
      </div>
    }>
      <LoginForm/>
    </Suspense>
  );
}
