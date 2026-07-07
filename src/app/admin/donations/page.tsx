'use client';
// src/app/admin/donations/page.tsx — Enhanced donations management
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Download, Plus, Upload, Search, Filter, X,
  CheckCircle, MessageCircle, FileText, RefreshCw, Save,
  ChevronDown, Eye, Edit, Trash2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_MODES = ['ONLINE','CASH','BANK_TRANSFER','CHEQUE','UPI','NEFT','RTGS'];
const CHAPTERS = [
  'Mumbai Zone','Ghatkopar Chapter','Goregaon Chapter','Gowalia Tank Chapter',
  'Juhu Chapter','Kalyan-Dombivali Chapter','Midtown Chapter','Mulund Chapter',
  "Navi Mumbai Chapter","Queen's Necklace Chapter","Thane Chapter","Walkeshwar Chapter",
  'Ladies Wing','Youth Wing','Other JITO Chapter','Non JITO Member','Others',
];
const BANKS = ['Bank of Ghatkopar','Bank of Goregaon','HDFC Bank','ICICI Bank',
               'State Bank of India','Kotak Bank','Axis Bank','Other'];

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400";

// ── Add Manual Donation Modal ─────────────────────────────────────────────────
function AddDonationModal({ campaigns, onClose, onSave }: any) {
  const [form, setForm] = useState({
    donorName:'', donorEmail:'', donorMobile:'', donorPan:'',
    donorChapter:'', dedicationName:'', numberOfTrees:'11',
    amount:'', campaignSlug:'individual',
    paymentMode:'CASH', paymentRef:'', paymentBank:'Bank of Ghatkopar',
    paymentBranch:'', chequeNumber:'', notes:'',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const treeCount = parseInt(form.numberOfTrees)||0;
  const calcAmount = treeCount * 500;

  async function handleSave() {
    if (!form.donorName || !form.numberOfTrees) { setError('Name and tree count required'); return; }
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Add Manual Donation</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Donor Full Name *</label>
            <input value={form.donorName} onChange={e=>setForm(f=>({...f,donorName:e.target.value}))} className={inp} placeholder="Full name"/></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Mobile</label>
            <input value={form.donorMobile} onChange={e=>setForm(f=>({...f,donorMobile:e.target.value}))} className={inp} placeholder="+91 98765 43210"/></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
            <input type="email" value={form.donorEmail} onChange={e=>setForm(f=>({...f,donorEmail:e.target.value}))} className={inp} placeholder="email@example.com"/></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">PAN Number</label>
            <input value={form.donorPan} onChange={e=>setForm(f=>({...f,donorPan:e.target.value.toUpperCase()}))} className={inp} placeholder="ABCDE1234F"/></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Chapter</label>
            <select value={form.donorChapter} onChange={e=>setForm(f=>({...f,donorChapter:e.target.value}))} className={inp}>
              <option value="">Select chapter</option>
              {CHAPTERS.map(c=><option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Dedication Name</label>
            <input value={form.dedicationName} onChange={e=>setForm(f=>({...f,dedicationName:e.target.value}))} className={inp} placeholder="e.g. Savitri Devi"/></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Campaign</label>
            <select value={form.campaignSlug} onChange={e=>setForm(f=>({...f,campaignSlug:e.target.value}))} className={inp}>
              {campaigns.map((c:any)=><option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Number of Trees *</label>
            <select value={form.numberOfTrees} onChange={e=>setForm(f=>({...f,numberOfTrees:e.target.value}))} className={inp}>
              {[11,27,54,108].map(n=><option key={n} value={n}>{n} Trees — ₹{(n*500).toLocaleString('en-IN')}</option>)}
              <option value="custom">Custom</option>
            </select></div>
          {form.numberOfTrees === 'custom' && (
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Custom Tree Count</label>
              <input type="number" value={form.numberOfTrees==='custom'?'':form.numberOfTrees}
                onChange={e=>setForm(f=>({...f,numberOfTrees:e.target.value}))} className={inp}/></div>
          )}
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Amount (₹)</label>
            <input type="number" value={form.amount||calcAmount}
              onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className={inp} placeholder={String(calcAmount)}/></div>

          <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-700 mb-2">Payment Details</p></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Payment Mode *</label>
            <select value={form.paymentMode} onChange={e=>setForm(f=>({...f,paymentMode:e.target.value}))} className={inp}>
              {PAYMENT_MODES.map(m=><option key={m} value={m}>{m}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Payment Reference / UTR</label>
            <input value={form.paymentRef} onChange={e=>setForm(f=>({...f,paymentRef:e.target.value}))} className={inp} placeholder="SP_xxx or UTR number"/></div>
          {['BANK_TRANSFER','CHEQUE','CASH'].includes(form.paymentMode) && (
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Bank</label>
              <select value={form.paymentBank} onChange={e=>setForm(f=>({...f,paymentBank:e.target.value}))} className={inp}>
                {BANKS.map(b=><option key={b} value={b}>{b}</option>)}
              </select></div>
          )}
          {form.paymentMode === 'CHEQUE' && (
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Cheque Number</label>
              <input value={form.chequeNumber} onChange={e=>setForm(f=>({...f,chequeNumber:e.target.value}))} className={inp}/></div>
          )}
          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className={inp} rows={2}/></div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-sage-700 hover:bg-sage-800 text-white font-bold py-2.5 rounded-xl disabled:opacity-60">
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
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
      return Object.fromEntries(headers.map((h,i) => [h, vals[i]||'']));
    }).filter(r => Object.values(r).some(v => v));
  }

  async function handleFile(f: File) {
    setFile(f);
    const text = await f.text();
    setRows(parseCSV(text));
  }

  async function handleUpload() {
    setLoading(true);
    const res  = await fetch('/api/admin/donations/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setLoading(false);
    setResult(data);
    if (data.success) onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Upload CSV — Bulk Donations</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>

        {!result ? (
          <>
            <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 mb-4 text-xs text-sage-700">
              <p className="font-semibold mb-1">CSV Column Headers (use exact names):</p>
              <code className="text-[10px] block">Donor Name, Email, Mobile, PAN, Chapter, Dedication, Trees, Amount, Campaign, Payment Mode, Payment Ref, Bank</code>
              <a href="/api/admin/export-csv?template=1" className="text-sage-600 hover:underline font-medium mt-2 inline-block">
                ⬇ Download CSV Template
              </a>
            </div>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed border-sage-300 rounded-xl p-8 cursor-pointer hover:bg-sage-50 mb-4 ${file?'border-sage-500 bg-sage-50':''}`}>
              <Upload className="w-8 h-8 text-sage-400 mb-2"/>
              <span className="text-sm text-sage-600 font-medium">{file ? file.name : 'Click to upload CSV file'}</span>
              <input type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            </label>
            {rows.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-700">
                ✓ {rows.length} records parsed and ready to import
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl">Cancel</button>
              <button onClick={handleUpload} disabled={loading || rows.length===0}
                className="flex-1 bg-sage-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-60">
                {loading ? 'Importing…' : `Import ${rows.length} Records`}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
            <p className="font-bold text-gray-900 mb-1">Import Complete</p>
            <p className="text-sm text-gray-600 mb-1">✓ {result.created} created · ⚠ {result.skipped} skipped</p>
            {result.errors?.length > 0 && <p className="text-xs text-red-500">{result.errors[0]}</p>}
            <button onClick={onClose} className="mt-4 bg-sage-700 text-white font-bold px-6 py-2.5 rounded-xl">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats]         = useState<any>({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('COMPLETED');
  const [pkgFilter, setPkgFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [showCSV, setShowCSV]     = useState(false);
  const [toast, setToast]         = useState('');
  const [editRow, setEditRow]     = useState<string|null>(null);
  const [editData, setEditData]   = useState<any>({});

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(''), 3000); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)       params.set('q', search);
    if (statusFilter) params.set('status', statusFilter);
    if (pkgFilter)    params.set('trees', pkgFilter);
    if (modeFilter)   params.set('mode', modeFilter);

    const [donRes, camRes] = await Promise.all([
      fetch(`/api/admin/export-csv?json=1&${params}`),
      fetch('/api/campaigns'),
    ]);
    const donData = await donRes.json().catch(()=>({donations:[]}));
    const camData = await camRes.json().catch(()=>({campaigns:[]}));
    const list = donData.donations || [];
    setDonations(list);
    setCampaigns(camData.campaigns || []);
    // Stats
    const paid = list.filter((d:any)=>d.paymentStatus==='COMPLETED');
    setStats({
      total:  paid.length,
      amount: paid.reduce((s:number,d:any)=>s+d.amount,0),
      trees:  paid.reduce((s:number,d:any)=>s+d.numberOfTrees,0),
      pending:list.filter((d:any)=>d.paymentStatus==='PENDING').length,
    });
    setLoading(false);
  }, [search, statusFilter, pkgFilter, modeFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateDonation(donationId: string, updates: any) {
    const res  = await fetch('/api/admin/donations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donationId, ...updates }),
    });
    const data = await res.json();
    if (data.success) { showToast('Updated ✓'); load(); setEditRow(null); }
    else showToast('Error: ' + data.error);
  }

  function modeColor(mode: string) {
    if (!mode || mode === 'ONLINE') return 'bg-blue-100 text-blue-700';
    if (mode === 'CASH')           return 'bg-amber-100 text-amber-700';
    if (mode === 'BANK_TRANSFER')  return 'bg-purple-100 text-purple-700';
    if (mode === 'CHEQUE')         return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-600';
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      {showAdd && (
        <AddDonationModal campaigns={campaigns} onClose={()=>setShowAdd(false)}
          onSave={(data:any)=>{ setShowAdd(false); showToast(`Added: ${data.refId}`); load(); }}/>
      )}
      {showCSV && (
        <CSVUploadModal onClose={()=>setShowCSV(false)} onSave={()=>{ setShowCSV(false); showToast('CSV imported'); load(); }}/>
      )}

      {/* Header */}
      <div className="bg-forest-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-forest-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></Link>
          <span className="font-display text-lg">Donations Management</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowCSV(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
            <Upload className="w-3.5 h-3.5"/> Upload CSV
          </button>
          <button onClick={()=>setShowAdd(true)}
            className="flex items-center gap-1.5 bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
            <Plus className="w-3.5 h-3.5"/> Add Manual Entry
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label:'Total Paid Registrations', value: stats.total||0, color:'text-gray-900' },
            { label:'Total Amount Collected',   value: `₹${(stats.amount||0).toLocaleString('en-IN')}`, color:'text-green-700' },
            { label:'Total Trees 🌳',            value: stats.trees||0, color:'text-gray-900' },
            { label:'Pending',                  value: stats.pending||0, color:'text-amber-700' },
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bulk Certificate Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="font-bold text-gray-900 flex items-center gap-2">📋 Bulk Certificate Actions</div>
            <div className="text-gray-500 text-sm">Generate & send certificates for paid registrations</div>
          </div>
          <div className="flex gap-2">
            <a href="/api/admin/export-csv" className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
              <FileText className="w-4 h-4"/> Export CSV
            </a>
            <a href="/api/admin/export-csv?format=zip" className="flex items-center gap-1.5 bg-forest-700 hover:bg-forest-800 text-white text-sm font-bold px-4 py-2 rounded-lg">
              <Download className="w-4 h-4"/> Download All ZIP
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Filter className="w-4 h-4"/> FILTER
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input placeholder="Search name / mobile / email / receipt"
                value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"/>
            </div>
            <select value={pkgFilter} onChange={e=>setPkgFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none min-w-[140px]">
              <option value="">All Packages</option>
              {[11,27,54,108].map(n=><option key={n} value={n}>{n} Trees</option>)}
            </select>
            <select value={modeFilter} onChange={e=>setModeFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none min-w-[130px]">
              <option value="">All Modes</option>
              {PAYMENT_MODES.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            <button onClick={load} className="bg-forest-700 hover:bg-forest-800 text-white font-bold px-4 py-2 rounded-xl text-sm">Apply</button>
            <button onClick={()=>{setSearch('');setStatusFilter('COMPLETED');setPkgFilter('');setModeFilter('');}}
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
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  {['#','Ref ID','Name','Mobile','Package','Trees','Amount','80G','WA Sent','Certificate','Payment Ref','Date','Mode','Update Status'].map(h=>(
                    <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="text-center py-12 text-gray-400">Loading…</td></tr>
                ) : donations.map((d, idx) => (
                  <tr key={d.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-gray-400 text-xs">{idx+1}</td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {d.refId || `#${d.receiptNumber?.slice(-5)||'—'}`}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-gray-900 whitespace-nowrap">{d.donorName}</div>
                      {d.dedicationName && <div className="text-gray-400 text-xs">🌱 {d.dedicationName}</div>}
                      {d.donorChapter   && <div className="text-gray-400 text-[10px]">{d.donorChapter}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-blue-600 text-xs font-medium">{d.donorMobile||'—'}</div>
                      <div className="text-gray-400 text-[10px]">{d.donorEmail}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-700">{d.numberOfTrees}</td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-gray-900">{d.numberOfTrees}</span>
                      <span className="text-green-500 ml-1">🌱</span>
                    </td>
                    <td className="px-3 py-3 font-bold text-gray-900 whitespace-nowrap">
                      ₹{d.amount?.toLocaleString('en-IN')}
                    </td>
                    {/* 80G */}
                    <td className="px-3 py-3 text-center">
                      {d.donorPan
                        ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto"/>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* WA Sent */}
                    <td className="px-3 py-3 text-center">
                      <button onClick={()=>updateDonation(d.id, { waMessageSent: !d.waMessageSent })}
                        title={d.waMessageSent ? 'Mark as not sent' : 'Mark as sent'}
                        className="mx-auto block">
                        {d.waMessageSent
                          ? <CheckCircle className="w-4 h-4 text-green-500"/>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </button>
                    </td>
                    {/* Certificate */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {d.certificateSent
                          ? <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Sent</span>
                          : <span className="text-gray-300 text-xs">Not sent</span>}
                        <a href={`/certificate?id=${d.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-sage-600 text-[10px] hover:underline flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5"/> View
                        </a>
                        <button onClick={()=>updateDonation(d.id,{certificateSent:!d.certificateSent})}
                          className="text-[10px] text-sage-500 hover:underline">
                          {d.certificateSent?'Mark unsent':'Mark sent'}
                        </button>
                      </div>
                    </td>
                    {/* Payment Ref */}
                    <td className="px-3 py-3">
                      {editRow === d.id ? (
                        <input value={editData.paymentGatewayId ?? d.paymentGatewayId ?? ''}
                          onChange={e=>setEditData((p:any)=>({...p,paymentGatewayId:e.target.value}))}
                          className="border rounded px-1.5 py-1 text-xs w-28"/>
                      ) : (
                        <span className="text-gray-500 text-xs font-mono">{d.paymentGatewayId||'—'}</span>
                      )}
                    </td>
                    {/* Date */}
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <div>{new Date(d.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</div>
                      <div className="text-[10px] text-gray-300">{new Date(d.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                    </td>
                    {/* Mode */}
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modeColor(d.paymentMode)}`}>
                        {d.paymentMode||'ONLINE'}
                      </span>
                      {d.paymentBank && <div className="text-[10px] text-gray-400 mt-0.5">{d.paymentBank}</div>}
                    </td>
                    {/* Update Status */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {editRow === d.id ? (
                          <>
                            <select value={editData.paymentStatus ?? d.paymentStatus}
                              onChange={e=>setEditData((p:any)=>({...p,paymentStatus:e.target.value}))}
                              className="border rounded px-1.5 py-1 text-xs">
                              <option value="COMPLETED">Paid</option>
                              <option value="PENDING">Pending</option>
                              <option value="FAILED">Failed</option>
                            </select>
                            <button onClick={()=>updateDonation(d.id, editData)}
                              className="bg-green-600 text-white text-xs px-2 py-1 rounded-lg">Save</button>
                            <button onClick={()=>setEditRow(null)}
                              className="text-gray-400 text-xs px-1 py-1 rounded-lg hover:bg-gray-100">✕</button>
                          </>
                        ) : (
                          <>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              d.paymentStatus==='COMPLETED'?'bg-green-100 text-green-700':
                              d.paymentStatus==='PENDING'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'
                            }`}>{d.paymentStatus==='COMPLETED'?'Paid':d.paymentStatus}</span>
                            <button onClick={()=>{setEditRow(d.id);setEditData({});}}
                              className="text-gray-400 hover:text-gray-700 p-0.5">
                              <Edit className="w-3 h-3"/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && donations.length === 0 && (
                  <tr><td colSpan={14} className="text-center py-12 text-gray-400">No donations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
