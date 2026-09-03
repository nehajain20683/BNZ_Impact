'use client';
// src/app/officer/farmer/[id]/report-issue/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, X, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';

const ISSUE_TYPES = [
  { value: 'ANIMAL_DAMAGE', label: '🐐 Animal Damage' },
  { value: 'FLOOD',         label: '🌊 Flood' },
  { value: 'FIRE',          label: '🔥 Fire' },
  { value: 'PEST_ATTACK',   label: '🐛 Pest Attack' },
  { value: 'MISSING_TREES', label: '❓ Missing Trees' },
  { value: 'WRONG_SPECIES', label: '🌿 Wrong Species' },
  { value: 'OTHER',         label: '📋 Other' },
];

const SEVERITIES = [
  { value: 'LOW',      label: 'Low',      color: 'bg-gray-100 text-gray-600 border-gray-300' },
  { value: 'MEDIUM',   label: 'Medium',   color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'HIGH',     label: 'High',     color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function ReportIssuePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [farmerName, setFarmerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  const [issueType, setIssueType] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
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
    if (!issueType) { setError('Select what kind of issue this is'); return; }
    const officerId = localStorage.getItem('officerId');
    setSubmitting(true);
    const res = await fetch('/api/field-officer/issue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officerId, farmerId: id, issueType, severity,
        description: description || undefined, photos,
        latitude: gps?.lat, longitude: gps?.lng,
      }),
    });
    const result = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(result.error || 'Failed to submit report'); return; }
    setSubmitted(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
          <h2 className="font-display text-xl text-sage-950">Issue Reported</h2>
          <p className="text-sage-500 text-sm mt-1">Admin has been notified for {farmerName}.</p>
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="mt-5 text-sage-700 font-semibold text-sm">← Back to Farmer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sage-50 pb-20">
      <div className="bg-red-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="font-bold text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Report an Issue</div>
            <div className="text-white/70 text-xs">{farmerName}</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-2">What happened?</label>
          <div className="grid grid-cols-2 gap-2">
            {ISSUE_TYPES.map(t => (
              <button key={t.value} onClick={() => setIssueType(t.value)}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                  issueType === t.value ? 'border-red-400 bg-red-50 text-red-700' : 'border-sage-100 text-sage-500'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-2">Severity</label>
          <div className="grid grid-cols-4 gap-2">
            {SEVERITIES.map(s => (
              <button key={s.value} onClick={() => setSeverity(s.value)}
                className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                  severity === s.value ? s.color : 'border-sage-100 text-sage-400'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <label className="text-xs font-medium text-sage-600 block mb-1.5">Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="What did you see? Any details that would help admin understand the situation…"
            className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
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
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </div>
  );
}
