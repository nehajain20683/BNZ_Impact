export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const activities = await prisma.plantationActivity.findMany({
      where: { siteId: params.id },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ activities });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    if (!body.date || !body.activityType)
      return NextResponse.json({ error: 'date and activityType are required' }, { status: 400 });

    // Calculate total trees from species rows if provided
    const validSpecies: any[] = (body.speciesPlanted || []).filter((s: any) => s.species && s.qty);
    const speciesTotal = validSpecies.reduce((s: number, r: any) => s + (parseInt(r.qty) || 0), 0);
    const treesPlanted = speciesTotal || (body.treesPlanted ? parseInt(body.treesPlanted) : undefined);

    // Build create data — only include fields that exist in DB
    // speciesPlanted and driveLink are new columns; skip if not yet in DB
    const createData: any = {
      siteId:       params.id,
      date:         new Date(body.date),
      activityType: body.activityType,
      description:  body.description  || undefined,
      team:         body.team         || undefined,
      workers:      body.workers      ? parseInt(body.workers) : undefined,
      treesPlanted: treesPlanted      || undefined,
      photos:       body.photos       || [],
      documents:    body.documents    || [],
      remarks:      body.remarks      || undefined,
      loggedById:   (session.user as any).id,
    };

    // Try to add new columns — they may not exist yet in DB
    // If they fail, we'll catch and retry without them
    let activity;
    try {
      activity = await prisma.plantationActivity.create({
        data: {
          ...createData,
          speciesPlanted: validSpecies.length ? validSpecies : undefined,
          driveLink:      body.driveLink || undefined,
        },
      });
    } catch {
      // Fallback: create without new columns (if SQL migration not yet run)
      activity = await prisma.plantationActivity.create({ data: createData });
    }

    // This activity log is a narrative/event record only — "this happened,
    // this was shared" — and deliberately does NOT touch PlantationSite or
    // LandAssignment's actual planted/surviving totals. Those are entered
    // explicitly and correctably via "Update Plantation Data" instead, so a
    // mis-logged activity can never silently corrupt the real numbers.
    if (body.activityType === 'PLANTATION' && treesPlanted) {
      await prisma.timelineEvent.create({
        data: {
          siteId:      params.id,
          eventType:   'PLANTATION_ACTIVITY',
          title:       `${treesPlanted} trees planted (reported)`,
          description: validSpecies.map(s => `${s.species}: ${s.qty}`).join(', ') || body.description,
          createdById: (session.user as any).id,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, activity });
  } catch (e: any) {
    console.error('[activities POST]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
