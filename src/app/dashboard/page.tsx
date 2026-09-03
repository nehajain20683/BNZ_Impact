// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Download, TreePine } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { computeDonorImpactMetrics } from '@/lib/impact-metrics';
import ImpactStatCard from '@/components/dashboard/ImpactStatCard';
import ImpactMap from '@/components/dashboard/ImpactMap';
import MyTreesSection from '@/components/dashboard/MyTreesSection';
import DonationsTable from '@/components/dashboard/DonationsTable';
import DonorCharts from '@/components/dashboard/DonorCharts';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-700',
  REFUNDED:  'bg-gray-100 text-gray-600',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/login?callbackUrl=/dashboard');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      // Show every donation, not just COMPLETED ones — a donor whose
      // payment is pending or failed should still be able to see that,
      // rather than it silently disappearing.
      donations: {
        include: { campaign: true, _count: { select: { trees: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!user) redirect('/auth/login');

  const completedDonations = user.donations.filter(d => d.paymentStatus === 'COMPLETED');
  const totalTrees  = completedDonations.reduce((s, d) => s + d.numberOfTrees, 0);
  const totalAmount = completedDonations.reduce((s, d) => s + d.amount, 0);
  const co2 = totalTrees * 22;

  // How many of this donor's trees have actually been matched to a real
  // farmer's planted land ("Link Sponsored Trees") vs are still waiting —
  // shown as its own clear split, not left implicit in a status dropdown.
  const linkedTreeCount = await prisma.tree.count({
    where: { donation: { userId: user.id, paymentStatus: 'COMPLETED' }, assignmentId: { not: null } },
  });
  const unlinkedTreeCount = totalTrees - linkedTreeCount;

  // Chart data — year-wise planting trend and species mix. Lightweight
  // select (just two small fields) since a donor could have hundreds of
  // trees; aggregation happens here in JS rather than loading full rows.
  const treeChartRows = await prisma.tree.findMany({
    where: { donation: { userId: user.id, paymentStatus: 'COMPLETED' } },
    select: { plantedDate: true, species: true },
  });

  const yearCounts: Record<string, number> = {};
  const speciesCounts: Record<string, number> = {};
  for (const t of treeChartRows) {
    if (t.plantedDate) {
      const year = new Date(t.plantedDate).getFullYear().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
    const sp = t.species || 'Unspecified';
    speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
  }
  const yearlyPlantingData = Object.entries(yearCounts)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const speciesEntries = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]);
  const topSpecies = speciesEntries.slice(0, 6).map(([species, count]) => ({ species, count }));
  const otherSpeciesCount = speciesEntries.slice(6).reduce((s, [, c]) => s + c, 0);
  const speciesData = otherSpeciesCount > 0 ? [...topSpecies, { species: 'Other', count: otherSpeciesCount }] : topSpecies;

  // Group trees by plantation site (for proportional impact-metric attribution
  // and for the site filter dropdown) — aggregate query, never loads full tree rows.
  const treeSiteGroups = await prisma.tree.groupBy({
    by: ['siteId'],
    where: { donation: { userId: user.id, paymentStatus: 'COMPLETED' } },
    _count: { _all: true },
  });
  const treeCountsBySite: Record<string, number> = {};
  for (const g of treeSiteGroups) {
    if (g.siteId) treeCountsBySite[g.siteId] = g._count._all;
  }
  const siteIds = Object.keys(treeCountsBySite);
  const sites = siteIds.length
    ? await prisma.plantationSite.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, siteName: true, gpsLatitude: true, gpsLongitude: true, district: true, state: true },
      })
    : [];

  // A site can have many farmers' lands within it, each in a different
  // exact spot. Rather than showing every farmer at the site (most of
  // whom may have nothing to do with this donor's specific trees), this
  // scopes down to only the exact parcel(s) this donor's own trees have
  // actually been linked to via "Link Sponsored Trees" (Tree.assignmentId)
  // — the real, precise answer to "where are MY trees", not a general
  // view of the whole site's community.
  const linkedAssignmentIds = await prisma.tree.findMany({
    where: { donation: { userId: user.id, paymentStatus: 'COMPLETED' }, assignmentId: { not: null } },
    select: { assignmentId: true },
    distinct: ['assignmentId'],
  }).then(rows => rows.map(r => r.assignmentId).filter(Boolean) as string[]);

  const landPins = linkedAssignmentIds.length
    ? await prisma.landAssignment.findMany({
        where: { id: { in: linkedAssignmentIds } },
        select: {
          id: true, siteId: true,
          farmer: { select: { fullName: true } },
          land: { select: { gpsLatitude: true, gpsLongitude: true, village: true, district: true, polygonGeoJson: true } },
        },
      })
    : [];

  // How many of THIS donor's own trees are on each specific parcel — not
  // the parcel's total tree count, which could include other donors' trees
  // too and would overstate this donor's actual contribution there.
  const donorTreesByAssignment = linkedAssignmentIds.length
    ? await prisma.tree.groupBy({
        by: ['assignmentId'],
        where: { donation: { userId: user.id, paymentStatus: 'COMPLETED' }, assignmentId: { in: linkedAssignmentIds } },
        _count: { _all: true },
      })
    : [];
  const donorTreeCountByAssignment: Record<string, number> = {};
  for (const g of donorTreesByAssignment) {
    if (g.assignmentId) donorTreeCountByAssignment[g.assignmentId] = g._count._all;
  }

  const impactMetrics = await computeDonorImpactMetrics((user as any).orgId, treeCountsBySite);

  // Phase 8 — verified field evidence. Only PUBLISHED monitoring visits are
  // donor-visible; community updates and unverified visits are never shown
  // here, per the explicit "raw operational records must not reach donors" rule.
  // Wrapped defensively — a newer field (donorVisible) must never break the
  // whole dashboard if that migration hasn't landed yet.
  const verifiedVisits = siteIds.length
    ? await (prisma as any).monitoringVisit.findMany({
        where: { siteId: { in: siteIds }, donorVisible: true },
        include: { site: { select: { siteName: true } } },
        orderBy: { visitDate: 'desc' },
        take: 12,
      }).catch((e: any) => { console.error('verifiedVisits query failed:', e.message); return []; })
    : [];
  const latestVerified = verifiedVisits[0];
  const verifiedSurvivalRate = verifiedVisits.length
    ? Math.round((verifiedVisits.reduce((s: number, v: any) => s + (v.survivalPct || 0), 0) / verifiedVisits.length) * 10) / 10
    : null;
  const verifiedPhotos = verifiedVisits.flatMap((v: any) => (v.photos || []).map((p: string) => ({ url: p, site: v.site.siteName, date: v.visitDate })));

  const donationGroups = completedDonations.map(d => ({
    id: d.id,
    receiptNumber: d.receiptNumber,
    campaignName: d.campaign.name,
    createdAt: d.createdAt,
    treeCount: (d as any)._count.trees,
  }));

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-10">
            <h1 className="font-display text-4xl text-sage-950 mb-1">My Dashboard</h1>
            <p className="text-sage-600">Welcome back, {user.name || 'Donor'}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Donated', value: formatCurrency(totalAmount), icon: '💰' },
              { label: 'Trees Sponsored', value: `${totalTrees}`, icon: '🌳' },
              { label: 'Donations Made', value: `${user.donations.length}`, icon: '📋' },
              { label: 'Plantation Sites', value: `${siteIds.length}`, icon: '📍' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-sage-100 rounded-2xl p-5">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="font-display text-2xl font-bold text-sage-900">{stat.value}</div>
                <div className="text-sage-500 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Impact stat cards — CO2 plus any admin-defined metrics with recorded data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <ImpactStatCard icon="🌍" value={co2.toLocaleString('en-IN')} unit="kg" label="CO₂ Offset/yr" color="#1a3a1a"/>
            {impactMetrics.map(m => (
              <ImpactStatCard key={m.id} icon={m.icon}
                value={m.value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                unit={m.unit} label={m.name} color={m.color}/>
            ))}
          </div>

          {/* Verified Field Evidence — only officially published monitoring, never raw/community data */}
          {verifiedVisits.length > 0 && (
            <div className="bg-white border border-sage-100 rounded-2xl overflow-hidden mb-8 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-sage-900">Verified Field Evidence</h2>
                <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 px-2 py-1 rounded-full">Officer Verified</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">
                    {verifiedSurvivalRate !== null ? `${verifiedSurvivalRate}%` : '—'}
                  </div>
                  <div className="text-sage-500 text-xs mt-1">Verified Survival Rate</div>
                </div>
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">
                    {latestVerified ? new Date(latestVerified.visitDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : '—'}
                  </div>
                  <div className="text-sage-500 text-xs mt-1">Last Verified Visit</div>
                </div>
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">{verifiedVisits.length}</div>
                  <div className="text-sage-500 text-xs mt-1">Published Visits</div>
                </div>
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">{verifiedPhotos.length}</div>
                  <div className="text-sage-500 text-xs mt-1">Verified Photos</div>
                </div>
              </div>
              {verifiedPhotos.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {verifiedPhotos.slice(0, 12).map((p: any, i: number) => (
                    <div key={i} className="flex-shrink-0">
                      <img src={p.url} alt="" className="w-28 h-28 rounded-xl object-cover"/>
                      <p className="text-sage-400 text-[10px] mt-1 max-w-28 truncate">{p.site}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DonorCharts yearlyPlantingData={yearlyPlantingData} speciesData={speciesData}/>

          <DonationsTable donations={user.donations} />

          <MyTreesSection donations={donationGroups} sites={sites} linkedTreeCount={linkedTreeCount} unlinkedTreeCount={unlinkedTreeCount} />

          <div className="mt-6">
            <ImpactMap
              pins={landPins
                .filter((p: any) => p.land?.gpsLatitude != null && p.land?.gpsLongitude != null)
                .map((p: any) => {
                  const site = sites.find((s: any) => s.id === p.siteId);
                  return {
                    lat: p.land.gpsLatitude, lng: p.land.gpsLongitude,
                    farmerName: p.farmer?.fullName, village: p.land.village, district: p.land.district,
                    siteName: site?.siteName, treesPlanted: donorTreeCountByAssignment[p.id] || 0,
                    polygonGeoJson: p.land.polygonGeoJson,
                  };
                })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
