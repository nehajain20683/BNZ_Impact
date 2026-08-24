// src/app/about/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { resolveTenantFromRequest } from '@/lib/tenant';

const TEAM_BNZ = [
  { name: 'CA Ashish Jain', role: 'Co-founder',  linkedin: '' },
  { name: 'Dr. Neha Jain',  role: 'Co-founder',  linkedin: '' },
];

const TEAM_ENV = [
  { name: 'Sujit Bhatevara', role: 'Director In-Charge', linkedin: '' },
  { name: 'Anand Chordia',   role: 'Chairman',           linkedin: '' },
  { name: 'Gaurav Dak',      role: 'Chief Secretary',    linkedin: '' },
];

const TEAM_MZ_ROW1 = [
  { name: 'Dr. Vinay Jain',  role: 'Chairman' },
  { name: 'CA Vijay Jain',   role: 'Chief Secretary' },
  { name: 'Tarachand Ganna', role: 'Vice Chairman' },
  { name: 'Pramod Mehta',    role: 'Treasurer' },
  { name: 'Dr. Neha Jain',   role: 'JES Zone Convenor' },
];
const TEAM_MZ_ROW2 = [
  { name: 'Yogesh Jain',  role: 'Youth Wing Zone Convenor' },
  { name: 'Ranjana Mehta',role: 'Ladies Wing Zone Convenor' },
];

const CHAPTERS = [
  { name: 'JITO Ghatkopar Chapter',        members: [{ n:'Mahendra Chordia', r:'Chairman' },{ n:'Sunil Doshi', r:'Chief Secretary' },{ n:'Piyush Bafna', r:'JES Convenor' }] },
  { name: 'JITO Goregaon Chapter',         members: [{ n:'B.C. Bhalawat', r:'Chairman' },{ n:'Amol Shah', r:'Chief Secretary' },{ n:'CA Meena Shah', r:'JES Convenor' }] },
  { name: 'JITO Gowalia Tank Chapter',     members: [{ n:'Jayesh Bhansali', r:'Chairman' },{ n:'Mahendra Shah', r:'Chief Secretary' },{ n:'Manish Jain', r:'JES Convenor' }] },
  { name: 'JITO Juhu Chapter',             members: [{ n:'Kantilal Mehta', r:'Chairman' },{ n:'Sunita Parmar', r:'Chief Secretary' },{ n:'Meena Choudhary', r:'JES Convenor' }] },
  { name: 'JITO Kalyan/Dombivali Chapter', members: [{ n:'Basantilal Chaplot', r:'Chairman' },{ n:'Mahendra Sancheti', r:'Chief Secretary' }] },
  { name: 'JITO Midtown Chapter',          members: [{ n:'Suresh Jain', r:'Chairman' },{ n:'Mahendra Jain', r:'Chief Secretary' },{ n:'Mitesh Sonigra', r:'JES Convenor' }] },
  { name: 'JITO Mulund Chapter',           members: [{ n:'Rakesh Doshi', r:'Chairman' },{ n:'Prietesh Meisheri', r:'Chief Secretary' }] },
  { name: 'JITO Navi Mumbai Chapter',      members: [{ n:'Mahendra Chordia', r:'Chairman' },{ n:'Ronak Surana', r:'Chief Secretary' }] },
  { name: "JITO Queen's Necklace Chapter", members: [{ n:'Rakesh Jain', r:'Chairman' },{ n:'Sunderlal Bothra', r:'Chief Secretary' },{ n:'Niki Hingad', r:'JES Convenor' }] },
  { name: 'JITO Thane Chapter',            members: [{ n:'Mahavir Jain', r:'Chairman' },{ n:'Sandeep Kothari', r:'Chief Secretary' },{ n:'Deepak Parik', r:'JES Convenor' }] },
  { name: 'JITO Walkeshwar Chapter',       members: [{ n:'Shailesh Logani', r:'Chairman' },{ n:'Kush Nahata', r:'Chief Secretary' },{ n:'Priyanka Nahata', r:'JES Convenor' }] },
];

