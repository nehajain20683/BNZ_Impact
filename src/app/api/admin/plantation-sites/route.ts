export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET() {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const sites = await prisma.plantationSite.findMany({
      where: { active: true, orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        speciesPlans: true,
        _count: { select: { landAssignments: true, activities: true, monitoringVisits: true } },
      },
    });

    return NextResponse.json({ sites });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();

    if (!body.siteName) return NextResponse.json({ error: 'siteName required' }, { status: 400 });

    const site = await prisma.plantationSite.create({
      data: {
        orgId,
        siteName:          body.siteName,
        siteCode:          body.siteCode          || undefined,
        description:       body.description       || undefined,
        currentPhase:      body.currentPhase      || 'PLANNING',
        plantationPartner: body.plantationPartner || undefined,
        implementingAgency:body.implementingAgency|| undefined,
        fieldOfficerId:    body.fieldOfficerId    || undefined,
        plantationSeason:  body.plantationSeason  || undefined,
        startDate:         body.startDate ? new Date(body.startDate) : undefined,
        endDate:           body.endDate   ? new Date(body.endDate)   : undefined,
        state:             body.state             || undefined,
        district:          body.district          || undefined,
        taluka:            body.taluka            || undefined,
        village:           body.village           || undefined,
        gpsLatitude:       body.gpsLatitude       ? parseFloat(body.gpsLatitude)  : undefined,
        gpsLongitude:      body.gpsLongitude      ? parseFloat(body.gpsLongitude) : undefined,
        totalPlannedArea:  body.totalPlannedArea  ? parseFloat(body.totalPlannedArea) : undefined,
        plannedTrees:      body.plannedTrees      ? parseInt(body.plannedTrees)    : undefined,
        estimatedCarbon:   body.estimatedCarbon   ? parseFloat(body.estimatedCarbon) : undefined,
        estimatedCredits:  body.estimatedCredits  ? parseFloat(body.estimatedCredits): undefined,
        expectedSurvival:  body.expectedSurvival  ? parseFloat(body.expectedSurvival): undefined,
        budget:            body.budget            ? parseFloat(body.budget)        : undefined,
        active:            true,
      },
    });

    // Create species plans if provided
    if (body.speciesPlans?.length) {
      await prisma.speciesPlan.createMany({
        data: body.speciesPlans.map((sp: any) => ({
          siteId:      site.id,
          species:     sp.species,
          plannedQty:  parseInt(sp.qty) || 0,
          description: sp.description || undefined,
        })),
      });
    }

    await prisma.timelineEvent.create({
      data: { siteId: site.id, eventType: 'SITE_CREATED',
              title: `Site created: ${site.siteName}`,
              createdById: actor.id }
    }).catch(() => {});

    return NextResponse.json({ success: true, site });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
