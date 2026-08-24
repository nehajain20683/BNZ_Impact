'use client';
// src/app/success/page.tsx — with download + share options
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Download, LayoutDashboard, Share2, MessageCircle, Copy, Mail } from 'lucide-react';
import { formatCurrency, NATURE_IMAGES } from '@/lib/utils';
import { useOrgConfig } from '@/components/OrgConfigProvider';

function SuccessContent() {
  const org        = useOrgConfig();
  const orgName    = org.loaded ? org.name : 'BNZ Impact';
  const params     = useSearchParams();
  const donationId = params.get('donationId');
  const [donation, setDonation]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (donationId) {
      fetch(`/api/donations/${donationId}`)
        .then(r => r.json())
        .then(d => { setDonation(d.donation); setLoading(false); });
    }
  }, [donationId]);

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const certUrl     = `/certificate?id=${donationId}`;
  const receiptUrl  = `/receipt?id=${donationId}`;
  const dashUrl     = `${appUrl}/dashboard`;

  function handleCopyLink() {
    navigator.clipboard.writeText(certUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `🌳 I just sponsored ${donation?.numberOfTrees || ''} trees with ${orgName}!\n\nView my Tree Sponsorship Certificate:\n${certUrl}\n\n*${orgName}*`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  function handleEmailShare() {
    const subject = encodeURIComponent(`My ${orgName} Tree Certificate`);
    const body    = encodeURIComponent(
      `Hi,\n\nI just sponsored ${donation?.numberOfTrees || ''} trees through the ${orgName} family plantation drive.\n\nView my Tree Sponsorship Certificate:\n${certUrl}\n\n${orgName}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50">
      <div className="text-sage-600 font-display text-xl">Loading your receipt…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-20 pb-16">
        <div className="max-w-lg mx-auto px-4">

          {/* Card */}
          <div className="bg-white rounded-3xl border border-sage-100 overflow-hidden shadow-xl">

            {/* Photo header */}
            <div className="relative h-36 sm:h-44">
              <Image src={NATURE_IMAGES.tree1} alt="Tree" fill className="object-cover"/>
              <div className="absolute inset-0 bg-sage-900/70 flex flex-col items-center justify-center text-center p-6">
                <CheckCircle className="w-10 h-10 text-sage-300 mb-2"/>
                <h1 className="font-display text-2xl text-white">Thank You! 🌳</h1>
                <p className="text-sage-300 text-xs mt-1">{orgName}</p>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {donation && (
                <>
                  {/* Summary */}
                  <div className="bg-sage-50 border border-sage-100 rounded-2xl p-4 mb-4 space-y-2">
                    <h2 className="font-display text-base text-sage-900 mb-2">Donation Summary</h2>
                    {[
                      ['Receipt No.', `#${donation.receiptNumber}`],
                      ['Donor',       donation.donorName],
                      ['Campaign',    donation.campaign?.name],
                      ['Trees',       `${donation.numberOfTrees} Trees 🌳`],
                      ['Amount',      formatCurrency(donation.amount)],
                      ['Transaction', donation.paymentGatewayId || '—'],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between text-sm">
                        <span className="text-sage-500">{label}</span>
                        <span className="text-sage-900 font-semibold text-right max-w-[55%]">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dedication */}
                  {donation.dedicationName && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-center">
                      <p className="text-amber-800 text-sm">🌺 Dedicated to <strong>{donation.dedicationName}</strong></p>
                    </div>
                  )}

                  {/* CO2 */}
                  <div className="bg-sage-700 rounded-2xl p-4 text-center mb-5">
                    <div className="text-sage-300 text-xs font-semibold uppercase tracking-widest mb-1">CO₂ Removed / Year</div>
                    <div className="font-display text-3xl text-white font-bold">
                      <span className="text-sage-300">↓</span> {donation.numberOfTrees * 22}kg
                    </div>
                    <div className="text-sage-400 text-xs mt-1">Carbon removed from atmosphere annually</div>
                  </div>
                </>
              )}

              {/* Download buttons */}
              <div className="space-y-2.5 mb-4">
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border-2 border-sage-300 text-sage-700 hover:bg-sage-50 font-semibold py-3 rounded-xl transition-colors text-sm w-full">
                  <Download className="w-4 h-4"/> Download Receipt (PDF)
                </a>
                <a href={certUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-sage-700 hover:bg-sage-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm w-full">
                  <Download className="w-4 h-4"/> Download Certificate (PDF)
                </a>
              </div>

              {/* Share section */}
              <div className="border border-sage-100 rounded-2xl overflow-hidden mb-4">
                <button
                  onClick={() => setShareOpen(!shareOpen)}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-sage-700 hover:bg-sage-50 transition-colors">
                  <span className="flex items-center gap-2"><Share2 className="w-4 h-4"/> Share Certificate</span>
                  <span className={`transition-transform ${shareOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {shareOpen && (
                  <div className="border-t border-sage-100 p-3 grid grid-cols-3 gap-2">
                    {/* WhatsApp */}
                    <button onClick={handleWhatsApp}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 transition-colors text-green-700">
                      <MessageCircle className="w-5 h-5"/>
                      <span className="text-xs font-semibold">WhatsApp</span>
                    </button>
                    {/* Email */}
                    <button onClick={handleEmailShare}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors text-blue-700">
                      <Mail className="w-5 h-5"/>
                      <span className="text-xs font-semibold">Email</span>
                    </button>
                    {/* Copy link */}
                    <button onClick={handleCopyLink}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-sage-50 hover:bg-sage-100 border border-sage-200 transition-colors text-sage-700">
                      <Copy className="w-5 h-5"/>
                      <span className="text-xs font-semibold">{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dashboard */}
              <Link href="/dashboard"
                className="flex items-center justify-center gap-2 border border-sage-200 text-sage-700 hover:bg-sage-50 font-semibold py-3 rounded-xl transition-colors text-sm">
                <LayoutDashboard className="w-4 h-4"/> Go to My Dashboard
              </Link>

              <p className="text-center text-sage-400 text-xs mt-4">
                A confirmation email with your receipt &amp; certificate has been sent.<br/>
                <strong>{orgName}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream-50"><div className="text-sage-600">Loading…</div></div>}>
      <SuccessContent />
    </Suspense>
  );
}
