// src/app/privacy-policy/page.tsx
import { headers } from 'next/headers';
import { resolveTenantFromRequest } from '@/lib/tenant';

const GENERIC_SECTIONS = (org: { name: string; email: string | null; phone: string | null }) => [
  { h: '1. Data We Collect', p: 'We collect your name, email address, mobile number, PAN number (optional), and payment information when you make a donation. For farmer registrations, we collect identity, bank account, and land information as required for the programme.' },
  { h: '2. How We Use Your Data', p: 'Your data is used to process donations, generate tax receipts where applicable, issue tree sponsorship certificates, send confirmation emails, and communicate programme updates. We do not sell your data to third parties.' },
  { h: '3. Data Storage & Security', p: 'Your data is stored on secure cloud infrastructure. Payment data is processed through our payment gateway and is PCI-DSS compliant. We use encryption in transit (TLS) and at rest.' },
  { h: '4. Cookies', p: 'We use essential cookies for authentication and session management only. We do not use tracking or advertising cookies.' },
  { h: '5. Third-Party Services', p: 'We use third-party providers for payment processing, transactional email, and database storage. Each service has its own privacy policy.' },
  { h: '6. Your Rights', p: `You may request access to, correction of, or deletion of your personal data by contacting ${org.email || 'us'}. We will respond within 30 days.` },
  { h: '7. Contact', p: `For privacy concerns, contact us at ${org.email || 'the contact details on this site'}${org.phone ? ` or ${org.phone}` : ''}.` },
];

export default async function PrivacyPolicy() {
  const org = await resolveTenantFromRequest({ headers: headers() } as unknown as Request);
  const customText = org.privacyPolicyText?.trim();

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-16 max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl text-forest-950 mb-2">Privacy Policy</h1>
        <p className="text-sage-400 text-sm mb-10">{org.name}</p>

        {customText ? (
          customText.split(/\n\s*\n/).map((block, i) => (
            <p key={i} className="text-sage-600 leading-relaxed whitespace-pre-line mb-6">{block}</p>
          ))
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-8">
              {org.name} has not yet published its own Privacy Policy. The section below is generic
              placeholder text and does not describe this organisation's specific practices.
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
