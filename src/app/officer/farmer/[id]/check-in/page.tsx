'use client';
// src/app/officer/farmer/[id]/check-in/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, CheckCircle, MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';

export default function CheckInPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [farmerName, setFarmerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'unavailable'>('locating');

  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [geofenceWarning, setGeofenceWarning] = useState<{ distanceMeters: number; radiusMeters: number } | null>(null);

  useEffect(() => {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }
    fetch(`/api/field-officer/farmer/${id}?officerId=${officerId}`)
      .then(r => r.json())
      .then(d => { setFarmerName(d.farmer?.fullName || ''); setLoading(false); });

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

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    setPhoto(await compressImage(file));
    setUploadingPhoto(false);
  }

  async function submit(overridden = false) {
    setError('');
    if (!photo) { setError('An arrival photo is required to check in.'); return; }
    const officerId = localStorage.getItem('officerId');
    setSubmitting(true);
    const res = await fetch('/api/field-officer/check-in', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officerId, farmerId: id, arrivalPhoto: photo,
        latitude: gps?.lat, longitude: gps?.lng, overridden,
      }),
    });
    const result = await res.json();
    setSubmitting(false);
    if (res.status === 409 && result.requiresOverride) {
      setGeofenceWarning({ distanceMeters: result.distanceMeters, radiusMeters: result.radiusMeters });
      return;
    }
    if (!res.ok) { setError(result.error || 'Failed to check in'); return; }
    setSubmitted(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
          <h2 className="font-display text-xl text-sage-950">Checked In</h2>
          <p className="text-sage-500 text-sm mt-1">Arrival recorded for {farmerName}.</p>
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="mt-5 bg-sage-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl">
            Continue to Farmer →
          </button>
        </div>
      </div>
    );
  }

  // The geofence-outside confirmation screen — a deliberate extra step,
  // not silently allowed and not silently blocked.
  if (geofenceWarning) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3"/>
          <h2 className="font-display text-xl text-sage-950">Outside Expected Area</h2>
          <p className="text-sage-500 text-sm mt-2">
            You're about <strong>{geofenceWarning.distanceMeters}m</strong> from this land's registered location
            (expected within {geofenceWarning.radiusMeters}m). This can happen if the registered GPS itself
            isn't precise — if you're genuinely at the farm, you can continue.
          </p>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setGeofenceWarning(null)} className="flex-1 border border-sage-200 text-sage-600 font-semibold py-2.5 rounded-xl text-sm">
              Go Back
            </button>
            <button onClick={() => submit(true)} disabled={submitting}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {submitting ? 'Checking in…' : 'Check In Anyway'}
            </button>
          </div>
          <p className="text-sage-400 text-[11px] mt-3">This will be recorded as an override, visible to your admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sage-50 pb-20">
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="font-bold text-sm">Check In — Arrival</div>
            <div className="text-white/70 text-xs">{farmerName}</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
          gpsStatus === 'ready' ? 'bg-green-50 text-green-700' : gpsStatus === 'locating' ? 'bg-sage-100 text-sage-500' : 'bg-amber-50 text-amber-700'}`}>
          <MapPin className="w-3.5 h-3.5 flex-shrink-0"/>
          {gpsStatus === 'locating' && 'Getting your location…'}
          {gpsStatus === 'ready' && 'Location captured'}
          {gpsStatus === 'unavailable' && 'Location unavailable — you can still check in, but it won\'t be geofence-verified.'}
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-2">Arrival Photo <span className="text-red-500">*required</span></label>
          {photo ? (
            <img src={photo} alt="" className="w-full h-48 rounded-xl object-cover"/>
          ) : (
            <label className="w-full h-32 rounded-xl border-2 border-dashed border-sage-200 flex flex-col items-center justify-center cursor-pointer hover:border-sage-400">
              {uploadingPhoto ? <Loader2 className="w-6 h-6 text-sage-400 animate-spin"/> : (
                <>
                  <Camera className="w-6 h-6 text-sage-400 mb-1"/>
                  <span className="text-xs text-sage-400">Tap to take a photo on arrival</span>
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={uploadingPhoto}/>
            </label>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

        <button onClick={() => submit(false)} disabled={submitting || !photo}
          className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60">
          {submitting ? 'Checking in…' : 'Check In'}
        </button>
      </div>
    </div>
  );
}
