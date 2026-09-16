export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { estimateCO2Tonnes } from '@/lib/carbon';

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
            // photos deliberately NOT selected here — see the raw query
            // below. Land.photos is a scalar array of base64 strings;
            // Prisma has no way to select "just the first element" of a
            // scalar array column, so `select: { photos: true }` always
            // pulls the ENTIRE array over the wire regardless of how the
            // result is sliced afterward in JS. On this specific page —
            // the highest-traffic, unauthenticated public page — that
            // meant every visitor's request was pulling every stored
            // photo for every land parcel on every active site, even
            // though only one photo per site is ever actually rendered.
            select: { speciesPlanted: true, land: { select: { id: true, kmlFileName: true, gpsLatitude: true, gpsLongitude: true, polygonGeoJson: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    // One targeted query for just the first photo per land — Postgres's
    // native array slice (photos[1:1]) does the trimming at the database
    // level, so only a handful of small strings cross the wire instead of
    // every photo on every land parcel referenced above.
    const landIds = [...new Set(sites.flatMap((s: any) => s.landAssignments.map((a: any) => a.land?.id).filter(Boolean)))];
    const coverPhotoRows = landIds.length
      ? await prisma.$queryRaw<{ id: string; cover: string[] }[]>`
          SELECT id, photos[1:1] as cover FROM lands WHERE id = ANY(${landIds}) AND cardinality(photos) > 0
        `.catch(() => [])
      : [];
    const coverPhotoByLandId: Record<string, string> = {};
    for (const row of coverPhotoRows) if (row.cover?.[0]) coverPhotoByLandId[row.id] = row.cover[0];

    const treesPlanted    = siteAgg._sum.treesPlanted    || 0;
    const estimatedCarbon = estimateCO2Tonnes(treesPlanted);

    // Species breakdown — real planted data, same source used for the
    // admin dashboard's own species chart, aggregated org-wide here rather
    // than per-site so a visitor sees the whole program's mix.
    const speciesTotals: Record<string, number> = {};
    const sitesShaped = sites.map((s: any) => {
      const photos = s.landAssignments
        .map((a: any) => a.land?.id && coverPhotoByLandId[a.land.id])
        .filter(Boolean)
        .slice(0, 4);
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
    }, {
      // Public, unauthenticated, non-personalized data — safe to cache at
      // Vercel's edge. 5 minutes fresh, then serve the stale copy for up
      // to 10 more minutes while a fresh one is fetched in the
      // background, so a real visitor almost never waits on a live
      // database hit and repeat traffic mostly never reaches Supabase at
      // all. A genuinely new donation or site takes at most 5 minutes to
      // show up publicly — an acceptable trade for a page previously
      // hitting the database on every single load.
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
