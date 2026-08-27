export const runtime = 'nodejs';
// src/app/api/admin/impact-metrics/values/route.ts
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

// GET ?siteId= — values for one site, or all values for the org's metrics
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    const where: any = { metric: { orgId } };
    if (siteId) where.siteId = siteId;

    const values = await (prisma as any).impactMetricValue.findMany({
      where,
      include: { metric: true, site: { select: { id: true, siteName: true } } },
      orderBy: { recordedAt: 'desc' },
    });
    return NextResponse.json({ values });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();

    if (!body.metricId || !body.siteId || body.value === undefined)
      return NextResponse.json({ error: 'metricId, siteId, and value are required' }, { status: 400 });

    const metric = await (prisma as any).impactMetricDefinition.findFirst({ where: { id: body.metricId, orgId } });
    if (!metric) return NextResponse.json({ error: 'Metric not found for this organisation' }, { status: 404 });

    const site = await prisma.plantationSite.findFirst({ where: { id: body.siteId, orgId } });
    if (!site) return NextResponse.json({ error: 'Plantation site not found for this organisation' }, { status: 404 });

    const value = await (prisma as any).impactMetricValue.create({
      data: {
        metricId: body.metricId,
        siteId:   body.siteId,
        value:    Number(body.value),
        period:   body.period || null,
        notes:    body.notes || null,
      },
    });
    return NextResponse.json({ success: true, value });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await (prisma as any).impactMetricValue.findFirst({
      where: { id, metric: { orgId } },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await (prisma as any).impactMetricValue.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
