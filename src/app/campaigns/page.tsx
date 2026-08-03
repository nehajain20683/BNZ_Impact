'use client';
// src/app/campaigns/page.tsx — Per-campaign default package selection
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { CAMPAIGNS, CAMPAIGN_PACKAGES, INDIVIDUAL_TREE_PRICE, formatCurrency, NATURE_IMAGES } from '@/lib/utils';

// Default package per campaign
const CAMPAIGN_DEFAULTS: Record<string, number> = {
  dadi: 108,
  maa:  54,
  beti: 27,
  poti: 11,
};

function CampaignCard({ c }: { c: typeof CAMPAIGNS[0] }) {
  const [selected, setSelected] = useState(CAMPAIGN_DEFAULTS[c.slug] ?? 54);
  const selectedPkg = CAMPAIGN_PACKAGES.find(p => p.trees === selected)!;

  return (
    <div className="group bg-white border border-sage-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-sage-100 transition-all hover:-translate-y-1">
      <div className="relative h-52 overflow-hidden">
        <Image src={c.image} alt={c.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-white font-display text-xl font-bold leading-tight">{c.name}</h2>
          <p className="text-white/75 text-xs mt-0.5">{c.subtitle}</p>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sage-600 text-xs leading-relaxed mb-4">{c.description}</p>

        <div className="space-y-2 mb-4">
          {CAMPAIGN_PACKAGES.map(pkg => {
            const isSelected = selected === pkg.trees;
            return (
              <button
                key={pkg.id}
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
                  {formatCurrency(pkg.price)}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href={`/donate?campaign=${c.slug}&trees=${selectedPkg.trees}&amount=${selectedPkg.price}`}
          className="flex items-center justify-center gap-2 bg-sage-700 hover:bg-sage-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          Sponsor {selectedPkg.trees} Trees — {formatCurrency(selectedPkg.price)} <ArrowRight className="w-4 h-4"/>
        </Link>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="relative h-64 mt-16">
        <Image src={NATURE_IMAGES.aerial} alt="Forest canopy" fill className="object-cover"/>
        <div className="absolute inset-0 bg-sage-900/70"/>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="text-sage-300 text-xs font-bold uppercase tracking-widest mb-3">JITO Green Legacy</div>
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">Family Campaigns</h1>
          <p className="text-sage-200 max-w-lg">Sponsor trees in honour of the most important women in your life.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {CAMPAIGN_PACKAGES.map(pkg => (
            <div key={pkg.id} className="flex items-center gap-3 bg-white border border-sage-100 rounded-2xl px-4 py-2.5 shadow-sm">
              <span className="text-xl">{pkg.emoji}</span>
              <div className="flex flex-col">
                <span className="font-bold text-sage-900 text-sm leading-tight">{pkg.badgeEn}</span>
                <span className="text-sage-500 text-xs leading-tight">{pkg.badge}</span>
              </div>
              <span className="text-sage-300">|</span>
              <span className="text-sage-700 text-sm">{pkg.trees} Trees</span>
              <span className="font-bold text-sage-800 text-sm">{formatCurrency(pkg.price)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {CAMPAIGNS.map(c => (
            <CampaignCard key={c.slug} c={c} />
          ))}
        </div>

        <div className="bg-forest-950 text-white rounded-3xl p-8 text-center max-w-xl mx-auto">
          <div className="text-4xl mb-3">🌱</div>
          <h3 className="font-display text-2xl mb-2">Individual Tree</h3>
          <p className="text-sage-300 text-sm mb-4">Sponsor any number of trees starting from just ₹500 per tree.</p>
          <div className="text-4xl font-display font-bold text-sage-300 mb-4">₹{INDIVIDUAL_TREE_PRICE}/tree</div>
          <Link href="/donate?campaign=individual&trees=11&amount=5500"
            className="inline-flex items-center gap-2 bg-sage-500 hover:bg-sage-400 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            Sponsor Trees <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>
      </div>
    </div>
  );
}
