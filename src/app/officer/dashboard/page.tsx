'use client';
// src/app/officer/dashboard/page.tsx
// Phase 1 minimal portal shell — assigned farmers list. Tree photo capture
// (Phase 2) will hang off each farmer's plantation from here.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, MapPin, TreePine, AlertTriangle } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';

const FARMER_STATUS_LABEL: Record<string, string> = {
  REGISTERED: 'Registered', DOCUMENTS_PENDING: 'Documents Pending',
  VERIFIED_LAND_OWNER: 'Verified', SUSPENDED: 'Suspended',
};

export default function FieldOfficerDashboard() {
  const org = useOrgConfig();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const officerId = localStorage.getItem('officerId');
    if (!officerId) { router.push('/officer/login'); return; }
    fetch(`/api/field-officer/dashboard?officerId=${officerId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { logout(); return; }
        setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem('officerId');
    localStorage.removeItem('officerName');
    localStorage.removeItem('officerToken');
    router.push('/officer/login');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sage-400">Loading…</div>;
  if (!data) return null;

  const { officer, farmers } = data;

  return (
    <div className="min-h-screen bg-sage-50">
      <div className="text-white px-4 py-4" style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {org.logoUrl && <OrgLogo src={org.logoUrl} alt="" size="sm" badge/>}
          <div className="flex-1">
            <div className="font-bold text-sm">{officer.name}</div>
            <div className="text-white/70 text-xs">{officer.designation || 'Field Officer'} · {officer.district || org.name}</div>
          </div>
          <button onClick={logout} aria-label="Sign Out" className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-sage-100 p-4">
            <Users className="w-5 h-5 text-sage-500 mb-1.5"/>
            <div className="font-bold text-sage-900 text-xl">{farmers.length}</div>
            <div className="text-sage-400 text-xs">Assigned Farmers</div>
          </div>
          <div className="bg-white rounded-2xl border border-sage-100 p-4">
            <MapPin className="w-5 h-5 text-sage-500 mb-1.5"/>
            <div className="font-bold text-sage-900 text-xl">{farmers.reduce((s: number, f: any) => s + f.lands.length, 0)}</div>
            <div className="text-sage-400 text-xs">Land Parcels</div>
          </div>
        </div>

        <h2 className="font-display text-lg text-sage-950 mb-3">My Assigned Farmers</h2>
        {farmers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-sage-200 p-8 text-center">
            <Users className="w-8 h-8 text-sage-200 mx-auto mb-2"/>
            <p className="text-sage-400 text-sm">No farmers assigned to you yet — check with your administrator.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {farmers.map((f: any) => (
              <a key={f.id} href={`/officer/farmer/${f.id}`} className="block bg-white rounded-2xl border border-sage-100 p-4 hover:shadow-md hover:border-sage-200 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sage-900 text-sm">{f.fullName}</div>
                    <div className="text-sage-400 text-xs mt-0.5">{f.farmerIdGenerated || f.mobile} · {f.village}{f.district ? `, ${f.district}` : ''}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                    {FARMER_STATUS_LABEL[f.status] || f.status}
                  </span>
                </div>
                {f.lands.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {f.lands.map((l: any) => (
                      <span key={l.id} className="flex items-center gap-1 text-[10px] bg-sage-50 text-sage-600 px-2 py-1 rounded-full">
                        <TreePine className="w-2.5 h-2.5"/> {l.surveyGutNumber || 'Land'} · {l.village}
                      </span>
                    ))}
                  </div>
                )}
                {(f.needsVerification || f.needsHealthCheck) && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-sage-50">
                    {f.needsVerification && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5"/> Not verified
                      </span>
                    )}
                    {f.needsHealthCheck && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5"/> No health check
                      </span>
                    )}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
