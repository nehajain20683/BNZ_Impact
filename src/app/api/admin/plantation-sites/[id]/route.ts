export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const site = await prisma.plantationSite.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      speciesPlans: true,
      landAssignments: {
        include: {
          farmer: { select: { fullName: true, mobile: true, farmerIdGenerated: true, village: true } },
          land:   { select: { surveyGutNumber: true, areaAcres: true, village: true, district: true } },
          stageHistory: { orderBy: { date: 'desc' }, take: 1 },
        },
      },
      activities: { orderBy: { date: 'desc' }, take: 10 },
      monitoringVisits: { orderBy: { visitDate: 'desc' }, take: 5 },
      carbonMonitoring: true,
      timelineEvents: { orderBy: { eventDate: 'desc' } },
      siteDocuments:  { orderBy: { uploadedAt: 'desc' } },
      notifications:  { where: { read: false }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ site });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
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

  // Log phase change to timeline
  if (body.currentPhase) {
    await prisma.timelineEvent.create({
      data: { siteId: params.id, eventType: 'PHASE_CHANGED', title: `Phase updated to ${body.currentPhase}`,
              createdById: (session.user as any).id }
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, site });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.plantationSite.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
