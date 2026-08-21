'use client';
// Farmer dashboard — tenant branded, shows land photos
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import {
  User, MapPin, FileText, Home, LogOut,
  TreePine, Plus, CheckCircle, Clock, Image
} from 'lucide-react';

const TABS = [
  { id:'overview',   label:'Overview',   hi:'अवलोकन',    icon: Home },
  { id:'land',       label:'My Land',    hi:'मेरी भूमि', icon: MapPin },
  { id:'documents',  label:'Documents',  hi:'दस्तावेज़',  icon: FileText },
];

export default function FarmerDashboard() {
  const org    = useOrgConfig();
  const router = useRouter();
  const primaryColor = org.primaryColor || '#2d5a1b';

  const [tab, setTab]         = useState('overview');
  const [farmer, setFarmer]   = useState<any>(null);
  const [lands, setLands]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const farmerId = localStorage.getItem('farmerId');
    if (!farmerId) { router.push('/farmer/login'); return; }

    Promise.all([
      fetch(`/api/farmer/profile?farmerId=${farmerId}`).then(r => r.json()),
      fetch(`/api/farmer/land?farmerId=${farmerId}`).then(r => r.json()),
    ]).then(([profileData, landData]) => {
      if (profileData.farmer) setFarmer(profileData.farmer);
      if (landData.lands) setLands(landData.lands);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerMobile');
    router.push('/farmer/login');
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
    farmer.dob, farmer.bankName, farmer.accountNumber,
  ].filter(Boolean).length : 0;
  const profilePct = Math.round((completedFields / 6) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — tenant branded */}
      <div className="text-white px-4 py-4" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {org.logoUrl
              ? <img src={org.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/20 p-0.5"/>
              : <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">{(org.name||'G').charAt(0)}</div>
            }
            <div>
              <div className="font-bold text-sm">{org.loaded ? org.name : ''}</div>
              <div className="text-white/70 text-xs">Land Owner Dashboard / भूमि स्वामी डैशबोर्ड</div>
            </div>
          </div>
          <button onClick={logout} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
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
              <div className={`w-1.5 h-1.5 rounded-full ${farmer.status === 'VERIFIED' ? 'bg-green-400' : 'bg-amber-400'}`}/>
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
            {/* Profile card */}
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
                <a href="/farmer/register" className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg border"
                  style={{ color: primaryColor, borderColor: primaryColor + '40' }}>
                  Edit Profile
                </a>
              </div>

              {/* Profile completion */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Profile Completion</span>
                  <span className="font-semibold" style={{ color: primaryColor }}>{profilePct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${profilePct}%`, backgroundColor: primaryColor }}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label:'Full Name',    value: farmer?.fullName,        hi:'पूरा नाम' },
                  { label:'Mobile',       value: farmer?.mobile,          hi:'मोबाइल' },
                  { label:'Farmer ID',    value: farmer?.farmerIdGenerated,hi:'किसान ID' },
                  { label:'GIS ID',       value: farmer?.gisId,           hi:'GIS ID' },
                  { label:"Father's Name",value: farmer?.fatherName,      hi:'पिता का नाम' },
                  { label:'Aadhaar',      value: farmer?.aadhaarNumber,   hi:'आधार' },
                  { label:'Gender',       value: farmer?.gender,          hi:'लिंग' },
                  { label:'Date of Birth',value: farmer?.dob ? new Date(farmer.dob).toLocaleDateString('en-IN') : null, hi:'जन्म तिथि' },
                  { label:'Registered On',value: farmer?.createdAt ? new Date(farmer.createdAt).toLocaleDateString('en-IN') : null, hi:'पंजीकृत' },
                  { label:'Status',       value: farmer?.status?.replace(/_/g,' '), hi:'स्थिति' },
                ].map(row => (
                  <div key={row.label} className="bg-gray-50 rounded-xl p-2.5">
                    <div className="text-gray-400 text-[10px]">{row.label} / {row.hi}</div>
                    <div className="font-semibold text-gray-800 mt-0.5 truncate">{row.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

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
                  const kmlPhoto  = photos[1] || null;

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
                          <span className="text-xs font-mono text-gray-400">{land.surveyGutNumber || '—'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            { label:'Area',     value: land.areaAcres ? `${land.areaAcres} acres` : '—' },
                            { label:'Offered',  value: land.areaOfferedAcres ? `${land.areaOfferedAcres} acres` : '—' },
                            { label:'Type',     value: land.landType?.replace('_',' ') || '—' },
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

                        {/* KML photo */}
                        {kmlPhoto && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1.5">KML Map Photo</p>
                            <img src={kmlPhoto} alt="KML map" className="w-full h-32 object-cover rounded-xl border border-gray-100"/>
                          </div>
                        )}

                        <a href="/farmer/land" className="flex items-center justify-center gap-1.5 text-xs font-semibold border-2 border-dashed border-gray-200 rounded-xl py-2 text-gray-400 hover:border-gray-300">
                          <Plus className="w-3.5 h-3.5"/> Add Another Photo
                        </a>
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
