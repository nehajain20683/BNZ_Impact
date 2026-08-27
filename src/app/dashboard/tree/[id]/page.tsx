'use client';
// src/app/dashboard/tree/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, TreePine, Calendar, User, Sprout, CheckCircle } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Awaiting Planting', PLANTED: 'Planted', GROWING: 'Growing', MATURE: 'Mature',
};

export default function TreeStoryPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard/trees/${id}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><TreePine className="w-8 h-8 text-sage-300 animate-pulse"/></div>;
  }
  if (!data || data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-sage-500">{data?.error || 'Tree not found.'}</p>
          <a href="/dashboard" className="text-sage-700 text-sm font-semibold mt-2 inline-block">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const { tree, campaign, dedicationName, site, farmer, land, verifiedVisits } = data;
  const mapUrl = (land?.gpsLatitude || tree.geoLatitude)
    ? `https://www.google.com/maps?q=${land?.gpsLatitude || tree.geoLatitude},${land?.gpsLongitude || tree.geoLongitude}`
    : null;

  return (
    <div className="min-h-screen bg-cream-50 pb-16">
      {/* Hero */}
      <div className="relative h-64 bg-sage-800">
        {tree.imageUrl && <img src={tree.imageUrl} alt="" className="w-full h-full object-cover opacity-70"/>}
        <div className="absolute inset-0 bg-gradient-to-t from-sage-950/80 to-sage-900/20"/>
        <button onClick={() => router.push('/dashboard')} className="absolute top-5 left-4 text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4"/> Dashboard
        </button>
        <div className="absolute bottom-6 left-4 right-4">
          <div className="text-sage-300 text-xs font-bold uppercase tracking-wide">{campaign?.name}</div>
          <h1 className="font-display text-3xl text-white mt-1">
            {dedicationName ? `Dedicated to ${dedicationName}` : (tree.treeTagId || 'Your Tree')}
          </h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-6 relative z-10 space-y-4">

        {/* Quick facts */}
        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-sage-400 text-xs">Species</div><div className="font-semibold text-sage-900">{tree.species || 'To be confirmed'}</div></div>
          <div><div className="text-sage-400 text-xs">Status</div><div className="font-semibold text-sage-900">{STATUS_LABEL[tree.status] || tree.status}</div></div>
          <div><div className="text-sage-400 text-xs">Planted</div><div className="font-semibold text-sage-900">{tree.plantedDate ? new Date(tree.plantedDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Not yet'}</div></div>
          <div><div className="text-sage-400 text-xs">CO₂ (est./yr)</div><div className="font-semibold text-sage-900">{tree.expectedCO2 || 22} kg</div></div>
        </div>

        {/* Where it's growing */}
        {site && (
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-sage-500"/>
              <h2 className="font-display text-lg text-sage-950">Where It's Growing</h2>
            </div>
            <div className="font-semibold text-sage-900">{site.siteName}</div>
            <div className="text-sage-500 text-sm mt-0.5">{site.district}{site.district && site.state ? ', ' : ''}{site.state}</div>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-xs font-bold text-sage-700 border-2 border-sage-200 px-3 py-1.5 rounded-xl hover:border-sage-400">
                View on Map →
              </a>
            )}
          </div>
        )}

        {/* Meet the farmer — only shown once an admin has explicitly linked this tree */}
        {farmer ? (
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-sage-500"/>
              <h2 className="font-display text-lg text-sage-950">Meet the Farmer</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 text-lg flex-shrink-0">
                {farmer.fullName?.charAt(0) || '?'}
              </div>
              <div>
                <div className="font-semibold text-sage-900">{farmer.fullName}</div>
                <div className="text-sage-500 text-xs">{land?.village || farmer.village}{(land?.district || farmer.district) ? `, ${land?.district || farmer.district}` : ''}</div>
              </div>
            </div>
            <p className="text-sage-500 text-xs mt-3">Your tree is growing on {farmer.fullName.split(' ')[0]}'s land, cared for as part of this plantation.</p>
          </div>
        ) : site && (
          <div className="bg-sage-50 border border-sage-100 rounded-2xl p-4 text-center">
            <p className="text-sage-500 text-xs">Farmer details for this specific tree haven't been linked yet — check back soon.</p>
          </div>
        )}

        {/* Verified growth updates */}
        {verifiedVisits?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sprout className="w-4 h-4 text-sage-500"/>
              <h2 className="font-display text-lg text-sage-950">Verified Growth Updates</h2>
            </div>
            <div className="space-y-3">
              {verifiedVisits.map((v: any) => (
                <div key={v.id} className="flex gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <div className="text-sage-800 text-sm font-medium">
                      {v.survivalPct != null ? `${v.survivalPct}% survival` : 'Site visited'}
                      {v.avgHeight != null ? ` · avg height ${Math.round(v.avgHeight)}cm` : ''}
                    </div>
                    <div className="text-sage-400 text-xs flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3"/> {new Date(v.visitDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
