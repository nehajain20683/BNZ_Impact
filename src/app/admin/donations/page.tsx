'use client';
// src/app/admin/donations/page.tsx
// Org-aware: bank details, tree price and ref prefix come from org config
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DollarSign, Plus, Search, Download, Trash2, X, CheckCircle, MoreVertical, Eye, Mail, Loader2, Upload, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

function RowActions({ d, onEmailed, onDelete }: { d: any; onEmailed: (msg: string) => void; onDelete: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.right + window.scrollX - 208 }); // 208px = menu width
    }
    setOpen(o => !o);
  }

  async function emailDocuments() {
    if (!d.donorEmail) { onEmailed('No email on file for this donor'); return; }
    setSending(true);
    const res = await fetch('/api/admin/donations/send-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donationId: d.id, type: 'certificate' }),
    });
    const data = await res.json();
    setSending(false);
    setOpen(false);
    onEmailed(res.ok ? `Emailed to ${d.donorEmail} ✓` : (data.error || 'Failed to send email'));
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
        <MoreVertical className="w-4 h-4"/>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef} style={{ position: 'absolute', top: pos.top, left: pos.left, width: 208 }}
          className="bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 text-xs">
          <a href={`/api/certificates/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
            <Eye className="w-3.5 h-3.5 text-gray-400"/> View Certificate
          </a>
          <a href={`/api/receipts/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
            <Eye className="w-3.5 h-3.5 text-gray-400"/> View Receipt
          </a>
          <div className="h-px bg-gray-100 my-1"/>
          <button onClick={emailDocuments} disabled={sending}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 text-left disabled:opacity-60">
            {sending ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin"/> : <Mail className="w-3.5 h-3.5 text-gray-400"/>}
            Email Receipt &amp; Certificate
          </button>
          <div className="h-px bg-gray-100 my-1"/>
          <button onClick={() => { setOpen(false); onDelete(d.id, d.donorName); }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-500 text-left">
            <Trash2 className="w-3.5 h-3.5"/> Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40";

const STATUS_COLOR: Record<string,string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING:   'bg-amber-100 text-amber-700',
  FAILED:    'bg-red-100 text-red-700',
};

// Minimal CSV parser — handles quoted fields with embedded commas, good
// enough for admin-uploaded spreadsheets without adding a new dependency.
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  function parseLine(line: string): string[] {
    const cells: string[] = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur); cur = '';
      } else cur += ch;
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map(line => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

const SAMPLE_CSV = 'donorName,donorEmail,donorMobile,numberOfTrees,amount,campaignSlug,donationDate,paymentMode,notes\nRamesh Shah,ramesh@example.com,9876543210,108,54000,individual,15/03/2025,BANK_TRANSFER,Migrated from old system';

function BulkImportModal({ campaigns, onClose, onSave }: any) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(''); setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result));
      if (parsed.length === 0) { setError('No valid rows found in this file'); return; }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (rows.length === 0) return;
    setImporting(true); setError(''); setResult(null);
    setProgress({ done: 0, total: rows.length });

    // Client-side batching so a very large file (thousands of rows) doesn't
    // hang in one giant request — send in chunks of 500 and accumulate results.
    const CHUNK = 500;
    let imported = 0, failed = 0;
    const allResults: any[] = [];

    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK).map(r => ({
        donorName: r.donorname, donorEmail: r.donoremail, donorMobile: r.donormobile,
        numberOfTrees: r.numberoftrees, amount: r.amount, campaignSlug: r.campaignslug,
        donationDate: r.donationdate, paymentMode: r.paymentmode, notes: r.notes,
      }));
      const res = await fetch('/api/admin/donations/bulk-import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: slice }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Import failed'); setImporting(false); return; }
      imported += data.imported; failed += data.failed;
      allResults.push(...data.results);
      setProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
    }

    setImporting(false);
    setResult({ imported, failed, results: allResults });
    if (imported > 0) onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">Bulk Import Historical Donations</h3>
            <p className="text-gray-400 text-xs mt-0.5">Creates real Donation + Tree records — imported trees behave exactly like any other donation</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/> {error}
            </div>
          )}

          {!result && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <strong>Expected columns:</strong> donorName* (required), donorEmail, donorMobile, numberOfTrees* (required),
                amount (auto-calculated if blank), campaignSlug (defaults to "individual"), donationDate (DD/MM/YYYY),
                paymentMode, notes.{' '}
                <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`} download="donation-import-sample.csv"
                  className="underline font-semibold">Download sample CSV</a>
              </div>

              <label className="border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center justify-center gap-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer">
                <Upload className="w-6 h-6 text-gray-300"/>
                {fileName || 'Click to select a CSV file'}
                <input type="file" accept=".csv" className="hidden" onChange={handleFile}/>
              </label>

              {rows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{rows.length} rows found — preview of first 5:</p>
                  <div className="border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50"><tr>
                        {Object.keys(rows[0]).map(h => <th key={h} className="px-2 py-1.5 text-left text-gray-500 whitespace-nowrap">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {rows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(r).map((v, j) => <td key={j} className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{v || '—'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importing && (
                <div className="text-center text-sm text-gray-500">Importing {progress.done} / {progress.total}…</div>
              )}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-green-700 text-xl">{result.imported}</div>
                  <div className="text-green-600 text-xs">Imported</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-red-700 text-xl">{result.failed}</div>
                  <div className="text-red-600 text-xs">Failed</div>
                </div>
              </div>
              {result.failed > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl">
                  {result.results.filter((r: any) => !r.success).map((r: any) => (
                    <div key={r.row} className="px-3 py-2 border-b last:border-0 text-xs">
                      <span className="font-semibold text-gray-700">Row {r.row + 1}:</span> <span className="text-red-600">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={runImport} disabled={rows.length === 0 || importing}
              className="flex-1 bg-[var(--admin-primary)] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {importing ? 'Importing…' : `Import ${rows.length || ''} Donations`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualEntryModal({ orgConfig, campaigns, onClose, onSave }: any) {
  const [form, setForm] = useState({
    donorName:'', certificateName:'', donorEmail:'', donorMobile:'',
    donorPan:'', donorChapter:'', dedicationName:'',
    numberOfTrees:'11', amount:'', campaignSlug:'individual',
    paymentMode:'CASH', paymentBank:'', paymentRef:'', chequeNumber:'', notes:'',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const f = (k: string) => (e: any) => {
    const val = e.target.value;
    setForm(p => {
      const next = { ...p, [k]: val };
      if (k === 'numberOfTrees' && !p.amount)
        next.amount = String(parseInt(val||'0') * (orgConfig?.tree_price || 500));
      return next;
    });
  };

  const banks: any[] = orgConfig?.payment_banks || [];

  async function save() {
    if (!form.donorName) { setError('Donor name required'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/admin/donations', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setSuccess(`✓ Donation saved — ${data.refId}`);
      setTimeout(() => { onSave(); onClose(); }, 1500);
    } else setError(data.error || 'Failed');
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl my-4">
        <div className="bg-[var(--admin-primary)] text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="font-bold">Add Manual Donation</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white/50"/></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {error   && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-600 text-sm p-3 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4"/>{success}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Donor Name *</label>
              <input value={form.donorName} onChange={f('donorName')} className={inp}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Name on Certificate</label>
              <input value={form.certificateName} onChange={f('certificateName')} className={inp} placeholder="Same as donor"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" value={form.donorEmail} onChange={f('donorEmail')} className={inp}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
              <input value={form.donorMobile} onChange={f('donorMobile')} className={inp}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">PAN</label>
              <input value={form.donorPan} onChange={f('donorPan')} className={inp} placeholder="For 80G"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Chapter / Group</label>
              <input value={form.donorChapter} onChange={f('donorChapter')} className={inp}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Dedication Name</label>
              <input value={form.dedicationName} onChange={f('dedicationName')} className={inp}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Campaign</label>
              <select value={form.campaignSlug} onChange={f('campaignSlug')} className={inp}>
                {campaigns.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Trees</label>
              <input type="number" value={form.numberOfTrees} onChange={f('numberOfTrees')} className={inp}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={f('amount')} className={inp}
                placeholder={`₹${(parseInt(form.numberOfTrees||'11') * (orgConfig?.tree_price||500)).toLocaleString('en-IN')}`}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode</label>
              <select value={form.paymentMode} onChange={f('paymentMode')} className={inp}>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="NEFT">NEFT / IMPS</option>
                <option value="UPI">UPI</option>
                <option value="ONLINE">Online / Razorpay</option>
              </select></div>
            {banks.length > 0 && (
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Bank</label>
                <select value={form.paymentBank} onChange={f('paymentBank')} className={inp}>
                  <option value="">Select bank</option>
                  {banks.map((b: any) => (
                    <option key={b.account} value={b.name}>{b.name} — A/C {b.account}</option>
                  ))}
                </select>
                {form.paymentBank && (
                  <p className="text-xs text-gray-400 mt-1">
                    {banks.find((b: any) => b.name === form.paymentBank)?.holder}
                  </p>
                )}
              </div>
            )}
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">
              {form.paymentMode === 'CHEQUE' ? 'Cheque No.' : 'UTR / Ref No.'}
            </label>
              <input value={form.paymentMode === 'CHEQUE' ? form.chequeNumber : form.paymentRef}
                onChange={f(form.paymentMode === 'CHEQUE' ? 'chequeNumber' : 'paymentRef')} className={inp}/></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={f('notes')} className={inp} rows={2}/></div>
        </div>
        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[var(--admin-primary)] hover:opacity-90 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Saving…' : 'Save Donation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDonationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [donations, setDonations] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [orgConfig, setOrgConfig] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showManual, setShowManual]     = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [toast, setToast]         = useState('');
  const [total, setTotal]         = useState(0);
  const role = (session?.user as any)?.role;

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!['ADMIN','SUPER_ADMIN'].includes(role)) { router.push('/'); return; }
    // Load org config and campaigns in parallel
    Promise.all([
      fetch('/api/admin/org-config').then(r => r.json()),
      fetch('/api/admin/campaigns').then(r => r.json()).catch(() => ({ campaigns: [] })),
    ]).then(([orgData, campData]) => {
      if (orgData.org) setOrgConfig(orgData.org);
      setCampaigns(campData.campaigns || []);
    });
    load();
  }, [status, role]);

  async function load(s = search, fs = filterStatus) {
    setLoading(true);
    const params = new URLSearchParams();
    if (s)  params.set('search', s);
    if (fs) params.set('status', fs);
    const res  = await fetch(`/api/admin/donations?${params}`);
    const data = await res.json();
    setDonations(data.donations || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((window as any)._donSearch);
    (window as any)._donSearch = setTimeout(() => load(val, filterStatus), 400);
  }

  async function deleteDonation(id: string, name: string) {
    if (!confirm(`Delete donation from ${name}?`)) return;
    const res  = await fetch('/api/admin/donations', {
      method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ donationId: id }),
    });
    if ((await res.json()).success) { showToast('Deleted'); load(); }
  }

  const totalAmount = donations.filter(d => d.paymentStatus === 'COMPLETED').reduce((s, d) => s + d.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--admin-primary)] text-white px-5 py-3 rounded-xl shadow-lg text-sm">✓ {toast}</div>
      )}
      {showManual && (
        <ManualEntryModal
          orgConfig={orgConfig}
          campaigns={campaigns}
          onClose={() => setShowManual(false)}
          onSave={() => { load(); showToast('Donation saved ✓'); }}
        />
      )}
      {showBulkImport && (
        <BulkImportModal
          campaigns={campaigns}
          onClose={() => setShowBulkImport(false)}
          onSave={() => { load(); showToast('Import complete ✓'); }}
        />
      )}

      <PageHeader title="Donations" subtitle={`${total} total · ₹${totalAmount.toLocaleString('en-IN')} collected`}>
        <button onClick={() => window.open('/api/admin/export-csv?type=donations','_blank')}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs hover:bg-gray-50">
          <Download className="w-3.5 h-3.5"/> Export CSV
        </button>
        <button onClick={() => setShowBulkImport(true)}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs hover:bg-gray-50">
          <Upload className="w-3.5 h-3.5"/> Bulk Import
        </button>
        <button onClick={() => setShowManual(true)}
          className="flex items-center gap-2 bg-[var(--admin-primary)] hover:opacity-90 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4"/> Add Entry
        </button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Org bank details */}
        {orgConfig?.payment_banks?.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2">Bank Accounts for Offline Payments</p>
            <div className="flex gap-4 flex-wrap">
              {(orgConfig.payment_banks as any[]).map((b: any) => (
                <div key={b.account} className="text-xs text-blue-600">
                  <span className="font-bold">{b.name}</span> — A/C {b.account}
                  {b.holder && <span className="text-blue-400"> · {b.holder}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, email, mobile, ref ID…"
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40 bg-white"/>
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); load(search, e.target.value); }}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40">
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Ref ID','Donor','Campaign','Trees','Amount','Mode','Status','Date','Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : donations.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12">
                  <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2"/>
                  <p className="text-gray-400">No donations yet</p>
                  <button onClick={() => setShowManual(true)} className="text-[var(--admin-primary)] text-sm hover:underline mt-1">Add first donation →</button>
                </td></tr>
              ) : donations.map(d => (
                <tr key={d.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-[var(--admin-primary)] font-semibold">{d.refId||'—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-gray-900 text-xs">{d.donorName}</div>
                    <div className="text-gray-400 text-[10px]">{d.donorEmail||d.donorMobile||''}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{d.campaign?.name||'—'}</td>
                  <td className="px-3 py-2.5 text-gray-700 font-semibold text-xs">{d.numberOfTrees}</td>
                  <td className="px-3 py-2.5 font-bold text-gray-900 text-xs">₹{d.amount?.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{d.paymentMode||'—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[d.paymentStatus]||'bg-gray-100 text-gray-600'}`}>
                      {d.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 text-[10px]">
                    {new Date(d.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </td>
                  <td className="px-3 py-2.5">
                    <RowActions d={d} onEmailed={showToast} onDelete={deleteDonation}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
