'use client';
// src/components/admin/ConsentSignaturePanel.tsx
// The admin side of the landowner consent declaration's signature workflow:
//   request signature → farmer uploads signed copy → review → verify / reject.
// "Verify" is deliberately not a bare click: the reviewer sees the actual
// signed copy inline and must confirm three specific checks, and the
// server records who verified, when, what they confirmed, and a fingerprint
// of the exact file they looked at.
import { useState } from 'react';
import { Send, ShieldCheck, ShieldX, ExternalLink, History, Clock } from 'lucide-react';

const CHECKS = [
  { key: 'ownerSignatureOrThumb', label: "The landowner's signature / thumb impression is present and clear" },
  { key: 'witnessesPresent',      label: 'Both witnesses have signed (name, mobile and signature)' },
  { key: 'documentMatches',       label: 'This is the complete declaration — all pages present, readable, and for this landowner and land' },
] as const;

const fmt = (d?: string | Date | null) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function ConsentSignaturePanel({ ag, onChanged }: { ag: any; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const verified  = ag.status === 'COMPLETED' && ag.verificationStatus === 'VERIFIED';
  const awaiting  = ag.status === 'SIGNED' && !!ag.signedPdfUrl;
  const requested = !!ag.signatureRequestedAt;
  const allChecked = CHECKS.every(c => checks[c.key]);
  const history: any[] = Array.isArray(ag.signatureHistory) ? ag.signatureHistory : [];

  async function act(action: 'request_signature' | 'verify' | 'reject') {
    setBusy(true); setError('');
    const res = await fetch('/api/admin/agreements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId: ag.id, action, checklist: action === 'verify' ? checks : undefined, note: note.trim() || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || 'Something went wrong'); return; }
    setReviewing(false); setChecks({}); setNote('');
    onChanged();
  }


  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-xs">
      {/* Status + primary action */}
      {verified ? (
        <div className="flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0"/>
          <div>
            <div className="font-semibold">Signature verified · {fmt(ag.verifiedAt)}</div>
            {ag.verificationNote && <div className="opacity-80 mt-0.5">{ag.verificationNote}</div>}
          </div>
        </div>
      ) : awaiting ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-teal-700 font-semibold"><Clock className="w-3.5 h-3.5"/> Signed copy received {fmt(ag.signedAt)} — awaiting your verification</span>
          <button onClick={() => setReviewing(r => !r)} className="flex items-center gap-1 bg-[var(--admin-primary)] text-white font-semibold rounded-lg px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5"/> {reviewing ? 'Hide review' : 'Review & verify'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {requested
            ? <span className="text-gray-500">Signature requested {fmt(ag.signatureRequestedAt)} — waiting for the farmer to upload the signed copy.</span>
            : <span className="text-gray-500">Not yet sent for signature. The farmer can already view and download it.</span>}
          <button onClick={() => act('request_signature')} disabled={busy}
            className="flex items-center gap-1 border border-[var(--admin-primary)]/40 text-[var(--admin-primary)] font-semibold rounded-lg px-3 py-1.5 hover:bg-[var(--admin-primary)]/5 disabled:opacity-60">
            <Send className="w-3.5 h-3.5"/> {requested ? 'Send reminder' : 'Share for signature'}
          </button>
        </div>
      )}

      {ag.verificationStatus === 'REJECTED' && !awaiting && !verified && (
        <div className="text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <span className="font-semibold">Last signed copy was rejected:</span> {ag.verificationNote}
        </div>
      )}

      {/* Review panel */}
      {reviewing && awaiting && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50/60">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-700">Signed copy uploaded by the farmer</div>
            <a href={ag.signedPdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-800"><ExternalLink className="w-3.5 h-3.5"/> Open in new tab</a>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Loaded from the on-demand endpoint only when the reviewer opens this panel;
                an iframe shows both PDFs and photos. */}
            <iframe src={ag.signedPdfUrl} title="Signed copy" className="w-full h-96 border-0"/>
          </div>

          <div className="space-y-1.5">
            {CHECKS.map(c => (
              <label key={c.key} className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={!!checks[c.key]} onChange={e => setChecks(s => ({ ...s, [c.key]: e.target.checked }))} className="mt-0.5"/>
                <span className="text-gray-700">{c.label}</span>
              </label>
            ))}
          </div>

          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Note (required to reject — tell the farmer what to fix; optional when verifying)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"/>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => act('verify')} disabled={busy || !allChecked}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
              <ShieldCheck className="w-3.5 h-3.5"/> Verify signature
            </button>
            <button onClick={() => act('reject')} disabled={busy || !note.trim()}
              className="flex items-center gap-1 border border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
              <ShieldX className="w-3.5 h-3.5"/> Reject &amp; ask to re-upload
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(h => !h)} className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
            <History className="w-3.5 h-3.5"/> {showHistory ? 'Hide' : 'Show'} audit trail ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {history.slice().reverse().map((h, i) => (
                <div key={i} className="border-l-2 border-gray-200 pl-3 text-gray-600">
                  <span className="font-semibold">{String(h.action || '').replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="text-gray-400"> · {fmt(h.at)}{h.by ? ` · ${h.by}` : ''}</span>
                  {h.note && <div className="text-gray-500">{h.note}</div>}
                  {h.copyFingerprint && <div className="text-gray-300 font-mono">file {h.copyFingerprint}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
