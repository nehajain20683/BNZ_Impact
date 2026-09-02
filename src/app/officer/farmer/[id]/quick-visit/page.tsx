'use client';
// src/app/officer/farmer/[id]/quick-visit/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, X, CheckCircle, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';

export default function QuickVisitPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [farmerName, setFarmerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  const [survivalCount, setSurvivalCount] = useState('');
  const [deadTrees, setDeadTrees] = useState('');
  const [avgHeight, setAvgHeight] = useState('');
  const [diseaseNotes, setDiseaseNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }
    fetch(`/api/field-officer/farmer/${id}?officerId=${officerId}`)
      .then(r => r.json())
      .then(d => { setFarmerName(d.farmer?.fullName || ''); setLoading(false); });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { timeout: 10000 },
      );
    }
  }, [id]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    const compressed = await compressImage(file);
    setPhotos(p => [...p, compressed]);
    setUploadingPhoto(false);
  }

  async function submit() {
    setError('');
    const officerId = localStorage.getItem('officerId');
    setSubmitting(true);
    const res = await fetch('/api/field-officer/quick-visit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officerId, farmerId: id,
        survivalCount: survivalCount || undefined, deadTrees: deadTrees || undefined,
        avgHeight: avgHeight || undefined, diseaseNotes: diseaseNotes || undefined,
        recommendations: recommendations || undefined, driveLink: driveLink || undefined, photos,
        latitude: gps?.lat, longitude: gps?.lng,
      }),
    });
    const result = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(result.error || 'Failed to submit visit'); return; }
    setSubmitted(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
          <h2 className="font-display text-xl text-sage-950">Visit Summary Submitted</h2>
          <p className="text-sage-500 text-sm mt-1">Logged for {farmerName}.</p>
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="mt-5 text-sage-700 font-semibold text-sm">← Back to Farmer</button>
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
            <div className="font-bold text-sm">Quick Visit Summary</div>
            <div className="text-white/70 text-xs">{farmerName}</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <p className="text-sage-500 text-xs">
          For an overall count across this farmer's land — use "Monitor Health" instead if you want to record each tree individually.
        </p>

        <div className="bg-white rounded-2xl border border-sage-100 p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-sage-600 block mb-1">Trees Surviving</label>
            <input type="number" value={survivalCount} onChange={e => setSurvivalCount(e.target.value)}
              className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
          </div>
          <div>
            <label className="text-xs font-medium text-sage-600 block mb-1">Dead Trees</label>
            <input type="number" value={deadTrees} onChange={e => setDeadTrees(e.target.value)}
              className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-sage-600 block mb-1">Average Height (cm)</label>
            <input type="number" value={avgHeight} onChange={e => setAvgHeight(e.target.value)}
              className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-1.5">Disease / Issues</label>
          <textarea value={diseaseNotes} onChange={e => setDiseaseNotes(e.target.value)} rows={2}
            placeholder="e.g. no disease found, or describe what was seen…"
            className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-1.5">Recommendations</label>
          <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={2}
            placeholder="e.g. fencing needs repair, use organic fertilizer…"
            className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-1.5">
            📸 Google Drive / Photos &amp; Videos Link <span className="text-sage-400">(optional)</span>
          </label>
          <input type="url" value={driveLink} onChange={e => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
          <p className="text-sage-400 text-[11px] mt-1">Paste a shared Google Drive folder or Google Photos album link for the full set from this visit.</p>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-2">Photos</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={p} alt="" className="w-16 h-16 rounded-lg object-cover"/>
                <button onClick={() => setPhotos(ph => ph.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                  <X className="w-3 h-3"/>
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-sage-200 flex items-center justify-center cursor-pointer hover:border-sage-400">
              {uploadingPhoto ? <Loader2 className="w-5 h-5 text-sage-400 animate-spin"/> : <Camera className="w-5 h-5 text-sage-400"/>}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={uploadingPhoto}/>
            </label>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

        <button onClick={submit} disabled={submitting}
          className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit Visit Summary'}
        </button>
      </div>
    </div>
  );
}
