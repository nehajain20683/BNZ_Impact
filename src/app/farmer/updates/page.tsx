'use client';
// src/app/farmer/updates/page.tsx
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { ChevronLeft, LogOut, Camera, MapPin, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { key: 'WATERING',   label: 'Watering',   hi: 'सिंचाई',      emoji: '💧' },
  { key: 'WEEDING',    label: 'Weeding',    hi: 'निराई',       emoji: '🌾' },
  { key: 'FERTILIZER', label: 'Fertilizer', hi: 'खाद',         emoji: '🧪' },
  { key: 'PEST',       label: 'Pest Issue', hi: 'कीट समस्या', emoji: '🐛' },
  { key: 'DAMAGE',     label: 'Damage',     hi: 'नुकसान',      emoji: '⚠️' },
  { key: 'GENERAL',    label: 'General Photo', hi: 'सामान्य फोटो', emoji: '📷' },
];

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  PENDING:      { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock,       label: 'Pending Review' },
  APPROVED:     { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle, label: 'Approved' },
  REJECTED:     { color: 'text-red-600 bg-red-50 border-red-200',       icon: XCircle,      label: 'Rejected' },
  NEEDS_REVIEW: { color: 'text-blue-600 bg-blue-50 border-blue-200',    icon: AlertCircle,  label: 'New Photo Requested' },
};

export default function FarmerUpdatesPage() {
  const org    = useOrgConfig();
  const router = useRouter();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const fileRef = useRef<HTMLInputElement>(null);

  const [farmerId, setFarmerId] = useState('');
  const [category, setCategory] = useState('');
  const [photo, setPhoto]       = useState('');
  const [notes, setNotes]       = useState('');
  const [gps, setGps]           = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle'|'capturing'|'captured'|'denied'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');
  const [updates, setUpdates]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('farmerId');
    if (!id) { router.push('/farmer/login'); return; }
    setFarmerId(id);
    loadUpdates(id);
    captureGPS();
  }, []);

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerMobile');
    router.push('/farmer/login');
  }

  async function loadUpdates(id: string) {
    setLoading(true);
    const res = await fetch(`/api/farmer/updates?farmerId=${id}`);
    const data = await res.json();
    setUpdates(data.updates || []);
    setLoading(false);
  }

  function captureGPS() {
    if (!navigator.geolocation) { setGpsStatus('denied'); return; }
    setGpsStatus('capturing');
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('captured'); },
      () => setGpsStatus('denied'),
    );
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Photo must be under 2MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function submit() {
    setError('');
    if (!category) { setError('Please select what this update is about'); return; }
    if (!photo) { setError('Please attach a photo'); return; }

    setSubmitting(true);
    const res = await fetch('/api/farmer/updates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId, category, photoUrl: photo, notes: notes || undefined,
        gpsLatitude: gps?.lat, gpsLongitude: gps?.lng,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.success) {
      showToast('Update submitted ✓');
      setCategory(''); setPhoto(''); setNotes('');
      loadUpdates(farmerId);
    } else {
      setError(data.error || 'Failed to submit update');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ backgroundColor: primaryColor }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="text-white px-4 py-4 sticky top-0 z-40" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/farmer/dashboard')} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="font-bold text-sm">My Updates</div>
            <div className="text-white/70 text-xs">Share progress on your plantation</div>
          </div>
          <button onClick={logout} aria-label="Sign Out"
            className="ml-auto text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">

        {/* Submit form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Share an Update</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What's this about?</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-colors ${
                    category === c.key ? '' : 'border-gray-100 text-gray-500'}`}
                  style={category === c.key ? { borderColor: primaryColor, backgroundColor: primaryColor + '10', color: primaryColor } : {}}>
                  <span className="text-lg">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Photo</label>
            {photo ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={photo} alt="" className="w-full h-48 object-cover"/>
                <button onClick={() => setPhoto('')}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5">
                  <XCircle className="w-4 h-4"/>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-2 hover:border-gray-300">
                <Camera className="w-8 h-8 text-gray-300"/>
                <span className="text-sm text-gray-500 font-semibold">Tap to take or choose a photo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden"/>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className={`w-3.5 h-3.5 ${gpsStatus === 'captured' ? 'text-green-500' : 'text-gray-400'}`}/>
            {gpsStatus === 'capturing' && <span className="text-gray-400">Capturing location…</span>}
            {gpsStatus === 'captured' && <span className="text-green-600">Location captured ✓</span>}
            {gpsStatus === 'denied' && (
              <span className="text-gray-400">
                Location unavailable — <button onClick={captureGPS} className="underline">try again</button>
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white"
              placeholder="Anything the field team should know?"/>
          </div>

          <button onClick={submit} disabled={submitting}
            className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}>
            {submitting ? 'Submitting…' : 'Submit Update'}
          </button>
        </div>

        {/* Past updates */}
        <div>
          <h2 className="font-bold text-gray-900 text-sm mb-3">Your Past Updates</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : updates.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No updates submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {updates.map(u => {
                const cat = CATEGORIES.find(c => c.key === u.category);
                const st  = STATUS_CONFIG[u.status] || STATUS_CONFIG.PENDING;
                return (
                  <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-3">
                    <img src={u.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{cat?.emoji} {cat?.label || u.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="text-gray-400 text-[10px] mt-0.5">
                        {new Date(u.submittedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </div>
                      {u.notes && <p className="text-gray-500 text-xs mt-1 truncate">{u.notes}</p>}
                      {u.reviewNotes && <p className="text-gray-400 text-xs mt-1 italic">Reviewer: {u.reviewNotes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
