'use client';
// src/app/admin/farmers/[id]/page.tsx — Admin farmer profile with document generation
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Send, Eye, CheckCircle, AlertCircle, Edit, Save, X, Plus } from 'lucide-react';

const STATUS_OPTIONS = ['REGISTERED','DOCUMENTS_PENDING','DOCUMENTS_VERIFIED','INSPECTION_PENDING','INSPECTION_COMPLETED','APPROVED','ACTIVE','SUSPENDED'];
const AGREEMENT_TYPES = [
  { type:'PARTICIPATION_AGREEMENT', label:'Landowner Participation Agreement', icon:'📜' },
  { type:'JOINT_OWNER_NOC',         label:'अनापत्ति प्रमाण पत्र (Joint Owner NOC)', icon:'📋' },
  { type:'PAYMENT_RECEIPT',         label:'Farmer Payment Receipt', icon:'💰' },
  { type:'SAPLING_RECEIPT',         label:'Sapling Receipt cum Handover', icon:'🌱' },
  { type:'PLANTATION_CERTIFICATE',  label:'Plantation Completion Certificate', icon:'🏆' },
];

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400";

export default function AdminFarmerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const farmerId = params.id as string;

  const [farmer, setFarmer]       = useState<any>(null);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'profile'|'lands'|'documents'|'agreements'|'logs'>('profile');
  const [generating, setGenerating] = useState<string|null>(null);
  const [toast, setToast]         = useState('');
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus]   = useState('');
  const [showGenModal, setShowGenModal] = useState<string|null>(null);
  const [genForm, setGenForm]       = useState<any>({});

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    const [fRes, aRes] = await Promise.all([
      fetch(`/api/farmer/profile?farmerId=${farmerId}`),
      fetch(`/api/admin/agreements?farmerId=${farmerId}`),
    ]);
    const fd = await fRes.json();
    const ad = await aRes.json();
    if (fd.farmer) { setFarmer(fd.farmer); setNewStatus(fd.farmer.status); }
    setAgreements(ad.agreements || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [farmerId]);

  async function updateStatus() {
    await fetch('/api/admin/farmers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, status: newStatus }),
    });
    setEditStatus(false);
    showToast('Status updated');
    load();
  }

  async function generateDocument(agreementType: string) {
    setGenerating(agreementType);
    const res  = await fetch('/api/admin/agreements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, agreementType, templateData: genForm }),
    });
    const data = await res.json();
    setGenerating(null);
    setShowGenModal(null);
    setGenForm({});
    if (data.success) { showToast('Document generated and shared with farmer ✓'); load(); }
    else showToast('Error: ' + data.error);
  }

  async function approveSignedCopy(agreementId: string) {
    await fetch('/api/admin/agreements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId, status: 'COMPLETED' }),
    });
    showToast('Signed copy approved ✓');
    load();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  if (!farmer)  return <div className="min-h-screen flex items-center justify-center text-gray-500">Farmer not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      {/* Document generation modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {AGREEMENT_TYPES.find(a=>a.type===showGenModal)?.icon} {AGREEMENT_TYPES.find(a=>a.type===showGenModal)?.label}
              </h3>
              <button onClick={() => { setShowGenModal(null); setGenForm({}); }}><X className="w-5 h-5 text-gray-400"/></button>
            </div>

            {/* Type-specific extra fields */}
            {showGenModal === 'PAYMENT_RECEIPT' && (
              <div className="space-y-3 mb-4">
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Payment Type *</label>
                  <select value={genForm.paymentType||''} onChange={e=>setGenForm((f:any)=>({...f,paymentType:e.target.value}))} className={inp}>
                    <option value="">Select…</option>
                    {['Carbon Credit Revenue Share','Plantation Maintenance Incentive','Tree Survival Incentive','CSR Support'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Amount (₹) *</label>
                  <input type="number" value={genForm.amount||''} onChange={e=>setGenForm((f:any)=>({...f,amount:parseFloat(e.target.value)}))} className={inp} placeholder="0"/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Payment Mode</label>
                  <select value={genForm.paymentMode||'NEFT'} onChange={e=>setGenForm((f:any)=>({...f,paymentMode:e.target.value}))} className={inp}>
                    {['NEFT','RTGS','IMPS','UPI','Cheque'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">UTR / Reference No.</label>
                  <input type="text" value={genForm.utrNumber||''} onChange={e=>setGenForm((f:any)=>({...f,utrNumber:e.target.value}))} className={inp}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                  <textarea value={genForm.notes||''} onChange={e=>setGenForm((f:any)=>({...f,notes:e.target.value}))} className={inp} rows={2}/></div>
              </div>
            )}

            {showGenModal === 'SAPLING_RECEIPT' && (
              <div className="space-y-3 mb-4">
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Species (JSON)</label>
                  <textarea className={inp} rows={3} placeholder='[{"name":"Neem","qty":50},{"name":"Mango","qty":30}]'
                    value={genForm._speciesRaw||''} onChange={e=>{
                      setGenForm((f:any)=>({...f,_speciesRaw:e.target.value}));
                      try { const s=JSON.parse(e.target.value); setGenForm((f:any)=>({...f,species:s,totalSaplings:s.reduce((t:number,x:any)=>t+x.qty,0)})); } catch{}
                    }}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Field Officer Name</label>
                  <input type="text" value={genForm.fieldOfficer||''} onChange={e=>setGenForm((f:any)=>({...f,fieldOfficer:e.target.value}))} className={inp}/></div>
              </div>
            )}

            {showGenModal === 'PLANTATION_CERTIFICATE' && (
              <div className="space-y-3 mb-4">
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Total Trees Planted *</label>
                  <input type="number" value={genForm.totalTrees||''} onChange={e=>setGenForm((f:any)=>({...f,totalTrees:parseInt(e.target.value)}))} className={inp}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Plantation Date</label>
                  <input type="date" value={genForm.plantationDate||''} onChange={e=>setGenForm((f:any)=>({...f,plantationDate:e.target.value}))} className={inp}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Plantation Type</label>
                  <select value={genForm.plantationType||''} onChange={e=>setGenForm((f:any)=>({...f,plantationType:e.target.value}))} className={inp}>
                    <option value="">Select…</option>
                    {['Agroforestry','Miyawaki','Native Forest','Fruit Plantation','Mixed'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Field Officer</label>
                  <input type="text" value={genForm.fieldOfficer||''} onChange={e=>setGenForm((f:any)=>({...f,fieldOfficer:e.target.value}))} className={inp}/></div>
              </div>
            )}

            {showGenModal === 'JOINT_OWNER_NOC' && (
              <div className="space-y-3 mb-4">
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Joint Owner Name *</label>
                  <input type="text" value={genForm.ownerName||''} onChange={e=>setGenForm((f:any)=>({...f,ownerName:e.target.value}))} className={inp}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Father's Name</label>
                  <input type="text" value={genForm.fatherName||''} onChange={e=>setGenForm((f:any)=>({...f,fatherName:e.target.value}))} className={inp}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Age</label>
                  <input type="text" value={genForm.age||''} onChange={e=>setGenForm((f:any)=>({...f,age:e.target.value}))} className={inp}/></div>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-4">
              Farmer details (name, land, address) will be auto-filled from profile.
            </p>

            <div className="flex gap-3">
              <button onClick={() => { setShowGenModal(null); setGenForm({}); }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => generateDocument(showGenModal)}
                disabled={generating === showGenModal}
                className="flex-1 bg-sage-700 hover:bg-sage-800 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                {generating === showGenModal ? 'Generating…' : '✓ Generate & Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-sage-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/farmers" className="text-sage-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></Link>
          <div>
            <div className="font-bold">{farmer.fullName}</div>
            <div className="text-sage-400 text-xs">{farmer.mobile} · {farmer.farmerIdGenerated || farmer.id.slice(0,12)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editStatus ? (
            <div className="flex gap-2">
              <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1 bg-white text-gray-700">
                {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <button onClick={updateStatus} className="bg-green-600 text-white text-xs px-3 py-1 rounded-lg">Save</button>
              <button onClick={() => setEditStatus(false)} className="bg-gray-600 text-white text-xs px-3 py-1 rounded-lg">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditStatus(true)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer ${
                farmer.status==='APPROVED'?'bg-green-100 text-green-800':farmer.status==='SUSPENDED'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'
              }`}>
              {farmer.status?.replace(/_/g,' ')} ✎
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-5 overflow-x-auto">
          {[
            { id:'profile',    label:'Profile' },
            { id:'lands',      label:'Lands' },
            { id:'documents',  label:'Documents' },
            { id:'agreements', label:`Documents Sent (${agreements.length})` },
            { id:'logs',       label:'Audit Log' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab===t.id ? 'bg-sage-700 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { title:'Personal Information', fields:[
                ['Farmer ID', farmer.farmerIdGenerated||'—'],['GIS ID', farmer.gisId||'—'],
                ['Full Name', farmer.fullName],["Father's Name", farmer.fatherName||'—'],
                ['Date of Birth', farmer.dateOfBirth?new Date(farmer.dateOfBirth).toLocaleDateString('en-IN'):'—'],
                ['Gender', farmer.gender||'—'],['Aadhaar', farmer.aadhaarNumber?'••••••••'+farmer.aadhaarNumber.slice(-4):'—'],
                ['PAN', farmer.panNumber||'—'],['Mobile', farmer.mobile],['Alt. Mobile', farmer.alternateMobile||'—'],
                ['Email', farmer.email||'—'],['Occupation', farmer.occupation||'—'],
                ['Is Farmer', farmer.isFarmer?'Yes':'No'],['Farming Experience', farmer.farmingExperience||'—'],
                ['Registered On', new Date(farmer.createdAt).toLocaleDateString('en-IN')],
                ['Registration Step', `${farmer.registrationStep||1}/8`],
              ]},
              { title:'Address', fields:[
                ['Village', farmer.village||'—'],['Taluka', farmer.taluka||'—'],
                ['District', farmer.district||'—'],['State', farmer.state||'—'],['Pincode', farmer.pincode||'—'],
              ]},
              { title:'Bank Account', fields:[
                ['Account Name', farmer.bankAccountName||'—'],['Bank', farmer.bankName||'—'],
                ['Account No.', farmer.accountNumber?'••••'+farmer.accountNumber.slice(-4):'—'],
                ['IFSC', farmer.ifscCode||'—'],
              ]},
              { title:'Nominee Details', fields:[
                ['Name', farmer.nomineeName||'—'],['Relation', farmer.nomineeRelation||'—'],
                ['Mobile', farmer.nomineeMobile||'—'],['Address', farmer.nomineeAddress||'—'],
                ['Aadhaar', farmer.nomineeAadhaar?'••••••••'+farmer.nomineeAadhaar.slice(-4):'—'],
              ]},
            ].map(section => (
              <div key={section.title} className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2 mb-3">{section.title}</h3>
                <div className="space-y-2">
                  {section.fields.map(([l,v]) => (
                    <div key={l as string} className="flex justify-between text-sm">
                      <span className="text-gray-400 text-xs">{l}</span>
                      <span className="text-gray-900 font-medium text-xs text-right max-w-[200px]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── LANDS TAB ── */}
        {activeTab === 'lands' && (
          <div className="space-y-4">
            {farmer.lands?.length > 0 ? farmer.lands.map((land: any) => (
              <div key={land.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-semibold text-gray-900">Survey: {land.surveyGutNumber||land.surveyNumber||'—'}</div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${land.verified?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                    {land.verified?'Verified':'Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {[['Area', `${land.areaAcres||'—'} ac`],['Offered', `${land.areaOfferedAcres||'—'} ${land.areaOfferedUnit||'ac'}`],
                    ['Type', land.landType||'—'],['Village', land.village||'—'],['District', land.district||'—'],
                    ['Ownership', land.ownershipType||'sole'],['GPS', land.gpsLatitude?`${land.gpsLatitude?.toFixed(4)},${land.gpsLongitude?.toFixed(4)}`:'—'],
                    ['Species', land.speciesPreference?.join(', ')||'—'],['Target Trees', land.targetTreeCount||'—'],
                  ].map(([l,v]) => (
                    <div key={l as string}><span className="text-gray-400">{l}: </span><span className="font-medium text-gray-800">{v}</span></div>
                  ))}
                </div>
              </div>
            )) : <p className="text-gray-400 text-sm py-8 text-center">No land parcels registered</p>}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            {farmer.documents?.length > 0 ? farmer.documents.map((d: any) => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{d.docType?.replace(/_/g,' ')}</div>
                  <div className="text-gray-400 text-xs">{d.fileName} · {new Date(d.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${d.status==='VERIFIED'?'bg-green-100 text-green-700':d.status==='REJECTED'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>
                    {d.status}
                  </span>
                  {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sage-600 text-xs hover:underline">View</a>}
                </div>
              </div>
            )) : <p className="text-gray-400 text-sm py-8 text-center">No documents uploaded by farmer</p>}
          </div>
        )}

        {/* ── AGREEMENTS / DOCUMENTS SENT TAB ── */}
        {activeTab === 'agreements' && (
          <div className="space-y-4">
            {/* Generate new document */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Generate & Share Document</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AGREEMENT_TYPES.map(at => (
                  <button key={at.type}
                    onClick={() => { setShowGenModal(at.type); setGenForm({}); }}
                    className="flex items-center gap-2 p-3 border border-sage-200 rounded-xl hover:bg-sage-50 text-left transition-colors">
                    <span className="text-xl">{at.icon}</span>
                    <span className="text-xs font-medium text-sage-800 leading-tight">{at.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List of generated documents */}
            {agreements.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 text-sm">Documents History</h3>
                {agreements.map((ag: any) => (
                  <div key={ag.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{ag.title}</div>
                        <div className="text-gray-400 text-xs">Generated: {new Date(ag.createdAt).toLocaleDateString('en-IN')}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        ag.status==='COMPLETED'   ? 'bg-green-100 text-green-700':
                        ag.status==='SIGNED'      ? 'bg-teal-100 text-teal-700':
                        ag.status==='ACKNOWLEDGED'? 'bg-blue-100 text-blue-700':
                        'bg-amber-100 text-amber-700'}`}>
                        {ag.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/farmer/agreements/${ag.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-sage-600 hover:underline border border-sage-200 rounded-lg px-2 py-1">
                        <Eye className="w-3 h-3"/> View Generated
                      </a>
                      {ag.signedPdfUrl && (
                        <>
                          <a href={ag.signedPdfUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-600 hover:underline border border-green-200 rounded-lg px-2 py-1">
                            <CheckCircle className="w-3 h-3"/> View Signed Copy
                          </a>
                          {ag.status !== 'COMPLETED' && (
                            <button onClick={() => approveSignedCopy(ag.id)}
                              className="flex items-center gap-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded-lg px-2 py-1">
                              <CheckCircle className="w-3 h-3"/> Approve Signed Copy
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {ag.notes && <p className="text-xs text-gray-400 mt-1 italic">{ag.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">No documents generated yet. Use the buttons above to generate documents for this farmer.</p>
            )}
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Time','Action','Actor','Details'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {farmer.auditLogs?.length > 0 ? farmer.auditLogs.map((log: any) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2"><span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{log.action}</span></td>
                    <td className="px-4 py-2 text-xs text-gray-500">{log.actorRole||'—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-400 truncate max-w-[200px]">{log.details?JSON.stringify(log.details).slice(0,60):'—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No audit logs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
