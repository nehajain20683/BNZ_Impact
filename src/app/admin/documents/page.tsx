'use client';
// src/app/admin/documents/page.tsx
// Two genuinely different document workflows live under one "Documents"
// nav item: raw identity/land documents that need admin verification
// (Aadhaar, PAN, 7/12 extract...), and system-generated documents that get
// shared with and signed by a farmer (agreements, receipts, certificates).
// Kept as two tabs rather than one merged list — the actions, statuses,
// and even the record source (FarmerDocument vs FarmerAgreement) are
// unrelated, and mixing them would make neither workflow easy to scan.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/admin/PageHeader';
import { Eye, CheckCircle, Send, Clock, FileCheck, Trash2, X, Search, User, MapPin } from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  SHARED:       { color: 'bg-amber-100 text-amber-700', icon: Send,       label: 'Sent — Awaiting Farmer' },
  ACKNOWLEDGED: { color: 'bg-blue-100 text-blue-700',    icon: Clock,     label: 'Farmer Reviewed' },
  SIGNED:       { color: 'bg-teal-100 text-teal-700',    icon: FileCheck, label: 'Signed Copy Received' },
  COMPLETED:    { color: 'bg-green-100 text-green-700',  icon: CheckCircle, label: 'Approved' },
};

const TYPE_LABELS: Record<string, string> = {
  PARTICIPATION_AGREEMENT: 'Participation Agreement',
  JOINT_OWNER_NOC:         'Joint Owner NOC',
  PAYMENT_RECEIPT:         'Payment Receipt',
  SAPLING_RECEIPT:         'Sapling Receipt',
  PLANTATION_CERTIFICATE:  'Plantation Certificate',
};

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'SHARED', label: 'Awaiting Farmer' },
  { key: 'SIGNED', label: 'Needs Your Approval' },
  { key: 'COMPLETED', label: 'Completed' },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  AADHAAR: 'Aadhaar Card', PAN: 'PAN Card', CANCELLED_CHEQUE: 'Cancelled Cheque',
  LAND_7_12: '7/12 Extract', LAND_RECORD: 'Land Record', OWNERSHIP_PROOF: 'Ownership Proof',
  PROPERTY_TAX: 'Property Tax Receipt', CONSENT_LETTER: 'Consent Letter',
  PLANTATION_PHOTO: 'Land / Site Photo', OTHER: 'KML / Other',
};

