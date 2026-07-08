export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    // Core site data — safe fields only
    const site = await prisma.plantationSite.findUnique({
      where: { id: params.id },
      include: {
        speciesPlans:    true,
        landAssignments: {
          include: {
            farmer: { select: { id: true, fullName: true, mobile: true, farmerIdGenerated: true, village: true } },
            land:   { select: { id: true, surveyGutNumber: true, areaAcres: true, village: true, district: true, gpsLatitude: true, gpsLongitude: true } },
            stageHistory: { orderBy: { date: 'desc' }, take: 1 },
          },
        },
        activities:     { orderBy: { date: 'desc' }, take: 20 },
        monitoringVisits:{ orderBy: { visitDate: 'desc' }, take: 10 },
      },
    });

    if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Optional tables — fetch separately so failures don't break the page
    const [timelineEvents, siteDocuments] = await Promise.all([
      prisma.timelineEvent.findMany({
        where: { siteId: params.id }, orderBy: { eventDate: 'desc' },
      }).catch(() => []),
      prisma.siteDocument.findMany({
        where: { siteId: params.id }, orderBy: { uploadedAt: 'desc' },
      }).catch(() => []),
    ]);

    return NextResponse.json({
      site: { ...site, timelineEvents, siteDocuments, carbonMonitoring: null, notifications: [] }
    });
  } catch (e: any) {
    console.error('[plantation-site GET]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body    = await req.json();
    const allowed = ['siteName','description','currentPhase','plantationPartner','implementingAgency',
      'fieldOfficerId','supervisorId','plantationSeason','startDate','endDate','state','district',
      'taluka','village','gpsLatitude','gpsLongitude','totalPlannedArea','plannedTrees','plannedArea',
      'estimatedCarbon','estimatedCredits','expectedSurvival','budget','active',
      'treesPlanted','treesSurviving','survivalRate','totalFarmers','carbonConsultant','auditor','nursery'];

    const data: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) {
        if (['startDate','endDate'].includes(k)) data[k] = body[k] ? new Date(body[k]) : null;
        else if (['gpsLatitude','gpsLongitude','totalPlannedArea','plannedArea','plannedTrees',
                  'estimatedCarbon','estimatedCredits','expectedSurvival','budget','treesPlanted',
                  'treesSurviving','survivalRate','totalFarmers'].includes(k))
          data[k] = body[k] !== '' ? Number(body[k]) : null;
        else data[k] = body[k];
      }
    }

    const site = await prisma.plantationSite.update({ where: { id: params.id }, data });

    if (body.currentPhase) {
      await prisma.timelineEvent.create({
        data: { siteId: params.id, eventType: 'PHASE_CHANGED',
                title: `Phase updated to ${body.currentPhase}`,
                createdById: (session.user as any).id }
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, site });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.plantationSite.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
