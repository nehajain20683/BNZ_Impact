export const runtime = 'nodejs';
// src/app/api/admin/impact-metrics/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET() {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const metrics = await (prisma as any).impactMetricDefinition.findMany({
      where: { orgId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: { values: { select: { id: true, value: true, siteId: true } } },
    });
    return NextResponse.json({ metrics });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();

    if (!body.name || !body.unit)
      return NextResponse.json({ error: 'Name and unit are required' }, { status: 400 });

    const metric = await (prisma as any).impactMetricDefinition.create({
      data: {
        orgId,
        name:            body.name,
        unit:            body.unit,
        icon:            body.icon || '🌿',
        color:           body.color || '#2d5a1b',
        description:     body.description || null,
        calculationType: body.calculationType === 'PER_TREE' ? 'PER_TREE' : 'SITE_PROPORTIONAL',
        displayOrder:    body.displayOrder ? parseInt(body.displayOrder) : 0,
        active:          body.active !== false,
      },
    });
    return NextResponse.json({ success: true, metric });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
