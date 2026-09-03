'use client';
// src/app/admin/community-updates/page.tsx
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import { CheckCircle, XCircle, RotateCcw, MapPin, Smartphone } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  WATERING: '💧 Watering', WEEDING: '🌾 Weeding', FERTILIZER: '🧪 Fertilizer',
  PEST: '🐛 Pest Issue', DAMAGE: '⚠️ Damage', GENERAL: '📷 General Photo',
};

const TABS = [
  { key: 'PENDING', label: 'Pending Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'NEEDS_REVIEW', label: 'New Photo Requested' },
];

export default function AdminCommunityUpdatesPage() {
  const [tab, setTab]         = useState('PENDING');
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState('');
  const [reviewing, setReviewing] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'REJECT'|'REQUEST_NEW_PHOTO'|null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/updates?status=${tab}`);
    const data = await res.json();
    setUpdates(data.updates || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tab]);

  async function act(id: string, action: string, notes?: string) {
    const res = await fetch('/api/admin/updates', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reviewNotes: notes }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed'); return; }
    showToast(action === 'APPROVE' ? 'Approved ✓' : action === 'REJECT' ? 'Rejected' : 'New photo requested');
    setReviewing(null); setReviewNotes(''); setReviewAction(null);
    load();
  }

  function openReview(u: any, action: 'REJECT'|'REQUEST_NEW_PHOTO') {
    setReviewing(u); setReviewAction(action); setReviewNotes('');
  }

  return (
    <div>
      <PageHeader title="Community Updates" subtitle="Farmer-submitted photo updates — separate from official Field Officer monitoring"/>

      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="p-6">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t.key ? 'bg-white shadow-sm text-[var(--admin-primary)]' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : updates.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
            Nothing here right now.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {updates.map(u => (
              <div key={u.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <img src={u.photoUrl} alt="" className="w-full h-40 object-cover"/>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{CATEGORY_LABELS[u.category] || u.category}</span>
                    <span className="text-gray-400 text-xs">{new Date(u.submittedAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="text-gray-500 text-xs">{u.farmer?.fullName} · {u.farmer?.mobile}</div>
                  {u.land && <div className="text-gray-400 text-xs">Survey {u.land.surveyGutNumber}</div>}
                  {u.notes && <p className="text-gray-600 text-xs mt-2">{u.notes}</p>}
                  <div className="flex items-center gap-3 mt-2 text-gray-400 text-[11px]">
                    {u.gpsLatitude && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {u.gpsLatitude.toFixed(3)}, {u.gpsLongitude.toFixed(3)}</span>
                    )}
                    {u.deviceInfo && <span className="flex items-center gap-1 truncate"><Smartphone className="w-3 h-3"/> logged</span>}
                  </div>
                  {u.reviewNotes && <p className="text-gray-400 text-xs mt-2 italic">Note: {u.reviewNotes}</p>}

                  {tab === 'PENDING' && (
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => act(u.id, 'APPROVE')}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-green-50 hover:bg-green-100 text-green-700 rounded-lg py-2">
                        <CheckCircle className="w-3.5 h-3.5"/> Approve
                      </button>
                      <button onClick={() => openReview(u, 'REJECT')}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg py-2">
                        <XCircle className="w-3.5 h-3.5"/> Reject
                      </button>
                      <button onClick={() => openReview(u, 'REQUEST_NEW_PHOTO')} title="Request a new photo"
                        className="text-blue-500 hover:text-blue-700 p-2">
                        <RotateCcw className="w-4 h-4"/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h2 className="font-bold text-gray-900 mb-1">
              {reviewAction === 'REJECT' ? 'Reject update' : 'Request a new photo'}
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              {reviewAction === 'REJECT' ? 'Let the farmer know why this was rejected.' : 'Tell the farmer what needs to be re-submitted.'}
            </p>
            <textarea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40"
              placeholder="Reason / notes for the farmer"/>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReviewing(null)} className="px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={() => act(reviewing.id, reviewAction!, reviewNotes)}
                className="px-5 py-2 text-sm font-semibold bg-[var(--admin-primary)] hover:opacity-90 text-white rounded-lg">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
