'use client';
// src/app/farmer/documents/page.tsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload, CheckCircle, Clock, XCircle, FileText,
  ChevronLeft, Trash2, Eye, AlertCircle
} from 'lucide-react';

const DOC_TYPES = [
  { key: 'AADHAAR',        label: 'Aadhaar Card',          required: true,  accept: 'image/*,application/pdf', hint: 'Front and back of Aadhaar card' },
  { key: 'LAND_7_12',      label: '7/12 Extract',          required: true,  accept: 'image/*,application/pdf', hint: 'Satbara Utara / Land Record extract' },
  { key: 'LAND_RECORD',    label: 'Land Record',           required: true,  accept: 'image/*,application/pdf', hint: 'Official land ownership record' },
  { key: 'OWNERSHIP_PROOF',label: 'Ownership Proof',       required: true,  accept: 'image/*,application/pdf', hint: 'Any document proving land ownership' },
  { key: 'PROPERTY_TAX',   label: 'Property Tax Receipt',  required: false, accept: 'image/*,application/pdf', hint: 'Latest property tax payment receipt' },
  { key: 'CANCELLED_CHEQUE',label: 'Cancelled Cheque',     required: false, accept: 'image/*,application/pdf', hint: 'For bank account verification' },
  { key: 'CONSENT_LETTER', label: 'Consent Letter',        required: false, accept: 'image/*,application/pdf', hint: 'Signed consent for plantation' },
  { key: 'PLANTATION_PHOTO',label: 'Land / Site Photo',    required: false, accept: 'image/*',                 hint: 'Current photo of your land' },
  { key: 'OTHER',            label: 'Google Earth / KML File', required: false, accept: '.kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,image/*,application/pdf', hint: 'KML/KMZ boundary file from Google Earth — shows your land polygon' },
  { key: 'PAN',              label: 'PAN Card',              required: false, accept: 'image/*,application/pdf', hint: 'PAN card for 80G tax benefit' },
];

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  PENDING:  { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock,        label: 'Under Review' },
  VERIFIED: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle,  label: 'Verified ✓' },
  REJECTED: { color: 'text-red-600 bg-red-50 border-red-200',       icon: XCircle,      label: 'Rejected' },
};

export default function FarmerDocumentsPage() {
  const router = useRouter();
  const [farmerId, setFarmerId]       = useState('');
  const [documents, setDocuments]     = useState<any[]>([]);
  const [uploading, setUploading]     = useState<string | null>(null);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [loading, setLoading]         = useState(true);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [activeDocType, setActiveDocType] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('farmerId');
    if (!id) { router.push('/farmer/register'); return; }
    setFarmerId(id);
    loadDocuments(id);
  }, []);

  async function loadDocuments(id: string) {
    setLoading(true);
    const res = await fetch(`/api/farmer/documents?farmerId=${id}`);
    const data = await res.json();
    setDocuments(data.documents || []);
    setLoading(false);
  }

  function getDocsForType(type: string) {
    return documents.filter(d => d.docType === type);
  }

  function triggerUpload(docType: string) {
    setActiveDocType(docType);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.accept = DOC_TYPES.find(d => d.key === docType)?.accept || 'image/*,application/pdf';
      fileInputRef.current.click();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeDocType || !farmerId) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    setUploading(activeDocType);
    setError('');

    try {
      // Convert file to base64 for simple storage
      // In production this would upload to S3/Supabase Storage
      const base64 = await fileToBase64(file);

      // For now store as base64 data URL
      // In production: upload to Supabase Storage first, then save URL
      const fileUrl = base64;

      const res = await fetch('/api/farmer/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId,
          docType:  activeDocType,
          fileUrl,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`${DOC_TYPES.find(d => d.key === activeDocType)?.label} uploaded successfully!`);
        await loadDocuments(farmerId);
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
    await loadDocuments(farmerId);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const requiredCount  = DOC_TYPES.filter(d => d.required).length;
  const uploadedRequired = DOC_TYPES.filter(d =>
    d.required && getDocsForType(d.key).length > 0
  ).length;
  const allRequiredDone = uploadedRequired === requiredCount;

  return (
    <div className="min-h-screen bg-sage-50">
      {/* Header */}
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/farmer/dashboard" className="text-sage-400 hover:text-white">
            <ChevronLeft className="w-5 h-5"/>
          </Link>
          <div>
            <div className="font-bold text-sm">Upload Documents</div>
            <div className="text-sage-300 text-xs">JITO Green Legacy · Farmer Onboarding</div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-sage-100 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-sage-900">Required Documents</span>
            <span className={`text-sm font-bold ${allRequiredDone ? 'text-green-600' : 'text-amber-600'}`}>
              {uploadedRequired}/{requiredCount} uploaded
            </span>
          </div>
          <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allRequiredDone ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${(uploadedRequired / requiredCount) * 100}%` }}
            />
          </div>
          {allRequiredDone && (
            <div className="flex items-center gap-2 mt-2 text-green-600 text-xs font-semibold">
              <CheckCircle className="w-4 h-4"/>
              All required documents uploaded! Our team will review shortly.
            </div>
          )}
        </div>

        {/* Alerts */}
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

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">📋 Upload Instructions</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Supported formats: JPG, PNG, PDF</li>
            <li>Maximum file size: 5MB per document</li>
            <li>Ensure documents are clear and readable</li>
            <li>Documents marked with <span className="text-red-500">*</span> are mandatory</li>
          </ul>
        </div>

        {/* Document cards */}
        {DOC_TYPES.map(docType => {
          const uploaded = getDocsForType(docType.key);
          const isUploading = uploading === docType.key;

          return (
            <div key={docType.key} className="bg-white rounded-2xl border border-sage-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      uploaded.length > 0 ? 'bg-green-100' : 'bg-sage-100'
                    }`}>
                      {uploaded.length > 0
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

                  {/* Upload button */}
                  {uploaded.every(d => d.status !== 'VERIFIED') && (
                    <button
                      onClick={() => triggerUpload(docType.key)}
                      disabled={isUploading}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0 ${
                        isUploading
                          ? 'bg-sage-100 text-sage-400'
                          : uploaded.length > 0
                            ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                            : 'bg-sage-700 text-white hover:bg-sage-800'
                      }`}>
                      <Upload className="w-3.5 h-3.5"/>
                      {isUploading ? 'Uploading...' : uploaded.length > 0 ? 'Re-upload' : 'Upload'}
                    </button>
                  )}
                </div>
              </div>

              {/* Uploaded files */}
              {uploaded.length > 0 && (
                <div className="border-t border-sage-50 px-4 pb-4 pt-3 space-y-2">
                  {uploaded.map(doc => {
                    const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDING;
                    const StatusIcon = statusCfg.icon;
                    const isImage = doc.fileUrl?.startsWith('data:image') || doc.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

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
                          {/* Preview */}
                          {isImage && doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                              <Eye className="w-3.5 h-3.5"/>
                            </a>
                          )}
                          {/* Delete (only if not verified) */}
                          {doc.status !== 'VERIFIED' && (
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
        })}

        {/* Submit button */}
        <div className="pb-6">
          {allRequiredDone ? (
            <Link href="/farmer/dashboard"
              className="flex items-center justify-center gap-2 w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-4 rounded-2xl transition-colors">
              <CheckCircle className="w-5 h-5"/>
              Documents Submitted — Go to Dashboard
            </Link>
          ) : (
            <div className="text-center text-sage-400 text-sm py-2">
              Upload all required documents marked with <span className="text-red-500">*</span> to proceed
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
