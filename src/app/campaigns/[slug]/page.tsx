'use client';
// src/app/campaigns/[slug]/page.tsx
// The clickable destination a campaign card was missing — a real product
// page, not just a "Sponsor" button with nowhere else to go.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ChevronLeft, TreePine, FileCheck, MapPin, Gift, Star } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { CAMPAIGN_PACKAGES as DEFAULT_PACKAGES, packagePrice, formatCurrency } from '@/lib/utils';

// Shown when a campaign has no custom perks set — reflects only what this
// platform actually does today. Deliberately doesn't include an
// e-greeting-card perk by default, since that isn't a built feature yet;
// an org can still add its own custom perk entry if it offers something
// outside this list.
const DEFAULT_PERKS = [
  { key: 'plantation', title: 'Tree(s) Plantation', description: 'A native tree is planted at a verified site by a field officer, GPS-tagged and photographed at the time of planting.', icon: 'plantation' },
  { key: 'certificate', title: 'e-Certificate of Plantation', description: 'A signed digital certificate with your name and the project details, available to download right after planting is confirmed.', icon: 'certificate' },
  { key: 'geotag', title: 'Geotag & Live Tracking', description: "Track your tree's exact location and growth photos any time, or scan the QR code printed on its certificate.", icon: 'geotag' },
];

const PERK_ICONS: Record<string, any> = { plantation: TreePine, certificate: FileCheck, geotag: MapPin, gift: Gift };

export default function CampaignDetailPage() {
  const { slug } = useParams() as { slug: string };
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [openPerk, setOpenPerk] = useState<string | null>('plantation');
  const [selected, setSelected] = useState<number | null>(null);
  const [customQty, setCustomQty] = useState(1);

  useEffect(() => {
    fetch(`/api/campaigns/${slug}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        const packages = Array.isArray(d.campaign?.packages) && d.campaign.packages.length ? d.campaign.packages : DEFAULT_PACKAGES;
        const def = packages.find((p: any) => p.popular) || packages[0];
        setSelected(def?.trees ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!data?.campaign) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
      <p className="text-gray-500">This campaign isn't available right now.</p>
      <Link href="/campaigns" className="text-sm font-semibold" style={{ color: primaryColor }}>← Back to all campaigns</Link>
    </div>
  );

  const c = data.campaign;
  const related: any[] = data.related || [];
  const packages = Array.isArray(c.packages) && c.packages.length ? c.packages : DEFAULT_PACKAGES;
  const perks = Array.isArray(c.perks) && c.perks.length ? c.perks.filter((p: any) => p.enabled !== false) : DEFAULT_PERKS;
  const images = [c.imageUrl, ...(c.galleryImages || [])].filter(Boolean);
  const selectedPkg = packages.find((p: any) => p.trees === selected);
  const isCustom = selected === -1;
  const treeCount = isCustom ? customQty : (selectedPkg?.trees || 1);
  const amount = packagePrice(treeCount, c.treePrice);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-sage-500 hover:text-sage-800 mb-6">
          <ChevronLeft className="w-4 h-4"/> All Campaigns
        </Link>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-sage-50">
              {images[activeImage] ? (
                <Image src={images[activeImage]} alt={c.name} fill className="object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: c.accentColor || primaryColor }}>
                  <TreePine className="w-16 h-16 text-white/40"/>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ outline: activeImage === i ? `2px solid ${primaryColor}` : '1px solid #e5e7eb', outlineOffset: 1 }}>
                    <Image src={img} alt="" fill className="object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-sage-950 leading-tight">{c.name}</h1>
            {c.subtitle && <p className="text-sage-500 mt-2">{c.subtitle}</p>}

            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-2xl font-bold" style={{ color: primaryColor }}>{formatCurrency(c.treePrice)}</span>
              <span className="text-sage-400 text-sm">per tree</span>
            </div>

            {c.description && <p className="text-sage-600 text-sm leading-relaxed mt-4">{c.description}</p>}

            <div className="mt-6">
              <h3 className="font-semibold text-sage-900 mb-1">How Many Will You Plant Today?</h3>
              <p className="text-sage-400 text-xs mb-3">Each tree supports a land owner and grows for years to come.</p>
              <div className="flex flex-wrap gap-2">
                {packages.map((pkg: any) => (
                  <button key={pkg.id || pkg.trees} onClick={() => setSelected(pkg.trees)}
                    className="px-4 py-2 rounded-xl border text-sm font-semibold transition-colors"
                    style={selected === pkg.trees
                      ? { borderColor: primaryColor, backgroundColor: `${primaryColor}12`, color: primaryColor }
                      : { borderColor: '#e5e7eb', color: '#3a4a34' }}>
                    {pkg.emoji} {pkg.trees} Tree{pkg.trees === 1 ? '' : 's'}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-xs text-sage-400 block mb-1">Or choose your own quantity</label>
                <div className="flex items-center gap-3 border border-sage-200 rounded-xl px-3 py-2 w-fit">
                  <button onClick={() => { setSelected(-1); setCustomQty(q => Math.max(1, q - 1)); }} className="text-sage-500 text-lg font-bold w-6">−</button>
                  <span className="w-10 text-center font-semibold text-sage-900">{isCustom ? customQty : treeCount}</span>
                  <button onClick={() => { setSelected(-1); setCustomQty(q => (isCustom ? q : treeCount) + 1); }} className="text-sage-500 text-lg font-bold w-6">+</button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl p-4" style={{ backgroundColor: `${primaryColor}0d` }}>
              <div>
                <div className="text-xs text-sage-400">Total for {treeCount} tree{treeCount === 1 ? '' : 's'}</div>
                <div className="text-xl font-bold" style={{ color: primaryColor }}>{formatCurrency(amount)}</div>
              </div>
              <Link href={`/donate?campaign=${c.slug}&trees=${treeCount}&amount=${amount}`}
                className="text-white font-bold px-6 py-3 rounded-xl text-sm" style={{ backgroundColor: primaryColor }}>
                Sponsor Now
              </Link>
            </div>

            {/* What You Get */}
            <div className="mt-10">
              <h3 className="font-semibold text-sage-900 mb-3">What You Get</h3>
              <div className="border border-sage-100 rounded-2xl divide-y divide-sage-100 overflow-hidden">
                {perks.map((perk: any) => {
                  const Icon = PERK_ICONS[perk.icon] || Star;
                  const isOpen = openPerk === perk.key;
                  return (
                    <div key={perk.key}>
                      <button onClick={() => setOpenPerk(isOpen ? null : perk.key)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }}/>
                        <span className="flex-1 font-medium text-sage-900 text-sm">{perk.title}</span>
                        <ChevronDown className={`w-4 h-4 text-sage-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                      </button>
                      {isOpen && <p className="px-4 pb-4 text-sage-500 text-xs leading-relaxed">{perk.description}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Related campaigns */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl text-sage-950 mb-5">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(r => (
                <Link key={r.id} href={`/campaigns/${r.slug}`} className="group block">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-sage-50 mb-2">
                    {r.imageUrl ? (
                      <Image src={r.imageUrl} alt={r.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500"/>
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: r.accentColor || primaryColor }}/>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-sage-900 leading-tight">{r.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: primaryColor }}>{formatCurrency(r.treePrice)} / tree</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
