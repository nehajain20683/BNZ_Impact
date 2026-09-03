'use client';
// src/app/officer/signature/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, PenTool } from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';

export default function OfficerSignaturePage() {
  const router = useRouter();
  const [existing, setExisting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }
    fetch(`/api/field-officer/signature?officerId=${officerId}`)
      .then(r => r.json())
      .then(d => { setExisting(d.signatureImage); setLoading(false); });
  }, []);

  async function save() {
    if (!draft) return;
    const officerId = localStorage.getItem('officerId');
    setSaving(true);
    await fetch('/api/field-officer/signature', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officerId, signatureImage: draft }),
    });
    setSaving(false);
    setExisting(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-sage-50">
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/70 hover:text-white"><ArrowLeft className="w-5 h-5"/></button>
          <div className="font-bold text-sm flex items-center gap-1.5"><PenTool className="w-4 h-4"/> My Signature</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <p className="text-sage-500 text-sm">
          This appears on sapling receipts, plantation certificates, and payment receipts you're involved in —
          captured once here, reused automatically, no more signing paper for every document.
        </p>

        {existing && (
          <div className="bg-white rounded-2xl border border-sage-100 p-4">
            <div className="text-xs font-medium text-sage-600 mb-2">Current signature on file</div>
            <img src={existing} alt="Current signature" className="h-16 border border-sage-100 rounded-lg bg-white px-3"/>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-sage-100 p-4">
          <div className="text-xs font-medium text-sage-600 mb-2">{existing ? 'Draw a new signature to replace it' : 'Draw your signature'}</div>
          <SignaturePad onChange={setDraft}/>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-green-700 bg-green-50 text-sm font-semibold px-3 py-2 rounded-xl">
            <CheckCircle className="w-4 h-4"/> Signature saved
          </div>
        )}

        <button onClick={save} disabled={!draft || saving}
          className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Signature'}
        </button>
      </div>
    </div>
  );
}