const TIMELINE = [
  { year: '5 June 2026',           title: 'BNZ Green Legacy Launch',     desc: 'Official World Environment Day launch of BNZ Green Legacy with a vision for 1 lakh trees across Maharashtra.' },
  { year: 'June 2026',             title: 'Phase 1 — Kalyan Plantation',  desc: 'First plantation drive of 10,000 trees at Palghar district farms covering 12.5 acres of verified land.' },
  { year: 'July – September 2026', title: 'Phase 2 Expansion',            desc: 'Expansion to additional districts across Maharashtra and onboarding of more farmer partners.' },
];

function MemberCard({ name, role, linkedin = '' }: { name: string; role: string; linkedin?: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-sage-100 border-2 border-sage-200 flex items-center justify-center mb-2 flex-shrink-0">
        <span className="text-sage-700 font-bold text-lg">{initials}</span>
      </div>
      <div className="font-bold text-forest-950 text-xs leading-tight">{name}</div>
      <div className="text-sage-500 text-[10px] mt-0.5 leading-tight">{role}</div>
      {linkedin && (
        <a href={linkedin} target="_blank" rel="noopener noreferrer"
          className="mt-1 text-blue-500 hover:text-blue-700">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
            <circle cx="4" cy="4" r="2"/>
          </svg>
        </a>
      )}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="text-center mb-6">
      <h3 className="font-display text-xl text-forest-950 mb-1">{title}</h3>
      <div className="w-12 h-0.5 bg-sage-400 mx-auto"/>
    </div>
  );
}

