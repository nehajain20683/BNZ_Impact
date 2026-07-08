// src/app/admin/page.tsx — SERVER COMPONENT
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { TreePine, Users, DollarSign, Leaf, MapPin, Activity, FileText, BarChart2 } from 'lucide-react';
import AdminSignOut from '@/components/admin/AdminSignOut';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role)) redirect('/');

  const [
    donationStats,
    userCount,
    farmerCount,
    siteStats,
    recentDonations,
    recentSites,
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: { paymentStatus: 'COMPLETED' },
      _sum:   { amount: true, numberOfTrees: true },
      _count: { id: true },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.farmer.count().catch(() => 0),
    // Plantation site stats
    Promise.all([
      prisma.plantationSite.count({ where: { active: true } }).catch(() => 0),
      prisma.plantationSite.aggregate({ _sum: { treesPlanted: true, plannedTrees: true, totalPlannedArea: true } }).catch(() => ({ _sum: { treesPlanted: 0, plannedTrees: 0, totalPlannedArea: 0 } })),
      prisma.landAssignment.count().catch(() => 0),
    ]),
    prisma.donation.findMany({
      take: 8, orderBy: { createdAt: 'desc' }, include: { campaign: true },
    }),
    prisma.plantationSite.findMany({
      where: { active: true }, take: 4, orderBy: { createdAt: 'desc' },
      select: { id: true, siteName: true, siteCode: true, currentPhase: true,
                treesPlanted: true, plannedTrees: true, district: true, state: true,
                plantationPartner: true },
    }).catch(() => []),
  ]);

  const [siteCount, siteAgg, assignmentCount] = siteStats;
  const treesPlanted  = siteAgg._sum.treesPlanted  || 0;
  const plannedTrees  = siteAgg._sum.plannedTrees  || 0;
  const totalArea     = siteAgg._sum.totalPlannedArea || 0;

  const PHASE_COLORS: Record<string,string> = {
    PLANNING:'bg-gray-100 text-gray-600', LAND_PREPARATION:'bg-blue-100 text-blue-700',
    PIT_DIGGING:'bg-amber-100 text-amber-700', PLANTATION:'bg-green-100 text-green-700',
    GAP_FILLING:'bg-teal-100 text-teal-700', MONITORING:'bg-purple-100 text-purple-700',
    COMPLETED:'bg-emerald-100 text-emerald-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-forest-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TreePine className="w-6 h-6 text-forest-400"/>
          <div>
            <div className="font-display text-lg">JITO Green Legacy — Admin</div>
            <div className="text-forest-400 text-xs">Mumbai Zone · Environment & Sustainability</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-forest-400">
          <Link href="/" className="hover:text-white">← Site</Link>
          <AdminSignOut/>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl text-gray-900 mb-6">Dashboard Overview</h1>

        {/* ── Row 1: Donation stats ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Donations & Fundraising</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: DollarSign, label: 'Total Revenue',      value: formatCurrency(donationStats._sum.amount || 0),           bg: 'bg-green-500' },
            { icon: TreePine,   label: 'Trees Sponsored',    value: (donationStats._sum.numberOfTrees || 0).toLocaleString(), bg: 'bg-emerald-500' },
            { icon: Users,      label: 'Paid Donations',     value: donationStats._count.id.toLocaleString(),                 bg: 'bg-blue-500' },
            { icon: Leaf,       label: 'Land Owners',        value: farmerCount.toLocaleString(),                             bg: 'bg-lime-500' },
          ].map(({ icon: Icon, label, value, bg }) => (
            <div key={label} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white"/>
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-gray-500 text-sm">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Row 2: Plantation stats ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Plantation Operations</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: MapPin,    label: 'Plantation Sites',    value: siteCount,                                bg: 'bg-sage-600' },
            { icon: TreePine,  label: 'Trees Planted',       value: treesPlanted.toLocaleString('en-IN'),    bg: 'bg-green-600' },
            { icon: BarChart2, label: 'Total Planned',       value: plannedTrees.toLocaleString('en-IN'),    bg: 'bg-teal-600' },
            { icon: Activity,  label: 'Farmers Assigned',    value: assignmentCount.toLocaleString('en-IN'), bg: 'bg-indigo-500' },
          ].map(({ icon: Icon, label, value, bg }) => (
            <div key={label} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white"/>
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-gray-500 text-sm">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Plantation progress bar ── */}
        {plannedTrees > 0 && (
          <div className="bg-white rounded-xl border p-5 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900 text-sm">Overall Plantation Progress</span>
              <span className="text-gray-500 text-sm">{treesPlanted.toLocaleString('en-IN')} / {plannedTrees.toLocaleString('en-IN')} trees · {totalArea.toFixed(1)} acres</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sage-500 to-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (treesPlanted / plannedTrees) * 100)}%` }}/>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{Math.round((treesPlanted / plannedTrees) * 100)}% complete</span>
              <span>{(plannedTrees - treesPlanted).toLocaleString('en-IN')} trees remaining</span>
            </div>
          </div>
        )}

        {/* ── Quick Links ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Quick Access</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { href:'/admin/donations',          icon:'💰', label:'Donations',          desc:'All transactions',           color:'bg-green-50  text-green-700  border-green-100'  },
            { href:'/admin/plantation-sites',   icon:'🌳', label:'Plantation Sites',   desc:'Sites, phases, activities',  color:'bg-sage-50   text-sage-700   border-sage-100'   },
            { href:'/admin/farmers',            icon:'🌾', label:'Land Owners',        desc:'Registrations & docs',       color:'bg-lime-50   text-lime-700   border-lime-100'   },
            { href:'/admin/people',             icon:'👥', label:'People',             desc:'Farmers & users',            color:'bg-indigo-50 text-indigo-700 border-indigo-100' },
            { href:'/admin/logs',               icon:'📋', label:'Activity Logs',      desc:'All system actions',         color:'bg-amber-50  text-amber-700  border-amber-100'  },
            { href:'/admin/donations',          icon:'📊', label:'Reports',            desc:'CSV export & analytics',     color:'bg-purple-50 text-purple-700 border-purple-100' },
          ].map(l => (
            <Link key={l.href+l.label} href={l.href}
              className={`${l.color} border rounded-xl p-4 hover:shadow-md transition-shadow flex items-start gap-3`}>
              <span className="text-2xl">{l.icon}</span>
              <div>
                <div className="font-semibold text-sm">{l.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{l.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Active Plantation Sites ── */}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <TreePine className="w-4 h-4 text-sage-600"/> Active Plantation Sites
              </h2>
              <Link href="/admin/plantation-sites" className="text-xs text-sage-600 hover:underline font-medium">View all →</Link>
            </div>
            {recentSites.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-2">No plantation sites yet</p>
                <Link href="/admin/plantation-sites" className="text-sage-600 text-xs font-semibold hover:underline">Create first site →</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(recentSites as any[]).map((site: any) => {
                  const pct = site.plannedTrees > 0 ? Math.round((site.treesPlanted / site.plannedTrees) * 100) : 0;
                  return (
                    <Link key={site.id} href={`/admin/plantation-sites/${site.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-sage-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TreePine className="w-4 h-4 text-sage-700"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{site.siteName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-24">
                            <div className="h-full bg-sage-500 rounded-full" style={{ width: `${pct}%` }}/>
                          </div>
                          <span className="text-gray-400 text-xs">{pct}%</span>
                          <span className="text-gray-300 text-xs">·</span>
                          <span className="text-gray-400 text-xs">{site.district || site.state || '—'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${PHASE_COLORS[site.currentPhase] || 'bg-gray-100 text-gray-600'}`}>
                        {site.currentPhase?.replace(/_/g,' ')}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recent Donations ── */}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600"/> Recent Donations
              </h2>
              <Link href="/admin/donations" className="text-xs text-sage-600 hover:underline font-medium">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentDonations.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-xs font-bold">{d.numberOfTrees}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{d.donorName}</div>
                    <div className="text-gray-400 text-xs">{d.campaign.name} · {new Date(d.createdAt).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-900 text-sm">₹{d.amount.toLocaleString('en-IN')}</div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      d.paymentStatus==='COMPLETED'?'bg-green-100 text-green-700':
                      d.paymentStatus==='PENDING'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                      {d.paymentStatus==='COMPLETED'?'Paid':d.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
              {recentDonations.length === 0 && (
                <p className="text-center py-8 text-gray-400 text-sm">No donations yet</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
