'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings, Building2, Palette, CreditCard, Bell, Save, Sprout, FileText } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const [org, setOrg]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [treePrice, setTreePrice] = useState('');
  const [org80g, setOrg80g] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const role = (session?.user as any)?.role;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function loadOrg() {
    fetch('/api/admin/org-config')
      .then(r => r.json())
      .then(d => {
        if (d.org) {
          setOrg(d.org);
          setTreePrice(String(d.org.tree_price ?? ''));
          setOrg80g(d.org.org_80g_number || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!['ADMIN','SUPER_ADMIN'].includes(role)) { router.push('/'); return; }
    loadOrg();
  }, [status, role]);

  async function savePricing() {
    setSaving(true);
    const res = await fetch('/api/admin/org-config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treePrice, org80gNumber: org80g }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.error || 'Failed to save'); return; }
    showToast('Saved ✓');
    loadOrg();
  }

  const cards = [
    { icon: Building2, label: 'Organisation',  desc: 'Name, email, address, domain',        color: 'text-blue-600',   bg: 'bg-blue-50',   href: role === 'SUPER_ADMIN' ? `/sadmin/orgs/${org?.id}` : '#' },
    { icon: Palette,   label: 'Branding',       desc: 'Logo, primary color, theme',          color: 'text-purple-600', bg: 'bg-purple-50', href: role === 'SUPER_ADMIN' ? `/sadmin/orgs/${org?.id}` : '#' },
    { icon: CreditCard,label: 'Payment Banks',  desc: 'Offline bank account details',        color: 'text-green-600',  bg: 'bg-green-50',  href: role === 'SUPER_ADMIN' ? `/sadmin/orgs/${org?.id}` : '#' },
    { icon: Bell,      label: 'Notifications',  desc: 'Email and SMS notification settings', color: 'text-amber-600',  bg: 'bg-amber-50',  href: '#' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Settings" subtitle="Organisation configuration and preferences"/>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

        {/* Org info card */}
        {org && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: org.primary_color || '#2d5a1b' }}>
              {org.name?.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{org.name}</h2>
              <p className="text-gray-400 text-sm">{org.email} · {org.plan} plan</p>
              <p className="text-gray-400 text-xs mt-0.5">Farmer ID prefix: <span className="font-mono font-semibold text-gray-600">{org.farmer_id_prefix}</span></p>
            </div>
            {role === 'SUPER_ADMIN' && org?.id && (
              <a href={`/sadmin/orgs/${org.id}`}
                className="ml-auto text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                Edit in Superadmin →
              </a>
            )}
          </div>
        )}

        {/* Pricing & Tax — editable at admin level, alongside campaigns */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Sprout className="w-4 h-4 text-emerald-600"/>
            <h3 className="font-semibold text-gray-900 text-sm">Pricing &amp; Tax</h3>
          </div>
          <p className="text-gray-400 text-xs mb-4">
            The org-wide default tree price — individual campaigns can still override this in <a href="/admin/campaigns" className="underline hover:text-gray-600">Campaigns</a>, this is just the fallback when a campaign doesn't set its own.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Default Tree Price (₹)</label>
              <input type="number" min={1} value={treePrice} onChange={e => setTreePrice(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3"/> 80G Receipt Number
              </label>
              <input value={org80g} onChange={e => setOrg80g(e.target.value)} placeholder="e.g. AABCB1234C-2025-26/123"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"/>
              <p className="text-gray-400 text-[11px] mt-1">Printed on every donation tax receipt generated for this org.</p>
            </div>
          </div>
          <button onClick={savePricing} disabled={saving}
            className="mt-4 flex items-center gap-1.5 bg-[var(--admin-primary)] text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-60">
            <Save className="w-3.5 h-3.5"/> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Settings cards */}
        <div className="grid grid-cols-2 gap-4">
          {cards.map(card => (
            <a key={card.label} href={card.href}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-start gap-4">
              <div className={`${card.bg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.color}`}/>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{card.label}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{card.desc}</p>
                {card.href === '#' && (
                  <span className="text-[10px] text-amber-500 mt-1 inline-block">Contact BNZ to update</span>
                )}
              </div>
            </a>
          ))}
        </div>

        {role !== 'SUPER_ADMIN' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold">Want to update your organisation settings?</p>
            <p className="text-xs text-blue-600 mt-1">Contact your BNZ platform administrator to update org name, branding, or bank details. Tree pricing and your 80G receipt number can be updated right above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
