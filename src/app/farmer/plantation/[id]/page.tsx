'use client';
// src/app/farmer/plantation/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { ChevronLeft, MapPin, TreePine, Calendar, LogOut, ExternalLink } from 'lucide-react';

export default function PlantationDetailPage() {
  const { id } = useParams() as { id: string };
  const org    = useOrgConfig();
  const router = useRouter();
  const primaryColor = org.primaryColor || '#2d5a1b';

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('farmerId')) {
      router.push('/farmer/login'); return;
    }
    fetch(`/api/farmer/plantations/${id}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerMobile');
    router.push('/farmer/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TreePine className="w-8 h-8 animate-pulse" style={{ color: primaryColor }}/>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-gray-500">Plantation not found.</p>
          <a href="/farmer/dashboard" className="text-sm font-semibold mt-2 inline-block" style={{ color: primaryColor }}>← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const { assignment, site, land, treeSummary, timeline } = data;
  const mapUrl = land?.gpsLatitude && land?.gpsLongitude
    ? `https://www.google.com/maps?q=${land.gpsLatitude},${land.gpsLongitude}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="text-white px-4 py-4 sticky top-0 z-40" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/farmer/dashboard')} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{site.name}</div>
            <div className="text-white/70 text-xs">{site.orgName}</div>
          </div>
          <button onClick={logout} aria-label="Sign Out"
            className="ml-auto text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* Plantation Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Plantation Overview</h2>
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
              style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
              {assignment.stage?.replace(/_/g,' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: 'Plantation Site', value: site.name },
              { label: 'Organization', value: site.orgName },
              { label: 'Phase', value: site.phase?.replace(/_/g,' ') },
              { label: 'Carbon Project', value: site.projectName },
              { label: 'Start Date', value: site.startDate ? new Date(site.startDate).toLocaleDateString('en-IN') : null },
              { label: 'Assigned On', value: new Date(assignment.assignedAt).toLocaleDateString('en-IN') },
            ].map(row => (
              <div key={row.label} className="bg-gray-50 rounded-xl p-2.5">
                <div className="text-gray-400 text-[10px]">{row.label}</div>
                <div className="font-semibold text-gray-800 mt-0.5 truncate">{row.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned Land */}
        {land && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3">Assigned Land</h2>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              {[
                { label: 'Survey Number', value: land.surveyNumber },
                { label: 'Area', value: land.areaAcres ? `${land.areaAcres} acres` : null },
                { label: 'Village', value: land.village },
                { label: 'District', value: land.district },
              ].map(row => (
                <div key={row.label} className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-gray-400 text-[10px]">{row.label}</div>
                  <div className="font-semibold text-gray-800 mt-0.5 truncate">{row.value || '—'}</div>
                </div>
              ))}
            </div>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl border-2"
                style={{ borderColor: primaryColor + '40', color: primaryColor }}>
                <MapPin className="w-3.5 h-3.5"/> View Map <ExternalLink className="w-3 h-3"/>
              </a>
            )}
          </div>
        )}

        {/* Tree Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">Tree Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 text-center text-white" style={{ backgroundColor: primaryColor }}>
              <div className="font-display text-2xl font-bold">{treeSummary.total}</div>
              <div className="text-white/70 text-[10px] mt-0.5">Total Trees</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-bold text-green-700">{treeSummary.alive}</div>
              <div className="text-green-600 text-[10px] mt-0.5">Alive</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-bold text-red-600">{treeSummary.dead}</div>
              <div className="text-red-500 text-[10px] mt-0.5">Dead</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-bold text-blue-700">
                {treeSummary.survivalRate !== null ? `${treeSummary.survivalRate}%` : '—'}
              </div>
              <div className="text-blue-500 text-[10px] mt-0.5">Survival Rate</div>
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-3 text-center">
            {treeSummary.lastMonitored
              ? `Last official monitoring: ${new Date(treeSummary.lastMonitored).toLocaleDateString('en-IN')}`
              : 'No official monitoring visit recorded yet'}
          </p>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">Activity Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No activity recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((event: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: primaryColor }}/>
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1"/>}
                  </div>
                  <div className="pb-4 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{event.title}</span>
                      <span className="text-gray-400 text-[10px] flex-shrink-0">
                        <Calendar className="w-3 h-3 inline mr-0.5"/>
                        {new Date(event.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </span>
                    </div>
                    {event.notes && <p className="text-gray-500 text-xs mt-1">{event.notes}</p>}
                    {event.meta && (
                      <p className="text-gray-400 text-xs mt-1">
                        {event.meta.survivalCount != null && `Survived: ${event.meta.survivalCount} · `}
                        {event.meta.deadTrees != null && `Dead: ${event.meta.deadTrees} · `}
                        {event.meta.avgHeight != null && `Avg height: ${event.meta.avgHeight}cm`}
                      </p>
                    )}
                    {event.photos?.length > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {event.photos.map((p: string, j: number) => (
                          <img key={j} src={p} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0"/>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <a href="/farmer/updates"
          className="block text-center text-white font-bold py-3.5 rounded-xl text-sm"
          style={{ backgroundColor: primaryColor }}>
          Share an Update for This Plantation
        </a>
      </div>
    </div>
  );
}