export default function AdminDocumentsPage() {
  const [category, setCategory] = useState<'verification' | 'agreements'>('verification');

  return (
    <div>
      <PageHeader title="Documents" subtitle="Everything waiting on you — identity verification and generated documents, in one place"/>

      <div className="px-6 pt-6">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit mb-6">
          {[
            { key: 'verification', label: 'Identity & Land Verification' },
            { key: 'agreements',   label: 'Generated Agreements' },
          ].map(t => (
            <button key={t.key} onClick={() => setCategory(t.key as any)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                category === t.key ? 'bg-white shadow-sm text-[var(--admin-primary)]' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {category === 'verification' ? <VerificationQueue/> : <GeneratedAgreements/>}
    </div>
  );
}

// ── Identity & Land Verification — the queue that never existed before ──
function VerificationQueue() {
  const [status, setStatus] = useState('PENDING');
  const [scope, setScope] = useState('');
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [preview, setPreview] = useState<any>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({ status });
    if (scope) qs.set('scope', scope);
    if (search) qs.set('search', search);
    const res = await fetch(`/api/admin/documents/queue?${qs}`);
    const data = await res.json();
    setDocs(data.documents || []);
    setStatusCounts(data.statusCounts || {});
    setLoading(false);
  }
  useEffect(() => { load(); }, [status, scope]);

  async function act(doc: any, action: 'VERIFY' | 'REJECT', reason?: string) {
    setBusyId(doc.id);
    const res = await fetch(`/api/admin/documents/${doc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejectionReason: reason }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) { showToast(data.error || 'Failed to update'); return; }
    showToast(action === 'VERIFY' ? 'Document verified ✓' : 'Document rejected');
    setRejectTarget(null); setRejectReason('');
    load();
  }

  // Grouped: identity docs (landId null) collapse to one row per farmer per
  // doc type, land docs group under their specific parcel — a farmer with
  // three land parcels should never have their paperwork blended together.
  const identityDocs = docs.filter(d => !d.landId);
  const landDocs = docs.filter(d => d.landId);
  const landGroups: Record<string, { land: any; farmer: any; docs: any[] }> = {};
  for (const d of landDocs) {
    const key = d.land?.id || 'unknown';
    if (!landGroups[key]) landGroups[key] = { land: d.land, farmer: d.farmer, docs: [] };
    landGroups[key].docs.push(d);
  }

  return (
    <div className="p-6 pt-0">
      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { key: 'PENDING', label: `Pending (${statusCounts.PENDING || 0})` },
            { key: 'VERIFIED', label: 'Verified' },
            { key: 'REJECTED', label: 'Rejected' },
            { key: 'ALL', label: 'All' },
          ].map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                status === t.key ? 'bg-white shadow-sm text-[var(--admin-primary)]' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={scope} onChange={e => setScope(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="">Identity + Land</option>
          <option value="identity">Identity Only</option>
          <option value="land">Land Only</option>
        </select>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search farmer name…" className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl"/>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500 text-sm">
          No {status === 'PENDING' ? 'pending' : status.toLowerCase()} documents right now.
        </div>
      ) : (
        <div className="space-y-8">
          {identityDocs.length > 0 && scope !== 'land' && (
            <div>
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Identity Documents</h3>
              <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
                {identityDocs.map(d => (
                  <DocRow key={d.id} d={d} busyId={busyId} onView={() => setPreview(d)} onVerify={() => act(d, 'VERIFY')} onReject={() => setRejectTarget(d)}/>
                ))}
              </div>
            </div>
          )}

          {Object.keys(landGroups).length > 0 && scope !== 'identity' && (
            <div>
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Land Documents — grouped per parcel</h3>
              <div className="space-y-4">
                {Object.entries(landGroups).map(([key, g]) => (
                  <div key={key} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-800 text-sm">{g.farmer?.fullName}</span>
                        <span className="text-gray-400 text-xs ml-2">Survey: {g.land?.surveyGutNumber || '—'} · {g.land?.village || '—'}</span>
                      </div>
                      <Link href={`/admin/farmers/${g.farmer?.id}`} className="text-xs text-[var(--admin-primary)] hover:underline font-medium">View Farmer →</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {g.docs.map(d => (
                        <DocRow key={d.id} d={d} busyId={busyId} onView={() => setPreview(d)} onVerify={() => act(d, 'VERIFY')} onReject={() => setRejectTarget(d)} hideFarmerName/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 text-sm">Reject Document</h3>
              <button onClick={() => setRejectTarget(null)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <p className="text-gray-500 text-xs mb-3">{DOC_TYPE_LABELS[rejectTarget.docType] || rejectTarget.docType} — {rejectTarget.farmer?.fullName}</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Why is this being rejected? The farmer will see this."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3"/>
            <button onClick={() => rejectReason && act(rejectTarget, 'REJECT', rejectReason)} disabled={!rejectReason || busyId === rejectTarget.id}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50">
              Reject Document
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 text-sm">{DOC_TYPE_LABELS[preview.docType] || preview.docType}</h3>
              <button onClick={() => setPreview(null)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            {preview.fileUrl?.startsWith('data:application/pdf') || preview.fileName?.endsWith('.pdf') ? (
              <a href={preview.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--admin-primary)] text-sm underline">Open PDF in new tab →</a>
            ) : (
              <img src={preview.fileUrl} alt="" className="w-full rounded-xl"/>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({ d, busyId, onView, onVerify, onReject, hideFarmerName }: any) {
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const looksLikeKml = /\.(kml|kmz)$/i.test(d.fileName || '');

  async function parseBoundary() {
    setParsing(true);
    setParseResult(null);
    const res = await fetch(`/api/admin/lands/${d.landId}/parse-kml`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: d.id }),
    });
    const data = await res.json();
    setParsing(false);
    setParseResult(res.ok
      ? { ok: true, msg: `Boundary saved — ${data.pointCount} points` }
      : { ok: false, msg: data.error || 'Failed to parse' });
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {d.fileUrl && !d.fileUrl.startsWith('data:application/pdf') && !looksLikeKml ? (
          <img src={d.fileUrl} alt="" className="w-full h-full object-cover"/>
        ) : <FileCheck className="w-4 h-4 text-gray-400"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{DOC_TYPE_LABELS[d.docType] || d.docType}{looksLikeKml && <span className="text-gray-400 font-normal"> — {d.fileName}</span>}</div>
        {!hideFarmerName && <div className="text-gray-400 text-xs">{d.farmer?.fullName} · {d.farmer?.farmerIdGenerated || d.farmer?.mobile}</div>}
        <div className="text-gray-400 text-[11px]">{new Date(d.createdAt).toLocaleDateString('en-IN')}</div>
        {parseResult && (
          <div className={`text-[11px] mt-1 font-medium ${parseResult.ok ? 'text-green-600' : 'text-red-500'}`}>{parseResult.msg}</div>
        )}
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
        d.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : d.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
        {d.status}
      </span>
      <div className="flex items-center gap-2 text-xs flex-shrink-0">
        <button onClick={onView} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 font-medium"><Eye className="w-3.5 h-3.5"/> View</button>
        {d.status === 'PENDING' && (
          <>
            <button onClick={onVerify} disabled={busyId === d.id} className="flex items-center gap-1 text-white bg-green-600 hover:bg-green-700 rounded-lg px-2.5 py-1.5 font-medium disabled:opacity-60">
              <CheckCircle className="w-3.5 h-3.5"/> Verify
            </button>
            <button onClick={onReject} disabled={busyId === d.id} className="text-red-500 hover:underline font-medium px-1">Reject</button>
          </>
        )}
        {d.status === 'VERIFIED' && looksLikeKml && d.landId && (
          <button onClick={parseBoundary} disabled={parsing}
            className="flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-2.5 py-1.5 font-medium disabled:opacity-60">
            {parsing ? 'Parsing…' : '🗺️ Parse Boundary'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Generated Agreements — unchanged from before, just relocated under its own tab ──
function GeneratedAgreements() {
  const [statusTab, setStatusTab] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const qs = typeFilter ? `?agreementType=${typeFilter}` : '';
    const res = await fetch(`/api/admin/agreements${qs}`);
    const data = await res.json();
    setDocs(data.agreements || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [typeFilter]);

  async function approve(id: string) {
    setBusyId(id);
    const res = await fetch('/api/admin/agreements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId: id, status: 'COMPLETED' }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) { showToast(data.error || 'Failed to approve'); return; }
    showToast('Document approved ✓');
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this document? It will also disappear from the farmer\'s own view.')) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/agreements?agreementId=${id}`, { method: 'DELETE' });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) { showToast(data.error || 'Failed to delete'); return; }
    showToast('Document deleted ✓');
    load();
  }

  const filtered = statusTab ? docs.filter(d => d.status === statusTab) : docs;

  return (
    <div className="p-6 pt-0">
      {toast && <div className="fixed top-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                statusTab === t.key ? 'bg-white shadow-sm text-[var(--admin-primary)]' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="">All Document Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
          No documents {statusTab ? `in "${STATUS_TABS.find(t => t.key === statusTab)?.label}"` : 'generated yet'}.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>{['Farmer', 'Land Parcel', 'Type', 'Generated', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((d: any) => {
                const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.SHARED;
                const StatusIcon = cfg.icon;
                return (
                  <tr key={d.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{d.farmer?.fullName}</div>
                      <div className="text-gray-400 text-xs">{d.farmer?.farmerIdGenerated || d.farmer?.mobile}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.land ? `${d.land.surveyGutNumber || '—'} · ${d.land.village || '—'}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{TYPE_LABELS[d.agreementType] || d.agreementType}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3"/> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <a href={`/api/farmer/agreements/${d.id}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[var(--admin-primary)] hover:underline font-medium">
                          <Eye className="w-3 h-3"/> View
                        </a>
                        {d.signedPdfUrl && (
                          <a href={d.signedPdfUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-teal-600 hover:underline font-medium">
                            <FileCheck className="w-3 h-3"/> Signed Copy
                          </a>
                        )}
                        {d.status === 'SIGNED' && (
                          <button onClick={() => approve(d.id)} disabled={busyId === d.id}
                            className="flex items-center gap-1 text-white bg-green-600 hover:bg-green-700 rounded-lg px-2 py-1 font-medium disabled:opacity-60">
                            <CheckCircle className="w-3 h-3"/> Approve
                          </button>
                        )}
                        <button onClick={() => remove(d.id)} disabled={busyId === d.id}
                          className="flex items-center gap-1 text-red-500 hover:underline font-medium disabled:opacity-50">
                          <Trash2 className="w-3 h-3"/> Delete
                        </button>
                        <Link href={`/admin/farmers/${d.farmerId}`} className="text-gray-400 hover:text-gray-600 hover:underline">
                          View Farmer →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
