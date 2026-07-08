export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const activities = await prisma.plantationActivity.findMany({
    where: { siteId: params.id },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json({ activities });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  const activity = await prisma.plantationActivity.create({
    data: {
      siteId:        params.id,
      date:          new Date(body.date),
      activityType:  body.activityType,
      description:   body.description || undefined,
      team:          body.team || undefined,
      workers:       body.workers ? parseInt(body.workers) : undefined,
      treesPlanted:  body.treesPlanted ? parseInt(body.treesPlanted) : undefined,
      speciesPlanted:body.speciesPlanted?.length ? body.speciesPlanted : undefined,
      driveLink:     body.driveLink || undefined,
      photos:        body.photos || [],
      documents:     body.documents || [],
      remarks:       body.remarks || undefined,
      loggedById:    (session.user as any).id,
    },
  });

  if (body.activityType === 'PLANTATION' && body.treesPlanted) {
    const planted = parseInt(body.treesPlanted);

    // Update site total
    await prisma.plantationSite.update({
      where: { id: params.id },
      data:  { treesPlanted: { increment: planted } },
    }).catch(() => {});

    // Update farmer assignment + merge species data
    if (body.assignmentId) {
      const existing = await prisma.landAssignment.findUnique({ where: { id: body.assignmentId } });
      const existingSpecies: any[] = (existing?.speciesPlanted as any[]) || [];

      // Merge new species into existing
      const merged = [...existingSpecies];
      for (const ns of (body.speciesPlanted || [])) {
        const found = merged.find(s => s.species === ns.species);
        if (found) found.qty = (found.qty || 0) + ns.qty;
        else merged.push({ species: ns.species, qty: ns.qty });
      }

      const existingLinks: string[] = (existing?.driveLinks as string[]) || [];
      const newLinks = body.driveLink
        ? [...new Set([...existingLinks, body.driveLink])]
        : existingLinks;

      await prisma.landAssignment.update({
        where: { id: body.assignmentId },
        data: {
          treesPlanted:  { increment: planted },
          speciesPlanted: merged,
          driveLinks:     newLinks,
        },
      }).catch(() => {});
    }

    await prisma.timelineEvent.create({
      data: {
        siteId: params.id, eventType: 'PLANTATION_ACTIVITY',
        title: `${planted} trees planted`,
        description: body.speciesPlanted?.map((s: any) => `${s.species}: ${s.qty}`).join(', ') || body.description,
        createdById: (session.user as any).id,
      },
    }).catch(() => {});
  }

  if (body.activityType === 'SURVIVAL_SURVEY' && body.treesSurviving && body.assignmentId) {
    await prisma.landAssignment.update({
      where: { id: body.assignmentId },
      data:  { treesSurviving: parseInt(body.treesSurviving) },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, activity });
}
