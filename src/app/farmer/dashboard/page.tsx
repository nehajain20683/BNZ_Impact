'use client';
// src/app/farmer/dashboard/page.tsx — Full Land Owner Dashboard
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  TreePine, MapPin, DollarSign, Leaf, FileText, CheckCircle,
  Clock, AlertCircle, Plus, LogOut, Edit, Eye, Upload,
  Download, Shield, Users, ChevronDown, ChevronUp, User, X
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  REGISTERED:           { label: 'Registered',           color: 'bg-blue-100 text-blue-700' },
  DOCUMENTS_PENDING:    { label: 'Documents Pending',    color: 'bg-amber-100 text-amber-700' },
  DOCUMENTS_VERIFIED:   { label: 'Documents Verified',   color: 'bg-teal-100 text-teal-700' },
  INSPECTION_PENDING:   { label: 'Inspection Pending',   color: 'bg-orange-100 text-orange-700' },
  INSPECTION_COMPLETED: { label: 'Inspection Completed', color: 'bg-cyan-100 text-cyan-700' },
  APPROVED:             { label: 'Approved ✅',           color: 'bg-green-100 text-green-800' },
  ACTIVE:               { label: 'Active Project',       color: 'bg-sage-100 text-sage-800' },
  SUSPENDED:            { label: 'Suspended',            color: 'bg-red-100 text-red-700' },
};

const AGREEMENT_ICONS: Record<string, string> = {
  PARTICIPATION_AGREEMENT: '📜',
  PAYMENT_RECEIPT:         '💰',
  SAPLING_RECEIPT:         '🌱',
  PLANTATION_CERTIFICATE:  '🏆',
  JOINT_OWNER_NOC:         '📋',
};

