'use client';
// src/app/admin/donations/page.tsx — Enhanced with all requested features
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Plus, Upload, Search, X, Edit, Save,
         Mail, Trash2, CheckCircle, Eye, Filter } from 'lucide-react';

const PAYMENT_MODES = ['ONLINE','CASH','BANK_TRANSFER','CHEQUE','UPI','NEFT','RTGS'];
const CHAPTERS = [
  'Mumbai Zone','Ghatkopar Chapter','Goregaon Chapter','Gowalia Tank Chapter',
  'Juhu Chapter','Kalyan-Dombivali Chapter','Midtown Chapter','Mulund Chapter',
  "Navi Mumbai Chapter","Queen's Necklace Chapter","Thane Chapter","Walkeshwar Chapter",
  'Ladies Wing','Youth Wing','Other JITO Chapter','Non JITO Member','Others',
];
const BANKS = [
  'Bank of Ghatkopar (A/C: 0054713345 — JITO Ghatkopar Chapter Foundation Youth Wing)',
  'Bank of Goregaon (A/C: 7246812022 — JITO Mumbai Goregaon Chapter Foundation)',
  'HDFC Bank','ICICI Bank','State Bank of India','Kotak Bank','Axis Bank','Other',
];

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400";
const inpSm = "border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sage-400 bg-white";

