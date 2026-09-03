'use client';
// src/app/officer/farmer/[id]/inspect/page.tsx
// Wires up SiteInspection (which already existed in the schema, with a
// secured backend route, but had zero UI anywhere) into a real Farm Visit /
// Land Verification form. GPS is captured automatically on load; a
// distance-from-registered-land figure is shown for context but never
// blocks submission — the farmer's own registered GPS can be imprecise,
// and a hard block would risk turning away a genuinely correct visit.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Camera, X, CheckCircle, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';

const CHECKLIST: { key: string; label: string }[] = [
  { key: 'farmerMetPersonally',  label: 'Farmer met in person' },
  { key: 'ownershipVerified',    label: 'Land ownership verified' },
  { key: 'boundaryVerified',     label: 'Land boundary verified' },
  { key: 'waterSourceAvailable', label: 'Water source available' },
  { key: 'plantationFeasible',   label: 'Plantation feasible on this land' },
];

// Haversine distance in meters — informational only.
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function FarmVisitPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  const [landId, setLandId] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'unavailable'>('locating');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }

    Promise.all([
      fetch(`/api/field-officer/farmer/${id}?officerId=${officerId}`).then(r => r.json()),
      fetch(`/api/field-officer/inspect?farmerId=${id}`).then(r => r.json()).catch(() => ({ inspections: [] })),
    ]).then(([farmerData, inspectData]) => {
      if (farmerData.error) { setData({ error: farmerData.error }); setLoading(false); return; }
      setData(farmerData);
      setHistory(inspectData.inspections || []);
      // Pre-selects the first land even when there are several — a blank
      // "Select a parcel…" default meant an officer could submit the whole
      // visit without ever picking one, silently losing which land it was
      // for. The dropdown is still there to change it; it just never
      // starts empty.
      if (farmerData.farmer?.lands?.length >= 1) setLandId(farmerData.farmer.lands[0].id);
      setLoading(false);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ready'); },
        () => setGpsStatus('unavailable'),
        { timeout: 10000 },
      );
    } else {
      setGpsStatus('unavailable');
    }
  }, [id]);

  async function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    const compressed = await compressImage(file);
    setPhotos(p => [...p, compressed]);
    setUploadingPhoto(false);
  }

  function removePhoto(i: number) {
    setPhotos(p => p.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError('');
    const officerId = localStorage.getItem('officerId');
    setSubmitting(true);
    const res = await fetch('/api/field-officer/inspect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId: id,
        landId: landId || undefined,
        officerId,
        inspectedAt: new Date().toISOString(),
        gpsLatitude: gps?.lat, gpsLongitude: gps?.lng,
        ...checklist,
        notes: notes || undefined,
        photos,
        status: 'COMPLETED',
      }),
    });
    const result = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(result.error || 'Failed to submit visit report'); return; }
    setSubmitted(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;
  if (!data || data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-sage-500">{data?.error || 'Farmer not found.'}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
          <h2 className="font-display text-xl text-sage-950">Visit Report Submitted</h2>
          <p className="text-sage-500 text-sm mt-1">Signed and time-stamped for {data.farmer.fullName}.</p>
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="mt-5 text-sage-700 font-semibold text-sm">
            ← Back to Farmer
          </button>
        </div>
      </div>
    );
  }

  const { farmer } = data;
  const selectedLand = farmer.lands.find((l: any) => l.id === landId);
  const distance = (gps && selectedLand?.gpsLatitude)
    ? distanceMeters(gps.lat, gps.lng, selectedLand.gpsLatitude, selectedLand.gpsLongitude)
    : null;

  return (
    <div className="min-h-screen bg-sage-50 pb-20">
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="font-bold text-sm">Farm Visit — {farmer.fullName}</div>
            <div className="text-white/70 text-xs">{farmer.village}{farmer.district ? `, ${farmer.district}` : ''}</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* GPS status */}
        <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
          gpsStatus === 'ready' ? 'bg-green-50 text-green-700' : gpsStatus === 'locating' ? 'bg-sage-100 text-sage-500' : 'bg-amber-50 text-amber-700'}`}>
          <MapPin className="w-3.5 h-3.5 flex-shrink-0"/>
          {gpsStatus === 'locating' && 'Getting your location…'}
          {gpsStatus === 'ready' && (
            <span>
              Location captured{distance != null ? ` — ${distance}m from this land's registered GPS` : ''}
            </span>
          )}
          {gpsStatus === 'unavailable' && 'Location unavailable — visit can still be recorded, but without a GPS check-in.'}
        </div>

        {/* Land selection, if more than one */}
        {farmer.lands.length > 1 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-4">
            <label className="text-xs font-medium text-sage-600 block mb-1.5">Which land parcel?</label>
            <select value={landId} onChange={e => setLandId(e.target.value)}
              className="w-full border border-sage-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Select a parcel…</option>
              {farmer.lands.map((l: any) => (
                <option key={l.id} value={l.id}>{l.surveyGutNumber || 'Land'} — {l.village}</option>
              ))}
            </select>
          </div>
        )}

        {/* Checklist */}
        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <h3 className="font-semibold text-sage-900 text-sm mb-3">Verification Checklist</h3>
          <div className="space-y-2.5">
            {CHECKLIST.map(c => (
              <label key={c.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!checklist[c.key]}
                  onChange={e => setChecklist(p => ({ ...p, [c.key]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-sage-700"/>
                <span className="text-sm text-sage-700">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <h3 className="font-semibold text-sage-900 text-sm mb-3">Visit Photos</h3>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={p} alt="" className="w-16 h-16 rounded-lg object-cover"/>
                <button onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                  <X className="w-3 h-3"/>
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-sage-200 flex items-center justify-center cursor-pointer hover:border-sage-400">
              {uploadingPhoto ? <Loader2 className="w-5 h-5 text-sage-400 animate-spin"/> : <Camera className="w-5 h-5 text-sage-400"/>}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoAdd} disabled={uploadingPhoto}/>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-1.5">Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Anything else worth recording about this visit…"
            className="w-full border border-sage-200 rounded-xl px-3 py-2.5 text-sm"/>
        </div>

        {/* Past inspections for context */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-4">
            <h3 className="font-semibold text-sage-900 text-sm mb-2">Previous Visits</h3>
            <div className="space-y-1.5">
              {history.slice(0, 3).map((h: any) => (
                <div key={h.id} className="text-xs text-sage-500 flex justify-between">
                  <span>{h.officer?.name || 'Officer'} — {h.status}</span>
                  <span>{h.inspectedAt ? new Date(h.inspectedAt).toLocaleDateString('en-IN') : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

        <button onClick={submit} disabled={submitting}
          className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit Visit Report'}
        </button>
      </div>
    </div>
  );
}
