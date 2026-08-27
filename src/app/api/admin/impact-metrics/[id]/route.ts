export const runtime = 'nodejs';
// src/app/api/admin/impact-metrics/[id]/route.ts
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

const ALLOWED = ['name', 'unit', 'icon', 'color', 'description', 'calculationType', 'displayOrder', 'active'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();

    const metric = await (prisma as any).impactMetricDefinition.findFirst({ where: { id: params.id, orgId } });
    if (!metric) return NextResponse.json({ error: 'Metric not found' }, { status: 404 });

    const data: any = {};
    for (const k of ALLOWED) if (body[k] !== undefined) data[k] = body[k];
    if ('calculationType' in data && !['PER_TREE', 'SITE_PROPORTIONAL'].includes(data.calculationType)) delete data.calculationType;
    if ('name' in data && !String(data.name).trim()) delete data.name;
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder) || 0;

    const updated = await (prisma as any).impactMetricDefinition.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, metric: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const metric = await (prisma as any).impactMetricDefinition.findFirst({ where: { id: params.id, orgId } });
    if (!metric) return NextResponse.json({ error: 'Metric not found' }, { status: 404 });

    await (prisma as any).impactMetricValue.deleteMany({ where: { metricId: params.id } });
    await (prisma as any).impactMetricDefinition.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
