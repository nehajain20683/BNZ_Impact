'use client';
// src/app/farmer/documents/page.tsx
// A farmer is one entity that can own many lands. Farmer-level identity
// documents (Aadhaar/PAN/Cancelled Cheque) are separate from per-land
// documents (7/12, Land Record, etc.) — each land has its own independent
// approval track, so its documents must be tied to that specific landId.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload, CheckCircle, Clock, XCircle, FileText,
  ChevronLeft, Trash2, Eye, AlertCircle, LogOut, Lock, MapPin, Send, Download
} from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';
import { FARMER_DOC_TYPES, LAND_DOC_TYPES } from '@/lib/farmer-constants';
import { openDataUrlInNewTab } from '@/lib/open-data-url';

const AGREEMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  SHARED:       { color: 'text-blue-600 bg-blue-50 border-blue-200',   label: 'New — Please Review' },
  ACKNOWLEDGED: { color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Reviewed — Signature Pending' },
  SIGNED:       { color: 'text-green-600 bg-green-50 border-green-200', label: 'Signed — Awaiting Approval' },
  COMPLETED:    { color: 'text-green-700 bg-green-100 border-green-300', label: 'Completed ✓' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  PENDING:  { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock,        label: 'Under Review' },
  VERIFIED: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle,  label: 'Verified ✓' },
  REJECTED: { color: 'text-red-600 bg-red-50 border-red-200',       icon: XCircle,      label: 'Rejected' },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Display state for an agreement. The landowner consent declaration has a
// richer lifecycle than the generic statuses (recorded → signature requested
// → signed → verified/rejected), so it gets its own labels.
function agreementDisplay(a: any): { color: string; label: string } {
  if (a.agreementType === 'LANDOWNER_CONSENT') {
    if (a.status === 'COMPLETED' && a.verificationStatus === 'VERIFIED') return { color: 'text-green-700 bg-green-100 border-green-300', label: 'Signature verified ✓' };
    if (a.verificationStatus === 'REJECTED') return { color: 'text-red-600 bg-red-50 border-red-200', label: 'Signed copy rejected — please re-upload' };
    if (a.status === 'SIGNED') return { color: 'text-green-600 bg-green-50 border-green-200', label: 'Signed — awaiting verification' };
    if (a.signatureRequestedAt) return { color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Signature requested' };
    return { color: 'text-green-700 bg-green-50 border-green-200', label: 'Consent recorded ✓' };
  }
  return AGREEMENT_STATUS_CONFIG[a.status] || AGREEMENT_STATUS_CONFIG.SHARED;
}

// Upload of a signed copy is offered once the farmer has reviewed the
// document. For the consent declaration it additionally requires that an
// admin has asked for a signature, and it is locked once verified.
function canUploadSigned(a: any): boolean {
  if (a.agreementType === 'LANDOWNER_CONSENT')
    return !!a.signatureRequestedAt && a.status !== 'SIGNED' && a.status !== 'COMPLETED';
  return a.status === 'ACKNOWLEDGED' || a.status === 'SHARED';
}

// A land photo or KML that came in through Land Details (or an officer
// visit) lives on the Land record, not as an uploaded document — so the
// Documents list used to show it as missing. This reads the Land record so
// it shows as provided no matter where in the dashboard it arrived.
const isDisplayable = (u?: string) => !!u && /^(data:image\/|https?:)/.test(u);
function landProvided(docKey: string, land: any): { sub: string; thumb?: string } | null {
  if (!land) return null;
  if (docKey === 'PLANTATION_PHOTO' && land.photos?.length > 0)
    return { sub: `${land.photos.length} photo${land.photos.length === 1 ? '' : 's'} on file`, thumb: isDisplayable(land.photos[0]) ? land.photos[0] : undefined };
  if (docKey === 'OTHER' && (land.kmlFileName || land.polygonGeoJson))
    return { sub: land.kmlFileName ? `KML file: ${land.kmlFileName}` : 'Boundary mapped from KML' };
  return null;
}

export default function FarmerDocumentsPage() {
  const org    = useOrgConfig();
  const router = useRouter();
  const [farmerId, setFarmerId]       = useState('');
  const [documents, setDocuments]     = useState<any[]>([]);
  const [lands, setLands]             = useState<any[]>([]);
  const [activeLandId, setActiveLandId] = useState<string>('');
  const [uploading, setUploading]     = useState<string | null>(null);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [loading, setLoading]         = useState(true);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [activeDocType, setActiveDocType] = useState('');
  const [activeDocScope, setActiveDocScope] = useState<'farmer'|'land'>('farmer');
  const [agreements, setAgreements] = useState<any[]>([]);
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('farmerId');
    if (!id) { router.push('/farmer/login'); return; }
    setFarmerId(id);
    loadAll(id);
  }, []);

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerMobile');
    router.push('/farmer/login');
  }

  async function loadAll(id: string) {
    setLoading(true);
    const [docsRes, landsRes, agreementsRes] = await Promise.all([
      fetch(`/api/farmer/documents?farmerId=${id}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/farmer/land?farmerId=${id}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/farmer/agreements?farmerId=${id}`).then(r => r.json()).catch(() => ({})),
    ]);
    setDocuments(docsRes.documents || []);
    const landList = landsRes.lands || [];
    setLands(landList);
    setActiveLandId(prev => prev || landList[0]?.id || '');
    // Only show documents Admin has actually shared — a GENERATED draft
    // that hasn't been sent yet stays internal to the admin panel.
    setAgreements((agreementsRes.agreements || []).filter((a: any) => a.status !== 'GENERATED'));
    setLoading(false);
  }

  async function acknowledgeAgreement(agreementId: string) {
    setAckLoading(agreementId);
    await fetch('/api/farmer/agreements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId, farmerId, action: 'acknowledge' }),
    });
    setAckLoading(null);
    await loadAll(farmerId);
  }

  async function uploadSignedCopy(agreementId: string, file: File) {
    if (file.size > 8 * 1024 * 1024) { setError('File too large. Maximum size is 8MB.'); return; }
    setAckLoading(agreementId);
    const signedPdfUrl = await fileToBase64(file);
    const res = await fetch('/api/farmer/agreements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId, farmerId, action: 'upload_signed', signedPdfUrl }),
    });
    setAckLoading(null);
    if (res.ok) { setSuccess('Signed copy uploaded — your admin will review it shortly.'); setTimeout(() => setSuccess(''), 4000); }
    else setError('Failed to upload. Please try again.');
    await loadAll(farmerId);
  }

  function getDocsForType(type: string, landId?: string) {
    return documents.filter(d => d.docType === type && (landId ? d.landId === landId : !d.landId));
  }

  function triggerUpload(docType: string, scope: 'farmer'|'land') {
    setActiveDocType(docType);
    setActiveDocScope(scope);
    setError('');
    setSuccess('');
    const config = scope === 'farmer' ? FARMER_DOC_TYPES : LAND_DOC_TYPES;
    if (fileInputRef.current) {
      fileInputRef.current.accept = config.find(d => d.key === docType)?.accept || 'image/*,application/pdf';
      fileInputRef.current.click();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeDocType || !farmerId) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    setUploading(activeDocType);
    setError('');

    try {
      const fileUrl = await fileToBase64(file);
      const res = await fetch('/api/farmer/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId,
          docType:  activeDocType,
          fileUrl,
          fileName: file.name,
          fileSize: file.size,
          landId:   activeDocScope === 'land' ? activeLandId : undefined,
        }),
      });

      const data = await res.json();
      const config = activeDocScope === 'farmer' ? FARMER_DOC_TYPES : LAND_DOC_TYPES;
      if (data.success) {
        setSuccess(`${config.find(d => d.key === activeDocType)?.label} uploaded successfully!`);
        await loadAll(farmerId);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(null);
      setActiveDocType('');
      e.target.value = '';
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Remove this document?')) return;
    await fetch('/api/farmer/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, farmerId }),
    });
    await loadAll(farmerId);
  }

  function DocumentCard({ docType, scope, landId }: { docType: typeof FARMER_DOC_TYPES[number] | typeof LAND_DOC_TYPES[number]; scope: 'farmer'|'land'; landId?: string }) {
    const uploaded = getDocsForType(docType.key, landId);
    const provided = scope === 'land' ? landProvided(docType.key, lands.find(l => l.id === landId)) : null;
    const hasAny = uploaded.length > 0 || !!provided;
    const isUploading = uploading === docType.key;
    const landLocked = scope === 'land' && !!lands.find(l => l.id === landId)?.verified;

    return (
      <div className="bg-white rounded-2xl border border-sage-100 shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                hasAny ? 'bg-green-100' : 'bg-sage-100'
              }`}>
                {hasAny
                  ? <CheckCircle className="w-5 h-5 text-green-600"/>
                  : <FileText className="w-5 h-5 text-sage-500"/>
                }
              </div>
              <div>
                <div className="font-semibold text-sage-900 text-sm">
                  {docType.label}
                  {docType.required && <span className="text-red-500 ml-0.5">*</span>}
                </div>
                <div className="text-sage-400 text-xs mt-0.5">{docType.hint}</div>
              </div>
            </div>

            {landLocked ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 flex-shrink-0" title="This land is approved and locked">
                <Lock className="w-3 h-3"/> Locked
              </span>
            ) : uploaded.every(d => d.status !== 'VERIFIED') && (
              <button
                onClick={() => triggerUpload(docType.key, scope)}
                disabled={isUploading}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0 ${
                  isUploading
                    ? 'bg-sage-100 text-sage-400'
                    : uploaded.length > 0
                      ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                      : 'bg-sage-700 text-white hover:bg-sage-800'
                }`}>
                <Upload className="w-3.5 h-3.5"/>
                {isUploading ? 'Uploading...' : uploaded.length > 0 ? 'Re-upload' : provided ? 'Add file' : 'Upload'}
              </button>
            )}
          </div>
        </div>

        {provided && (
          <div className="border-t border-sage-50 px-4 pb-3 pt-3">
            <div className="flex items-center gap-3 p-2.5 rounded-xl border text-green-700 bg-green-50 border-green-200">
              {provided.thumb
                ? <img src={provided.thumb} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>
                : <CheckCircle className="w-4 h-4 flex-shrink-0"/>}
              <div className="min-w-0">
                <div className="text-xs font-semibold">Provided ✓ <span className="font-normal opacity-80">· via Land Details</span></div>
                <div className="text-xs opacity-80 truncate">{provided.sub}</div>
              </div>
            </div>
          </div>
        )}

        {uploaded.length > 0 && (
          <div className="border-t border-sage-50 px-4 pb-4 pt-3 space-y-2">
            {uploaded.map(doc => {
              const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={doc.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${statusCfg.color}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <StatusIcon className="w-4 h-4 flex-shrink-0"/>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{doc.fileName || 'Document'}</div>
                      <div className="text-xs opacity-70">{statusCfg.label}</div>
                      {doc.status === 'REJECTED' && doc.rejectionReason && (
                        <div className="text-xs text-red-600 mt-0.5">Reason: {doc.rejectionReason}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                        <Eye className="w-3.5 h-3.5"/>
                      </a>
                    )}
                    {doc.status !== 'VERIFIED' && !landLocked && (
                      <button onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const farmerRequiredCount  = FARMER_DOC_TYPES.filter(d => d.required).length;
  const farmerUploadedCount  = FARMER_DOC_TYPES.filter(d => d.required && getDocsForType(d.key).length > 0).length;
  const farmerDone = farmerUploadedCount === farmerRequiredCount;

  const activeLand = lands.find(l => l.id === activeLandId);
  const landRequiredCount = LAND_DOC_TYPES.filter(d => d.required).length;
  const landUploadedCount = activeLandId ? LAND_DOC_TYPES.filter(d => d.required && getDocsForType(d.key, activeLandId).length > 0).length : 0;
  const landDone = landUploadedCount === landRequiredCount;

  return (
    <div className="min-h-screen bg-sage-50">
      {/* Header */}
      <div className="text-white px-4 py-4" style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/farmer/dashboard" className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5"/>
          </Link>
          {org.logoUrl && (
            <OrgLogo src={org.logoUrl} alt="" size="sm" badge/>
          )}
          <div>
            <div className="font-bold text-sm">Upload Documents</div>
            <div className="text-white/70 text-xs">{org.loaded ? org.name : ''} · Farmer Onboarding</div>
          </div>
          <button onClick={logout} aria-label="Sign Out"
            className="ml-auto text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" capture="environment" className="hidden" onChange={handleFileChange}/>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/>{error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0"/>{success}
          </div>
        )}

        {/* ── SHARED WITH YOU (admin-generated documents) ── */}
        {agreements.length > 0 && (
          <div>
            <h2 className="font-bold text-sage-900 text-sm mb-2 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5"/> Shared With You
            </h2>
            <div className="space-y-2">
              {agreements.map(a => {
                const cfg = agreementDisplay(a);
                return (
                  <div key={a.id} className={`bg-white rounded-2xl border p-4 ${cfg.color.split(' ')[2] || 'border-sage-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sage-900 text-sm truncate">{a.title}</div>
                        <div className="text-sage-400 text-xs mt-0.5">
                          Shared {a.sharedAt ? new Date(a.sharedAt).toLocaleDateString('en-IN') : new Date(a.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <a href={`/api/farmer/agreements/${a.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold bg-sage-100 hover:bg-sage-200 text-sage-700 px-3 py-2 rounded-xl">
                        <Download className="w-3.5 h-3.5"/> View / Download
                      </a>
                      {a.status === 'SHARED' && (
                        <button onClick={() => acknowledgeAgreement(a.id)} disabled={ackLoading === a.id}
                          className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-xl disabled:opacity-60"
                          style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
                          <CheckCircle className="w-3.5 h-3.5"/> {ackLoading === a.id ? 'Marking…' : 'Mark as Reviewed'}
                        </button>
                      )}
                      {canUploadSigned(a) && (
                        <label className="flex items-center gap-1.5 text-xs font-semibold border-2 px-3 py-2 rounded-xl cursor-pointer"
                          style={{ borderColor: (org.primaryColor || '#2d5a1b') + '60', color: org.primaryColor || '#2d5a1b' }}>
                          <Upload className="w-3.5 h-3.5"/> {ackLoading === a.id ? 'Uploading…' : 'Upload Signed Copy'}
                          <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden"
                            disabled={ackLoading === a.id}
                            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadSignedCopy(a.id, f); }}/>
                        </label>
                      )}
                    </div>
                    {canUploadSigned(a) && a.agreementType === 'LANDOWNER_CONSENT' && (
                      <p className="mt-2 text-xs text-sage-500">
                        Download and print this declaration, sign it (signature or thumb impression) with two witnesses, then upload a clear photo or PDF of the signed pages.
                      </p>
                    )}
                    {a.verificationStatus === 'REJECTED' && a.verificationNote && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <span className="font-semibold">Why it was sent back:</span> {a.verificationNote}
                      </div>
                    )}
                    {a.verificationStatus === 'VERIFIED' && a.verifiedAt && (
                      <p className="mt-2 text-xs text-green-700">Your signature was verified on {new Date(a.verifiedAt).toLocaleDateString('en-IN')}.</p>
                    )}
                    {a.signedPdfUrl && (
                      <div className="mt-2 pt-2 border-t border-sage-50">
                        <button type="button" onClick={() => { if (!openDataUrlInNewTab(a.signedPdfUrl)) window.open(a.signedPdfUrl, '_blank'); }}
                          className="text-xs text-sage-500 underline">
                          View your uploaded signed copy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FARMER DOCUMENTS (identity — one set, not per land) ── */}
        <div className="bg-white rounded-2xl border border-sage-100 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-sage-900">Your Identity Documents</span>
            <span className={`text-sm font-bold ${farmerDone ? 'text-green-600' : 'text-amber-600'}`}>
              {farmerUploadedCount}/{farmerRequiredCount} uploaded
            </span>
          </div>
          <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${farmerDone ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${(farmerUploadedCount / farmerRequiredCount) * 100}%` }}/>
          </div>
          <p className="text-sage-400 text-xs mt-2">These identify you as a person and only need to be uploaded once — verifying them completes your registration.</p>
        </div>

        {FARMER_DOC_TYPES.map(dt => <DocumentCard key={dt.key} docType={dt} scope="farmer"/>)}

        {/* ── LAND DOCUMENTS (per land parcel) ── */}
        <div className="pt-2">
          <h2 className="font-bold text-sage-900 text-sm mb-2">Land Documents</h2>
          {lands.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-sage-200 p-6 text-center">
              <MapPin className="w-8 h-8 text-sage-200 mx-auto mb-2"/>
              <p className="text-sage-500 text-sm">Add a land parcel first to upload its documents.</p>
              <Link href="/farmer/land" className="inline-block mt-2 text-xs font-bold px-4 py-2 rounded-xl text-white"
                style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
                Add Land Parcel
              </Link>
            </div>
          ) : (
            <>
              {lands.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  {lands.map((l, i) => (
                    <button key={l.id} onClick={() => setActiveLandId(l.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors ${
                        activeLandId === l.id ? '' : 'border-sage-100 text-sage-500'}`}
                      style={activeLandId === l.id ? { borderColor: org.primaryColor || '#2d5a1b', color: org.primaryColor || '#2d5a1b', backgroundColor: (org.primaryColor || '#2d5a1b') + '10' } : {}}>
                      Parcel #{i + 1}{l.verified ? ' 🔒' : ''}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-sage-100 p-4 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-sage-900">
                    {activeLand?.surveyGutNumber || 'This Parcel'}'s Documents
                  </span>
                  <span className={`text-sm font-bold ${landDone ? 'text-green-600' : 'text-amber-600'}`}>
                    {landUploadedCount}/{landRequiredCount} uploaded
                  </span>
                </div>
                <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${landDone ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${(landUploadedCount / landRequiredCount) * 100}%` }}/>
                </div>
                {activeLand?.verified && (
                  <div className="flex items-center gap-2 mt-2 text-gray-500 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5"/> This land is approved — documents are locked.
                  </div>
                )}
              </div>

              {activeLandId && LAND_DOC_TYPES.map(dt => <DocumentCard key={dt.key} docType={dt} scope="land" landId={activeLandId}/>)}
            </>
          )}
        </div>

        <div className="pb-6 pt-2">
          {farmerDone ? (
            <Link href="/farmer/dashboard"
              className="flex items-center justify-center gap-2 w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-4 rounded-2xl transition-colors">
              <CheckCircle className="w-5 h-5"/>
              Back to Dashboard
            </Link>
          ) : (
            <div className="text-center text-sage-400 text-sm py-2">
              Upload all required identity documents marked with <span className="text-red-500">*</span> to complete your registration
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
