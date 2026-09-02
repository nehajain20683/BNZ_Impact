'use client';
// src/components/LandGallery.tsx
// A single, consistent way to show land parcel photos everywhere they
// appear — admin, farmer, donor, field officer — at genuinely viewable
// size with a real full-screen lightbox, not squeezed into small
// thumbnails inside a card. Land.photos is one array that can hold both
// regular land photos and KML boundary preview screenshots together (see
// the schema comment on that field) — there's no separate stored KML file
// to render, only its original filename, shown clearly as a reference.
import { useState } from 'react';
import { MapPin, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

type Variant = 'admin' | 'sage';

const STYLES: Record<Variant, {
  card: string; label: string; sub: string; empty: string;
}> = {
  admin: {
    card: 'bg-white border border-gray-200 rounded-2xl p-5',
    label: 'font-semibold text-gray-900 text-sm',
    sub: 'text-gray-400 text-xs',
    empty: 'text-gray-400 text-sm',
  },
  sage: {
    card: 'bg-white rounded-2xl shadow-sm border border-sage-100 p-5',
    label: 'font-display text-lg text-sage-950',
    sub: 'text-sage-400 text-xs',
    empty: 'text-sage-400 text-sm',
  },
};

export function LandGallery({
  photos, kmlFileName, gpsLatitude, gpsLongitude, label, meta, variant = 'sage',
}: {
  photos?: string[] | null;
  kmlFileName?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  label?: string;
  meta?: string;
  variant?: Variant;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const s = STYLES[variant];
  const list = photos || [];

  if (list.length === 0 && !kmlFileName) return null;

  const mapUrl = gpsLatitude != null && gpsLongitude != null
    ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}` : null;

  return (
    <div className={s.card}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          {label && <div className={s.label}>{label}</div>}
          {meta && <div className={`mt-0.5 ${s.sub}`}>{meta}</div>}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1 mt-0.5 hover:underline ${s.sub}`}>
              <MapPin className="w-3 h-3"/> {gpsLatitude?.toFixed(5)}, {gpsLongitude?.toFixed(5)} · Open in Maps
            </a>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className={s.empty}>No land photos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {list.map((url, i) => (
            <div key={i}>
              <button onClick={() => setLightboxIndex(i)}
                className="relative aspect-[4/3] rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-400 w-full">
                <img src={url} alt={`Land photo ${i + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
                </div>
              </button>
              {/* The "KML file" is actually always just this second uploaded
                  photo (a boundary screenshot) — the upload field only ever
                  accepts .jpg/.jpeg/.png, never a real .kml/.kmz file.
                  Captioning it here, on the photo it actually is, instead of
                  repeating its raw filename as a separate floating chip that
                  made it look like a distinct third item existed. */}
              {i === 1 && kmlFileName && (
                <div className={`text-[10px] mt-1 truncate ${s.sub}`}>🗺️ KML Boundary Preview</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full-screen lightbox */}
      {lightboxIndex !== null && list.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setLightboxIndex(null)}>
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="w-7 h-7"/>
          </button>
          {list.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i! - 1 + list.length) % list.length); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 rounded-full p-2">
              <ChevronLeft className="w-6 h-6"/>
            </button>
          )}
          <img src={list[lightboxIndex]} alt="" className="max-w-full max-h-[85vh] rounded-lg object-contain" onClick={e => e.stopPropagation()}/>
          {list.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i! + 1) % list.length); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 rounded-full p-2">
              <ChevronRight className="w-6 h-6"/>
            </button>
          )}
          {list.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
              {lightboxIndex + 1} / {list.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
