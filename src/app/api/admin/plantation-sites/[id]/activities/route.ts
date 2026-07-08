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
      siteId:       params.id,
      date:         new Date(body.date),
      activityType: body.activityType,
      description:  body.description || undefined,
      team:         body.team || undefined,
      workers:      body.workers ? parseInt(body.workers) : undefined,
      treesPlanted: body.treesPlanted ? parseInt(body.treesPlanted) : undefined,
      photos:       body.photos || [],
      documents:    body.documents || [],
      remarks:      body.remarks || undefined,
      loggedById:   (session.user as any).id,
    },
  });
  // Update site treesPlanted if plantation activity
  if (body.activityType === 'PLANTATION' && body.treesPlanted) {
    await prisma.plantationSite.update({
      where: { id: params.id },
      data: { treesPlanted: { increment: parseInt(body.treesPlanted) } },
    });
    await prisma.timelineEvent.create({
      data: { siteId: params.id, eventType: 'PLANTATION_ACTIVITY',
              title: `${body.treesPlanted} trees planted`,
              description: body.description, createdById: (session.user as any).id }
    });
  }
  return NextResponse.json({ success: true, activity });
}