export default async function AboutPage() {
  // This page's content (leadership, chapters, timeline) is written specifically
  // for the BNZ Green tenant and isn't generic per-tenant content — so for every
  // other tenant it's hidden from navigation (Navbar.tsx) and unreachable here.
  const org = await resolveTenantFromRequest({ headers: headers() } as unknown as Request);
  if (org.slug !== 'bnz-green') notFound();

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-16">

        {/* Hero */}
        <section className="bg-forest-950 text-white py-20 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage:"url('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1600&q=80')", backgroundSize:'cover', backgroundPosition:'center' }}/>
          <div className="relative z-10 max-w-3xl mx-auto">
            <p className="text-sage-400 text-sm tracking-widest uppercase mb-3 font-semibold">About Us</p>
            <h1 className="font-display text-4xl sm:text-5xl mb-4">BNZ Green Impact</h1>
            <p className="text-sage-300 text-lg">A long-term family-driven tree plantation movement by BNZ Green</p>
          </div>
        </section>

        {/* About */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl text-forest-950 mb-4">About the Initiative</h2>
              <p className="text-sage-700 leading-relaxed mb-4">
                BNZ Green Legacy is a long-term, community-driven tree plantation initiative conceived by BNZ Green Technologies. This is not a one-time event — it is a legacy programme designed to span generations.
              </p>
              <p className="text-sage-700 leading-relaxed mb-4">
                Phase 1 begins with a family plantation drive, inviting everyone to plant trees in the names of the most important women in their lives — Dadi, Maa, Beti, and Poti. Each tree is geo-tagged, photographed, and monitored.
              </p>
              <p className="text-sage-700 leading-relaxed">
                Beyond Phase 1, the programme supports farmer livelihoods, builds carbon credit portfolios under international standards, and creates a measurable environmental legacy for the community.
              </p>
            </div>
            <div className="bg-sage-50 rounded-3xl p-8 border border-sage-100">
              {[
                ['Phase 1 Target',  '10,000+ Trees'],
                ['Plantation Sites','Palghar District, MH'],
                ['Land Area',       '12.5 Acres Verified'],
                ['Launch Date',     '5th June 2026'],
                ['Tax Benefit',     '80G Eligible'],
                ['Price per Tree',  '₹500 only'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2 border-b border-sage-100 last:border-0">
                  <span className="text-sage-500 text-sm">{l}</span>
                  <span className="font-semibold text-forest-900 text-sm">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="bg-forest-950 py-14 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {[
              { title:'Our Mission', icon:'🎯', text:'To create family-driven environmental stewardship and support farmers through sustainable tree plantations, generating long-term ecological and economic value for communities across Maharashtra.' },
              { title:'Our Vision',  icon:'🌏', text:"To build India's largest community-led family plantation movement — where every family has a living legacy of trees that will grow for generations, sequester carbon, and restore India's green cover." },
            ].map(mv => (
              <div key={mv.title} className="bg-white/10 rounded-2xl p-8 border border-white/10">
                <div className="text-4xl mb-4">{mv.icon}</div>
                <h3 className="font-display text-2xl text-white mb-3">{mv.title}</h3>
                <p className="text-sage-300 leading-relaxed">{mv.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 px-4 bg-cream-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl text-forest-950 text-center mb-12">Our Journey</h2>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-sage-200"/>
              <div className="space-y-8">
                {TIMELINE.map((t, i) => (
                  <div key={i} className="flex gap-6 relative">
                    <div className="w-12 h-12 bg-sage-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 z-10">{i + 1}</div>
                    <div className="bg-white rounded-2xl border border-sage-100 p-5 flex-1 shadow-sm">
                      <div className="text-sage-500 text-xs font-semibold uppercase tracking-wide mb-1">{t.year}</div>
                      <div className="font-display text-lg text-forest-950 mb-1">{t.title}</div>
                      <p className="text-sage-600 text-sm leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl text-forest-950 text-center mb-3">Our Team</h2>
            <p className="text-sage-500 text-center mb-12 max-w-2xl mx-auto text-sm">
              BNZ Green Legacy is led by dedicated volunteers across India.
            </p>

            {/* Team BNZ Green */}
            <div className="bg-sage-50 rounded-3xl p-8 border border-sage-100 mb-8">
              <SectionHeading title="Team BNZ Green"/>
              <div className="flex justify-center gap-10 flex-wrap">
                {TEAM_BNZ.map(m => <MemberCard key={m.name} {...m}/>)}
              </div>
            </div>

            {/* Environment Team */}
            <div className="bg-sage-50 rounded-3xl p-8 border border-sage-100 mb-8">
              <SectionHeading title="Environment Team"/>
              <div className="flex justify-center gap-10 flex-wrap">
                {TEAM_ENV.map(m => <MemberCard key={m.name} {...m}/>)}
              </div>
            </div>

            {/* Mumbai Zone */}
            <div className="bg-sage-50 rounded-3xl p-8 border border-sage-100 mb-8">
              <SectionHeading title="Mumbai Zone"/>
              <div className="flex justify-center gap-8 flex-wrap mb-6">
                {TEAM_MZ_ROW1.map(m => <MemberCard key={m.name} {...m}/>)}
              </div>
              <div className="flex justify-center gap-8 flex-wrap">
                {TEAM_MZ_ROW2.map(m => <MemberCard key={m.name} {...m}/>)}
              </div>
            </div>

            {/* Chapters */}
            <div className="bg-sage-50 rounded-3xl p-8 border border-sage-100">
              <SectionHeading title="Chapters"/>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {CHAPTERS.map(ch => (
                  <div key={ch.name} className="bg-white rounded-2xl p-4 border border-sage-100 shadow-sm">
                    <h4 className="font-bold text-forest-950 text-xs mb-3 border-b border-sage-100 pb-2">{ch.name}</h4>
                    <div className="space-y-1.5">
                      {ch.members.map(m => (
                        <div key={m.n} className="flex justify-between text-[11px]">
                          <span className="text-forest-900 font-medium">{m.n}</span>
                          <span className="text-sage-500">{m.r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* CTA */}
        <section className="py-14 px-4 bg-sage-700 text-center text-white">
          <h2 className="font-display text-3xl mb-3">Join the Movement</h2>
          <p className="text-sage-300 mb-6 max-w-xl mx-auto">Plant a tree today in the name of someone you love. Together, we build India's green legacy.</p>
          <Link href="/campaigns" className="inline-block bg-white text-sage-800 font-bold px-8 py-3.5 rounded-full hover:bg-sage-50 transition-colors">
            Sponsor Trees Now →
          </Link>
        </section>

      </div>
    </div>
  );
}
