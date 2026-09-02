'use client';
// src/app/officer/farmer/[id]/page.tsx
// The actual capture flow: tree list -> tap Capture Photo -> camera opens
// -> auto-compress -> auto-upload with GPS -> success confirmation -> tree
// card updates immediately. No manual filename entry, no gallery
// organization by the officer — everything automatic, per spec.
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, MapPin, CheckCircle, AlertCircle, RefreshCw, TreePine, ClipboardCheck, Stethoscope } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';
import { LandGallery } from '@/components/LandGallery';

const STATUS_STYLES: Record<string, string> = {
  PLANTED: 'bg-green-100 text-green-700', GROWING: 'bg-blue-100 text-blue-700',
  MATURE: 'bg-emerald-100 text-emerald-800', PENDING: 'bg-amber-100 text-amber-700',
};

export default function OfficerFarmerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<Record<string, 'idle'|'capturing'|'locating'|'uploading'|'success'|'error'>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }
    const res = await fetch(`/api/field-officer/farmer/${id}?officerId=${officerId}`);
    const d = await res.json();
    if (d.error) { setLoading(false); setData({ error: d.error }); return; }
    setData(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  function triggerCapture(treeId: string) {
    setActiveTreeId(treeId);
    // Also persist to sessionStorage — many mobile browsers reload or
    // discard a backgrounded tab while the native camera app is open to
    // free memory. If that happens, all React state (including
    // activeTreeId) is wiped by the time the user returns with their
    // photo, and the upload would silently do nothing: no error, no
    // network request, nothing. sessionStorage survives that reload
    // within the same tab, so the capture can still complete correctly.
    sessionStorage.setItem('officerActiveTreeId', treeId);
    setUploadState(p => ({ ...p, [treeId]: 'capturing' }));
    fileInputRef.current?.click();
  }

  function getGpsThenUpload(file: File, treeId: string) {
    setUploadState(p => ({ ...p, [treeId]: 'locating' }));

    if (!navigator.geolocation) { uploadPhoto(file, null, treeId); return; }

    // The browser's own geolocation `timeout` option is not reliably
    // honoured on every mobile browser — if the permission prompt or the
    // GPS fix itself stalls, getCurrentPosition can simply never call
    // either callback, silently hanging forever with zero feedback and no
    // network request ever firing. This guarantees the upload proceeds
    // (without GPS) after 8 seconds no matter what the browser does.
    let settled = false;
    const hardTimeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      uploadPhoto(file, null, treeId);
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimeout);
        uploadPhoto(file, { latitude: pos.coords.latitude, longitude: pos.coords.longitude, gpsAccuracy: pos.coords.accuracy }, treeId);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimeout);
        uploadPhoto(file, null, treeId); // permission denied or unavailable — never blocks the upload
      },
      { timeout: 8000 },
    );
  }

  async function uploadPhoto(file: File, gps: { latitude: number; longitude: number; gpsAccuracy: number } | null, treeId: string) {
    setUploadState(p => ({ ...p, [treeId]: 'uploading' }));

    try {
      const imageBase64 = await compressImage(file);
      const officerId = localStorage.getItem('officerId');
      const res = await fetch('/api/field-officer/tree-photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId, treeId, imageBase64, ...(gps || {}) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');

      sessionStorage.removeItem('officerActiveTreeId');
      setUploadState(p => ({ ...p, [treeId]: 'success' }));
      // Reflect the new photo on the tree card immediately, no reload needed.
      setData((d: any) => ({
        ...d,
        trees: d.trees.map((t: any) => t.id === treeId
          ? { ...t, images: [{ imageUrl: imageBase64, capturedAt: new Date().toISOString() }], _count: { images: (t._count?.images || 0) + 1 } }
          : t),
      }));
      setTimeout(() => setUploadState(p => ({ ...p, [treeId]: 'idle' })), 2500);
    } catch (err) {
      setUploadState(p => ({ ...p, [treeId]: 'error' }));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    // Falls back to sessionStorage if the page was reloaded while the
    // camera was open (see triggerCapture) — activeTreeId in React state
    // would be null in that case, but the sessionStorage value survives.
    const treeId = activeTreeId || sessionStorage.getItem('officerActiveTreeId');
    if (!file || !treeId) {
      // User cancelled the camera/picker — reset back to the normal button
      // instead of leaving the card stuck showing "Waiting for photo…" forever.
      if (treeId) setUploadState(p => ({ ...p, [treeId]: 'idle' }));
      return;
    }
    getGpsThenUpload(file, treeId);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;
  if (!data || data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-sage-500">{data?.error || 'Farmer not found.'}</p>
          <button onClick={() => router.push('/officer/dashboard')} className="text-sage-700 text-sm font-semibold mt-2">← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const { farmer, trees, latestInspection, latestMonitoring } = data;

  return (
    <div className="min-h-screen bg-sage-50 pb-16">
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/officer/dashboard')} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="font-bold text-sm">{farmer.fullName}</div>
            <div className="text-white/70 text-xs">{farmer.farmerIdGenerated || farmer.mobile} · {farmer.village}</div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange}/>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <a href={`/officer/farmer/${farmer.id}/inspect`}
            className="flex items-center justify-center gap-2 bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-2xl text-sm">
            <ClipboardCheck className="w-4 h-4"/> {latestInspection ? 'Re-verify / Update' : 'Farm Visit'}
          </a>
          <a href={`/officer/farmer/${farmer.id}/monitor`}
            className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-2xl text-sm">
            <Stethoscope className="w-4 h-4"/> {latestMonitoring ? 'Re-check Health' : 'Monitor Health'}
          </a>
        </div>
        <a href={`/officer/farmer/${farmer.id}/quick-visit`}
          className="flex items-center justify-center gap-2 border-2 border-sage-200 hover:border-sage-400 text-sage-600 font-semibold py-2.5 rounded-2xl text-xs mb-2">
          Or log a quick overall visit summary →
        </a>

        {/* Status awareness — what's already been recorded and when, so the
            officer isn't guessing whether a visit already happened. Not
            everything gets captured in one go, so this frames the buttons
            above as continuing/updating a record rather than only ever
            starting fresh. */}
        <div className="grid grid-cols-2 gap-2 mb-5 text-[11px]">
          <div className={`rounded-xl px-3 py-2 ${latestInspection ? 'bg-sage-100 text-sage-600' : 'bg-amber-50 text-amber-600'}`}>
            {latestInspection ? (
              <>
                <div className="font-semibold">Last verified: {latestInspection.inspectedAt ? new Date(latestInspection.inspectedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : '—'}</div>
                <div className="opacity-80 mt-0.5">
                  {[latestInspection.ownershipVerified, latestInspection.boundaryVerified, latestInspection.farmerMetPersonally, latestInspection.plantationFeasible, latestInspection.waterSourceAvailable].filter(Boolean).length}/5 checks complete
                </div>
              </>
            ) : 'Not yet verified'}
          </div>
          <div className={`rounded-xl px-3 py-2 ${latestMonitoring ? 'bg-sage-100 text-sage-600' : 'bg-amber-50 text-amber-600'}`}>
            {latestMonitoring ? (
              <>
                <div className="font-semibold">Last checked: {new Date(latestMonitoring.visitDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</div>
                <div className="opacity-80 mt-0.5">
                  {latestMonitoring._count.treeSamples} tree{latestMonitoring._count.treeSamples === 1 ? '' : 's'}{latestMonitoring.survivalPct != null ? ` · ${latestMonitoring.survivalPct}% survival` : ''}
                </div>
              </>
            ) : 'Not yet monitored'}
          </div>
        </div>

        {farmer.lands?.some((l: any) => l.photos?.length > 0 || l.kmlFileName) && (
          <div className="space-y-4 mb-5">
            {farmer.lands.filter((l: any) => l.photos?.length > 0 || l.kmlFileName).map((l: any) => (
              <LandGallery key={l.id} variant="sage" label={l.surveyGutNumber ? `Survey No. ${l.surveyGutNumber}` : 'Land Parcel'}
                meta={[l.areaAcres ? `${l.areaAcres} acres` : null, l.village].filter(Boolean).join(' · ')}
                photos={l.photos} kmlFileName={l.kmlFileName}
                gpsLatitude={l.gpsLatitude} gpsLongitude={l.gpsLongitude}/>
            ))}
          </div>
        )}

        <h2 className="font-display text-lg text-sage-950 mb-3">Trees ({trees.length})</h2>
        {trees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-sage-200 p-8 text-center">
            <TreePine className="w-8 h-8 text-sage-200 mx-auto mb-2"/>
            <p className="text-sage-400 text-sm">No trees linked to this farmer's land yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {trees.map((t: any) => {
              const state = uploadState[t.id] || 'idle';
              const latestPhoto = t.images?.[0]?.imageUrl;
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-sage-100 overflow-hidden">
                  <div className="w-full h-32 bg-sage-100 flex items-center justify-center relative">
                    {latestPhoto ? (
                      <img src={latestPhoto} alt="" className="w-full h-full object-cover"/>
                    ) : (
                      <TreePine className="w-8 h-8 text-sage-300"/>
                    )}
                    {t._count?.images > 0 && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                        {t._count.images} photo{t._count.images === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-mono text-xs text-sage-500">{t.treeTagId || 'Tag pending'}</div>
                    <div className="font-semibold text-sage-900 text-sm">{t.species || 'Species TBA'}</div>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {t.status}
                    </span>

                    {state === 'success' ? (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-green-600 text-xs font-semibold py-2">
                        <CheckCircle className="w-4 h-4"/> Uploaded ✓
                      </div>
                    ) : state === 'error' ? (
                      <button onClick={() => triggerCapture(t.id)}
                        className="w-full mt-3 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 text-xs font-semibold py-2 rounded-xl">
                        <RefreshCw className="w-3.5 h-3.5"/> Upload failed — Retry
                      </button>
                    ) : state === 'uploading' ? (
                      <div className="w-full mt-3 flex items-center justify-center gap-1.5 bg-sage-50 text-sage-500 text-xs font-semibold py-2 rounded-xl">
                        <MapPin className="w-3.5 h-3.5 animate-pulse"/> Uploading…
                      </div>
                    ) : state === 'locating' ? (
                      <div className="w-full mt-3 flex items-center justify-center gap-1.5 bg-sage-50 text-sage-500 text-xs font-semibold py-2 rounded-xl">
                        <MapPin className="w-3.5 h-3.5 animate-pulse"/> Getting location…
                      </div>
                    ) : state === 'capturing' ? (
                      <div className="w-full mt-3 flex items-center justify-center gap-1.5 bg-sage-50 text-sage-500 text-xs font-semibold py-2 rounded-xl">
                        <Camera className="w-3.5 h-3.5 animate-pulse"/> Waiting for photo…
                      </div>
                    ) : (
                      <button onClick={() => triggerCapture(t.id)}
                        className="w-full mt-3 flex items-center justify-center gap-1.5 bg-sage-700 hover:bg-sage-800 text-white text-xs font-semibold py-2 rounded-xl">
                        <Camera className="w-3.5 h-3.5"/> Capture Photo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
