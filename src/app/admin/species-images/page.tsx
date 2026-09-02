'use client';
// src/app/admin/species-images/page.tsx
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import { Upload, Trash2, Leaf } from 'lucide-react';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SpeciesImagesPage() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSpecies, setNewSpecies] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/species-images');
    const data = await res.json();
    setImages(data.images || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, existingSpecies?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const species = existingSpecies || newSpecies.trim();
    if (!species) { showToast('Enter a species name first'); e.target.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large — please use a file under 2MB'); e.target.value = ''; return; }

    setUploading(true);
    const imageUrl = await fileToBase64(file);
    const res = await fetch('/api/admin/species-images', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species, imageUrl }),
    });
    const data = await res.json();
    setUploading(false);
    e.target.value = '';
    if (!res.ok) { showToast(data.error || 'Upload failed'); return; }
    showToast(`Image saved for ${species} ✓`);
    setNewSpecies('');
    load();
  }

  async function setCategory(species: string, category: 'MAIN' | 'SIDE') {
    const res = await fetch('/api/admin/species-images', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species, category }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to update category'); return; }
    load();
  }

  async function remove(id: string, species: string) {
    if (!confirm(`Remove the image for ${species}?`)) return;
    const res = await fetch(`/api/admin/species-images?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to remove'); return; }
    showToast('Removed ✓');
    load();
  }

  return (
    <div>
      <PageHeader title="Species Images" subtitle="A real photo per plant species, shown on each donor's Tree Story page"/>
      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="p-6 max-w-3xl">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-xs text-blue-700">
          <strong>Main vs Side:</strong> classify each species as <strong>Main</strong> (primary/economic, e.g. Mango) or
          <strong> Side</strong> (support/boundary, e.g. Bamboo). This drives "Auto by Category Ratio" when linking
          sponsored trees — it distributes a donor's trees to hit your organisation's target Main/Side split
          (set on the organisation's settings page) instead of one flat species. Uncategorized species are treated as Side.
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Add a New Species Image</h3>
          <div className="flex flex-wrap gap-2">
            <input value={newSpecies} onChange={e => setNewSpecies(e.target.value)}
              placeholder="Species name — e.g. Mango, Neem, Teak"
              className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40"/>
            <label className="flex items-center gap-2 bg-[var(--admin-primary)] text-white text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer hover:opacity-90">
              <Upload className="w-4 h-4"/> {uploading ? 'Uploading…' : 'Upload Photo'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => handleUpload(e)}/>
            </label>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Species names match what's entered in "Update Plantation Data" — use the same spelling so trees link up correctly (not case-sensitive).
          </p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : images.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <Leaf className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
            <p className="text-gray-400 text-sm">No species images yet — add your first one above.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img: any) => (
              <div key={img.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <img src={img.imageUrl} alt={img.species} className="w-full h-32 object-cover"/>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 text-sm">{img.species}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[var(--admin-primary)] font-semibold cursor-pointer hover:underline">
                        Replace
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, img.species)}/>
                      </label>
                      <button onClick={() => remove(img.id, img.species)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setCategory(img.species, 'MAIN')}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border-2 transition-colors ${
                        img.category === 'MAIN' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-400'}`}>
                      Main
                    </button>
                    <button onClick={() => setCategory(img.species, 'SIDE')}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border-2 transition-colors ${
                        img.category === 'SIDE' || !img.category ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-400'}`}>
                      Side
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
