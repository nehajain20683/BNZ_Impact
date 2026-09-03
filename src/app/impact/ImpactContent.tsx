'use client';
// src/app/impact/ImpactContent.tsx
// Client component - fetches data via API, never at build time
import { useState, useEffect } from 'react';
import { TreePine, Users, Leaf, MapPin, Clock, ArrowRight, FileText } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';
import PublicSitesMap from '@/components/PublicSitesMap';

export default function ImpactContent() {
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/impact')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading impact data…</p>
    </div>
  );

  const s = stats || {};
  const activeSites: any[] = s.activeSites || [];
  const comingSoonSites: any[] = s.comingSoonSites || [];
  const speciesBreakdown: any[] = s.speciesBreakdown || [];
  const mapSites = [...activeSites, ...comingSoonSites]
    .filter(site => site.gpsLatitude != null)
    .map(site => ({
      id: site.id, siteName: site.siteName, lat: site.gpsLatitude, lng: site.gpsLongitude,
      district: site.district, state: site.state, treesPlanted: site.treesPlanted, isComingSoon: site.isComingSoon,
      polygons: site.polygons,
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — themed to the org's own brand color, not a fixed green */}
      <div className="text-white" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          {org.logoUrl && (
            <div className="flex justify-center mb-4">
              <OrgLogo src={org.logoUrl} alt={org.name} size="lg"/>
            </div>
          )}
          <h1 className="font-display text-4xl mb-2">Our Impact</h1>
          <p className="text-white/80">{org.name ? `${org.name}'s ` : ''}real-time plantation and carbon data</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-14">

        {/* Headline stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: TreePine, label:'Trees Planted',     value:(s.treesPlanted||0).toLocaleString('en-IN') },
            { icon: Users,    label:'Land Owners',       value:(s.farmerCount||0).toLocaleString('en-IN') },
            { icon: MapPin,   label:'Plantation Sites',  value:(s.siteCount||0).toLocaleString('en-IN') },
            { icon: Leaf,     label:'Carbon Est. tCO₂e', value:(s.estimatedCarbon||0).toLocaleString('en-IN') },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl p-6 text-center" style={{ backgroundColor: `${primaryColor}10` }}>
              <Icon className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }}/>
              <div className="text-3xl font-black" style={{ color: primaryColor }}>{value}</div>
              <div className="text-gray-500 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Map — all sites, active and coming soon, at a glance.
            Always rendered, even with zero sites — a missing section reads
            as "broken" to a visitor; an honest empty state reads as
            "nothing here yet", which is what's actually true. */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-2xl text-gray-900">Our Planting Sites</h2>
              <p className="text-gray-400 text-sm mt-0.5">{mapSites.length} location{mapSites.length === 1 ? '' : 's'} mapped</p>
            </div>
          </div>
          <PublicSitesMap sites={mapSites} primaryColor={primaryColor}/>
        </div>

        {/* Active plantation sites — always shown, honest empty state if none yet */}
        <div>
          <h2 className="font-display text-2xl text-gray-900 mb-4">Active Plantation Sites</h2>
          {activeSites.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <TreePine className="w-8 h-8 text-gray-200 mx-auto mb-2"/>
              <p className="text-gray-400 text-sm">No active sites published yet — check back soon.</p>
            </div>
          ) : (
          <div className="grid md:grid-cols-2 gap-5">
              {activeSites.map(site => (
                <a key={site.id} href={`/sites/${site.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {site.photos?.length > 0 ? (
                    <div className="h-44 overflow-hidden">
                      <img src={site.photos[0]} alt={site.siteName} className="w-full h-full object-cover"/>
                    </div>
                  ) : (
                    <div className="h-44 bg-gray-100 flex items-center justify-center">
                      <TreePine className="w-8 h-8 text-gray-300"/>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{site.siteName}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                        {site.currentPhase.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs mb-3">{[site.village, site.district, site.state].filter(Boolean).join(', ')}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold" style={{ color: primaryColor }}>{(site.treesPlanted || 0).toLocaleString('en-IN')}</span>
                      <span className="text-gray-400 text-xs -ml-3">trees planted</span>
                      {site.kmlFileName && <span className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto"><FileText className="w-3 h-3"/> Boundary mapped</span>}
                    </div>
                  </div>
                </a>
              ))}
          </div>
          )}
        </div>

        {/* Coming soon sites — separated clearly, not planted yet.
            Always shown; if none are scheduled, says so rather than
            disappearing. */}
        <div>
          <h2 className="font-display text-2xl text-gray-900 mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500"/> Coming Soon
          </h2>
          <p className="text-gray-400 text-sm mb-4">Sites in planning or preparation — not yet planted</p>
          {comingSoonSites.length === 0 ? (
            <p className="text-gray-400 text-sm">No upcoming sites scheduled right now.</p>
          ) : (
          <div className="grid md:grid-cols-3 gap-4">
              {comingSoonSites.map(site => (
                <div key={site.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <h3 className="font-semibold text-amber-900 text-sm">{site.siteName}</h3>
                  <div className="text-amber-600 text-xs mt-0.5">{[site.district, site.state].filter(Boolean).join(', ')}</div>
                  {site.plannedTrees && <div className="text-amber-700 text-xs mt-2 font-medium">{site.plannedTrees.toLocaleString('en-IN')} trees planned</div>}
                </div>
              ))}
          </div>
          )}
        </div>

        {/* Species distribution — real planted data, org-wide. Always
            shown; a genuinely new program with nothing planted yet should
            say so, not vanish. */}
        <div>
          <h2 className="font-display text-2xl text-gray-900 mb-4">Species Planted</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {speciesBreakdown.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No species data recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {speciesBreakdown.slice(0, 10).map(sp => (
                  <div key={sp.species}>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{sp.species}</span>
                      <span>{sp.qty.toLocaleString('en-IN')} ({sp.pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${sp.pct}%`, backgroundColor: primaryColor }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meet the Farmers — link to the full gallery, not duplicated here.
            Shown even at zero, since a brand-new org will have no verified
            land owners yet and the page shouldn't look incomplete for it. */}
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: `${primaryColor}08` }}>
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }}/>
            <h2 className="font-display text-2xl text-gray-900 mb-2">Meet the Land Owners</h2>
            <p className="text-gray-500 text-sm mb-5 max-w-md mx-auto">
              {(s.farmerCount || 0) > 0
                ? 'The real people behind every tree — see their stories, their land, and their villages.'
                : 'Verified land owner profiles will appear here as the program grows.'}

            </p>
            <a href="/farmers" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl"
              style={{ backgroundColor: primaryColor }}>
              See All Land Owners <ArrowRight className="w-4 h-4"/>
            </a>
        </div>
      </div>
    </div>
  );
}
