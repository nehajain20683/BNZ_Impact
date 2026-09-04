'use client';
// src/app/page.tsx — Tenant-branded home page · Light Theme · Real Photography
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Leaf, Globe, Shield, FileText, TreePine } from 'lucide-react';
import { CAMPAIGN_PACKAGES as DEFAULT_PACKAGES, INDIVIDUAL_TREE_PRICE, packagePrice, formatCurrency, NATURE_IMAGES, WHY_PLANT_IMAGES } from '@/lib/utils';
import { useOrgConfig } from '@/components/OrgConfigProvider';

const STATS = [
  { number: '1,08,000+', label: 'Trees Pledged' },
  { number: '₹4.8 Cr+',  label: 'Raised' },
  { number: '8,500+',    label: 'Donor Families' },
  { number: '2,376 MT',  label: 'CO₂ Offset / Year' },
];

const WHY_PLANT = [
  { icon: '🌍', title: 'Environmental Responsibility', desc: 'We believe in giving back to nature — contributing meaningfully to climate action for a sustainable tomorrow.', img: WHY_PLANT_IMAGES.environmental },
  { icon: '🌳', title: 'Family Legacy',                desc: 'Trees symbolise continuity, roots, and generations — just like our families. A tree planted today will shade your grandchildren.', img: WHY_PLANT_IMAGES.legacy },
  { icon: '🤝', title: 'Community Participation',      desc: 'Encouraging every member to join a shared green mission — because collective action creates the most lasting change.', img: WHY_PLANT_IMAGES.community },
  { icon: '👶', title: 'Future Generations',           desc: 'Creating a healthier planet for our children and grandchildren is the greatest inheritance we can leave behind.', img: WHY_PLANT_IMAGES.future },
  { icon: '🕊️', title: 'Spiritual Responsibility',    desc: 'Aligning environmental stewardship with our values of compassion, service, and responsibility to all living beings.', img: WHY_PLANT_IMAGES.spiritual },
  { icon: '📊', title: 'Transparent Impact',           desc: 'Every tree is geo-tagged and photographed. Track your impact on our live dashboard — complete transparency guaranteed.', img: WHY_PLANT_IMAGES.transparent },
];

const TESTIMONIALS = [
  { name: 'Rajesh Jain', city: 'Mumbai', text: 'I planted 108 trees in my dadi\'s name. She cried when she saw the certificate. No gift I\'ve ever given meant this much.', trees: 108, campaign: 'Ek Ped Dadi Ke Naam' },
  { name: 'Priya Shah', city: 'Thane', text: 'Our family sponsored 54 trees for Maa on her 70th birthday. We track each tree on the dashboard — a living birthday gift.', trees: 54, campaign: 'Ek Ped Maa Ke Naam' },
  { name: 'Amit Mehta', city: 'Navi Mumbai', text: 'For our beti\'s birth we planted 27 trees. She\'ll grow up knowing she has her own forest. What a start to life.', trees: 27, campaign: 'Ek Ped Beti Ke Naam' },
];

