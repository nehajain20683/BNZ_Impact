'use client';
// src/app/admin/signatories/page.tsx
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import { Upload, Trash2, PenTool, Star } from 'lucide-react';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SignatoriesPage() {
  const [signatories, setSignatories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [makePrimary, setMakePrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/signatories').then(r => r.json());
    setSignatories(res.signatories || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImage(await fileToBase64(file));
  }

  async function addSignatory() {
    if (!name || !designation || !image) return;
    setSaving(true);
    await fetch('/api/admin/signatories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, designation, signatureImage: image, isPrimary: makePrimary || signatories.length === 0 }),
    });
    setName(''); setDesignation(''); setImage(null); setMakePrimary(false);
    setSaving(false);
    load();
  }

  async function setPrimary(id: string) {
    await fetch(`/api/admin/signatories/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Remove this signatory?')) return;
    await fetch(`/api/admin/signatories/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <PageHeader title="Authorized Signatories" subtitle="Whose signature appears on generated certificates, receipts, and agreements" />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
          The signatory marked <strong>Primary</strong> is used automatically wherever a document needs
          an "Authorised By" / "Project Authority" signature. Keep more than one on file if that person changes —
          documents already generated won't retroactively change whose signature they show.
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Add a Signatory</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"/>
            <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation — e.g. Managing Trustee"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"/>
          </div>
          <div className="flex items-center gap-4 mb-3">
            {image ? (
              <img src={image} alt="" className="h-16 border border-gray-200 rounded-lg bg-white px-3 object-contain"/>
            ) : (
              <label className="flex items-center gap-2 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-gray-400">
                <Upload className="w-4 h-4"/> Upload signature image
                <input type="file" accept="image/*" className="hidden" onChange={handleImage}/>
              </label>
            )}
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={makePrimary} onChange={e => setMakePrimary(e.target.checked)} className="accent-[var(--admin-primary)]"/>
              Make Primary
            </label>
          </div>
          <button onClick={addSignatory} disabled={saving || !name || !designation || !image}
            className="bg-[var(--admin-primary)] text-white font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Signatory'}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : signatories.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <PenTool className="w-8 h-8 mx-auto mb-2"/>
            <p className="text-sm">No signatories added yet — documents will show a blank signature line until one exists.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signatories.map((s: any) => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
                <img src={s.signatureImage} alt="" className="h-12 w-28 object-contain border border-gray-100 rounded-lg bg-white flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    {s.name}
                    {s.isPrimary && <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Star className="w-2.5 h-2.5 fill-amber-500"/> Primary</span>}
                  </div>
                  <div className="text-gray-400 text-xs">{s.designation}</div>
                </div>
                {!s.isPrimary && (
                  <button onClick={() => setPrimary(s.id)} className="text-xs font-semibold text-[var(--admin-primary)] hover:underline">Make Primary</button>
                )}
                <button onClick={() => remove(s.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
