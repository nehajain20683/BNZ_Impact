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
            land:   { select: { id: true, surveyGutNumber: true, areaAcres: true, village: true, district: true, gpsLatitude: true, gpsLongitude: true, photos: true, kmlFileName: true } },
            stageHistory: { orderBy: { date: 'desc' }, take: 1 },
            // Real count of Tree rows actually linked via "Link Sponsored
            // Trees" — was missing entirely here, so the card always
            // displayed "(0 linked)" regardless of the real number; this
            // route (not the separate /assignments sub-route) is what
            // actually powers the page.
            _count: { select: { trees: true } },
          },
        },
        activities:     { orderBy: { date: 'desc' }, take: 20 },
        monitoringVisits:{ orderBy: { visitDate: 'desc' }, take: 10 },
      },
    });

    if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Resolve who logged each monitoring visit — officerId can be either a
    // User.id (admin logged it via "Log Visit") or a FieldOfficer.id (an
    // officer logged it in the field), so both tables need checking. Was
    // previously not resolved at all — the table showed which farmer a
    // visit was for, but never who actually did the visit.
    const officerIds = [...new Set(site.monitoringVisits.map(v => v.officerId).filter(Boolean))] as string[];
    const [adminUsers, fieldOfficers] = officerIds.length
      ? await Promise.all([
          prisma.user.findMany({ where: { id: { in: officerIds } }, select: { id: true, name: true } }),
          prisma.fieldOfficer.findMany({ where: { id: { in: officerIds } }, select: { id: true, name: true } }),
        ])
      : [[], []];
    const officerNameById = new Map<string, string>([
      ...adminUsers.map(u => [u.id, u.name || 'Admin'] as [string, string]),
      ...fieldOfficers.map(o => [o.id, o.name] as [string, string]),
    ]);
    const monitoringVisitsWithOfficer = site.monitoringVisits.map(v => ({
      ...v, officerName: v.officerId ? (officerNameById.get(v.officerId) || 'Unknown') : null,
    }));

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
      site: { ...site, monitoringVisits: monitoringVisitsWithOfficer, timelineEvents, siteDocuments, carbonMonitoring: null, notifications: [] }
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
