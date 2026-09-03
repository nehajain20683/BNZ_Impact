'use client';
// src/app/farmers/page.tsx
// A public gallery of the org's farmers — trust/transparency page, no login
// required. Only shows what the public API already treats as safe: name,
// village, aggregate tree count. Never contact or financial details.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, MapPin, TreePine, Search } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';

const AVATAR_COLORS = ['#2d5a1b', '#8b5a2b', '#1a5276', '#7d3c98', '#a04000', '#186a3b'];
function avatarColor(name: string) {
  const idx = (name || '').charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] || AVATAR_COLORS[0];
}

export default function FarmersGalleryPage() {
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/public/farmers')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const farmers = (data?.farmers || []).filter((f: any) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return f.fullName?.toLowerCase().includes(q) || f.village?.toLowerCase().includes(q) || f.district?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-cream-50 pb-16">
      <div className="text-white py-14 px-4 text-center" style={{ backgroundColor: primaryColor }}>
        <Users className="w-10 h-10 mx-auto mb-3 text-white/70"/>
        <h1 className="font-display text-3xl md:text-4xl">Meet the Farmers</h1>
        <p className="text-sage-300 text-sm mt-2 max-w-lg mx-auto">
          Every tree has a story, and every story starts with a farmer. {data?.orgName ? `Here's who's growing with ${data.orgName}.` : ''}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-3 flex items-center gap-2 mb-6">
          <Search className="w-4 h-4 text-sage-300 ml-2"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, village, or district…"
            className="flex-1 py-2 text-sm focus:outline-none"/>
        </div>

        {loading ? (
          <div className="text-center py-16 text-sage-400">Loading farmers…</div>
        ) : farmers.length === 0 ? (
          <div className="text-center py-16 text-sage-400">
            {search ? 'No farmers match your search.' : 'No farmers to show yet — check back soon.'}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {farmers.map((f: any) => (
              <div key={f.id} className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-xl mb-3 overflow-hidden"
                  style={{ backgroundColor: avatarColor(f.fullName) }}>
                  {f.photo ? <img src={f.photo} alt="" className="w-full h-full object-cover"/> : (f.fullName?.charAt(0) || '?')}
                </div>
                <div className="font-semibold text-sage-900">{f.fullName}</div>
                <div className="flex items-center gap-1 text-sage-400 text-xs mt-1">
                  <MapPin className="w-3 h-3"/> {[f.village, f.district].filter(Boolean).join(', ') || '—'}
                </div>
                <div className="flex items-center gap-1 text-sage-600 text-sm font-semibold mt-3">
                  <TreePine className="w-3.5 h-3.5"/> {f.totalTrees.toLocaleString('en-IN')} trees planted
                </div>
                {f.sites?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.sites.slice(0, 2).map((s: string) => (
                      <span key={s} className="text-[10px] bg-sage-50 text-sage-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-10">
          <Link href="/donate" className="inline-block text-white font-bold px-6 py-3 rounded-2xl text-sm"
            style={{ backgroundColor: primaryColor }}>
            🌳 Sponsor a Tree
          </Link>
        </div>
      </div>
    </div>
  );
}
