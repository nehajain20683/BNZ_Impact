export const runtime = 'nodejs';
// src/app/api/public/sites/[id]/route.ts
// Powers the shareable public "site story" page — no login required. Only
// ever returns what's safe to publish: site narrative/location/aggregate
// numbers, verified (donorVisible) monitoring evidence, and farmers'
// fullName + village only — never mobile, Aadhaar, bank details, or any
// document. Scoped to the requesting tenant, and further scoped so a site
// from one org can never be fetched through another org's domain.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const org = await resolveTenantFromRequest(req);

    const site = await prisma.plantationSite.findFirst({
      where: { id: params.id, orgId: org.id, active: true },
      select: {
        id: true, siteName: true, description: true, imageUrl: true,
        state: true, district: true, taluka: true,
        gpsLatitude: true, gpsLongitude: true,
        treesPlanted: true, plannedTrees: true, survivalRate: true,
        currentPhase: true, plantationSeason: true,
      },
    });
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    // Farmers growing here — name + village only, and only those who've
    // completed farmer-entity registration (VERIFIED_LAND_OWNER), so an
    // incomplete/unverified profile never appears on a public page.
    const assignments = await prisma.landAssignment.findMany({
      where: { siteId: site.id, farmer: { status: 'VERIFIED_LAND_OWNER' as any, publiclyVisible: true } },
      select: {
        treesPlanted: true,
        farmer: { select: { fullName: true, photo: true, village: true, district: true } },
        land: { select: { gpsLatitude: true, gpsLongitude: true, polygonGeoJson: true } },
      },
    });
    const farmers = assignments
      .filter(a => a.farmer)
      .map(a => ({ fullName: a.farmer!.fullName, photo: a.farmer!.photo, village: a.farmer!.village, district: a.farmer!.district, treesPlanted: a.treesPlanted }));

    // Land parcels with real GPS/boundary data — same information already
    // shown on the donor dashboard's own map and admin's GIS coverage
    // card, not a new privacy exposure; only the farmer's name (already
    // public above) is ever paired with it, never mobile/Aadhaar/documents.
    const landParcels = assignments
      .filter(a => a.land?.gpsLatitude != null)
      .map((a, i) => ({
        id: `parcel-${i}`, farmerName: a.farmer?.fullName || 'Land Owner',
        lat: a.land!.gpsLatitude, lng: a.land!.gpsLongitude,
        polygonGeoJson: a.land!.polygonGeoJson,
      }));

    // Only officially published monitoring reaches the public — same rule
    // used everywhere else donor-facing evidence is shown.
    const verifiedVisits = await (prisma as any).monitoringVisit.findMany({
      where: { siteId: site.id, donorVisible: true },
      select: { visitDate: true, survivalPct: true, photos: true },
      orderBy: { visitDate: 'desc' },
      take: 6,
    }).catch(() => []);

    return NextResponse.json({ site, farmers, verifiedVisits, landParcels, orgName: org.name });
  } catch (error: any) {
    console.error('Public site story error:', error);
    return NextResponse.json({ error: 'Failed to load site' }, { status: 500 });
  }
}
