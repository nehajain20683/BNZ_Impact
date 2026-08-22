'use client';
// src/app/auth/register/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreePine } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Registration failed.');
      setLoading(false);
    } else {
      router.push('/auth/login?registered=1');
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-sage-600 rounded-xl flex items-center justify-center">
              <TreePine className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-xl text-forest-900">BNZ Green Legacy</span>
          </Link>
          <h1 className="font-display text-3xl text-forest-950">Create account</h1>
          <p className="text-sage-600 mt-2">Join thousands of tree donors</p>
        </div>

        <div className="bg-white border border-forest-100 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Rajesh Kumar' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'mobile', label: 'Mobile', type: 'tel', placeholder: '+91 98765 43210' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 characters' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-forest-700 mb-1">{f.label}</label>
                <input
                  type={f.type} required
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border border-sage-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <button
              type="submit" disabled={loading}
              className="w-full bg-sage-600 hover:bg-sage-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-forest-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-sage-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
