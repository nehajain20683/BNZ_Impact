'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings, Building2, Palette, CreditCard, Bell } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const [org, setOrg]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!['ADMIN','SUPER_ADMIN'].includes(role)) { router.push('/'); return; }
    fetch('/api/admin/org-config')
      .then(r => r.json())
      .then(d => { if (d.org) setOrg(d.org); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, role]);

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
              <p className="text-gray-400 text-xs mt-0.5">Farmer ID prefix: <span className="font-mono font-semibold text-gray-600">{org.farmer_id_prefix}</span> · Tree price: <span className="font-semibold text-gray-600">₹{org.tree_price}</span></p>
            </div>
            {role === 'SUPER_ADMIN' && org?.id && (
              <a href={`/sadmin/orgs/${org.id}`}
                className="ml-auto text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                Edit in Superadmin →
              </a>
            )}
          </div>
        )}

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
            <p className="text-xs text-blue-600 mt-1">Contact your BNZ platform administrator to update org name, branding, bank details, or tree pricing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
