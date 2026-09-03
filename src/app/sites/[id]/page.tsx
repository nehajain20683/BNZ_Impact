'use client';
// src/app/sites/[id]/page.tsx
// A public, shareable page for one plantation site — no login required.
// Meant for donors to share ("here's the grove I'm part of") and for the
// org's own transparency/marketing. Only ever shows what the public APIs
// already treat as safe: site narrative, aggregate numbers, verified
// evidence, and farmers' name + village (never contact/financial details).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, TreePine, Users, Sprout, CheckCircle, Calendar, Share2 } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';

export default function SiteStoryPage() {
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/public/sites/${id}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  function share() {
    if (navigator.share) {
      navigator.share({ title: data?.site?.siteName, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><TreePine className="w-8 h-8 text-sage-300 animate-pulse"/></div>;
  }
  if (!data || data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-sage-500">{data?.error || 'Site not found.'}</p>
          <Link href="/" className="text-sage-700 text-sm font-semibold mt-2 inline-block">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const { site, farmers, verifiedVisits, orgName } = data;
  const progressPct = site.plannedTrees ? Math.min(100, Math.round((site.treesPlanted / site.plannedTrees) * 100)) : null;
  const mapUrl = site.gpsLatitude ? `https://www.google.com/maps?q=${site.gpsLatitude},${site.gpsLongitude}` : null;

  return (
    <div className="min-h-screen bg-cream-50 pb-16">
      {/* Hero */}
      <div className="relative h-72" style={{ backgroundColor: primaryColor }}>
        {site.imageUrl && <img src={site.imageUrl} alt="" className="w-full h-full object-cover opacity-70"/>}
        <div className="absolute inset-0 bg-gradient-to-t from-sage-950/85 to-sage-900/20"/>
        <div className="absolute top-5 left-4 right-4 flex justify-between items-start">
          <Link href="/" className="text-white/80 hover:text-white text-sm font-semibold">← {orgName}</Link>
          <button onClick={share} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
            <Share2 className="w-3.5 h-3.5"/> {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
        <div className="absolute bottom-6 left-4 right-4">
          <div className="text-sage-300 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
            <MapPin className="w-3 h-3"/> {[site.district, site.state].filter(Boolean).join(', ')}
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-white mt-1">{site.siteName}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10 space-y-4">

        {/* Quick stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-bold text-sage-900 text-xl">{site.treesPlanted?.toLocaleString('en-IN') || 0}</div>
            <div className="text-sage-400 text-xs mt-0.5">Trees Planted</div>
          </div>
          <div>
            <div className="font-bold text-sage-900 text-xl">{farmers.length}</div>
            <div className="text-sage-400 text-xs mt-0.5">Farmers</div>
          </div>
          <div>
            <div className="font-bold text-sage-900 text-xl">{site.survivalRate != null ? `${Math.round(site.survivalRate)}%` : '—'}</div>
            <div className="text-sage-400 text-xs mt-0.5">Survival Rate</div>
          </div>
        </div>

        {progressPct != null && (
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
            <div className="flex justify-between text-xs text-sage-500 mb-1.5">
              <span>Progress toward goal</span>
              <span>{site.treesPlanted.toLocaleString('en-IN')} of {site.plannedTrees.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-2.5 bg-sage-100 rounded-full overflow-hidden">
              <div className="h-full bg-sage-600 rounded-full transition-all" style={{ width: `${progressPct}%` }}/>
            </div>
          </div>
        )}

        {/* Story */}
        {site.description && (
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
            <h2 className="font-display text-lg text-sage-950 mb-2">About This Grove</h2>
            <p className="text-sage-600 text-sm leading-relaxed whitespace-pre-wrap">{site.description}</p>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-xs font-bold text-sage-700 border-2 border-sage-200 px-3 py-1.5 rounded-xl hover:border-sage-400">
                View on Map →
              </a>
            )}
          </div>
        )}

        {/* Meet the farmers here */}
        {farmers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-sage-500"/>
              <h2 className="font-display text-lg text-sage-950">The Farmers Growing Here</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {farmers.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-sage-50 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-sage-200 flex items-center justify-center font-bold text-sage-700 flex-shrink-0 overflow-hidden">
                    {f.photo ? <img src={f.photo} alt="" className="w-full h-full object-cover"/> : (f.fullName?.charAt(0) || '?')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sage-900 text-sm truncate">{f.fullName}</div>
                    <div className="text-sage-400 text-xs truncate">{f.village}{f.district ? `, ${f.district}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/farmers" className="inline-block mt-4 text-xs font-bold text-sage-700 hover:underline">
              Meet more farmers across {orgName} →
            </Link>
          </div>
        )}

        {/* Verified evidence */}
        {verifiedVisits?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sprout className="w-4 h-4 text-sage-500"/>
              <h2 className="font-display text-lg text-sage-950">Verified Growth Updates</h2>
            </div>
            <div className="space-y-3">
              {verifiedVisits.map((v: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <div className="text-sage-800 text-sm font-medium">
                      {v.survivalPct != null ? `${v.survivalPct}% survival confirmed` : 'Site visited and verified'}
                    </div>
                    <div className="text-sage-400 text-xs flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3"/> {new Date(v.visitDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/donate" className="inline-block text-white font-bold px-6 py-3 rounded-2xl text-sm"
            style={{ backgroundColor: primaryColor }}>
            🌳 Sponsor Trees Like These
          </Link>
        </div>
      </div>
    </div>
  );
}
