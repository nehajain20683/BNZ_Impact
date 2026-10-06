export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { guardSite, assignmentOfSite, farmerInOrg, officerInOrg } from '@/lib/admin-guard';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const adminScope = await guardSite(params.id);
  if (adminScope instanceof Response) return adminScope;
  const visits = await prisma.monitoringVisit.findMany({
    where: { siteId: params.id },
    orderBy: { visitDate: 'desc' },
  });
  return NextResponse.json({ visits });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const adminScope = await guardSite(params.id);
  if (adminScope instanceof Response) return adminScope;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (body.assignmentId && !(await assignmentOfSite(body.assignmentId, params.id)))
    return NextResponse.json({ error: 'Assignment not found for this site' }, { status: 404 });
  if (body.farmerId && !(await farmerInOrg(body.farmerId, adminScope.orgId)))
    return NextResponse.json({ error: 'Farmer not found in this organisation' }, { status: 404 });
  if (body.officerId && !(await officerInOrg(body.officerId, adminScope.orgId)))
    return NextResponse.json({ error: 'Officer not found in this organisation' }, { status: 404 });
  const survival = body.survivalCount && body.treesPlanted
    ? Math.round((body.survivalCount / body.treesPlanted) * 100)
    : undefined;
  const mortality = survival !== undefined ? 100 - survival : undefined;
  const visit = await prisma.monitoringVisit.create({
    data: {
      siteId:          params.id,
      assignmentId:    body.assignmentId || undefined,
      farmerId:        body.farmerId || undefined,
      visitDate:       new Date(body.visitDate),
      officerId:       body.officerId || (session.user as any).id,
      survivalCount:   body.survivalCount ? parseInt(body.survivalCount) : undefined,
      deadTrees:       body.deadTrees ? parseInt(body.deadTrees) : undefined,
      diseaseNotes:    body.diseaseNotes || undefined,
      avgHeight:       body.avgHeight ? parseFloat(body.avgHeight) : undefined,
      avgDiameter:     body.avgDiameter ? parseFloat(body.avgDiameter) : undefined,
      photos:          body.photos || [],
      gpsLat:          body.gpsLat ? parseFloat(body.gpsLat) : undefined,
      gpsLng:          body.gpsLng ? parseFloat(body.gpsLng) : undefined,
      recommendations: body.recommendations || undefined,
      driveLink:       body.driveLink || undefined,
      survivalPct:     survival ? survival : undefined,
      mortalityPct:    mortality ? mortality : undefined,
    },
  });

  // Every monitoring visit also shows up in the site's general Activity
  // timeline, not just the dedicated Monitoring tab — a supervisor
  // scanning overall site activity shouldn't need to check two separate
  // places to see that a visit happened.
  await prisma.plantationActivity.create({
    data: {
      siteId: params.id,
      date: new Date(body.visitDate),
      activityType: 'MONITORING',
      description: `Monitoring visit${body.survivalCount ? ` — ${body.survivalCount} trees surviving` : ''}${body.deadTrees ? `, ${body.deadTrees} dead` : ''}`,
      remarks: body.diseaseNotes || body.recommendations || undefined,
      photos: body.photos || [],
      loggedById: body.officerId || (session.user as any).id,
    },
  }).catch(() => {});
  // Update site survival rate
  if (survival !== undefined) {
    await prisma.plantationSite.update({
      where: { id: params.id },
      data: { survivalRate: survival, treesSurviving: body.survivalCount ? parseInt(body.survivalCount) : undefined }
    });
  }
  return NextResponse.json({ success: true, visit });
}
