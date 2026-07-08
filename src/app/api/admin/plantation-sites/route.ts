export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN','PROJECT_MANAGER'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

function autoSiteCode(name: string) {
  const abbr = name.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  return `JGL-${abbr}-${Date.now().toString().slice(-4)}`;
}

// GET — list all plantation sites
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const projectId = params.get('projectId');
  const phase     = params.get('phase');
  const q         = params.get('q');

  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (phase)     where.currentPhase = phase;
  if (q) where.OR = [
    { siteName: { contains: q, mode: 'insensitive' } },
    { district: { contains: q, mode: 'insensitive' } },
    { village:  { contains: q, mode: 'insensitive' } },
  ];

  const sites = await prisma.plantationSite.findMany({
    where,
    include: {
      _count: { select: { landAssignments: true, activities: true, monitoringVisits: true } },
      speciesPlans: true,
      project: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ sites });
}

// POST — create plantation site
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body  = await req.json();

    const siteCode = body.siteCode || autoSiteCode(body.siteName || 'SITE');
    const site = await prisma.plantationSite.create({
      data: {
        projectId:         body.projectId || undefined,
        siteName:          body.siteName,
        location:          [body.village, body.district, body.state].filter(Boolean).join(', ') || body.siteName,
        siteCode,
        internalRef:       body.internalRef || undefined,
        description:       body.description || undefined,
        state:             body.state || undefined,
        district:          body.district || undefined,
        taluka:            body.taluka || undefined,
        village:           body.village || undefined,
        gpsLatitude:       body.gpsLatitude ? parseFloat(body.gpsLatitude) : undefined,
        gpsLongitude:      body.gpsLongitude ? parseFloat(body.gpsLongitude) : undefined,
        totalPlannedArea:  body.totalPlannedArea ? parseFloat(body.totalPlannedArea) : undefined,
        currentPhase:      body.currentPhase || 'PLANNING',
        plantationPartner: body.plantationPartner || undefined,
        implementingAgency:body.implementingAgency || undefined,
        fieldOfficerId:    body.fieldOfficerId || undefined,
        supervisorId:      body.supervisorId || undefined,
        carbonConsultant:  body.carbonConsultant || undefined,
        auditor:           body.auditor || undefined,
        nursery:           body.nursery || undefined,
        plantationSeason:  body.plantationSeason || undefined,
        startDate:         body.startDate ? new Date(body.startDate) : undefined,
        endDate:           body.endDate ? new Date(body.endDate) : undefined,
        totalFarmers:      body.totalFarmers ? parseInt(body.totalFarmers) : undefined,
        plannedArea:       body.plannedArea ? parseFloat(body.plannedArea) : undefined,
        plannedTrees:      body.plannedTrees ? parseInt(body.plannedTrees) : undefined,
        estimatedCarbon:   body.estimatedCarbon ? parseFloat(body.estimatedCarbon) : undefined,
        estimatedCredits:  body.estimatedCredits ? parseFloat(body.estimatedCredits) : undefined,
        expectedSurvival:  body.expectedSurvival ? parseFloat(body.expectedSurvival) : undefined,
        budget:            body.budget ? parseFloat(body.budget) : undefined,
      },
    });

    // Create species plans
    if (body.speciesPlans?.length) {
      await prisma.speciesPlan.createMany({
        data: body.speciesPlans.map((sp: any) => ({
          siteId:           site.id,
          species:          sp.species,
          plannedQty:       parseInt(sp.plannedQty),
          nurserySource:    sp.nurserySource || undefined,
          expectedSurvival: sp.expectedSurvival ? parseFloat(sp.expectedSurvival) : undefined,
          carbonFactor:     sp.carbonFactor ? parseFloat(sp.carbonFactor) : undefined,
          remarks:          sp.remarks || undefined,
        })),
      });
    }

    // Create initial timeline event
    await prisma.timelineEvent.create({
      data: {
        siteId: site.id,
        eventType: 'SITE_CREATED',
        title: 'Plantation Site Created',
        description: `Site "${site.siteName}" created by ${actor.name || actor.email}`,
        createdById: actor.id,
      },
    });

    await prisma.auditLog.create({
      data: { actorId: actor.id, actorRole: actor.role, action: 'PLANTATION_SITE_CREATED',
              details: { siteId: site.id, siteName: site.siteName } }
    }).catch(() => {});

    return NextResponse.json({ success: true, site });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
