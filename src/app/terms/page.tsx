// src/app/terms/page.tsx
import { headers } from 'next/headers';
import { resolveTenantFromRequest } from '@/lib/tenant';

const GENERIC_SECTIONS = (org: { name: string }) => [
  { h: '1. Donations', p: `All donations made through ${org.name} are voluntary. Donations are used exclusively for tree plantation activities, farmer payments, and programme operations. Tax deduction eligibility, if any, is subject to verification and this organisation's registration.` },
  { h: '2. Tree Sponsorships', p: 'Each tree sponsorship entitles the donor to a geo-tagged tree allocated on verified land. The donor receives a personalised digital certificate and access to a monitoring dashboard.' },
  { h: '3. Tree Plantation Process', p: `Trees are planted by our partner farmers on their registered land parcels. Planting timelines are subject to seasonal and agricultural factors. ${org.name} commits to planting all sponsored trees within a reasonable timeframe of donation.` },
  { h: '4. User Responsibilities', p: 'Users must provide accurate information during registration and donation. Providing false information, particularly for tax-deduction claims, is a legal offence.' },
  { h: '5. Limitation of Liability', p: `${org.name} shall not be liable for force majeure events including floods, drought, or natural disasters that affect plantation survival rates. We commit to best-effort replacement of trees with a low survival rate.` },
  { h: '6. Governing Law', p: 'These terms are governed by the laws applicable to this organisation\u2019s place of registration.' },
];

export default async function Terms() {
  const org = await resolveTenantFromRequest({ headers: headers() } as unknown as Request);
  const customText = org.termsText?.trim();

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-16 max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl text-forest-950 mb-2">Terms & Conditions</h1>
        <p className="text-sage-400 text-sm mb-10">{org.name}</p>

        {customText ? (
          customText.split(/\n\s*\n/).map((block, i) => (
            <p key={i} className="text-sage-600 leading-relaxed whitespace-pre-line mb-6">{block}</p>
          ))
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-8">
              {org.name} has not yet published its own Terms & Conditions. The section below is generic
              placeholder text — in particular it does not state this organisation's actual registered
              jurisdiction, and should not be relied on as such.
            </div>
            {GENERIC_SECTIONS(org).map(s => (
              <div key={s.h} className="mb-8">
                <h2 className="font-display text-xl text-forest-950 mb-2">{s.h}</h2>
                <p className="text-sage-600 leading-relaxed">{s.p}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
