'use client';
// src/app/officer/farmer/[id]/monitor/page.tsx
// Search-and-select tree health monitoring — an officer can jump straight
// to any specific tree tag (via search or tapping it in the list) and see
// at a glance whether it's already been checked, rather than only being
// able to move through trees in a fixed sequential order. Wires up
// MonitoringTreeSample, which existed in the schema with the right fields
// but had no write path anywhere until this.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, CheckCircle, TreePine, AlertTriangle, Search, ChevronLeft } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';

const HEALTH_OPTIONS = [
  { value: 'HEALTHY',  label: 'Healthy',      color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'STRESSED', label: 'Needs Water',  color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'DISEASED', label: 'Disease',      color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'DEAD',     label: 'Dead',         color: 'bg-red-100 text-red-700 border-red-300' },
];

const HEALTH_DOT: Record<string, string> = {
  HEALTHY: 'bg-green-500', STRESSED: 'bg-amber-500', DISEASED: 'bg-orange-500', DEAD: 'bg-red-500',
};

export default function TreeMonitoringPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTree, setSelectedTree] = useState<any>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  const [height, setHeight] = useState('');
  const [diameter, setDiameter] = useState('');
  const [health, setHealth] = useState('HEALTHY');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [creatingReplacement, setCreatingReplacement] = useState(false);
  const [replacementTag, setReplacementTag] = useState<string | null>(null);

  async function createReplacement() {
    if (!selectedTree) return;
    setCreatingReplacement(true);
    const officerId = localStorage.getItem('officerId');
    const res = await fetch(`/api/field-officer/tree/${selectedTree.id}/replace`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officerId }),
    });
    const result = await res.json();
    setCreatingReplacement(false);
    if (res.ok) setReplacementTag(result.replacement.treeTagId);
  }

  useEffect(() => {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }
    fetch(`/api/field-officer/farmer/${id}?officerId=${officerId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { timeout: 10000 },
      );
    }
  }, [id]);

  function openTree(tree: any) {
    setSelectedTree(tree);
    setJustSaved(false);
    setReplacementTag(null);
    const latest = tree.monitoringSamples?.[0];
    // Pre-fills with the last recorded values — this is explicitly an
    // update/re-check, not a blank form each time, since the same tree can
    // legitimately be checked more than once over its life.
    setHeight(latest?.height != null ? String(latest.height) : '');
    setDiameter('');
    setHealth(latest?.health || 'HEALTHY');
    setNotes('');
    setPhoto(null);
  }

  function backToList() {
    setSelectedTree(null);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    setPhoto(await compressImage(file));
    setUploadingPhoto(false);
  }

  async function save() {
    if (!selectedTree) return;
    setSaving(true);
    const officerId = localStorage.getItem('officerId');
    const res = await fetch('/api/field-officer/tree-sample', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officerId, treeId: selectedTree.id,
        height: height ? parseFloat(height) : undefined,
        diameter: diameter ? parseFloat(diameter) : undefined,
        health, survived: health !== 'DEAD',
        photo: photo || undefined, notes: notes || undefined,
        latitude: gps?.lat, longitude: gps?.lng,
      }),
    });
    setSaving(false);
    if (!res.ok) return;

    // Reflect the new record in the list immediately, no reload needed.
    setData((d: any) => ({
      ...d,
      trees: d.trees.map((t: any) => t.id === selectedTree.id
        ? { ...t, monitoringSamples: [{ health, height: height ? parseFloat(height) : null, createdAt: new Date().toISOString() }] }
        : t),
    }));
    setJustSaved(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;
  if (!data || data.error) {
    return <div className="min-h-screen flex items-center justify-center px-4 text-center"><p className="text-sage-500">{data?.error || 'Farmer not found.'}</p></div>;
  }

  const { farmer, trees } = data;

  if (trees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <TreePine className="w-10 h-10 text-sage-200 mx-auto mb-3"/>
          <p className="text-sage-500">No trees linked to this farmer's land yet — nothing to monitor.</p>
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="mt-3 text-sage-700 font-semibold text-sm">← Back to Farmer</button>
        </div>
      </div>
    );
  }

  const filteredTrees = search
    ? trees.filter((t: any) => (t.treeTagId || '').toLowerCase().includes(search.toLowerCase()))
    : trees;
  const checkedCount = trees.filter((t: any) => t.monitoringSamples?.length > 0).length;

  // ── Tree detail / recording form ──────────────────────────────────────
  if (selectedTree) {
    const latest = selectedTree.monitoringSamples?.[0];
    return (
      <div className="min-h-screen bg-sage-50 pb-20">
        <div className="bg-sage-800 text-white px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={backToList} className="text-white/70 hover:text-white">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <div>
              <div className="font-bold text-sm font-mono">{selectedTree.treeTagId || 'Tag pending'}</div>
              <div className="text-white/70 text-xs">{selectedTree.species || 'Species TBA'} · {farmer.fullName}</div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {justSaved ? (
            <div className="bg-white rounded-2xl border border-sage-100 p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2"/>
              <p className="text-sage-700 font-semibold text-sm">Recorded ✓</p>

              {health === 'DEAD' && (
                replacementTag ? (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 mt-4 text-left">
                    <div className="text-green-700 text-xs font-semibold">Replacement tag created</div>
                    <div className="font-mono text-green-800 text-sm mt-0.5">{replacementTag}</div>
                    <div className="text-green-600 text-[11px] mt-1">Attach this new tag when the replacement is planted, then capture its photo as usual.</div>
                  </div>
                ) : (
                  <button onClick={createReplacement} disabled={creatingReplacement}
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-sm mt-4 disabled:opacity-60">
                    {creatingReplacement ? 'Creating…' : '🏷️ Create Replacement Tag'}
                  </button>
                )
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={backToList} className="flex-1 border border-sage-200 text-sage-600 font-semibold py-2.5 rounded-xl text-sm">
                  Back to List
                </button>
                <button onClick={() => openTree(selectedTree)} className="flex-1 bg-sage-700 text-white font-semibold py-2.5 rounded-xl text-sm">
                  Check Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {latest && (
                <div className="bg-sage-100 text-sage-600 rounded-xl p-3 text-xs">
                  Previously checked {new Date(latest.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })} — {latest.health || 'HEALTHY'}
                  {latest.height ? ` · ${latest.height}cm` : ''}. This will add a new, separate record — not overwrite it.
                </div>
              )}

              <div className="bg-white rounded-2xl border border-sage-100 p-4">
                <h3 className="font-semibold text-sage-900 text-sm mb-3">Health Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  {HEALTH_OPTIONS.map(h => (
                    <button key={h.value} onClick={() => setHealth(h.value)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        health === h.value ? h.color : 'border-sage-100 text-sage-400'}`}>
                      {h.value === 'DEAD' && <AlertTriangle className="w-3.5 h-3.5 inline mr-1"/>}
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-sage-100 p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-sage-600 block mb-1">Height (cm)</label>
                  <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                    className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-sage-600 block mb-1">Stem Diameter (cm)</label>
                  <input type="number" value={diameter} onChange={e => setDiameter(e.target.value)}
                    className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-sage-100 p-4">
                <label className="text-xs font-medium text-sage-600 block mb-2">Photo (optional)</label>
                {photo ? (
                  <img src={photo} alt="" className="w-20 h-20 rounded-lg object-cover"/>
                ) : (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-sage-200 flex items-center justify-center cursor-pointer hover:border-sage-400">
                    {uploadingPhoto ? <span className="text-xs text-sage-400">…</span> : <Camera className="w-5 h-5 text-sage-400"/>}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={uploadingPhoto}/>
                  </label>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-sage-100 p-4">
                <label className="text-xs font-medium text-sage-600 block mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-sage-200 rounded-xl px-3 py-2 text-sm"/>
              </div>

              <button onClick={save} disabled={saving}
                className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Record'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Tree list / search ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-sage-50 pb-16">
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/officer/farmer/${id}`)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="font-bold text-sm">Tree Health Monitoring</div>
            <div className="text-white/70 text-xs">{farmer.fullName} — {checkedCount} / {trees.length} checked</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by tree tag…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-sage-200 rounded-xl bg-white"/>
        </div>

        {filteredTrees.length === 0 ? (
          <p className="text-sage-400 text-sm text-center py-8">No trees match "{search}".</p>
        ) : (
          <div className="space-y-2">
            {filteredTrees.map((t: any) => {
              const latest = t.monitoringSamples?.[0];
              return (
                <button key={t.id} onClick={() => openTree(t)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-sage-100 p-3 text-left hover:border-sage-300 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
                    <TreePine className="w-5 h-5 text-sage-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-sage-500 truncate">{t.treeTagId || 'Tag pending'}</div>
                    <div className="text-sm font-semibold text-sage-800 truncate">{t.species || 'Species TBA'}</div>
                  </div>
                  {latest ? (
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[latest.health] || 'bg-gray-300'}`}/>
                        <span className="text-[10px] font-semibold text-sage-600">{latest.health || 'HEALTHY'}</span>
                      </div>
                      <div className="text-[10px] text-sage-400 mt-0.5">{new Date(latest.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full flex-shrink-0">Not checked</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
