export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/tenant';
import prisma from '@/lib/prisma';

// Phases before real ground work starts are shown publicly as "Coming Soon"
// rather than "Active" — a donor or visitor shouldn't see a site listed as
// live plantation when it's still in planning/land prep.
const COMING_SOON_PHASES = ['PLANNING', 'LAND_PREPARATION'];

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);

    const [farmerCount, siteAgg, donationAgg, sites] = await Promise.all([
      prisma.farmer.count({ where: { orgId: org.id } }).catch(() => 0),
      prisma.plantationSite.aggregate({
        where: { orgId: org.id, active: true },
        _sum:  { treesPlanted: true, plannedTrees: true },
        _count:{ id: true },
      }).catch(() => ({ _sum: { treesPlanted: 0, plannedTrees: 0 }, _count: { id: 0 } })),
      prisma.donation.aggregate({
        where: { orgId: org.id, paymentStatus: 'COMPLETED' },
        _sum:  { amount: true, numberOfTrees: true },
        _count:{ id: true },
      }).catch(() => ({ _sum: { amount: 0, numberOfTrees: 0 }, _count: { id: 0 } })),
      prisma.plantationSite.findMany({
        where: { orgId: org.id, active: true },
        select: {
          id: true, siteName: true, description: true, district: true, state: true, village: true,
          gpsLatitude: true, gpsLongitude: true, currentPhase: true,
          treesPlanted: true, plannedTrees: true, totalPlannedArea: true,
          landAssignments: {
            take: 3,
            select: { speciesPlanted: true, land: { select: { photos: true, kmlFileName: true, gpsLatitude: true, gpsLongitude: true, polygonGeoJson: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    const treesPlanted    = siteAgg._sum.treesPlanted    || 0;
    const estimatedCarbon = Math.round(treesPlanted * 0.022 * 0.87 * 25);

    // Species breakdown — real planted data, same source used for the
    // admin dashboard's own species chart, aggregated org-wide here rather
    // than per-site so a visitor sees the whole program's mix.
    const speciesTotals: Record<string, number> = {};
    const sitesShaped = sites.map((s: any) => {
      const photos = s.landAssignments.flatMap((a: any) => a.land?.photos || []).slice(0, 4);
      const kmlFileName = s.landAssignments.find((a: any) => a.land?.kmlFileName)?.land?.kmlFileName || null;
      // A site's own GPS is often never set by admin even when its linked
      // land parcels have real GPS from farmer registration — falling back
      // to the first land with coordinates means the map actually
      // populates instead of silently having nothing to plot.
      const landWithGps = s.landAssignments.find((a: any) => a.land?.gpsLatitude != null)?.land;
      const gpsLatitude = s.gpsLatitude ?? landWithGps?.gpsLatitude ?? null;
      const gpsLongitude = s.gpsLongitude ?? landWithGps?.gpsLongitude ?? null;
      const polygons = s.landAssignments
        .map((a: any) => a.land?.polygonGeoJson)
        .filter((p: any) => p?.coordinates?.[0]?.length >= 3);
      for (const a of s.landAssignments) {
        for (const sp of (a.speciesPlanted as any[]) || []) {
          if (sp?.species && sp?.qty) speciesTotals[sp.species] = (speciesTotals[sp.species] || 0) + sp.qty;
        }
      }
      return {
        id: s.id, siteName: s.siteName, description: s.description,
        district: s.district, state: s.state, village: s.village,
        gpsLatitude, gpsLongitude,
        currentPhase: s.currentPhase, isComingSoon: COMING_SOON_PHASES.includes(s.currentPhase),
        treesPlanted: s.treesPlanted, plannedTrees: s.plannedTrees, totalPlannedArea: s.totalPlannedArea,
        photos, kmlFileName, polygons,
      };
    });

    const activeSites = sitesShaped.filter(s => !s.isComingSoon);
    const comingSoonSites = sitesShaped.filter(s => s.isComingSoon);

    const totalSpecies = Object.values(speciesTotals).reduce((a, b) => a + b, 0);
    const speciesBreakdown = Object.entries(speciesTotals)
      .map(([species, qty]) => ({ species, qty, pct: totalSpecies > 0 ? Math.round((qty / totalSpecies) * 100) : 0 }))
      .sort((a, b) => b.qty - a.qty);

    return NextResponse.json({
      treesPlanted,
      plannedTrees:    siteAgg._sum.plannedTrees   || 0,
      siteCount:       siteAgg._count.id            || 0,
      farmerCount,
      estimatedCarbon,
      totalDonations:  donationAgg._count.id        || 0,
      totalAmount:     donationAgg._sum.amount      || 0,
      treesDonated:    donationAgg._sum.numberOfTrees || 0,
      activeSites, comingSoonSites, speciesBreakdown,
      org: { name: org.name, primaryColor: org.primaryColor, logoUrl: org.logoUrl },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
