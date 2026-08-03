// src/app/impact/page.tsx — with real plantation sites
import Image from 'next/image';
import prisma from '@/lib/prisma';
import { formatCurrency, NATURE_IMAGES } from '@/lib/utils';
import { TreePine, Users, Leaf, Globe, MapPin, Droplets, Shield, Sprout } from 'lucide-react';

export const revalidate = 60;

// Real plantation site data
const PLANTATION_SITES = [
  {
    id: 'site-1',
    siteName: 'Prakash Namdev Farm',
    farmerName: 'Prakash Gighe',
    location: 'Palghar District, Maharashtra',
    acreage: 5.5,
    estimatedTrees: 5500,
    species: '80% Mango · 20% Teak, Sapota & Guava',
    landType: 'Private Agriculture',
    ownership: 'Single Owner',
    waterSource: 'Well',
    security: 'Fencing work in progress',
    geoData: { lat: 19.087144, lng: 73.477663, perimeter: '590.57 m', area: '5.1 ac' },
    fieldPhoto: '/sites/prakash-field.jpg',
    polygonPhoto: '/sites/prakash-polygon.png',
    status: 'active' as const,
  },
  {
    id: 'site-2',
    siteName: 'Rakesh Mourya Farm',
    farmerName: 'Rakesh Mourya',
    location: 'Poshir, Palghar, Maharashtra',
    acreage: 7.5,
    estimatedTrees: 7500,
    species: 'Mango, Guava, Jackfruit, Bamboo & Teak',
    landType: 'Private Agriculture',
    ownership: 'Joint Ownership (both owners in agreement)',
    waterSource: 'Adjacent River',
    security: 'Barbed wire fencing',
    geoData: { lat: null, lng: null, perimeter: '860.34 m', area: '7.43 ac' },
    fieldPhoto: '/sites/rakesh-field.jpg',
    polygonPhoto: '/sites/rakesh-polygon.png',
    status: 'active' as const,
  },
];

