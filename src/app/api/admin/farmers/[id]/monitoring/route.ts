export const runtime = 'nodejs';
// src/app/api/admin/farmers/[id]/monitoring/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const farmer = await prisma.farmer.findFirst({ where: { id: params.id, orgId }, select: { id: true } });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found in this organisation' }, { status: 404 });

    const visits = await prisma.monitoringVisit.findMany({
      where: { farmerId: params.id },
      include: {
        treeSamples: { include: { tree: { select: { treeTagId: true, species: true } } }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { visitDate: 'desc' },
    });

    return NextResponse.json({ visits });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
