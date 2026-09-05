'use client';
// src/app/admin/campaigns/page.tsx
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import { Plus, Trash2, Upload, X, Star } from 'lucide-react';

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40";
const emptyPkg = () => ({ id: `pkg-${Date.now()}`, trees: 11, badge: '', badgeEn: '', emoji: '🌳', popular: false, description: '' });

// Same three perks the public detail page falls back to when a campaign
// has no custom perks saved — kept as one shared source of truth so the
// admin checklist and the public default never quietly drift apart.
const DEFAULT_PERK_OPTIONS = [
  { key: 'plantation', title: 'Tree(s) Plantation', description: 'A native tree is planted at a verified site by a field officer, GPS-tagged and photographed at the time of planting.', icon: 'plantation', enabled: true },
  { key: 'certificate', title: 'e-Certificate of Plantation', description: 'A signed digital certificate with your name and the project details, available to download right after planting is confirmed.', icon: 'certificate', enabled: true },
  { key: 'geotag', title: 'Geotag & Live Tracking', description: "Track your tree's exact location and growth photos any time, or scan the QR code printed on its certificate.", icon: 'geotag', enabled: true },
];

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<any>(null); // null = closed, {} = new, {...} = editing
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/campaigns');
    const data = await res.json();
    setCampaigns(data.campaigns || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setError('');
    setEditing({
      name: '', slug: '', subtitle: '', shortName: '', dedicationLabel: '',
      description: '', imageUrl: '', accentColor: '#2d5a1b', accentBg: '#f6faf3',
      accentBorder: '#c9dcc0', treePrice: '', goal: '', displayOrder: campaigns.length,
      packages: [emptyPkg()], active: true,
    });
  }
  function openEdit(c: any) {
    setError('');
    setEditing({ ...c, packages: Array.isArray(c.packages) && c.packages.length ? c.packages : [emptyPkg()] });
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Image must be a PNG, JPG, etc.'); return; }
    if (file.size > 1024 * 1024) { setError('Image must be under 1MB. Please compress it and try again.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setEditing((p: any) => ({ ...p, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function handleGalleryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Image must be a PNG, JPG, etc.'); return; }
    if (file.size > 1024 * 1024) { setError('Image must be under 1MB. Please compress it and try again.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setEditing((p: any) => ({ ...p, galleryImages: [...(p.galleryImages || []), reader.result as string] }));
    reader.readAsDataURL(file);
  }

  function updatePkg(i: number, key: string, value: any) {
    setEditing((p: any) => {
      const packages = [...p.packages];
      packages[i] = { ...packages[i], [key]: value };
      return { ...p, packages };
    });
  }
  function addPkg() {
    setEditing((p: any) => ({ ...p, packages: [...p.packages, emptyPkg()] }));
  }
  function removePkg(i: number) {
    setEditing((p: any) => ({ ...p, packages: p.packages.filter((_: any, idx: number) => idx !== i) }));
  }

  async function handleSave() {
    setSaving(true); setError('');
    const isNew = !editing.id;
    const url    = isNew ? '/api/admin/campaigns' : `/api/admin/campaigns/${editing.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    const payload = {
      ...editing,
      treePrice: editing.treePrice ? Number(editing.treePrice) : undefined,
      goal: editing.goal ? parseInt(editing.goal) : null,
      displayOrder: parseInt(editing.displayOrder) || 0,
      packages: editing.packages.filter((p: any) => p.trees > 0),
    };

    const res  = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error || 'Failed to save'); return; }
    showToast(isNew ? 'Campaign created ✓' : 'Saved ✓');
    setEditing(null);
    load();
  }

  async function handleToggleActive(c: any) {
    const res = await fetch(`/api/admin/campaigns/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to update'); return; }
    load();
  }

  async function handleDelete(c: any) {
    if (!confirm(`Delete "${c.name}"? This can't be undone unless donations already reference it (in which case it will be deactivated instead).`)) return;
    const res = await fetch(`/api/admin/campaigns/${c.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to delete'); return; }
    showToast(data.deactivatedInstead ? 'Campaign had donations — deactivated instead of deleted' : 'Campaign deleted');
    load();
  }

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Manage the tree-sponsorship campaigns shown on your public site">
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-[var(--admin-primary)] hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4"/> New Campaign
        </button>
      </PageHeader>

      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>
      )}

      <div className="p-6">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
            No campaigns yet — create your first one to start accepting donations.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="h-28 relative" style={{ background: c.imageUrl ? undefined : (c.accentColor || 'var(--admin-primary)') }}>
                  {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover"/>}
                  {!c.active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-bold uppercase tracking-wide">Inactive</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-bold text-gray-900 text-sm">{c.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{c.subtitle || c.slug}</div>
                  <div className="text-gray-500 text-xs mt-2">₹{c.treePrice}/tree · {Array.isArray(c.packages) ? c.packages.length : 0} package{Array.isArray(c.packages) && c.packages.length === 1 ? '' : 's'}</div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => openEdit(c)}
                      className="flex-1 text-xs font-semibold border border-gray-200 hover:border-[var(--admin-primary)] rounded-lg py-1.5">
                      Edit
                    </button>
                    <button onClick={() => handleToggleActive(c)}
                      className="flex-1 text-xs font-semibold border border-gray-200 hover:border-[var(--admin-primary)] rounded-lg py-1.5">
                      {c.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(c)} className="text-red-400 hover:text-red-600 p-1.5">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-bold text-gray-900">{editing.id ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Name *</label>
                  <input value={editing.name} onChange={e => setEditing((p: any) => ({ ...p, name: e.target.value }))} className={inp} placeholder="e.g. Ek Ped Maa Ke Naam"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL) {!editing.id && '*'}</label>
                  <input value={editing.slug || ''} disabled={!!editing.id}
                    onChange={e => setEditing((p: any) => ({ ...p, slug: e.target.value }))}
                    className={inp + (editing.id ? ' bg-gray-50 text-gray-400' : '')} placeholder="e.g. maa"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Short Name</label>
                  <input value={editing.shortName || ''} onChange={e => setEditing((p: any) => ({ ...p, shortName: e.target.value }))} className={inp} placeholder="e.g. Maa"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dedication Label</label>
                  <input value={editing.dedicationLabel || ''} onChange={e => setEditing((p: any) => ({ ...p, dedicationLabel: e.target.value }))} className={inp} placeholder="e.g. Mother"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                  <input value={editing.subtitle || ''} onChange={e => setEditing((p: any) => ({ ...p, subtitle: e.target.value }))} className={inp} placeholder="e.g. In Honour of Your Mother"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea rows={2} value={editing.description || ''} onChange={e => setEditing((p: any) => ({ ...p, description: e.target.value }))} className={inp}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price per Tree (₹)</label>
                  <input type="number" value={editing.treePrice} onChange={e => setEditing((p: any) => ({ ...p, treePrice: e.target.value }))} className={inp} placeholder="Uses org default if blank"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tree Goal (optional)</label>
                  <input type="number" value={editing.goal || ''} onChange={e => setEditing((p: any) => ({ ...p, goal: e.target.value }))} className={inp}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Image</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {editing.imageUrl ? <img src={editing.imageUrl} alt="" className="w-full h-full object-cover"/> : <span className="text-gray-300 text-xs">No image</span>}
                  </div>
                  <label className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5"/> Upload
                    <input type="file" accept="image/*" onChange={handleImageFile} className="hidden"/>
                  </label>
                  {editing.imageUrl && (
                    <button type="button" onClick={() => setEditing((p: any) => ({ ...p, imageUrl: '' }))} className="text-red-400 hover:text-red-600 text-xs font-semibold">Remove</button>
                  )}
                </div>
                <p className="text-gray-400 text-xs mt-1">Under 1MB. Falls back to a solid color card if left blank.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gallery Images</label>
                <p className="text-gray-400 text-xs mb-2">Extra photos shown on the campaign's detail page — sample certificate, past plantings, etc.</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(editing.galleryImages || []).map((img: string, i: number) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 group">
                      <img src={img} alt="" className="w-full h-full object-cover"/>
                      <button type="button"
                        onClick={() => setEditing((p: any) => ({ ...p, galleryImages: p.galleryImages.filter((_: any, j: number) => j !== i) }))}
                        className="absolute inset-0 bg-black/50 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>
                  ))}
                  <label className="w-16 h-16 flex items-center justify-center border border-dashed border-gray-300 hover:border-gray-400 rounded-lg cursor-pointer text-gray-400 flex-shrink-0">
                    <Upload className="w-4 h-4"/>
                    <input type="file" accept="image/*" onChange={handleGalleryFile} className="hidden"/>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">What You Get — Perks Shown on Detail Page</label>
                <p className="text-gray-400 text-xs mb-2">Turn off anything this campaign doesn't actually offer, rather than leave it listed but untrue.</p>
                <div className="space-y-2">
                  {(editing.perks && editing.perks.length > 0 ? editing.perks : DEFAULT_PERK_OPTIONS).map((perk: any, i: number) => (
                    <label key={perk.key} className="flex items-center gap-2.5 border border-gray-100 rounded-lg px-3 py-2 cursor-pointer">
                      <input type="checkbox" checked={perk.enabled !== false}
                        onChange={e => {
                          const base = editing.perks && editing.perks.length > 0 ? editing.perks : DEFAULT_PERK_OPTIONS;
                          const next = base.map((p: any, j: number) => j === i ? { ...p, enabled: e.target.checked } : p);
                          setEditing((prev: any) => ({ ...prev, perks: next }));
                        }}
                        className="rounded"/>
                      <span className="text-sm text-gray-700">{perk.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Accent Color</label>
                  <input type="color" value={editing.accentColor || '#2d5a1b'} onChange={e => setEditing((p: any) => ({ ...p, accentColor: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Background Tint</label>
                  <input type="color" value={editing.accentBg || '#f6faf3'} onChange={e => setEditing((p: any) => ({ ...p, accentBg: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Border Tint</label>
                  <input type="color" value={editing.accentBorder || '#c9dcc0'} onChange={e => setEditing((p: any) => ({ ...p, accentBorder: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"/>
                </div>
              </div>

              {/* Packages */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Sponsorship Packages</label>
                  <button type="button" onClick={addPkg} className="text-[var(--admin-primary)] text-xs font-semibold">+ Add tier</button>
                </div>
                <div className="space-y-2">
                  {editing.packages.map((pkg: any, i: number) => (
                    <div key={pkg.id || i} className="grid grid-cols-[70px_1fr_1fr_50px_auto_auto] gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <input type="number" value={pkg.trees} onChange={e => updatePkg(i, 'trees', parseInt(e.target.value) || 0)} className={inp} placeholder="Trees"/>
                      <input value={pkg.badge} onChange={e => updatePkg(i, 'badge', e.target.value)} className={inp} placeholder="Badge (native script)"/>
                      <input value={pkg.badgeEn} onChange={e => updatePkg(i, 'badgeEn', e.target.value)} className={inp} placeholder="Badge (English)"/>
                      <input value={pkg.emoji} onChange={e => updatePkg(i, 'emoji', e.target.value)} className={inp} placeholder="🌳"/>
                      <button type="button" onClick={() => updatePkg(i, 'popular', !pkg.popular)} title="Mark as most popular"
                        className={`p-2 rounded-lg ${pkg.popular ? 'bg-amber-100 text-amber-600' : 'text-gray-300'}`}>
                        <Star className="w-4 h-4" fill={pkg.popular ? 'currentColor' : 'none'}/>
                      </button>
                      <button type="button" onClick={() => removePkg(i)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="active" checked={editing.active} onChange={e => setEditing((p: any) => ({ ...p, active: e.target.checked }))}/>
                <label htmlFor="active" className="text-sm text-gray-700">Active (visible on public site)</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-[var(--admin-primary)] hover:opacity-90 text-white rounded-lg disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
