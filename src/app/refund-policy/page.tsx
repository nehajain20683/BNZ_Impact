// src/app/refund-policy/page.tsx
import { headers } from 'next/headers';
import { resolveTenantFromRequest } from '@/lib/tenant';

const GENERIC_SECTIONS = (org: { name: string; email: string | null; phone: string | null }) => [
  { h: 'General Policy', p: `Donations made to ${org.name} are generally non-refundable, as they are used directly for tree plantation activities and farmer livelihood support.` },
  { h: 'Exceptional Refunds', p: `Refunds may be considered in exceptional circumstances at the sole discretion of ${org.name}. To request a refund, please contact ${org.email || 'us'} within 7 days of donation with your receipt number and reason.` },
  { h: 'Failed Transactions', p: 'In the event of a payment failure where money is deducted but no donation is recorded, the amount will be automatically refunded to your account within 5\u20137 business days as per our payment gateway\u2019s policies.' },
  { h: 'Duplicate Payments', p: `If you have made a duplicate payment, please contact us immediately at ${org.email || 'the contact details on this site'} with both receipt numbers. We will investigate and process a refund for the duplicate within 10 business days.` },
  { h: 'How to Contact Us', p: `Email: ${org.email || '\u2014'}${org.phone ? `\nPhone: ${org.phone}` : ''}\nPlease include your receipt number, name, and email in all refund requests.` },
];

export default async function RefundPolicy() {
  const org = await resolveTenantFromRequest({ headers: headers() } as unknown as Request);
  const customText = org.refundPolicyText?.trim();

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-16 max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl text-forest-950 mb-2">Refund Policy</h1>
        <p className="text-sage-400 text-sm mb-10">{org.name}</p>

        {customText ? (
          customText.split(/\n\s*\n/).map((block, i) => (
            <p key={i} className="text-sage-600 leading-relaxed whitespace-pre-line mb-6">{block}</p>
          ))
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-8">
              {org.name} has not yet published its own Refund Policy. The section below is generic
              placeholder text and does not describe this organisation's specific practices.
            </div>
            {GENERIC_SECTIONS(org).map(s => (
              <div key={s.h} className="mb-8">
                <h2 className="font-display text-xl text-forest-950 mb-2">{s.h}</h2>
                <p className="text-sage-600 leading-relaxed whitespace-pre-line">{s.p}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
