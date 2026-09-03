'use client';
// src/app/officer/farmer/[id]/bulk-capture/page.tsx
// The spec's own headline flow: "scan tag -> camera opens -> save -> next
// tag -> repeat, 100 trees in under 15 minutes." Reuses the same QRScanner
// and tree-photo upload API as the rest of the app — this page's job is
// purely the tight scan -> confirm -> photograph -> auto-rescan loop.
// One deliberate tap between scan and camera (not fully hands-free):
// browsers require a direct user gesture to open a native camera picker,
// so a "Take Photo" tap sits between the scan result and the camera —
// still one motion per tree, just not zero.
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, CheckCircle, QrCode, TreePine, X } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';
import { QRScanner } from '@/components/QRScanner';

type Stage = 'scanning' | 'confirm' | 'uploading' | 'saved';

export default function BulkCapturePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [farmerName, setFarmerName] = useState('');
  const [trees, setTrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>('scanning');
  const [activeTree, setActiveTree] = useState<any>(null);
  const [error, setError] = useState('');
  const [sessionLog, setSessionLog] = useState<{ tag: string; at: string }[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }
    fetch(`/api/field-officer/farmer/${id}?officerId=${officerId}`)
      .then(r => r.json())
      .then(d => { setFarmerName(d.farmer?.fullName || ''); setTrees(d.trees || []); setLoading(false); });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { timeout: 10000 },
      );
    }
  }, [id]);

  function handleScan(tag: string) {
    const match = trees.find(t => t.treeTagId === tag.trim());
    if (!match) {
      setError(`No tree with tag "${tag}" found for this farmer.`);
      setTimeout(() => setError(''), 3000);
      return; // stays in 'scanning' — QRScanner re-mounts fresh below
    }
    setActiveTree(match);
    setStage('confirm');
  }

  function openCamera() {
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeTree) return;
    setStage('uploading');
    const compressed = await compressImage(file);
    const officerId = localStorage.getItem('officerId');
    const res = await fetch('/api/field-officer/tree-photo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officerId, treeId: activeTree.id, imageBase64: compressed,
        latitude: gps?.lat, longitude: gps?.lng,
      }),
    });
    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      setError(result.error || 'Upload failed — try this tree again.');
      setStage('scanning');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setSessionLog(log => [{ tag: activeTree.treeTagId, at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }, ...log]);
    setStage('saved');
    setTimeout(() => { setActiveTree(null); setStage('scanning'); }, 900);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-sage-950">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile}/>

      {/* QRScanner is a full-screen fixed overlay — while scanning, it
          covers everything below, so the running counter and session log
          only need to render for the other stages, not fight for
          visibility underneath it. */}
      {stage === 'scanning' && (
        <QRScanner key={sessionLog.length} title={`Scan Next Tree Tag${sessionLog.length > 0 ? ` (${sessionLog.length} saved)` : ''}`}
          onScan={handleScan} onClose={() => router.push(`/officer/farmer/${id}`)}/>
      )}

      {stage !== 'scanning' && (
        <>
          <div className="px-4 py-4 flex items-center justify-between text-white">
            <button onClick={() => router.push(`/officer/farmer/${id}`)} className="flex items-center gap-2 text-white/70 hover:text-white">
              <ArrowLeft className="w-5 h-5"/> <span className="text-sm">Exit Bulk Mode</span>
            </button>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-sm font-bold">
              <CheckCircle className="w-3.5 h-3.5"/> {sessionLog.length} saved
            </div>
          </div>

          <div className="text-center text-white/50 text-xs mb-2">{farmerName}</div>

          {error && (
            <div className="mx-4 mb-3 bg-red-500/20 border border-red-400/40 text-red-200 text-xs rounded-xl p-3 text-center">{error}</div>
          )}

          {stage === 'confirm' && activeTree && (
            <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: '60vh' }}>
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
                <TreePine className="w-10 h-10 text-sage-600 mx-auto mb-3"/>
                <div className="font-mono text-sage-500 text-sm">{activeTree.treeTagId}</div>
                <div className="font-display text-xl text-sage-950 mb-5">{activeTree.species || 'Species TBA'}</div>
                <button onClick={openCamera}
                  className="w-full flex items-center justify-center gap-2 bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-2xl text-sm mb-2">
                  <Camera className="w-4 h-4"/> Take Photo
                </button>
                <button onClick={() => { setActiveTree(null); setStage('scanning'); }}
                  className="w-full flex items-center justify-center gap-1.5 text-sage-400 text-xs font-semibold py-2">
                  <X className="w-3.5 h-3.5"/> Not this tree — scan again
                </button>
              </div>
            </div>
          )}

          {stage === 'uploading' && (
            <div className="flex flex-col items-center justify-center text-white/70" style={{ minHeight: '60vh' }}>
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3"/>
              <p className="text-sm">Saving {activeTree?.treeTagId}…</p>
            </div>
          )}

          {stage === 'saved' && (
            <div className="flex flex-col items-center justify-center text-white" style={{ minHeight: '60vh' }}>
              <CheckCircle className="w-14 h-14 text-green-400 mb-3"/>
              <p className="font-semibold">{activeTree?.treeTagId} saved</p>
              <p className="text-white/50 text-xs mt-1">Next tag…</p>
            </div>
          )}

          {sessionLog.length > 0 && (
            <div className="px-4 pb-6">
              <div className="text-white/40 text-xs font-semibold mb-2 flex items-center gap-1.5"><QrCode className="w-3 h-3"/> This session</div>
              <div className="flex flex-wrap gap-1.5">
                {sessionLog.slice(0, 12).map((s, i) => (
                  <span key={i} className="text-[10px] font-mono bg-white/10 text-white/70 px-2 py-1 rounded-full">{s.tag}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
