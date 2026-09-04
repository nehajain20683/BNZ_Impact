'use client';
// src/components/PublicSitesMap.tsx
// Same Leaflet-via-CDN approach as the donor dashboard's ImpactMap (free,
// no API key, no billing risk) — appropriate here specifically because
// this is a PUBLIC page: traffic is unpredictable, and Google Maps' JS API
// bills per load and needs a managed API key, which is a real operational
// risk to embed live on a page anyone can hit. Google Maps is still
// offered — as a plain link per site (https://www.google.com/maps?q=...),
// which needs no key at all and opens Google's own app/site directly.
// Numbered badge markers + legend row deliberately styled after a
// portfolio-dashboard look (clean light basemap, black numbered pins,
// legend underneath) rather than a default noisy OSM map.
import { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink, TreePine } from 'lucide-react';

type SitePin = {
  id: string;
  siteName: string;
  lat: number;
  lng: number;
  district?: string | null;
  state?: string | null;
  treesPlanted?: number | null;
  isComingSoon?: boolean;
  polygons?: { type: 'Polygon'; coordinates: number[][][] }[];
};

let leafletLoadingPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if ((window as any).L) return Promise.resolve();
  if (leafletLoadingPromise) return leafletLoadingPromise;
  leafletLoadingPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load map library'));
    document.body.appendChild(script);
  });
  return leafletLoadingPromise;
}

export default function PublicSitesMap({ sites, primaryColor }: { sites: SitePin[]; primaryColor: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const pinned = sites.filter(s => s.lat != null && s.lng != null);

  useEffect(() => {
    if (pinned.length === 0) { setStatus('ready'); return; }
    let cancelled = false;

    loadLeaflet().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = (window as any).L;
      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      mapRef.current = map;

      // Plain OpenStreetMap tiles — matches the donor dashboard's own map.
      // Previously used CartoDB's "light" basemap for a cleaner look, but
      // that now requires an API key it didn't need when this was first
      // built — CARTO changed their free-tier policy at some point. OSM's
      // standard tile server remains genuinely free with no key required,
      // just a fair-use request-rate policy for large-scale traffic, so
      // it's the safer default for a page with unpredictable public load.
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];
      pinned.forEach((site, i) => {
        const color = site.isComingSoon ? '#c9a227' : primaryColor;
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:30px;height:30px;border-radius:50%;background:${site.isComingSoon ? '#c9a227' : '#1a1a1a'};display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${i + 1}</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        });
        bounds.push([site.lat, site.lng]);
        L.marker([site.lat, site.lng], { icon }).addTo(map).bindPopup(`
          <div style="font-family:sans-serif;min-width:160px">
            <div style="font-weight:700;font-size:13px;margin-bottom:2px">${i + 1}. ${site.siteName}</div>
            <div style="font-size:11px;color:#666">${[site.district, site.state].filter(Boolean).join(', ')}</div>
            ${site.isComingSoon
              ? `<div style="font-size:11px;color:#b8860b;font-weight:600;margin-top:4px">Coming soon</div>`
              : `<div style="font-size:12px;color:${color};font-weight:600;margin-top:4px">${site.treesPlanted || 0} trees planted</div>`}
            <a href="https://www.google.com/maps?q=${site.lat},${site.lng}" target="_blank" rel="noopener noreferrer"
              style="font-size:11px;color:#1a73e8;display:inline-block;margin-top:6px">Open in Google Maps →</a>
          </div>
        `);

        // Real parcel boundaries, when any of this site's lands have a
        // parsed KML on file — drawn alongside the numbered site pin, not
        // instead of it, since a site can span several land parcels and
        // the pin still marks the site as a whole.
        for (const polygon of site.polygons || []) {
          const latLngs = polygon.coordinates[0].map(([lon, lat]) => [lat, lon]);
          L.polygon(latLngs, { color, weight: 2, fillColor: color, fillOpacity: 0.2 }).addTo(map);
          latLngs.forEach(([lat, lng]) => bounds.push([lat, lng]));
        }
      });
      bounds.length === 1 ? map.setView(bounds[0], 12) : map.fitBounds(bounds, { padding: [30, 30] });
      setStatus('ready');
    }).catch(() => setStatus('error'));

    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pinned.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2"/>
        <p className="text-gray-400 text-sm">No site locations recorded yet — add GPS coordinates to a plantation site to see it here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {status === 'error' ? (
        <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Map failed to load — please refresh.</div>
      ) : (
        <div ref={containerRef} className="h-80 w-full" style={{ background: '#f7f7f5' }}/>
      )}

      {/* Legend row, matching a numbered-site portfolio-map style */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 border-t border-gray-50 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <TreePine className="w-3.5 h-3.5" style={{ color: primaryColor }}/> Reforested area
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-amber-500 flex-shrink-0"/> Coming soon
        </span>
        {pinned.map((s, i) => (
          <a key={s.id} href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-blue-600">
            <span className="w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            {s.siteName} <ExternalLink className="w-2.5 h-2.5"/>
          </a>
        ))}
      </div>
    </div>
  );
}
