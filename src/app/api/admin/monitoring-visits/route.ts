export const runtime = 'nodejs';
// src/app/api/admin/monitoring-visits/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { notifyOrgAdmins } from '@/lib/notifications';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — list visits for the org's sites (optionally filtered by siteId/status)
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || undefined;
    const status = searchParams.get('status') || undefined;

    const visits = await (prisma as any).monitoringVisit.findMany({
      where: { site: { orgId }, ...(siteId ? { siteId } : {}), ...(status ? { status } : {}) },
      include: {
        site: { select: { id: true, siteName: true } },
        treeSamples: true,
      },
      orderBy: { visitDate: 'desc' },
      take: 200,
    });
    return NextResponse.json({ visits });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create a monitoring visit with a sample of trees (not every tree required)
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();
    const { siteId, assignmentId, farmerId, visitDate, gpsLat, gpsLng, photos, recommendations, diseaseNotes, treeSamples } = body;

    if (!siteId || !visitDate)
      return NextResponse.json({ error: 'siteId and visitDate are required' }, { status: 400 });

    const site = await prisma.plantationSite.findFirst({ where: { id: siteId, orgId } });
    if (!site) return NextResponse.json({ error: 'Plantation site not found for this organisation' }, { status: 404 });

    const samples = Array.isArray(treeSamples) ? treeSamples : [];
    const survivalCount = samples.length ? samples.filter((s: any) => s.survived !== false).length : undefined;
    const deadTrees      = samples.length ? samples.filter((s: any) => s.survived === false).length : undefined;
    const avgHeight       = samples.length
      ? samples.filter((s: any) => s.height).reduce((sum: number, s: any, _i: number, arr: any[]) => sum + s.height / arr.length, 0) || undefined
      : undefined;
    const survivalPct = samples.length ? Math.round((survivalCount! / samples.length) * 1000) / 10 : undefined;
    const mortalityPct = survivalPct !== undefined ? Math.round((100 - survivalPct) * 10) / 10 : undefined;

    const visit = await (prisma as any).monitoringVisit.create({
      data: {
        siteId, assignmentId: assignmentId || null, farmerId: farmerId || null,
        officerId: actor.id,
        visitDate: new Date(visitDate),
        gpsLat: gpsLat ?? null, gpsLng: gpsLng ?? null,
        photos: Array.isArray(photos) ? photos : [],
        recommendations: recommendations || null, diseaseNotes: diseaseNotes || null,
        survivalCount, deadTrees, avgHeight, survivalPct, mortalityPct,
        status: 'SUBMITTED',
        treeSamples: samples.length ? {
          create: samples.map((s: any) => ({
            treeId: s.treeId || null, species: s.species || null,
            height: s.height ?? null, diameter: s.diameter ?? null,
            health: s.health || null, survived: s.survived !== false,
            photo: s.photo || null, gpsLat: s.gpsLat ?? null, gpsLng: s.gpsLng ?? null,
            notes: s.notes || null,
          })),
        } : undefined,
      },
      include: { treeSamples: true },
    });

    // Keep the assignment's running totals in sync if this visit is tied to one
    if (assignmentId && samples.length) {
      await prisma.landAssignment.update({
        where: { id: assignmentId },
        data: { lastMonitored: new Date(visitDate), treesSurviving: survivalCount },
      }).catch(() => {});
    }

    await notifyOrgAdmins(orgId, 'PENDING_REVIEW', `New monitoring visit awaiting verification — ${site.siteName}`,
      undefined, '/admin/dmrv/verify');

    return NextResponse.json({ success: true, visit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
