'use client';
// src/components/farmer/ConsentDeclarationModal.tsx
// Shows the landowner's Consent & Participation Declaration — rendered by the
// server from their saved details and their organisation's own wording — when
// they tap "Terms and Conditions" on the registration Consent step.
import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

export function ConsentDeclarationModal({ farmerId, onClose }: { farmerId: string; onClose: () => void }) {
  const src = `/api/farmer/consent?farmerId=${encodeURIComponent(farmerId)}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // don't scroll the form behind the modal
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Consent and Participation Declaration"
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl h-[92vh] sm:h-[88vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">Consent &amp; Participation Declaration</div>
            <div className="text-xs text-gray-400 truncate">भूमि स्वामी की सहमति एवं सहभागिता घोषणा पत्र</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a href={src} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-50">
              <ExternalLink className="w-3.5 h-3.5"/> Open / Download
            </a>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5"/></button>
          </div>
        </div>
        <iframe src={src} title="Consent and Participation Declaration" className="flex-1 w-full border-0"/>
      </div>
    </div>
  );
}
