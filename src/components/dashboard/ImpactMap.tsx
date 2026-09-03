'use client';
// src/components/dashboard/ImpactMap.tsx
// Plots each individual farmer land parcel a donor's trees are linked to,
// using the GPS already captured when that farmer registered their land —
// not one blurred pin per site, since a single site can span many farmers'
// parcels and a donor should be able to see the real, exact location.
// Uses Leaflet loaded from a CDN rather than an npm dependency — this repo
// has no map library installed yet, and Leaflet (backed by free
// OpenStreetMap tiles) needs no API key, unlike Google Maps, so it works
// immediately with zero new setup.
import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';

type LandPin = {
  lat: number;
  lng: number;
  farmerName?: string | null;
  village?: string | null;
  district?: string | null;
  siteName?: string | null;
  treesPlanted?: number | null;
  polygonGeoJson?: { type: 'Polygon'; coordinates: number[][][] } | null;
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

export default function ImpactMap({ pins }: { pins: LandPin[] }) {
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (pins.length === 0) { setStatus('ready'); return; }
    let cancelled = false;

    loadLeaflet()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const L = (window as any).L;

        const map = L.map(containerRef.current, { scrollWheelZoom: false });
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        const markerIcon = L.divIcon({
          className: '',
          html: `<div style="background:${primaryColor};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const popupHtml = (pin: LandPin) => `
          <div style="font-family:sans-serif;min-width:150px">
            ${pin.farmerName ? `<div style="font-weight:700;font-size:13px;margin-bottom:2px">${pin.farmerName}'s Land</div>` : ''}
            ${pin.siteName ? `<div style="font-size:11px;color:#888">${pin.siteName}</div>` : ''}
            <div style="font-size:11px;color:#666">${[pin.village, pin.district].filter(Boolean).join(', ') || ''}</div>
            ${pin.treesPlanted ? `<div style="font-size:12px;color:${primaryColor};font-weight:600;margin-top:4px">${pin.treesPlanted} of your trees here</div>` : ''}
          </div>
        `;

        const bounds: [number, number][] = [];
        for (const pin of pins) {
          bounds.push([pin.lat, pin.lng]);

          // Real parcel shape when a KML boundary has been parsed for this
          // land — falls back to a plain point marker otherwise, same as
          // before. GeoJSON stores [lon, lat]; Leaflet wants [lat, lon].
          if (pin.polygonGeoJson?.coordinates?.[0]?.length >= 3) {
            const latLngs = pin.polygonGeoJson.coordinates[0].map(([lon, lat]) => [lat, lon]);
            L.polygon(latLngs, {
              color: primaryColor, weight: 2, fillColor: primaryColor, fillOpacity: 0.25,
            }).addTo(map).bindPopup(popupHtml(pin));
            latLngs.forEach(([lat, lng]) => bounds.push([lat, lng]));
          } else {
            L.marker([pin.lat, pin.lng], { icon: markerIcon })
              .addTo(map)
              .bindPopup(popupHtml(pin));
          }
        }

        if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        } else {
          map.fitBounds(bounds, { padding: [30, 30] });
        }

        setStatus('ready');
      })
      .catch(() => setStatus('error'));

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pins.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-sage-100 p-8 text-center">
        <MapPin className="w-8 h-8 text-sage-200 mx-auto mb-2"/>
        <p className="text-sage-400 text-sm">Exact parcel locations aren't available yet — check back soon.</p>
      </div>
    );
  }

  const siteCount = new Set(pins.map(p => p.siteName).filter(Boolean)).size || 1;

  return (
    <div className="bg-white rounded-2xl border border-sage-100 overflow-hidden shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <h3 className="font-display text-lg text-sage-950">Where Your Trees Are Growing</h3>
        <p className="text-sage-400 text-xs mt-0.5">
          {pins.length} farmer parcel{pins.length === 1 ? '' : 's'} across {siteCount} site{siteCount === 1 ? '' : 's'} — tap a pin for details
        </p>
      </div>
      {status === 'error' ? (
        <div className="h-72 flex items-center justify-center text-sage-400 text-sm">Map failed to load — please refresh.</div>
      ) : (
        <div ref={containerRef} className="h-72 w-full" style={{ background: '#f0f0f0' }}/>
      )}
    </div>
  );
}
