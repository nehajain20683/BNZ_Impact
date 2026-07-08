export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const assignments = await prisma.landAssignment.findMany({
    where: { siteId: params.id },
    include: {
      farmer: { select: { id: true, fullName: true, mobile: true, farmerIdGenerated: true, village: true, district: true } },
      land:   { select: { id: true, surveyGutNumber: true, areaAcres: true, areaOfferedAcres: true, village: true, district: true, ownershipType: true } },
      stageHistory: { orderBy: { date: 'desc' } },
    },
    orderBy: { assignedAt: 'desc' },
  });
  return NextResponse.json({ assignments });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actor = session.user as any;
    const body  = await req.json();

    if (!body.farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    // Validate capacity
    const land = body.landId ? await prisma.land.findUnique({ where: { id: body.landId } }) : null;
    const capacity = land?.areaOfferedAcres ? Math.floor((land.areaOfferedAcres || 0) * 800) : 99999;
    if (body.treesAssigned > capacity)
      return NextResponse.json({ error: `Trees (${body.treesAssigned}) exceed land capacity (${capacity})` }, { status: 400 });

    const assignment = await prisma.landAssignment.create({
      data: {
        siteId:          params.id,
        farmerId:        body.farmerId,
        landId:          body.landId || undefined,
        treesAssigned:   parseInt(body.treesAssigned),
        speciesAlloc:    body.speciesAlloc || undefined,
        plantationDate:  body.plantationDate ? new Date(body.plantationDate) : undefined,
        remarks:         body.remarks || undefined,
        stage:           'ASSIGNED',
        assignedById:    actor.id,
      },
    });

    // Log initial stage
    await prisma.landStageHistory.create({
      data: { assignmentId: assignment.id, stage: 'ASSIGNED', updatedById: actor.id,
              remarks: 'Land assigned to plantation site' }
    });

    // Timeline event
    await prisma.timelineEvent.create({
      data: { siteId: params.id, eventType: 'FARMER_ASSIGNED', title: `Farmer land assigned`,
              description: `${body.treesAssigned} trees assigned`, createdById: actor.id }
    });

    return NextResponse.json({ success: true, assignment });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { assignmentId, stage, treesPlanted, treesSurviving, remarks, photos } = await req.json();

  const update: any = {};
  if (stage)          { update.stage = stage; update.lastMonitored = new Date(); }
  if (treesPlanted !== undefined) update.treesPlanted = parseInt(treesPlanted);
  if (treesSurviving !== undefined) update.treesSurviving = parseInt(treesSurviving);

  const assignment = await prisma.landAssignment.update({ where: { id: assignmentId }, data: update });

  if (stage) {
    await prisma.landStageHistory.create({
      data: { assignmentId, stage, updatedById: (session.user as any).id, remarks, photos: photos || [] }
    });
  }
  return NextResponse.json({ success: true, assignment });
}