export default function HomePage() {
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : { campaigns: [] })
      .then(d => setCampaigns(d.campaigns || []))
      .catch(() => setCampaigns([]));
  }, []);

  const previewPackages = campaigns
    .slice()
    .sort((a, b) => (b.packages?.length || 0) - (a.packages?.length || 0))[0]?.packages
    || DEFAULT_PACKAGES;

  return (
    <div className="min-h-screen bg-cream-50">
      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* Real tree photograph as background */}
        <div className="absolute inset-0">
          <Image
            src={NATURE_IMAGES.hero}
            alt={`Majestic green tree — ${org.name || 'BNZ Impact'}`}
            fill
            className="object-cover object-center"
            priority
            quality={90}
          />
          {/* Elegant light overlay — left side readable, right side reveals photo */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/20"/>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/30"/>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center hero-grid">
          {/* Left: Content */}
          <div className="fade-up">
            {/* Org badge */}
            <div className="inline-flex items-center gap-2 bg-white/90 border border-sage-200 text-sage-700 text-xs font-semibold px-4 py-2 rounded-full mb-7 shadow-sm backdrop-blur-sm">
              <span className="w-2 h-2 bg-sage-500 rounded-full"/>
              {org.loaded ? org.name : 'BNZ Impact'} · Family Plantation Drive
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl text-sage-950 leading-[0.95] tracking-tight mb-4 sm:mb-5">
              {org.loaded ? org.name : 'BNZ Impact'}
            </h1>
            <p className="text-sage-600 text-lg font-medium mb-4 italic font-display">Grow a living legacy for your family.</p>
            <p className="text-sage-700 text-lg leading-relaxed mb-10 max-w-lg">
              Plant trees in honor of your family — Dadi, Maa, Beti, and Poti — and create a living legacy for generations to come.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/campaigns"
                className="group flex items-center justify-center gap-3 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:scale-[1.02]"
                style={{ backgroundColor: primaryColor }}>
                Sponsor Trees
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
              </Link>
              <Link href="/impact"
                className="flex items-center justify-center gap-3 bg-white/90 border border-sage-200 text-sage-800 hover:bg-sage-50 font-semibold text-lg px-8 py-4 rounded-2xl transition-all backdrop-blur-sm shadow-sm">
                <Globe className="w-5 h-5 text-sage-500"/>
                View Impact Dashboard
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-5">
              {[
                { icon: Shield, text: 'Secure Payments' },
                { icon: FileText, text: '80G Tax Receipt' },
                { icon: TreePine, text: 'Geo-tagged Trees' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-sage-600 bg-white/80 border border-sage-100 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Icon className="w-3.5 h-3.5 text-sage-500"/>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Stats cards floating over photo */}
          <div className="hidden lg:flex flex-col gap-4 items-end fade-up-d2 hero-stats">
            <div className="grid grid-cols-2 gap-3">
              {STATS.map(s => (
                <div key={s.label} className="bg-white/90 backdrop-blur-md border border-sage-100 rounded-2xl p-5 shadow-lg text-center">
                  <div className="font-display text-2xl font-bold text-sage-800">{s.number}</div>
                  <div className="text-sage-500 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="backdrop-blur-md rounded-2xl px-6 py-4 text-center" style={{ backgroundColor: `${primaryColor}e6`, borderColor: `${primaryColor}cc`, borderWidth: 1 }}>
              <div className="text-sage-300 text-xs font-semibold uppercase tracking-widest mb-1">Next Plantation</div>
              <div className="text-white font-display text-lg">Mumbai · June 2026</div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-sage-400">
          <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-sage-400 to-transparent animate-pulse"/>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <section className="bg-white border-y border-sage-100 py-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="font-display text-3xl font-bold text-sage-800">{s.number}</div>
              <div className="text-sage-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CAMPAIGNS ══════════ */}
      <section className="py-24 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-sage-100 text-sage-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Campaigns</div>
            <h2 className="font-display text-4xl sm:text-5xl text-sage-950 mb-4">Choose Your Campaign</h2>
            <p className="text-sage-600 text-lg max-w-xl mx-auto leading-relaxed">Sponsor trees toward the cause or dedication that matters most to you.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {campaigns.map((c, i) => (
              <Link key={c.slug} href={`/donate?campaign=${c.slug}`}
                className="group card-lift bg-white border border-sage-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Real photo header */}
                <div className="relative h-44 overflow-hidden">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: c.accentColor || '#2d5a1b' }}/>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"/>
                  {/* Campaign heading on photo */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-white font-display text-lg font-bold leading-tight">{c.name}</div>
                    <div className="text-white/80 text-xs mt-0.5">{c.subtitle}</div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sage-600 text-sm leading-relaxed mb-4">{c.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sage-400">
                      {(Array.isArray(c.packages) && c.packages.length ? c.packages : DEFAULT_PACKAGES).map((p: any) => p.trees).join(' · ')} trees
                    </span>
                    <span className="flex items-center gap-1 text-sage-700 font-semibold text-sm group-hover:gap-2 transition-all">
                      Sponsor <ArrowRight className="w-4 h-4"/>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Individual trees */}
          <div className="mt-8 relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0">
              <Image src={NATURE_IMAGES.aerial} alt="Forest aerial" fill className="object-cover"/>
              <div className="absolute inset-0 bg-sage-900/80"/>
            </div>
            <div className="relative z-10 p-10 md:p-14 text-center">
              <h3 className="font-display text-3xl text-white mb-2">Individual Tree Sponsorship</h3>
              <p className="text-sage-200 mb-6 text-lg max-w-lg mx-auto">
                Buy 1 tree or any quantity — starting at <strong className="text-white">{formatCurrency(org.treePrice || INDIVIDUAL_TREE_PRICE)}</strong> per tree.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={`/donate?type=individual&trees=1&amount=${org.treePrice || INDIVIDUAL_TREE_PRICE}`}
                  className="inline-flex items-center gap-2 bg-white text-sage-800 font-bold px-8 py-3.5 rounded-xl hover:bg-sage-50 transition-all hover:scale-105">
                  Buy 1 Tree — {formatCurrency(org.treePrice || INDIVIDUAL_TREE_PRICE)}
                </Link>
                <Link href="/donate?type=individual"
                  className="inline-flex items-center gap-2 border-2 border-white/40 text-white hover:bg-white/10 font-semibold px-8 py-3.5 rounded-xl transition-all">
                  Custom Quantity
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ WHY PLANT SECTION ══════════ */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-sage-100 text-sage-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">The Mission</div>
            <h2 className="font-display text-4xl sm:text-5xl text-sage-950 mb-4">
              Why Families<br/>Choose to Plant
            </h2>
            <p className="text-sage-600 text-lg max-w-2xl mx-auto leading-relaxed">
              This isn't just a plantation drive. It's a movement rooted in family, faith, and responsibility to the earth we share.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_PLANT.map((item, i) => (
              <div key={item.title} className="group card-lift bg-cream-50 border border-sage-100 rounded-2xl overflow-hidden">
                {/* Real photo */}
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={item.img}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sage-900/50 to-transparent"/>
                </div>
                <div className="p-6">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="font-display text-xl text-sage-950 mb-2">{item.title}</h3>
                  <p className="text-sage-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PACKAGES OVERVIEW ══════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image src={NATURE_IMAGES.nature1} alt="" fill className="object-cover"/>
          <div className="absolute inset-0 bg-sage-50/60"/>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block bg-white border border-sage-200 text-sage-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Sponsorship Packages</div>
            <h2 className="font-display text-4xl text-sage-950 mb-3">Choose Your Legacy</h2>
            <p className="text-sage-600 max-w-lg mx-auto">Every package includes geo-tagging, digital certificate, 80G receipt, and live tree tracking.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {previewPackages.map((pkg: any) => (
              <div key={pkg.id || pkg.trees}
                className={`relative rounded-2xl border-2 p-6 transition-all ${pkg.popular ? 'shadow-xl' : 'border-sage-100 bg-white hover:border-sage-300 card-lift'}`}
                style={pkg.popular ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow"
                    style={{ color: primaryColor }}>
                    Most Popular
                  </div>
                )}
                <div className={`font-display text-5xl font-bold mb-1 ${pkg.popular ? 'text-sage-200' : 'text-sage-700'}`}>{pkg.trees}</div>
                <div className={`text-sm mb-3 ${pkg.popular ? 'text-sage-400' : 'text-sage-400'}`}>trees · {pkg.badge}</div>
                <div className={`font-bold text-2xl mb-2 ${pkg.popular ? 'text-white' : 'text-sage-900'}`}>{formatCurrency(packagePrice(pkg.trees, org.treePrice))}</div>
                <div className={`text-xs mb-4 ${pkg.popular ? 'text-sage-400' : 'text-sage-400'}`}>{pkg.trees * 22}kg CO₂ absorbed/year</div>
                <p className={`text-xs leading-relaxed mb-5 ${pkg.popular ? 'text-sage-300' : 'text-sage-500'}`}>{pkg.description}</p>
                <ul className={`text-xs space-y-1.5 mb-5 ${pkg.popular ? 'text-sage-400' : 'text-sage-500'}`}>
                  {['Geo-tagged plantation','Digital certificate','80G receipt','Live tree tracking'].map(f => (
                    <li key={f} className="flex items-center gap-1.5"><span className="text-sage-500">✓</span>{f}</li>
                  ))}
                </ul>
                <Link href="/campaigns"
                  className={`block text-center text-sm font-bold py-2.5 rounded-xl transition-colors ${pkg.popular ? 'bg-white hover:bg-sage-50' : 'text-white'}`}
                  style={pkg.popular ? { color: primaryColor } : { backgroundColor: primaryColor }}>
                  Choose Campaign
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block bg-sage-100 text-sage-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Stories of Legacy</div>
            <h2 className="font-display text-4xl text-sage-950 mb-3">What Our Families Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card-lift bg-cream-50 border border-sage-100 rounded-2xl p-7">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-sage-700 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center justify-between pt-4 border-t border-sage-100">
                  <div>
                    <div className="text-sage-900 font-semibold text-sm">{t.name}</div>
                    <div className="text-sage-400 text-xs">{t.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="bg-sage-100 text-sage-700 text-xs font-bold px-3 py-1 rounded-full">🌳 {t.trees} trees</div>
                    <div className="text-sage-400 text-xs mt-1">{t.campaign}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image src={NATURE_IMAGES.nature2} alt="Peaceful forest" fill className="object-cover"/>
          <div className="absolute inset-0 bg-sage-900/75"/>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-block bg-white/10 border border-white/20 text-sage-200 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            {org.loaded ? org.name : 'BNZ Impact'}
          </div>
          <h2 className="font-display text-4xl sm:text-6xl text-white mb-5 leading-tight">
            Her legacy begins<br/>with a single tree.
          </h2>
          <p className="text-sage-200 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of families creating a greener India. It takes just 2 minutes.
          </p>
          <Link href="/campaigns"
            className="inline-flex items-center gap-3 bg-white text-sage-800 font-bold text-xl px-10 py-5 rounded-2xl hover:bg-sage-50 transition-all hover:scale-105 hover:shadow-2xl shadow-lg">
            Sponsor Trees Now <ArrowRight className="w-6 h-6"/>
          </Link>
        </div>
      </section>

      {/* ══════════ CONTACT ══════════ */}
      <section id="contact" className="py-16 bg-white border-t border-sage-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl text-sage-950 mb-3">Get in Touch</h2>
          <p className="text-sage-500 mb-8">Questions about the initiative? We'd love to hear from you.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`mailto:${org.email || 'contact@bnzgreen.io'}`}
              className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              style={{ backgroundColor: primaryColor }}>
              Email Us
            </a>
            <Link href="/csr"
              className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-semibold px-6 py-3 rounded-xl hover:bg-sage-50 transition-colors">
              Corporate Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