const inp = "w-full border border-sage-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [farmer, setFarmer]     = useState<any>(null);
  const [stats, setStats]       = useState<any>(null);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'profile'|'lands'|'documents'|'agreements'>('overview');
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [farmerId, setFarmerIdLocal] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function loadData(id: string) {
    try {
      const [profileRes, agreementsRes] = await Promise.all([
        fetch(`/api/farmer/profile?farmerId=${id}`),
        fetch(`/api/farmer/agreements?farmerId=${id}`).catch(() => null),
      ]);
      const profileData = await profileRes.json().catch(() => ({}));
      const agreeData   = agreementsRes ? await agreementsRes.json().catch(() => ({})) : {};
      if (profileData.farmer) {
        setFarmer(profileData.farmer);
        setStats(profileData.stats || {});
        setProfileForm({
          email:           profileData.farmer.email || '',
          alternateMobile: profileData.farmer.alternateMobile || '',
          village:         profileData.farmer.village || '',
          taluka:          profileData.farmer.taluka || '',
          district:        profileData.farmer.district || '',
          state:           profileData.farmer.state || '',
          pincode:         profileData.farmer.pincode || '',
          occupation:      profileData.farmer.occupation || '',
          bankAccountName: profileData.farmer.bankAccountName || '',
          bankName:        profileData.farmer.bankName || '',
          accountNumber:   profileData.farmer.accountNumber || '',
          ifscCode:        profileData.farmer.ifscCode || '',
          nomineeName:     profileData.farmer.nomineeName || '',
          nomineeRelation: profileData.farmer.nomineeRelation || '',
          nomineeMobile:   profileData.farmer.nomineeMobile || '',
          nomineeAddress:  profileData.farmer.nomineeAddress || '',
        });
      }
      setAgreements(agreeData.agreements || []);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = localStorage.getItem('farmerId');
    if (!id) { router.push('/farmer/login'); return; }
    setFarmerIdLocal(id);
    loadData(id);
  }, []);

  async function saveProfile() {
    setSaving(true);
    const res  = await fetch('/api/farmer/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, ...profileForm }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) { showToast('Profile updated successfully'); setEditProfile(false); loadData(farmerId); }
    else showToast('Failed to save: ' + data.error);
  }

  async function acknowledgeAgreement(agreementId: string) {
    await fetch('/api/farmer/agreements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId, action: 'acknowledge' }),
    });
    loadData(farmerId);
    showToast('Document acknowledged');
  }

  async function uploadSignedDoc(agreementId: string, file: File) {
    // Convert to base64 for simple storage
    const reader = new FileReader();
    reader.onload = async () => {
      await fetch('/api/farmer/agreements', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, action: 'upload_signed', signedPdfUrl: reader.result }),
      });
      loadData(farmerId);
      showToast('Signed document uploaded ✓');
    };
    reader.readAsDataURL(file);
  }

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerToken');
    router.push('/farmer/login');
  }

  if (loading) return (
    <div className="min-h-screen bg-sage-50 flex items-center justify-center">
      <div className="text-sage-600 text-sm">Loading your dashboard…</div>
    </div>
  );

  if (!farmer) return (
    <div className="min-h-screen bg-sage-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sage-600 mb-4">Session expired</p>
        <Link href="/farmer/login" className="bg-sage-700 text-white px-6 py-3 rounded-xl font-semibold">Login</Link>
      </div>
    </div>
  );

  const statusCfg = STATUS_CONFIG[farmer.status] || STATUS_CONFIG.REGISTERED;
  const newAgreements = agreements.filter(a => a.status === 'GENERATED' || a.status === 'SHARED').length;

  return (
    <div className="min-h-screen bg-sage-50">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sage-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <div className="font-bold text-sm">🌳 JITO Green Legacy</div>
            <div className="text-sage-300 text-xs">Land Owner Dashboard / भूमि स्वामी डैशबोर्ड</div>
          </div>
          <button onClick={logout} className="text-sage-400 hover:text-white flex items-center gap-1 text-sm">
            <LogOut className="w-4 h-4"/> Logout
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Registration success banner */}
        {searchParams.get('registered') && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0"/>
            <div>
              <div className="font-semibold text-green-800 text-sm">Registration Successful!</div>
              <div className="text-green-600 text-xs">Our team will review your application and contact you shortly.</div>
            </div>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl text-sage-950">{farmer.fullName}</h2>
              <p className="text-sage-500 text-sm">{farmer.mobile}</p>
              {farmer.farmerIdGenerated && (
                <p className="text-sage-400 text-xs font-mono mt-0.5">{farmer.farmerIdGenerated}</p>
              )}
              {farmer.gisId && (
                <p className="text-sage-300 text-xs font-mono">GIS: {farmer.gisId}</p>
              )}
              <p className="text-sage-400 text-xs mt-0.5">
                Registered: {new Date(farmer.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-sage-400 mb-1">
              <span>Onboarding Progress</span>
              <span>{farmer.registrationStep || 1}/8 steps</span>
            </div>
            <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
              <div className="h-full bg-sage-600 rounded-full" style={{ width: `${Math.min(100, ((farmer.registrationStep||1)/8)*100)}%` }}/>
            </div>
          </div>
          {/* Notification badge for new agreements */}
          {newAgreements > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0"/>
              <span className="text-amber-700 font-medium">{newAgreements} new document{newAgreements>1?'s':''} require your attention</span>
              <button onClick={() => setActiveTab('agreements')} className="ml-auto text-amber-600 text-xs font-bold hover:underline">View →</button>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-white rounded-xl border border-sage-100 p-1 mb-4 overflow-x-auto">
          {[
            { id:'overview',    label:'Overview',   icon: Leaf },
            { id:'profile',     label:'Profile',    icon: User },
            { id:'lands',       label:'My Land',    icon: MapPin },
            { id:'documents',   label:'Documents',  icon: FileText },
            { id:'agreements',  label: `Agreements${newAgreements>0?` (${newAgreements})`:''}`, icon: Shield },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-1 justify-center ${
                activeTab === t.id ? 'bg-sage-700 text-white' : 'text-sage-500 hover:text-sage-700 hover:bg-sage-50'
              }`}>
              <t.icon className="w-3.5 h-3.5"/> {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Land Registered', value:`${(stats?.totalLandAcres||0).toFixed(1)} ac`, color:'bg-blue-50 text-blue-700', icon:MapPin },
                { label:'Trees Planted',   value:stats?.totalTreesPlanted||0, color:'bg-green-50 text-green-700', icon:TreePine },
                { label:'CO₂ Credits',     value:`${(stats?.totalCO2||0).toFixed(1)} tCO₂`, color:'bg-emerald-50 text-emerald-700', icon:Leaf },
                { label:'Revenue Earned',  value:`₹${(stats?.totalRevenue||0).toLocaleString('en-IN')}`, color:'bg-amber-50 text-amber-700', icon:DollarSign },
              ].map(s=>(
                <div key={s.label} className={`${s.color} rounded-2xl p-4 border border-current/10`}>
                  <s.icon className="w-4 h-4 mb-1.5 opacity-70"/>
                  <div className="font-bold text-lg leading-none">{s.value}</div>
                  <div className="text-xs mt-1 opacity-70">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-sage-100 p-4 shadow-sm">
              <h3 className="font-semibold text-sage-900 text-sm mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2 p-3 rounded-xl border border-sage-100 hover:bg-sage-50 text-sm text-sage-700">
                  <Edit className="w-4 h-4 text-sage-400"/> Edit Profile
                </button>
                <Link href="/farmer/documents"
                  className="flex items-center gap-2 p-3 rounded-xl border border-sage-100 hover:bg-sage-50 text-sm text-sage-700">
                  <Upload className="w-4 h-4 text-sage-400"/> Upload Docs
                </Link>
                <button onClick={() => setActiveTab('agreements')}
                  className="flex items-center gap-2 p-3 rounded-xl border border-sage-100 hover:bg-sage-50 text-sm text-sage-700 relative">
                  <Shield className="w-4 h-4 text-sage-400"/> My Documents
                  {newAgreements>0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center">{newAgreements}</span>}
                </button>
                <Link href="/farmer/land"
                  className="flex items-center gap-2 p-3 rounded-xl border border-sage-100 hover:bg-sage-50 text-sm text-sage-700">
                  <Plus className="w-4 h-4 text-sage-400"/> Add Land
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sage-900">Profile Details / प्रोफाइल विवरण</h3>
              <button onClick={() => setEditProfile(!editProfile)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${editProfile ? 'bg-red-50 text-red-600' : 'bg-sage-100 text-sage-700'}`}>
                {editProfile ? <><X className="w-3 h-3"/> Cancel</> : <><Edit className="w-3 h-3"/> Edit</>}
              </button>
            </div>

            {/* Non-editable fields */}
            <div className="bg-sage-50 rounded-xl p-4 mb-4 border border-sage-100">
              <p className="text-xs text-sage-400 mb-2">Fields below can only be edited by Admin</p>
              {[
                ['Full Name / पूरा नाम', farmer.fullName],
                ['Mobile / मोबाइल', farmer.mobile],
                ['Farmer ID', farmer.farmerIdGenerated || '—'],
                ['GIS ID', farmer.gisId || '—'],
                ["Father's Name / पिता का नाम", farmer.fatherName || '—'],
                ['Aadhaar', farmer.aadhaarNumber ? '••••••••'+farmer.aadhaarNumber.slice(-4) : '—'],
                ['Gender / लिंग', farmer.gender || '—'],
                ['Date of Birth / जन्म तिथि', farmer.dateOfBirth ? new Date(farmer.dateOfBirth).toLocaleDateString('en-IN') : '—'],
                ['Registered On', new Date(farmer.createdAt).toLocaleDateString('en-IN')],
                ['Status', farmer.status?.replace(/_/g,' ')],
              ].map(([l,v]) => (
                <div key={l as string} className="flex items-center justify-between py-1.5 border-b border-sage-100 last:border-0">
                  <span className="text-sage-500 text-xs">{l}</span>
                  <span className="text-sage-900 text-xs font-semibold">{v}</span>
                </div>
              ))}
            </div>

            {/* Editable fields */}
            {editProfile ? (
              <div className="space-y-3">
                {[
                  { k:'email',          en:'Email',           hi:'ईमेल',         type:'email' },
                  { k:'alternateMobile',en:'Alternate Mobile',hi:'वैकल्पिक मोबाइल',type:'tel' },
                  { k:'occupation',     en:'Occupation',      hi:'व्यवसाय',        type:'text' },
                  { k:'village',        en:'Village',         hi:'गांव',           type:'text' },
                  { k:'taluka',         en:'Taluka',          hi:'तालुका',          type:'text' },
                  { k:'district',       en:'District',        hi:'जिला',           type:'text' },
                  { k:'state',          en:'State',           hi:'राज्य',           type:'text' },
                  { k:'pincode',        en:'Pincode',         hi:'पिन कोड',         type:'text' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-xs font-semibold text-sage-700 mb-1">
                      {f.en} / <span className="text-sage-400 font-normal">{f.hi}</span>
                    </label>
                    <input type={f.type} value={profileForm[f.k] || ''}
                      onChange={e => setProfileForm((p: any) => ({...p,[f.k]:e.target.value}))}
                      className={inp}/>
                  </div>
                ))}
                <div className="border-t border-sage-100 pt-3">
                  <p className="text-xs font-semibold text-sage-700 mb-2">Bank Details / बैंक विवरण</p>
                  {[
                    { k:'bankAccountName', en:'Account Holder Name', hi:'खाताधारक का नाम' },
                    { k:'bankName',        en:'Bank Name',           hi:'बैंक का नाम' },
                    { k:'accountNumber',   en:'Account Number',      hi:'खाता संख्या' },
                    { k:'ifscCode',        en:'IFSC Code',           hi:'IFSC कोड' },
                  ].map(f => (
                    <div key={f.k} className="mb-2">
                      <label className="block text-xs text-sage-600 mb-1">{f.en} / {f.hi}</label>
                      <input type="text" value={profileForm[f.k] || ''}
                        onChange={e => setProfileForm((p: any) => ({...p,[f.k]:e.target.value}))}
                        className={inp}/>
                    </div>
                  ))}
                </div>
                <div className="border-t border-sage-100 pt-3">
                  <p className="text-xs font-semibold text-sage-700 mb-2">Nominee Details / नामांकित विवरण</p>
                  {[
                    { k:'nomineeName',     en:'Nominee Name',    hi:'नामांकित का नाम' },
                    { k:'nomineeRelation', en:'Relationship',    hi:'संबंध' },
                    { k:'nomineeMobile',   en:'Mobile',          hi:'मोबाइल' },
                    { k:'nomineeAddress',  en:'Address',         hi:'पता' },
                  ].map(f => (
                    <div key={f.k} className="mb-2">
                      <label className="block text-xs text-sage-600 mb-1">{f.en} / {f.hi}</label>
                      <input type="text" value={profileForm[f.k] || ''}
                        onChange={e => setProfileForm((p: any) => ({...p,[f.k]:e.target.value}))}
                        className={inp}/>
                    </div>
                  ))}
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="w-full bg-sage-700 hover:bg-sage-800 text-white font-bold py-3 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? 'Saving…' : '✓ Save Changes / बदलाव सहेजें'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  ['Email', farmer.email || '—'],
                  ['Alt. Mobile', farmer.alternateMobile || '—'],
                  ['Occupation', farmer.occupation || '—'],
                  ['Village', farmer.village || '—'],
                  ['Taluka', farmer.taluka || '—'],
                  ['District', farmer.district || '—'],
                  ['State', farmer.state || '—'],
                  ['Pincode', farmer.pincode || '—'],
                  ['Bank', farmer.bankName ? `${farmer.bankName} — ••••${farmer.accountNumber?.slice(-4)||''}` : '—'],
                  ['IFSC', farmer.ifscCode || '—'],
                  ['Nominee', farmer.nomineeName ? `${farmer.nomineeName} (${farmer.nomineeRelation||''})` : '—'],
                ].map(([l,v]) => (
                  <div key={l as string} className="flex items-center justify-between py-1.5 border-b border-sage-50 last:border-0">
                    <span className="text-sage-500 text-xs">{l}</span>
                    <span className="text-sage-900 text-xs font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LANDS TAB ── */}
        {activeTab === 'lands' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sage-900">Land Parcels / भूमि पार्सल</h3>
              <Link href="/farmer/land"
                className="flex items-center gap-1.5 bg-sage-700 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-sage-800">
                <Plus className="w-3.5 h-3.5"/> Add Land
              </Link>
            </div>
            {farmer.lands?.length > 0 ? farmer.lands.map((land: any) => (
              <div key={land.id} className="bg-white rounded-2xl border border-sage-100 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-sage-900 text-sm">
                      Survey: {land.surveyGutNumber || land.surveyNumber || 'N/A'}
                    </div>
                    <div className="text-sage-400 text-xs mt-0.5">
                      {land.areaAcres} acres · {land.district} · {land.landType?.replace('_',' ')||'—'}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${land.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {land.verified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Khata No.', land.khataNumber||'—'],
                    ['Area Offered', land.areaOfferedAcres ? `${land.areaOfferedAcres} ${land.areaOfferedUnit||'ac'}` : '—'],
                    ['Ownership', land.ownershipType||'sole'],
                    ['Village', land.village||'—'],
                    ['GPS', land.gpsLatitude ? `${land.gpsLatitude?.toFixed(4)}, ${land.gpsLongitude?.toFixed(4)}` : '—'],
                    ['Species', land.speciesPreference?.join(', ')||'—'],
                  ].map(([l,v]) => (
                    <div key={l as string}>
                      <span className="text-sage-400">{l}: </span>
                      <span className="text-sage-800 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                {land.ownershipType === 'joint' && (
                  <div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <p className="text-amber-700 text-xs font-semibold mb-1">
                      Joint Ownership — {land.jointOwnerCount || '?'} co-owners
                    </p>
                    <p className="text-amber-600 text-xs">
                      {land.nocUploaded ? '✓ NOC uploaded' : 'NOC not yet uploaded — check Agreements tab'}
                    </p>
                  </div>
                )}
              </div>
            )) : (
              <div className="bg-white rounded-2xl border border-sage-100 p-8 text-center shadow-sm">
                <MapPin className="w-8 h-8 mx-auto text-sage-300 mb-2"/>
                <p className="text-sage-500 text-sm mb-3">No land parcels registered yet</p>
                <Link href="/farmer/land"
                  className="inline-flex items-center gap-2 bg-sage-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl">
                  <Plus className="w-4 h-4"/> Add Your First Land Parcel
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sage-900">Uploaded Documents / दस्तावेज़</h3>
              <Link href="/farmer/documents"
                className="flex items-center gap-1.5 bg-sage-700 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-sage-800">
                <Upload className="w-3.5 h-3.5"/> Upload
              </Link>
            </div>
            {farmer.documents?.length > 0 ? farmer.documents.map((d: any) => (
              <div key={d.id} className="bg-white rounded-xl border border-sage-100 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sage-400"/>
                  <div>
                    <div className="text-sage-800 text-sm font-medium">{d.docType?.replace(/_/g,' ')}</div>
                    <div className="text-sage-400 text-xs">{d.fileName || 'Document'}</div>
                    {d.rejectionReason && <div className="text-red-500 text-xs mt-0.5">Rejected: {d.rejectionReason}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    d.status==='VERIFIED' ? 'bg-green-100 text-green-700' :
                    d.status==='REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'}`}>
                    {d.status}
                  </span>
                  {d.status === 'REJECTED' && (
                    <Link href="/farmer/documents" className="text-sage-600 text-xs hover:underline">Re-upload</Link>
                  )}
                </div>
              </div>
            )) : (
              <div className="bg-white rounded-2xl border border-sage-100 p-8 text-center shadow-sm">
                <FileText className="w-8 h-8 mx-auto text-sage-300 mb-2"/>
                <p className="text-sage-500 text-sm mb-3">No documents uploaded yet</p>
                <Link href="/farmer/documents"
                  className="inline-flex items-center gap-2 bg-sage-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl">
                  <Upload className="w-4 h-4"/> Upload Documents
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── AGREEMENTS TAB ── */}
        {activeTab === 'agreements' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sage-900">Documents & Agreements / दस्तावेज़ एवं समझौते</h3>
            {agreements.length === 0 ? (
              <div className="bg-white rounded-2xl border border-sage-100 p-8 text-center shadow-sm">
                <Shield className="w-8 h-8 mx-auto text-sage-300 mb-2"/>
                <p className="text-sage-500 text-sm">No documents shared by admin yet</p>
                <p className="text-sage-400 text-xs mt-1">Documents will appear here once your registration is processed.</p>
              </div>
            ) : agreements.map((ag: any) => (
              <div key={ag.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${
                ag.status === 'GENERATED' || ag.status === 'SHARED' ? 'border-amber-200 bg-amber-50/30' : 'border-sage-100'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{AGREEMENT_ICONS[ag.agreementType] || '📄'}</span>
                    <div>
                      <div className="font-semibold text-sage-900 text-sm">{ag.title}</div>
                      <div className="text-sage-400 text-xs">
                        Shared: {new Date(ag.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    ag.status === 'SIGNED'       ? 'bg-green-100 text-green-700' :
                    ag.status === 'ACKNOWLEDGED' ? 'bg-blue-100 text-blue-700' :
                    ag.status === 'GENERATED'    ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {ag.status}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {/* View */}
                  <a href={`/api/farmer/agreements/${ag.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-sage-100 text-sage-700 rounded-lg hover:bg-sage-200">
                    <Eye className="w-3.5 h-3.5"/> View / Download
                  </a>

                  {/* Acknowledge if new */}
                  {(ag.status === 'GENERATED' || ag.status === 'SHARED') && (
                    <button onClick={() => acknowledgeAgreement(ag.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <CheckCircle className="w-3.5 h-3.5"/> Acknowledge
                    </button>
                  )}

                  {/* Upload signed copy */}
                  {ag.status === 'ACKNOWLEDGED' && (
                    <label className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
                      <Upload className="w-3.5 h-3.5"/> Upload Signed Copy
                      <input type="file" accept="image/*,application/pdf" className="hidden"
                        onChange={e => e.target.files?.[0] && uploadSignedDoc(ag.id, e.target.files[0])}/>
                    </label>
                  )}

                  {/* View signed copy */}
                  {ag.signedPdfUrl && (
                    <a href={ag.signedPdfUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5"/> View Signed Copy
                    </a>
                  )}
                </div>

                {ag.notes && (
                  <p className="mt-2 text-xs text-sage-500 italic">{ag.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function FarmerDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-sage-600">Loading…</div></div>}>
      <DashboardContent/>
    </Suspense>
  );
}
