'use client';
// src/app/farmer/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TreePine, MapPin, DollarSign, Leaf, FileText, CheckCircle, Clock, AlertCircle, Plus, LogOut } from 'lucide-react';
import { Suspense } from 'react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  REGISTERED:           { label: 'Registered',           color: 'bg-blue-100 text-blue-700',   icon: CheckCircle },
  DOCUMENTS_PENDING:    { label: 'Documents Pending',    color: 'bg-amber-100 text-amber-700',  icon: Clock },
  DOCUMENTS_VERIFIED:   { label: 'Documents Verified',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  INSPECTION_PENDING:   { label: 'Inspection Pending',   color: 'bg-orange-100 text-orange-700',icon: Clock },
  INSPECTION_COMPLETED: { label: 'Inspection Completed', color: 'bg-teal-100 text-teal-700',    icon: CheckCircle },
  APPROVED:             { label: 'Approved ✅',           color: 'bg-green-100 text-green-800',  icon: CheckCircle },
  ACTIVE:               { label: 'Active Project',       color: 'bg-sage-100 text-sage-800',    icon: Leaf },
  SUSPENDED:            { label: 'Suspended',            color: 'bg-red-100 text-red-700',      icon: AlertCircle },
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [farmer, setFarmer] = useState<any>(null);
  const [stats, setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const farmerId = localStorage.getItem('farmerId');
    if (!farmerId) { router.push('/farmer/register'); return; }
    fetch(`/api/farmer/profile?farmerId=${farmerId}`)
      .then(r => r.json())
      .then(d => { setFarmer(d.farmer); setStats(d.stats); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerToken');
    router.push('/farmer/register');
  }

  if (loading) return (
    <div className="min-h-screen bg-sage-50 flex items-center justify-center">
      <div className="text-sage-600">Loading your dashboard...</div>
    </div>
  );

  if (!farmer) return (
    <div className="min-h-screen bg-sage-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sage-600 mb-4">Session expired</p>
        <Link href="/farmer/register" className="bg-sage-700 text-white px-6 py-3 rounded-xl font-semibold">Register / Login</Link>
      </div>
    </div>
  );

  const statusCfg = STATUS_CONFIG[farmer.status] || STATUS_CONFIG.REGISTERED;
  const StatusIcon = statusCfg.icon;

  const totalPaymentsPending = farmer.payments?.filter((p: any) => p.status === 'PENDING').reduce((s: number, p: any) => s + p.amount, 0) || 0;
  const totalPaymentsPaid    = farmer.payments?.filter((p: any) => p.status === 'PAID').reduce((s: number, p: any) => s + p.amount, 0) || 0;

  return (
    <div className="min-h-screen bg-sage-50">
      {/* Header */}
      <div className="bg-sage-800 text-white px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <div className="font-bold">🌳 JITO Green Legacy</div>
            <div className="text-sage-300 text-sm">Land Owner Dashboard / भूमि स्वामी डैशबोर्ड</div>
          </div>
          <button onClick={logout} className="text-sage-400 hover:text-white flex items-center gap-1 text-sm">
            <LogOut className="w-4 h-4"/> Logout
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Registered banner */}
        {searchParams.get('registered') && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0"/>
            <div>
              <div className="font-semibold text-green-800 text-sm">Registration Successful!</div>
              <div className="text-green-600 text-xs">Our team will review your application and contact you shortly.</div>
            </div>
          </div>
        )}

        {/* Farmer profile card */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl text-sage-950">{farmer.fullName}</h2>
              <p className="text-sage-500 text-sm">{farmer.mobile}</p>
              {farmer.farmerIdGenerated && (
                <p className="text-sage-400 text-xs mt-0.5 font-mono">{farmer.farmerIdGenerated}</p>
              )}
              {farmer.village && <p className="text-sage-400 text-xs mt-0.5">{farmer.village}, {farmer.district}</p>}
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${statusCfg.color}`}>
              <StatusIcon className="w-3 h-3"/>{statusCfg.label}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-sage-400 mb-1">
              <span>Onboarding Progress</span>
              <span>{['REGISTERED','DOCUMENTS_PENDING','DOCUMENTS_VERIFIED','INSPECTION_PENDING','INSPECTION_COMPLETED','APPROVED','ACTIVE'].indexOf(farmer.status) + 1}/7</span>
            </div>
            <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
              <div className="h-full bg-sage-600 rounded-full transition-all" style={{
                width: `${((['REGISTERED','DOCUMENTS_PENDING','DOCUMENTS_VERIFIED','INSPECTION_PENDING','INSPECTION_COMPLETED','APPROVED','ACTIVE'].indexOf(farmer.status) + 1) / 7) * 100}%`
              }}/>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: MapPin,       label: 'Land Registered', value: `${(stats?.totalLandAcres || 0).toFixed(1)} ac`, color: 'bg-blue-50 text-blue-700' },
            { icon: TreePine,     label: 'Trees Planted',   value: stats?.totalTreesPlanted || 0,                  color: 'bg-green-50 text-green-700' },
            { icon: Leaf,         label: 'CO₂ Credits',     value: `${(stats?.totalCO2 || 0).toFixed(1)} tCO₂`,   color: 'bg-emerald-50 text-emerald-700' },
            { icon: DollarSign,  label: 'Revenue Earned',  value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`, color: 'bg-amber-50 text-amber-700' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={`${color} rounded-2xl p-4 border border-current/10`}>
              <Icon className="w-5 h-5 mb-2 opacity-70"/>
              <div className="font-bold text-lg leading-none">{value}</div>
              <div className="text-xs mt-1 opacity-70">{label}</div>
            </div>
          ))}
        </div>

        {/* Land parcels */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sage-900">My Land Parcels</h3>
            <Link href="/farmer/land" className="flex items-center gap-1 text-sage-600 text-sm font-medium hover:text-sage-800">
              <Plus className="w-4 h-4"/> Add Land
            </Link>
          </div>
          {farmer.lands?.length > 0 ? (
            <div className="space-y-3">
              {farmer.lands.map((land: any) => (
                <div key={land.id} className="bg-sage-50 rounded-xl p-3 border border-sage-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sage-900 text-sm">
                        Survey: {land.surveyNumber || 'N/A'} · Gut: {land.gutNumber || 'N/A'}
                      </div>
                      <div className="text-sage-500 text-xs mt-0.5">
                        {land.areaAcres} acres · {land.district} · {land.landType?.replace('_',' ') || 'N/A'}
                      </div>
                      {land.gpsLatitude && (
                        <div className="text-sage-400 text-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3"/>{land.gpsLatitude?.toFixed(4)}, {land.gpsLongitude?.toFixed(4)}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${land.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {land.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  {/* Plantations on this land */}
                  {land.plantations?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-sage-200">
                      {land.plantations.map((pl: any) => (
                        <div key={pl.id} className="flex justify-between text-xs text-sage-600">
                          <span>🌳 {pl.treesPlanted} planted · {pl.treesSurviving} surviving</span>
                          <span className="font-medium">{pl.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sage-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40"/>
              <p className="text-sm">No land registered yet</p>
              <Link href="/farmer/land" className="text-sage-600 text-sm font-medium hover:underline mt-1 inline-block">
                + Add your first land parcel
              </Link>
            </div>
          )}
        </div>

        {/* Payments */}
        {farmer.payments?.length > 0 && (
          <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm">
            <h3 className="font-semibold text-sage-900 mb-3">Payments</h3>
            <div className="space-y-2">
              {farmer.payments.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium text-sage-900">{p.paymentType?.replace(/_/g,' ')}</div>
                    <div className="text-sage-400 text-xs">{new Date(p.createdAt).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sage-900">₹{p.amount.toLocaleString('en-IN')}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-sage-100 flex justify-between text-xs text-sage-500">
              <span>Pending: ₹{totalPaymentsPending.toLocaleString('en-IN')}</span>
              <span>Paid: ₹{totalPaymentsPaid.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* Documents status */}
        <div className="bg-white rounded-2xl border border-sage-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sage-900">Documents</h3>
            <Link href="/farmer/documents" className="text-sage-600 text-sm font-medium">Upload →</Link>
          </div>
          {farmer.documents?.length > 0 ? (
            <div className="space-y-2">
              {farmer.documents.map((d: any) => (
                <div key={d.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sage-400"/>
                    <span className="text-sage-700">{d.docType?.replace(/_/g,' ')}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    d.status === 'VERIFIED'  ? 'bg-green-100 text-green-700' :
                    d.status === 'REJECTED'  ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'}`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sage-400 text-sm">No documents uploaded yet</p>
          )}
        </div>

        {/* What happens next */}
        {['REGISTERED','DOCUMENTS_PENDING','INSPECTION_PENDING'].includes(farmer.status) && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <h4 className="font-semibold text-blue-900 mb-3">What Happens Next?</h4>
            <div className="space-y-2 text-sm text-blue-700">
              {farmer.status === 'REGISTERED' && <p>✅ Registration complete. Please upload your land documents.</p>}
              {farmer.status === 'DOCUMENTS_PENDING' && <p>📋 Documents under review. Our team will verify within 2-3 working days.</p>}
              {farmer.status === 'INSPECTION_PENDING' && <p>🔍 A field officer will visit your land for site inspection. You will be contacted on your mobile number.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FarmerDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-sage-600">Loading...</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