// ── Add Manual Donation Modal ─────────────────────────────────────────────────
function AddDonationModal({ campaigns, onClose, onSave }: any) {
  const [form, setForm] = useState({
    donorName:'', certificateName:'', donorEmail:'', donorMobile:'', donorPan:'',
    donorChapter:'', dedicationName:'', numberOfTrees:'11', amount:'',
    campaignSlug:'individual', paymentMode:'CASH', paymentRef:'',
    paymentBank:'Bank of Ghatkopar (A/C: 0054713345 — JITO Ghatkopar Chapter Foundation Youth Wing)',
    chequeNumber:'', notes:'',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const calcAmount = (parseInt(form.numberOfTrees)||0) * 500;

  async function handleSave() {
    if (!form.donorName || !form.numberOfTrees) { setError('Donor name and tree count are required'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/admin/donations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount)||calcAmount }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave(data);
    else setError(data.error || 'Failed to save');
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Add Manual Entry</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 block mb-1">Donor Full Name *</label>
            <input value={form.donorName} onChange={e=>setForm(f=>({...f,donorName:e.target.value}))} className={inp} placeholder="Person making the payment"/>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Name on Certificate <span className="text-gray-400 font-normal">(if different from donor name)</span>
            </label>
            <input value={form.certificateName} onChange={e=>setForm(f=>({...f,certificateName:e.target.value}))} className={inp} placeholder="Leave blank to use donor name"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Mobile</label>
            <input value={form.donorMobile} onChange={e=>setForm(f=>({...f,donorMobile:e.target.value}))} className={inp} placeholder="+91 98765 43210"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
            <input type="email" value={form.donorEmail} onChange={e=>setForm(f=>({...f,donorEmail:e.target.value}))} className={inp} placeholder="email@example.com"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">PAN (for 80G)</label>
            <input value={form.donorPan} onChange={e=>setForm(f=>({...f,donorPan:e.target.value.toUpperCase()}))} className={inp} placeholder="ABCDE1234F"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Chapter</label>
            <select value={form.donorChapter} onChange={e=>setForm(f=>({...f,donorChapter:e.target.value}))} className={inp}>
              <option value="">Select chapter</option>
              {CHAPTERS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 block mb-1">Dedication Name (for campaign)</label>
            <input value={form.dedicationName} onChange={e=>setForm(f=>({...f,dedicationName:e.target.value}))} className={inp} placeholder="e.g. Savitri Devi (Dadi Campaign)"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Campaign</label>
            <select value={form.campaignSlug} onChange={e=>setForm(f=>({...f,campaignSlug:e.target.value}))} className={inp}>
              {campaigns.map((c:any)=><option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Number of Trees *</label>
            <select value={form.numberOfTrees} onChange={e=>setForm(f=>({...f,numberOfTrees:e.target.value}))} className={inp}>
              {[11,27,54,108].map(n=><option key={n} value={String(n)}>{n} Trees — ₹{(n*500).toLocaleString('en-IN')}</option>)}
              <option value="custom">Custom</option>
            </select>
          </div>
          {form.numberOfTrees === 'custom' && (
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Custom Trees</label>
              <input type="number" onChange={e=>setForm(f=>({...f,numberOfTrees:e.target.value}))} className={inp}/></div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Amount (₹)</label>
            <input type="number" value={form.amount||calcAmount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className={inp}/>
          </div>

          {/* Payment section */}
          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-700 mb-2">Payment Details</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Payment Mode *</label>
            <select value={form.paymentMode} onChange={e=>setForm(f=>({...f,paymentMode:e.target.value}))} className={inp}>
              {PAYMENT_MODES.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Payment Ref / UTR / SP_</label>
            <input value={form.paymentRef} onChange={e=>setForm(f=>({...f,paymentRef:e.target.value}))} className={inp} placeholder="SP_xxx or UTR number"/>
          </div>
          {['CASH','BANK_TRANSFER','CHEQUE'].includes(form.paymentMode) && (<>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Bank / Deposit Account</label>
              <select value={form.paymentBank} onChange={e=>setForm(f=>({...f,paymentBank:e.target.value}))} className={inp}>
                {BANKS.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {form.paymentMode === 'CHEQUE' && (
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Cheque Number</label>
                <input value={form.chequeNumber} onChange={e=>setForm(f=>({...f,chequeNumber:e.target.value}))} className={inp}/></div>
            )}
          </>)}
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className={inp} rows={2}/>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-sage-700 hover:bg-sage-800 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Saving…' : '✓ Save Donation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CSV Upload Modal ──────────────────────────────────────────────────────────
function CSVUploadModal({ onClose, onSave }: any) {
  const [file, setFile]       = useState<File|null>(null);
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);

  function parseCSV(text: string) {
    const lines   = text.trim().split('\n');
    const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v=>v.trim().replace(/^"|"$/g,''));
      return Object.fromEntries(headers.map((h,i)=>[h, vals[i]||'']));
    }).filter(r=>Object.values(r).some(v=>v));
  }

  async function handleFile(f: File) { setFile(f); const t = await f.text(); setRows(parseCSV(t)); }

  async function handleUpload() {
    setLoading(true);
    const res  = await fetch('/api/admin/donations/bulk', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({rows}),
    });
    const data = await res.json();
    setLoading(false); setResult(data);
    if (data.success) onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Upload CSV — Bulk Donations</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        {!result ? (<>
          <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 mb-4 text-xs text-sage-700 space-y-1">
            <p className="font-semibold">CSV Column Headers:</p>
            <code className="text-[10px] block bg-white p-2 rounded border">Donor Name, Certificate Name, Email, Mobile, PAN, Chapter, Dedication, Trees, Amount, Campaign, Payment Mode, Payment Ref, Bank, Notes</code>
            <a href="/api/admin/export-csv?template=1" className="text-sage-600 hover:underline font-medium inline-block mt-1">⬇ Download Template</a>
          </div>
          <div className="border-2 border-dashed border-sage-300 rounded-xl p-8 text-center cursor-pointer hover:bg-sage-50 mb-4" onClick={()=>document.getElementById('csv-input')?.click()}>
            <Upload className="w-8 h-8 text-sage-400 mx-auto mb-2"/>
            <p className="text-sm text-sage-600 font-medium">{file ? file.name : 'Click to upload CSV file'}</p>
            <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
          </div>
          {rows.length > 0 && <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-700">✓ {rows.length} records ready to import</div>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={handleUpload} disabled={loading||rows.length===0}
              className="flex-1 bg-sage-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {loading ? 'Importing…' : `Import ${rows.length} Records`}
            </button>
          </div>
        </>) : (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
            <p className="font-bold text-gray-900 mb-1">Import Complete</p>
            <p className="text-sm text-gray-600">✓ {result.created} created · {result.skipped} skipped</p>
            {result.errors?.length > 0 && <p className="text-xs text-red-500 mt-1">{result.errors[0]}</p>}
            <button onClick={onClose} className="mt-4 bg-sage-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit Row Modal ────────────────────────────────────────────────────────────
function EditModal({ donation, campaigns, onClose, onSave }: any) {
  const [form, setForm] = useState({
    donorName:       donation.donorName || '',
    certificateName: donation.certificateName || '',
    donorEmail:      donation.donorEmail || '',
    donorMobile:     donation.donorMobile || '',
    donorPan:        donation.donorPan || '',
    donorChapter:    donation.donorChapter || '',
    dedicationName:  donation.dedicationName || '',
    numberOfTrees:   String(donation.numberOfTrees || 11),
    amount:          String(donation.amount || 0),
    paymentMode:     donation.paymentMode || 'ONLINE',
    paymentGatewayId:donation.paymentGatewayId || '',
    paymentBank:     donation.paymentBank || '',
    paymentStatus:   donation.paymentStatus || 'COMPLETED',
    notes:           donation.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSave() {
    setLoading(true); setError('');
    const res  = await fetch('/api/admin/donations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donationId: donation.id, ...form,
        numberOfTrees: parseInt(form.numberOfTrees),
        amount: parseFloat(form.amount) }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSave();
    else setError(data.error || 'Failed');
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Edit Donation — {donation.refId||donation.receiptNumber}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          {[
            { k:'donorName',       l:'Donor Name *',           t:'text' },
            { k:'certificateName', l:'Certificate Name',       t:'text' },
            { k:'donorEmail',      l:'Email',                  t:'email' },
            { k:'donorMobile',     l:'Mobile',                 t:'tel' },
            { k:'donorPan',        l:'PAN',                    t:'text' },
            { k:'dedicationName',  l:'Dedication Name',        t:'text' },
            { k:'numberOfTrees',   l:'Number of Trees',        t:'number' },
            { k:'amount',          l:'Amount (₹)',             t:'number' },
            { k:'paymentGatewayId',l:'Payment Ref / UTR',      t:'text' },
            { k:'notes',           l:'Notes',                  t:'text' },
          ].map(f=>(
            <div key={f.k}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{f.l}</label>
              <input type={f.t} value={(form as any)[f.k]}
                onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className={inp}/>
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Chapter</label>
            <select value={form.donorChapter} onChange={e=>setForm(f=>({...f,donorChapter:e.target.value}))} className={inp}>
              <option value="">Select</option>
              {CHAPTERS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Payment Mode</label>
            <select value={form.paymentMode} onChange={e=>setForm(f=>({...f,paymentMode:e.target.value}))} className={inp}>
              {PAYMENT_MODES.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
            <select value={form.paymentStatus} onChange={e=>setForm(f=>({...f,paymentStatus:e.target.value}))} className={inp}>
              <option value="COMPLETED">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Bank</label>
            <select value={form.paymentBank} onChange={e=>setForm(f=>({...f,paymentBank:e.target.value}))} className={inp}>
              <option value="">—</option>
              {BANKS.map(b=><option key={b} value={b}>{b.split('(')[0].trim()}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-sage-700 hover:bg-sage-800 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? 'Saving…' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDonationsPage() {
  const [donations, setDonations]   = useState<any[]>([]);
  const [campaigns, setCampaigns]   = useState<any[]>([]);
  const [stats, setStats]           = useState<any>({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('COMPLETED');
  const [pkgFilter, setPkgFilter]   = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [showCSV, setShowCSV]       = useState(false);
  const [editDonation, setEditDonation] = useState<any>(null);
  const [toast, setToast]           = useState('');
  const [sending, setSending]       = useState<string|null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(''), 3000); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)       params.set('q', search);
    if (statusFilter) params.set('status', statusFilter);
    if (pkgFilter)    params.set('trees', pkgFilter);

    const [donRes, camRes] = await Promise.all([
      fetch(`/api/admin/export-csv?json=1&${params}`),
      fetch('/api/campaigns'),
    ]);
    const donData = await donRes.json().catch(()=>({donations:[]}));
    const camData = await camRes.json().catch(()=>({campaigns:[]}));
    const list    = donData.donations || [];
    setDonations(list);
    setCampaigns(camData.campaigns || []);

    const paid = list.filter((d:any)=>d.paymentStatus==='COMPLETED');
    const uniqueDonors = new Set(paid.map((d:any)=>d.donorEmail||d.donorMobile||d.donorName));
    setStats({
      totalDonations: paid.length,
      totalRevenue:   paid.reduce((s:number,d:any)=>s+d.amount,0),
      totalTrees:     paid.reduce((s:number,d:any)=>s+d.numberOfTrees,0),
      totalDonors:    uniqueDonors.size,
      pending:        list.filter((d:any)=>d.paymentStatus==='PENDING').length,
    });
    setLoading(false);
  }, [search, statusFilter, pkgFilter]);

  useEffect(() => { load(); }, [load]);

  async function sendEmail(d: any, type: 'receipt'|'certificate') {
    setSending(`${d.id}-${type}`);
    const endpoint = type==='receipt' ? `/api/receipts/${d.id}/pdf` : `/api/certificates/${d.id}/pdf`;
    // Open in new tab for manual send, or trigger email API
    const res = await fetch('/api/admin/donations/send-email', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ donationId: d.id, type }),
    });
    const data = await res.json();
    setSending(null);
    if (data.success) showToast(`${type === 'receipt' ? 'Receipt' : 'Certificate'} sent to ${d.donorEmail} ✓`);
    else { showToast('Email failed — opening document instead'); window.open(endpoint, '_blank'); }
  }

  async function toggleFlag(donationId: string, field: string, current: boolean) {
    await fetch('/api/admin/donations', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ donationId, [field]: !current }),
    });
    showToast('Updated ✓'); load();
  }

  async function updateStatus(donationId: string, paymentStatus: string) {
    await fetch('/api/admin/donations', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ donationId, paymentStatus }),
    });
    showToast('Status updated ✓'); load();
  }

  async function deleteDonation(d: any) {
    if (!confirm(`Delete donation by ${d.donorName} (${d.receiptNumber})? This cannot be undone.`)) return;
    const res  = await fetch('/api/admin/donations', {
      method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ donationId: d.id }),
    });
    const data = await res.json();
    if (data.success) { showToast('Donation deleted'); load(); }
    else showToast('Error: ' + data.error);
  }

  const modeColor = (m:string) => ({
    ONLINE:'bg-blue-100 text-blue-700', CASH:'bg-amber-100 text-amber-700',
    BANK_TRANSFER:'bg-purple-100 text-purple-700', CHEQUE:'bg-orange-100 text-orange-700',
    UPI:'bg-cyan-100 text-cyan-700', NEFT:'bg-teal-100 text-teal-700',
  }[m] || 'bg-gray-100 text-gray-600');

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}
      {showAdd    && <AddDonationModal campaigns={campaigns} onClose={()=>setShowAdd(false)}    onSave={(d:any)=>{setShowAdd(false);showToast(`Added ${d.refId}`);load();}}/>}
      {showCSV    && <CSVUploadModal   onClose={()=>setShowCSV(false)}    onSave={()=>{setShowCSV(false);showToast('CSV imported');load();}}/>}
      {editDonation && <EditModal donation={editDonation} campaigns={campaigns} onClose={()=>setEditDonation(null)} onSave={()=>{setEditDonation(null);showToast('Saved ✓');load();}}/>}

      {/* Header */}
      <div className="bg-forest-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-forest-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></Link>
          <span className="font-display text-lg">Donations Management</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowCSV(true)} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
            <Upload className="w-3.5 h-3.5"/> Upload CSV
          </button>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
            <Plus className="w-3.5 h-3.5"/> Add Manual Entry
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label:'Total Donations',    value: stats.totalDonations||0,  sub:'Paid transactions' },
            { label:'Total Revenue',      value: `₹${(stats.totalRevenue||0).toLocaleString('en-IN')}`, sub:'Amount collected', green:true },
            { label:'Total Trees 🌳',      value: stats.totalTrees||0,      sub:'Trees sponsored' },
            { label:'Unique Donors',      value: stats.totalDonors||0,     sub:'People who paid' },
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className={`text-2xl font-black ${s.green?'text-green-700':'text-gray-900'}`}>{s.value}</div>
              <div className="text-gray-900 text-sm font-semibold mt-0.5">{s.label}</div>
              <div className="text-gray-400 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Offline payment info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm">
          <p className="font-semibold text-amber-800 mb-1">🏦 Offline Payment Accounts</p>
          <div className="text-amber-700 text-xs space-y-0.5">
            <p>• <strong>Ghatkopar:</strong> A/C 0054713345 — JITO Ghatkopar Chapter Foundation Youth Wing</p>
            <p>• <strong>Goregaon:</strong> A/C 7246812022 — JITO Mumbai Goregaon Chapter Foundation Mumbai Zone</p>
          </div>
          <p className="text-amber-600 text-xs mt-1">Use "Add Manual Entry" or Upload CSV to record offline payments.</p>
        </div>

        {/* Bulk actions + export */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="font-bold text-gray-900">📋 Bulk Certificate Actions</div>
            <div className="text-gray-500 text-sm">Generate & send certificates for paid registrations</div>
          </div>
          <div className="flex gap-2">
            <a href="/api/admin/export-csv" className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
              <Download className="w-4 h-4"/> Export CSV
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-gray-600 flex items-center gap-1"><Filter className="w-4 h-4"/> FILTER</span>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input placeholder="Search name / mobile / email / receipt / ref ID"
                value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&load()}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"/>
            </div>
            <select value={pkgFilter} onChange={e=>setPkgFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none min-w-[130px]">
              <option value="">All Packages</option>
              {[11,27,54,108].map(n=><option key={n} value={n}>{n} Trees</option>)}
            </select>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            <button onClick={load} className="bg-forest-700 hover:bg-forest-800 text-white font-bold px-4 py-2 rounded-xl text-sm">Apply</button>
            <button onClick={()=>{setSearch('');setStatusFilter('COMPLETED');setPkgFilter('');}}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">Reset</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-900">Paid Registrations</span>
            <span className="text-gray-400 text-sm">{donations.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['#','Ref ID','Name / Certificate Name','Mobile + Email','Campaign','Trees','Amount','80G','WA Sent','Certificate','Payment Ref','Date','Mode','Update Status','Actions'].map(h=>(
                    <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} className="text-center py-12 text-gray-400">Loading…</td></tr>
                ) : donations.map((d:any, idx:number) => (
                  <tr key={d.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-gray-400 text-xs">{idx+1}</td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {d.refId || `#${d.receiptNumber?.slice(-6)||'—'}`}
                    </td>
                    {/* Name + Certificate Name + Dedication */}
                    <td className="px-3 py-3">
                      <div className="font-semibold text-gray-900 whitespace-nowrap">{d.donorName}</div>
                      {d.certificateName && d.certificateName !== d.donorName && (
                        <div className="text-blue-600 text-xs">📜 {d.certificateName}</div>
                      )}
                      {d.dedicationName && <div className="text-gray-400 text-xs">🌱 {d.dedicationName}</div>}
                      {d.donorChapter   && <div className="text-gray-300 text-[10px]">{d.donorChapter}</div>}
                    </td>
                    {/* Mobile + Email */}
                    <td className="px-3 py-3">
                      <div className="text-blue-600 text-xs font-medium">{d.donorMobile||'—'}</div>
                      <div className="text-gray-400 text-[10px]">{d.donorEmail||'—'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-gray-800 text-xs font-medium">{d.campaign?.name||'—'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-gray-900">{d.numberOfTrees}</span>
                      <span className="text-green-500 ml-1 text-xs">🌱</span>
                    </td>
                    <td className="px-3 py-3 font-bold text-gray-900 whitespace-nowrap">₹{d.amount?.toLocaleString('en-IN')}</td>
                    {/* 80G */}
                    <td className="px-3 py-3 text-center">
                      {d.donorPan ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto"/> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* WA Sent — clickable toggle */}
                    <td className="px-3 py-3 text-center">
                      <button onClick={()=>toggleFlag(d.id,'waMessageSent',!!d.waMessageSent)} title="Toggle WA sent">
                        {d.waMessageSent
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto"/>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </button>
                    </td>
                    {/* Certificate */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {d.certificateSent
                        ? <span className="text-green-600 text-xs flex items-center gap-0.5"><CheckCircle className="w-3 h-3"/> Sent</span>
                        : <span className="text-gray-300 text-xs">Not sent</span>}
                      <div className="flex gap-1 mt-0.5">
                        <a href={`/certificate?id=${d.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-sage-600 text-[10px] hover:underline">View</a>
                        <span className="text-gray-300 text-[10px]">·</span>
                        <button onClick={()=>toggleFlag(d.id,'certificateSent',!!d.certificateSent)}
                          className="text-[10px] text-gray-400 hover:text-gray-600">
                          {d.certificateSent?'Unmark':'Mark sent'}
                        </button>
                      </div>
                    </td>
                    {/* Payment Ref */}
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {d.paymentGatewayId||'—'}
                      {d.paymentBank && <div className="text-[10px] text-gray-300">{d.paymentBank.split('(')[0].trim()}</div>}
                    </td>
                    {/* Date */}
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <div>{new Date(d.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</div>
                      <div className="text-[10px] text-gray-300">{new Date(d.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                    </td>
                    {/* Mode */}
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modeColor(d.paymentMode||'ONLINE')}`}>
                        {d.paymentMode||'ONLINE'}
                      </span>
                    </td>
                    {/* Update Status */}
                    <td className="px-3 py-3">
                      <select value={d.paymentStatus}
                        onChange={e=>updateStatus(d.id, e.target.value)}
                        className={`${inpSm} min-w-[80px]`}>
                        <option value="COMPLETED">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                      </select>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* Edit */}
                        <button onClick={()=>setEditDonation(d)} title="Edit"
                          className="p-1.5 rounded-lg bg-sage-50 hover:bg-sage-100 text-sage-700">
                          <Edit className="w-3.5 h-3.5"/>
                        </button>
                        {/* Email receipt */}
                        <button
                          onClick={()=>sendEmail(d,'receipt')}
                          disabled={!d.donorEmail || sending===`${d.id}-receipt`}
                          title={d.donorEmail ? 'Email Receipt' : 'No email on file'}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 disabled:opacity-40">
                          {sending===`${d.id}-receipt`
                            ? <span className="text-[9px]">…</span>
                            : <Mail className="w-3.5 h-3.5"/>}
                        </button>
                        {/* Email certificate */}
                        <button
                          onClick={()=>sendEmail(d,'certificate')}
                          disabled={!d.donorEmail || sending===`${d.id}-certificate`}
                          title={d.donorEmail ? 'Email Certificate' : 'No email on file'}
                          className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-40">
                          {sending===`${d.id}-certificate`
                            ? <span className="text-[9px]">…</span>
                            : <><Mail className="w-3 h-3 inline"/><span className="text-[9px] ml-0.5">cert</span></>}
                        </button>
                        {/* View receipt */}
                        <a href={`/receipt?id=${d.id}`} target="_blank" rel="noopener noreferrer"
                          title="View Receipt"
                          className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600">
                          <Eye className="w-3.5 h-3.5"/>
                        </a>
                        {/* Delete */}
                        <button onClick={()=>deleteDonation(d)} title="Delete"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && donations.length===0 && (
                  <tr><td colSpan={15} className="text-center py-12 text-gray-400">No donations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
