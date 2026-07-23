'use client';
// src/components/layout/Footer.tsx — Org-config driven footer
import Link from 'next/link';
import Image from 'next/image';
import { useOrgConfig } from '@/components/OrgConfigProvider';

export default function Footer() {
  const org = useOrgConfig();

  return (
    <footer className="bg-forest-950 text-forest-200 py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt={org.name} className="w-10 h-10 rounded-lg object-contain"/>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-sage-700 flex items-center justify-center text-white font-bold text-lg">
                  {org.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-display text-white text-lg leading-tight">{org.name}</div>
                <div className="text-forest-400 text-xs">Afforestation · Carbon Credits · dMRV</div>
              </div>
            </div>
            <p className="text-forest-400 text-sm leading-relaxed max-w-sm">
              A verified digital platform for tree plantation, farmer onboarding, and carbon credit generation.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-forest-400">
              {[
                ['/campaigns',  'Sponsor Trees'],
                ['/farmer/register', 'Register Land'],
                ['/impact',     'Impact Dashboard'],
                ['/about',      'About Us'],
                ['/csr',        'Corporate Support'],
              ].map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-forest-400">
              {org.email && <li><a href={`mailto:${org.email}`} className="hover:text-white">{org.email}</a></li>}
              {org.phone && <li><a href={`tel:${org.phone}`} className="hover:text-white">{org.phone}</a></li>}
              {org.website && <li><a href={org.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">{org.website}</a></li>}
            </ul>
            <div className="mt-4 space-y-1 text-xs text-forest-500">
              <Link href="/privacy-policy" className="block hover:text-forest-300">Privacy Policy</Link>
              <Link href="/terms" className="block hover:text-forest-300">Terms of Service</Link>
              <Link href="/refund-policy" className="block hover:text-forest-300">Refund Policy</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-forest-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-forest-500 text-xs">
            © {new Date().getFullYear()} {org.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-forest-500 text-xs">
            <span>Powered by</span>
            <a href="https://www.bnzgreen.io" target="_blank" rel="noopener noreferrer"
              className="text-forest-400 hover:text-white font-semibold">BNZ Green Technologies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
