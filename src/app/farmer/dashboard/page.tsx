'use client';
// Farmer dashboard — tenant branded, shows land photos
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';
import { LandGallery } from '@/components/LandGallery';
import {
  User, MapPin, FileText, Home, LogOut,
  TreePine, Plus, CheckCircle, Clock, Image, ChevronRight, Bell,
  Pencil, Check, X, Loader2, Lock
} from 'lucide-react';
import EditableSection from '@/components/farmer/EditableSection';
import { FARMER_LOCK_STATUS, isAtOrBeyondStage } from '@/lib/farmer-constants';

const SPECIES_OPTIONS = ['Neem / नीम','Mango / आम','Bamboo / बांस','Peepal / पीपल','Teak / सागवान','Mixed / मिश्रित','Others / अन्य'];

const TABS = [
  { id:'overview',   label:'Overview',   hi:'अवलोकन',    icon: Home },
  { id:'land',       label:'My Land',    hi:'मेरी भूमि', icon: MapPin },
  { id:'documents',  label:'Documents',  hi:'दस्तावेज़',  icon: FileText },
];

function LandSpeciesEditor({ land, primaryColor, onSaved }: { land: any; primaryColor: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [draft, setDraft]     = useState<string[]>(land.speciesPreference || []);

  async function save() {
    setSaving(true);
    const farmerId = localStorage.getItem('farmerId');
    const res = await fetch('/api/farmer/land', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landId: land.id, farmerId, speciesPreference: draft }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); onSaved(); }
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">Plantation Preference</span>
        {land.verified ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400" title="This land is approved and locked">
            <Lock className="w-3 h-3"/> Locked
          </span>
        ) : editing ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(false); setDraft(land.speciesPreference || []); }} disabled={saving}
              className="text-[10px] font-semibold text-gray-500">Cancel</button>
            <button onClick={save} disabled={saving}
              className="text-[10px] font-semibold text-white px-2 py-1 rounded-lg disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
        ) : (
          <button onClick={() => { setDraft(land.speciesPreference || []); setEditing(true); }}
            className="text-[10px] font-semibold" style={{ color: primaryColor }}>
            Edit
          </button>
        )}
      </div>
      {editing && !land.verified ? (
        <div className="flex flex-wrap gap-1.5">
          {SPECIES_OPTIONS.map(s => (
            <button key={s} type="button"
              onClick={() => setDraft(sp => sp.includes(s) ? sp.filter(x => x !== s) : [...sp, s])}
              className={`px-2.5 py-1 rounded-full text-[10px] border-2 transition-colors ${draft.includes(s) ? 'text-white border-current' : 'border-gray-200 text-gray-600'}`}
              style={draft.includes(s) ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
              {s}
            </button>
          ))}
        </div>
      ) : Array.isArray(land.speciesPreference) && land.speciesPreference.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {land.speciesPreference.map((s: string) => (
            <span key={s} className="bg-white text-gray-700 text-[10px] px-2 py-0.5 rounded-full border border-gray-200">{s}</span>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-[10px]">No species preference set for this parcel.</p>
      )}
    </div>
  );
}

export default function FarmerDashboard() {
  const org    = useOrgConfig();
  const router = useRouter();
  const primaryColor = org.primaryColor || '#2d5a1b';

  const [tab, setTab]         = useState('overview');
  const [farmer, setFarmer]   = useState<any>(null);
  const [lands, setLands]     = useState<any[]>([]);
  const [plantations, setPlantations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);

  async function loadAll() {
    const farmerId = localStorage.getItem('farmerId');
    if (!farmerId) return;
    // Each fetch degrades independently — one endpoint failing (e.g. a
    // pending migration for a newer feature) must never blank out the rest
    // of the farmer's own data.
    const safeFetch = (url: string, fallback: any) =>
      fetch(url).then(r => r.json()).catch(() => fallback);

    const [profileData, landData, plantationData, notifData, agreementsData] = await Promise.all([
      safeFetch(`/api/farmer/profile?farmerId=${farmerId}`, {}),
      safeFetch(`/api/farmer/land?farmerId=${farmerId}`, {}),
      safeFetch(`/api/farmer/plantations?farmerId=${farmerId}`, {}),
      safeFetch(`/api/farmer/notifications?farmerId=${farmerId}`, {}),
      safeFetch(`/api/farmer/agreements?farmerId=${farmerId}`, {}),
    ]);
    if (profileData.farmer) setFarmer(profileData.farmer);
    setPlantations(plantationData.plantations || []);
    if (landData.lands) setLands(landData.lands);
    setUnreadCount(notifData.unreadCount || 0);
    setPendingDocsCount((agreementsData.agreements || []).filter((a: any) => a.status === 'SHARED').length);
    setLoading(false);
  }

  useEffect(() => {
    const farmerId = localStorage.getItem('farmerId');
    if (!farmerId) { router.push('/farmer/login'); return; }
    loadAll();
  }, []);

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerMobile');
    router.push('/farmer/login');
  }

  // Generic handler passed to every EditableSection — PATCHes only the
  // changed fields, then refreshes the farmer record so all sections
  // reflect the saved values (no navigation, no page reload).
  async function handleSectionSave(changed: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    const farmerId = localStorage.getItem('farmerId');
    if (!farmerId) return { success: false, error: 'Session expired. Please login again.' };

    const res = await fetch('/api/farmer/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, ...changed }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return { success: false, error: data.error || 'Failed to save changes' };

    const refreshed = await fetch(`/api/farmer/profile?farmerId=${farmerId}`).then(r => r.json());
    if (refreshed.farmer) setFarmer(refreshed.farmer);
    return { success: true };
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <TreePine className="w-8 h-8 mx-auto mb-3 animate-pulse" style={{ color: primaryColor }}/>
        <p className="text-gray-400 text-sm">Loading your dashboard…</p>
      </div>
    </div>
  );

  const completedFields = farmer ? [
    farmer.fullName, farmer.aadhaarNumber, farmer.gender,
    farmer.dateOfBirth, farmer.bankName, farmer.accountNumber,
  ].filter(Boolean).length : 0;
  const profilePct = Math.round((completedFields / 6) * 100);
  // Once a farmer is fully "Registered" (personal + bank details complete
  // and identity documents verified), their own profile locks — further
  // changes go through Admin. This is a stage on the Farmer entity itself,
  // separate from any individual land's own approval status.
  const profileLocked = isAtOrBeyondStage(farmer?.status, FARMER_LOCK_STATUS);
  const profileLockedMessage = 'Your registration is complete. Contact your administrator to update this information.';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — tenant branded */}
      <div className="text-white px-4 py-4" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {org.logoUrl
              ? <OrgLogo src={org.logoUrl} alt="" size="sm" badge/>
              : <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">{(org.name||'G').charAt(0)}</div>
            }
            <div>
              <div className="font-bold text-sm">{org.loaded ? org.name : ''}</div>
              <div className="text-white/70 text-xs">Land Owner Dashboard / भूमि स्वामी डैशबोर्ड</div>
            </div>
          </div>
          <button onClick={() => router.push('/farmer/notifications')} aria-label="Notifications"
            className="relative text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <Bell className="w-4 h-4"/>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={logout} aria-label="Sign Out" className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Farmer ID bar */}
      {farmer && (
        <div className="text-white px-4 py-3" style={{ backgroundColor: primaryColor + 'dd' }}>
          <div className="max-w-xl mx-auto flex items-center justify-between text-xs">
            <div>
              <span className="text-white/70">Farmer ID: </span>
              <span className="font-mono font-bold">{farmer.farmerIdGenerated || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${profileLocked ? 'bg-green-400' : 'bg-amber-400'}`}/>
              <span className="text-white/80">{farmer.status?.replace(/_/g,' ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-xl mx-auto flex">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-current' : 'border-transparent text-gray-400'
              }`}
              style={tab === t.id ? { color: primaryColor, borderColor: primaryColor } : {}}>
              <t.icon className="w-4 h-4 mb-0.5"/>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {/* A document waiting for signature is the single most time-sensitive
                thing a farmer can miss — surface it before anything else. */}
            {pendingDocsCount > 0 && (
              <a href="/farmer/documents"
                className="block bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-100 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-amber-700"/>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-amber-900 text-sm">
                    {pendingDocsCount} Document{pendingDocsCount === 1 ? '' : 's'} Waiting For You
                  </div>
                  <div className="text-amber-700 text-xs mt-0.5">Your admin has shared a document — tap to view and sign</div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0"/>
              </a>
            )}

            {/* My Active Plantations — answers "which plantation am I working on" first */}
            <div>
              <h2 className="font-bold text-gray-900 text-sm mb-3">My Active Plantations</h2>
              {plantations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                  <TreePine className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                  <p className="text-gray-500 text-sm">No plantation has been assigned yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Once an admin assigns your land to a plantation site, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plantations.map((p: any) => (
                    <a key={p.id} href={`/farmer/plantation/${p.id}`}
                      className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{p.siteName}</div>
                          <div className="text-gray-400 text-xs mt-0.5">
                            {p.orgName}{p.landSurveyNumber ? ` · Survey ${p.landSurveyNumber}` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
                          {p.stage?.replace(/_/g,' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div className="bg-gray-50 rounded-lg py-2">
                          <div className="font-bold text-gray-900 text-sm">{p.treesPlanted || p.treesAssigned}</div>
                          <div className="text-gray-400 text-[10px]">Trees</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg py-2">
                          <div className="font-bold text-gray-900 text-sm">{p.landAreaAcres ? `${p.landAreaAcres}ac` : '—'}</div>
                          <div className="text-gray-400 text-[10px]">Land Area</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg py-2">
                          <div className="font-bold text-gray-900 text-sm">
                            {p.lastMonitored ? new Date(p.lastMonitored).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : '—'}
                          </div>
                          <div className="text-gray-400 text-[10px]">Last Visit</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end mt-2 text-xs font-semibold" style={{ color: primaryColor }}>
                        View Details <ChevronRight className="w-3.5 h-3.5"/>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Profile card — identity + quick summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: primaryColor }}>
                  {farmer?.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{farmer?.fullName || 'Pending'}</h2>
                  <p className="text-gray-400 text-xs">{farmer?.mobile}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-gray-400">Farmer ID</div>
                  <div className="text-xs font-semibold text-gray-700">{farmer?.farmerIdGenerated || '—'}</div>
                </div>
              </div>

              {/* Profile completion */}
              <div className="mb-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Profile Completion</span>
                  <span className="font-semibold" style={{ color: primaryColor }}>{profilePct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${profilePct}%`, backgroundColor: primaryColor }}/>
                </div>
              </div>
            </div>

            {/* Personal Details — inline section edit */}
            <EditableSection title="Personal Details" primaryColor={primaryColor}
              fields={[
                { key:'fullName',    label:'Full Name',     value: farmer?.fullName, locked: true },
                { key:'mobile',      label:'Mobile',        value: farmer?.mobile,   locked: true },
                { key:'fatherName',  label:"Father's Name", value: farmer?.fatherName },
                { key:'gender',      label:'Gender',        value: farmer?.gender, type:'select', options:['Male','Female','Other'] },
                { key:'dob',         label:'Date of Birth', value: farmer?.dateOfBirth ? farmer.dateOfBirth.slice(0,10) : '', type:'date' },
                { key:'aadhaarNumber', label:'Aadhaar (Government ID)', value: farmer?.aadhaarNumber, locked: true },
                { key:'panNumber',   label:'PAN',           value: farmer?.panNumber },
                { key:'occupation',  label:'Occupation',    value: farmer?.occupation },
                { key:'alternateMobile', label:'Alternate Mobile', value: farmer?.alternateMobile, type:'tel' },
                { key:'email',       label:'Email',         value: farmer?.email, type:'email' },
                { key:'gisId',       label:'GIS ID',        value: farmer?.gisId, locked: true },
                { key:'farmerIdGenerated', label:'Farmer ID', value: farmer?.farmerIdGenerated, locked: true },
                { key:'createdAt',   label:'Registered On', value: farmer?.createdAt ? new Date(farmer.createdAt).toLocaleDateString('en-IN') : null, locked: true },
                { key:'status',      label:'Status',        value: farmer?.status?.replace(/_/g,' '), locked: true },
              ]}
              onSave={handleSectionSave}
              locked={profileLocked}
              lockedMessage={profileLockedMessage}
            />

            {/* Bank Details — inline section edit */}
            <EditableSection title="Bank Details" primaryColor={primaryColor}
              fields={[
                { key:'bankAccountName', label:'Account Holder', value: farmer?.bankAccountName },
                { key:'bankName',        label:'Bank Name',      value: farmer?.bankName },
                { key:'accountNumber',   label:'Account Number', value: farmer?.accountNumber },
                { key:'ifscCode',        label:'IFSC Code',      value: farmer?.ifscCode },
              ]}
              onSave={handleSectionSave}
              locked={profileLocked}
              lockedMessage={profileLockedMessage}
            />

            {/* Nominee — inline section edit */}
            <EditableSection title="Nominee Details" primaryColor={primaryColor}
              fields={[
                { key:'nomineeName',     label:'Nominee Name', value: farmer?.nomineeName },
                { key:'nomineeRelation', label:'Relation',     value: farmer?.nomineeRelation },
                { key:'nomineeDob',      label:'Date of Birth',value: farmer?.nomineeDob ? farmer.nomineeDob.slice(0,10) : '', type:'date' },
                { key:'nomineeMobile',   label:'Mobile',       value: farmer?.nomineeMobile, type:'tel' },
                { key:'nomineeAadhaar',  label:'Aadhaar',      value: farmer?.nomineeAadhaar },
                { key:'nomineeAddress',  label:'Address',      value: farmer?.nomineeAddress },
              ]}
              onSave={handleSectionSave}
              locked={profileLocked}
              lockedMessage={profileLockedMessage}
            />

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <a href="/farmer/land"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: primaryColor + '20' }}>
                  <Plus className="w-5 h-5" style={{ color: primaryColor }}/>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Add Land</div>
                  <div className="text-gray-400 text-xs">भूमि जोड़ें</div>
                </div>
              </a>
              <a href="/farmer/documents"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                  <FileText className="w-5 h-5 text-blue-600"/>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Documents</div>
                  <div className="text-gray-400 text-xs">दस्तावेज़</div>
                </div>
              </a>
              <a href="/farmer/updates"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow col-span-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
                  <Image className="w-5 h-5 text-amber-600"/>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">My Updates</div>
                  <div className="text-gray-400 text-xs">Share watering, weeding, or plantation photos / अपडेट भेजें</div>
                </div>
              </a>
            </div>
          </>
        )}

        {/* ── MY LAND ── */}
        {tab === 'land' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{lands.length} Land Parcel{lands.length !== 1 ? 's' : ''}</h2>
              <a href="/farmer/land"
                className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl text-white"
                style={{ backgroundColor: primaryColor }}>
                <Plus className="w-3.5 h-3.5"/> Add Land
              </a>
            </div>

            {lands.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
                <p className="text-gray-400 text-sm">No land parcels added yet</p>
                <a href="/farmer/land"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-white mt-3"
                  style={{ backgroundColor: primaryColor }}>
                  <Plus className="w-3.5 h-3.5"/> Add Your First Land Parcel
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {lands.map((land: any, i: number) => {
                  const photos = land.photos || [];
                  const landPhoto = photos[0] || null;

                  return (
                    <div key={land.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Land photo */}
                      {landPhoto ? (
                        <img src={landPhoto} alt="Land photo" className="w-full h-48 object-cover"/>
                      ) : (
                        <div className="w-full h-32 bg-gray-50 flex items-center justify-center">
                          <div className="text-center">
                            <Image className="w-8 h-8 text-gray-200 mx-auto mb-1"/>
                            <p className="text-gray-300 text-xs">No photo uploaded</p>
                          </div>
                        </div>
                      )}

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900">Parcel #{i + 1}</h3>
                          <div className="flex items-center gap-2">
                            {land.verified ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3"/> {(land.status || 'APPROVED').replace(/_/g,' ')}
                              </span>
                            ) : (
                              <>
                                <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                                  {(land.status || 'DOCUMENTS_PENDING').replace(/_/g,' ')}
                                </span>
                                <a href={`/farmer/land?id=${land.id}`}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border"
                                  style={{ color: primaryColor, borderColor: primaryColor + '40' }}>
                                  Edit
                                </a>
                              </>
                            )}
                            <span className="text-xs font-mono text-gray-400">{land.surveyGutNumber || '—'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            { label:'Area',     value: land.areaAcres ? `${land.areaAcres} acres` : '—' },
                            { label:'Offered',  value: land.areaOfferedAcres ? `${land.areaOfferedAcres} acres` : '—' },
                            { label:'Type',     value: land.landType?.replace('_',' ') || '—' },
                            { label:'Ownership',value: land.ownershipType === 'joint'
                                ? `Joint (${land.jointOwnerCount || '?'} owners)`
                                : (land.ownershipType ? 'Sole' : '—') },
                            { label:'Village',  value: land.village || '—' },
                            { label:'District', value: land.district || '—' },
                            { label:'State',    value: land.state || '—' },
                          ].map(r => (
                            <div key={r.label} className="bg-gray-50 rounded-xl p-2">
                              <div className="text-gray-400 text-[10px]">{r.label}</div>
                              <div className="font-semibold text-gray-800 truncate">{r.value}</div>
                            </div>
                          ))}
                        </div>

                        {land.gpsLatitude && (
                          <div className="bg-green-50 rounded-xl p-2 text-xs font-mono text-green-700">
                            📍 {land.gpsLatitude}, {land.gpsLongitude}
                          </div>
                        )}

                        {/* All uploaded land/KML photos — not just the first
                            two, which is all this card used to show; any
                            photo beyond that was previously never visible
                            anywhere. */}
                        {photos.length > 0 && (
                          <LandGallery variant="admin" photos={photos} kmlFileName={land.kmlFileName}/>
                        )}

                        {/* Plantation Preference — per land, moved here from the profile so
                            different parcels can request different species */}
                        <LandSpeciesEditor land={land} primaryColor={primaryColor} onSaved={loadAll}/>

                        {land.ownershipType === 'joint' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                              <div>
                                <p className="text-amber-800 text-xs font-semibold">This land has {land.jointOwnerCount || 'multiple'} co-owners</p>
                                <p className="text-amber-700 text-xs mt-0.5">
                                  Each co-owner needs to sign a No Objection Certificate before this land can be approved.
                                </p>
                                <a href={`/api/farmer/land/${land.id}/joint-noc-sample`} target="_blank" rel="noopener noreferrer"
                                  className="inline-block mt-2 text-xs font-bold text-amber-900 underline">
                                  Download Sample NOC Template →
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {!land.verified && (
                          <a href={`/farmer/land?id=${land.id}`} className="flex items-center justify-center gap-1.5 text-xs font-semibold border-2 border-dashed border-gray-200 rounded-xl py-2 text-gray-400 hover:border-gray-300">
                            <Plus className="w-3.5 h-3.5"/> Edit Photos / Details
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === 'documents' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Required Documents / आवश्यक दस्तावेज़</h2>
            <div className="space-y-3">
              {[
                { label:'Aadhaar Card',       hi:'आधार कार्ड',          done: !!farmer?.aadhaarNumber },
                { label:'7/12 Extract',        hi:'7/12 उतारा',          done: false },
                { label:'Bank Passbook',       hi:'बैंक पासबुक',         done: !!farmer?.bankName },
                { label:'Land Photo',          hi:'भूमि फ़ोटो',          done: lands.some((l: any) => l.photos?.[0]) },
                { label:'KML Map',             hi:'KML मानचित्र',        done: lands.some((l: any) => l.photos?.[1]) },
                { label:'NOC (if joint owner)',hi:'NOC (संयुक्त स्वामी)',done: false },
              ].map(doc => (
                <div key={doc.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{doc.label}</div>
                    <div className="text-xs text-gray-400">{doc.hi}</div>
                  </div>
                  {doc.done
                    ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0"/>
                    : <Clock className="w-5 h-5 text-amber-400 flex-shrink-0"/>
                  }
                </div>
              ))}
            </div>
            <a href="/farmer/documents"
              className="mt-4 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl text-white"
              style={{ backgroundColor: primaryColor }}>
              Upload Documents / दस्तावेज़ अपलोड करें
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
