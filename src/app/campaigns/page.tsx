'use client';
// src/app/campaigns/page.tsx — Per-campaign default package selection
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { CAMPAIGN_PACKAGES as DEFAULT_PACKAGES, INDIVIDUAL_TREE_PRICE, packagePrice, formatCurrency, NATURE_IMAGES } from '@/lib/utils';
import { useOrgConfig } from '@/components/OrgConfigProvider';

function CampaignCard({ c, treePrice }: { c: any; treePrice?: number | null }) {
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const packages = Array.isArray(c.packages) && c.packages.length ? c.packages : DEFAULT_PACKAGES;
  const defaultPkg = packages.find((p: any) => p.popular) || packages[0];
  const [selected, setSelected] = useState(defaultPkg?.trees ?? 0);
  const selectedPkg = packages.find((p: any) => p.trees === selected) || defaultPkg;
  const selectedAmount = packagePrice(selectedPkg.trees, c.treePrice || treePrice);

  return (
    <div className="group bg-white border border-sage-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-sage-100 transition-all hover:-translate-y-1">
      <div className="relative h-52 overflow-hidden">
        {c.imageUrl ? (
          <Image src={c.imageUrl} alt={c.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700"/>
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: c.accentColor || '#2d5a1b' }}/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-white font-display text-xl font-bold leading-tight">{c.name}</h2>
          <p className="text-white/75 text-xs mt-0.5">{c.subtitle}</p>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sage-600 text-xs leading-relaxed mb-4">{c.description}</p>

        <div className="space-y-2 mb-4">
          {packages.map((pkg: any) => {
            const isSelected = selected === pkg.trees;
            return (
              <button
                key={pkg.id || pkg.trees}
                onClick={() => setSelected(pkg.trees)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  isSelected
                    ? 'border-sage-600 bg-sage-50 ring-1 ring-sage-400'
                    : 'border-sage-100 hover:border-sage-300 hover:bg-sage-50/50'
                }`}>
                <span className="font-semibold text-sage-900">
                  {pkg.emoji} {pkg.trees} Trees
                </span>
                <span className={`font-bold ${isSelected ? 'text-sage-700' : 'text-sage-600'}`}>
                  {formatCurrency(packagePrice(pkg.trees, c.treePrice || treePrice))}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href={`/donate?campaign=${c.slug}&trees=${selectedPkg.trees}&amount=${selectedAmount}`}
          className="flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          style={{ backgroundColor: primaryColor }}>
          Sponsor {selectedPkg.trees} Trees — {formatCurrency(selectedAmount)} <ArrowRight className="w-4 h-4"/>
        </Link>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const org = useOrgConfig();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : { campaigns: [] })
      .then(d => setCampaigns(d.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoaded(true));
  }, []);

  // Package chips shown at the top preview whichever campaign has the most
  // package tiers configured (falls back to the platform default set).
  const previewPackages = campaigns
    .slice()
    .sort((a, b) => (b.packages?.length || 0) - (a.packages?.length || 0))[0]?.packages
    || DEFAULT_PACKAGES;

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="relative h-64 mt-16">
        <Image src={NATURE_IMAGES.aerial} alt="Forest canopy" fill className="object-cover"/>
        <div className="absolute inset-0 bg-sage-900/70"/>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="text-sage-300 text-xs font-bold uppercase tracking-widest mb-3">{org.loaded ? org.name : 'BNZ Impact'}</div>
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">Our Campaigns</h1>
          <p className="text-sage-200 max-w-lg">Sponsor trees in honour of the most important people in your life.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {previewPackages.map((pkg: any) => (
            <div key={pkg.id || pkg.trees} className="flex items-center gap-3 bg-white border border-sage-100 rounded-2xl px-4 py-2.5 shadow-sm">
              <span className="text-xl">{pkg.emoji}</span>
              <div className="flex flex-col">
                <span className="font-bold text-sage-900 text-sm leading-tight">{pkg.badgeEn}</span>
                <span className="text-sage-500 text-xs leading-tight">{pkg.badge}</span>
              </div>
              <span className="text-sage-300">|</span>
              <span className="text-sage-700 text-sm">{pkg.trees} Trees</span>
              <span className="font-bold text-sage-800 text-sm">{formatCurrency(packagePrice(pkg.trees, org.treePrice))}</span>
            </div>
          ))}
        </div>

        {loaded && campaigns.length === 0 ? (
          <p className="text-center text-sage-400 text-sm mb-12">No campaigns available right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {campaigns.map(c => (
              <CampaignCard key={c.slug} c={c} treePrice={org.treePrice} />
            ))}
          </div>
        )}

        <div className="text-white rounded-3xl p-8 text-center max-w-xl mx-auto" style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
          <div className="text-4xl mb-3">🌱</div>
          <h3 className="font-display text-2xl mb-2">Individual Tree</h3>
          <p className="text-sage-300 text-sm mb-4">Sponsor any number of trees starting from just {formatCurrency(org.treePrice || INDIVIDUAL_TREE_PRICE)} per tree.</p>
          <div className="text-4xl font-display font-bold text-sage-300 mb-4">{formatCurrency(org.treePrice || INDIVIDUAL_TREE_PRICE)}/tree</div>
          <Link href={`/donate?type=individual&trees=11&amount=${packagePrice(11, org.treePrice)}`}
            className="inline-flex items-center gap-2 bg-white hover:bg-sage-50 font-bold px-6 py-3 rounded-xl transition-colors"
            style={{ color: org.primaryColor || '#2d5a1b' }}>
            Sponsor Trees <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>
      </div>
    </div>
  );
}