export default async function ImpactPage() {
  const [donationStats, treeStats, donorCount] = await Promise.all([
    prisma.donation.aggregate({ where:{ paymentStatus:'COMPLETED' }, _sum:{ amount:true, numberOfTrees:true }, _count:{ id:true } }),
    prisma.tree.groupBy({ by:['status'], _count:true }),
    prisma.user.count(),
  ]);

  const totalTrees  = donationStats._sum.numberOfTrees || 0;
  const totalAmount = donationStats._sum.amount || 0;
  const co2         = totalTrees * 22;

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero */}
      <div className="relative h-64 mt-16">
        <Image src={NATURE_IMAGES.aerial} alt="Forest" fill className="object-cover"/>
        <div className="absolute inset-0 bg-sage-900/65"/>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="text-sage-300 text-xs font-bold uppercase tracking-widest mb-3">JITO Green Legacy</div>
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">Our Collective Impact</h1>
          <p className="text-sage-200 max-w-lg">Real-time data on every tree planted and every rupee donated.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
          {[
            { icon: TreePine, label:'Trees Planted',    value: totalTrees.toLocaleString('en-IN'),        color:'bg-sage-600' },
            { icon: Users,    label:'Donors',           value: donorCount.toLocaleString('en-IN'),         color:'bg-blue-500' },
            { icon: Leaf,     label:'CO₂ Offset / yr',  value: `${(co2/1000).toFixed(1)} MT`,             color:'bg-emerald-500' },
            { icon: Globe,    label:'Total Raised',     value: formatCurrency(totalAmount),               color:'bg-amber-500' },
          ].map(({ icon:Icon, label, value, color })=>(
            <div key={label} className="bg-white border border-sage-100 rounded-2xl p-6 text-center shadow-sm">
              <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <Icon className="w-6 h-6 text-white"/>
              </div>
              <div className="font-display text-3xl font-bold text-sage-900 mb-1">{value}</div>
              <div className="text-sage-400 text-sm">{label}</div>
            </div>
          ))}
        </div>

        {/* ══ ACTIVE PLANTATION SITES ══ */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-block bg-sage-100 text-sage-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">Verified Sites</div>
              <h2 className="font-display text-3xl text-sage-950">Active Plantation Sites</h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
              2 Sites Active
            </div>
          </div>

          <div className="space-y-10">
            {PLANTATION_SITES.map((site, idx) => (
              <div key={site.id} className="bg-white border border-sage-100 rounded-3xl overflow-hidden shadow-sm">
                {/* Site header */}
                <div className="bg-gradient-to-r from-sage-800 to-sage-700 px-8 py-5 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <div className="text-sage-300 text-xs font-bold uppercase tracking-widest mb-1">Location {idx+1}</div>
                    <h3 className="font-display text-2xl text-white">{site.siteName}</h3>
                    <div className="flex items-center gap-1.5 text-sage-300 text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5"/>{site.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sage-300 text-xs mb-1">Estimated Plantation</div>
                    <div className="font-display text-3xl text-white font-bold">{site.estimatedTrees.toLocaleString()}</div>
                    <div className="text-sage-400 text-xs">trees on {site.acreage} acres</div>
                  </div>
                </div>

                {/* Photos row */}
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative h-64 group overflow-hidden">
                    <Image src={site.fieldPhoto} alt={`${site.siteName} field`} fill className="object-cover group-hover:scale-105 transition-transform duration-500"/>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <div className="text-white text-xs font-semibold">📸 Site Ground View</div>
                      <div className="text-white/70 text-xs">Farmer: {site.farmerName}</div>
                    </div>
                  </div>
                  <div className="relative h-64 group overflow-hidden">
                    <Image src={site.polygonPhoto} alt={`${site.siteName} polygon`} fill className="object-cover group-hover:scale-105 transition-transform duration-500"/>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <div className="text-white text-xs font-semibold">🗺️ Google Earth Boundary</div>
                      <div className="text-white/70 text-xs">Perimeter: {site.geoData.perimeter} · Area: {site.geoData.area}</div>
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="p-8">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { icon: Sprout,   label: 'Tree Species',   value: site.species },
                      { icon: Shield,   label: 'Land Type',      value: `${site.landType} · ${site.ownership}` },
                      { icon: Droplets, label: 'Water Source',   value: site.waterSource },
                      { icon: MapPin,   label: 'Security',       value: site.security },
                      { icon: TreePine, label: 'Est. Trees',     value: `${site.estimatedTrees.toLocaleString()} trees` },
                      { icon: Globe,    label: 'Area',           value: `${site.acreage} Acres (${site.geoData.area})` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 bg-sage-50 border border-sage-100 rounded-xl p-4">
                        <div className="w-8 h-8 bg-sage-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-sage-600"/>
                        </div>
                        <div>
                          <div className="text-sage-500 text-xs font-medium uppercase tracking-wide mb-0.5">{label}</div>
                          <div className="text-sage-900 text-sm font-semibold">{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {site.geoData.lat && (
                    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
                      <MapPin className="w-4 h-4 flex-shrink-0"/>
                      <span>GPS: {site.geoData.lat}, {site.geoData.lng} · Elevation ~175m · Verified by field team</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Coming Soon */}
          <div className="mt-8 border-2 border-dashed border-sage-200 rounded-2xl p-10 text-center bg-sage-50">
            <div className="w-14 h-14 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-sage-400"/>
            </div>
            <h3 className="font-display text-xl text-sage-700 mb-2">More Locations Coming Soon</h3>
            <p className="text-sage-500 text-sm max-w-md mx-auto">
              JITO Mumbai Zone is actively scouting additional plantation sites across Maharashtra.
              New verified locations will be added as agreements are finalised.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white border border-sage-200 text-sage-600 text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"/>
              Site scouting in progress
            </div>
          </div>
        </div>

        {/* Tree status */}
        {treeStats.length > 0 && (
          <div className="bg-white border border-sage-100 rounded-2xl p-8 shadow-sm mt-8">
            <h2 className="font-display text-2xl text-sage-950 mb-6">Tree Status Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {treeStats.map(stat=>(
                <div key={stat.status} className="text-center p-5 bg-sage-50 rounded-xl border border-sage-100">
                  <div className="font-display text-3xl font-bold text-sage-700">{stat._count}</div>
                  <div className="text-sage-500 text-sm capitalize mt-1">{stat.status.toLowerCase()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
