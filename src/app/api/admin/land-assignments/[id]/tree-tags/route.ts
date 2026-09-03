export const runtime = 'nodejs';
// src/app/api/admin/land-assignments/[id]/tree-tags/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
      throw new Error('Unauthorized');
    const orgId = await getActiveOrgId();

    const assignment = await prisma.landAssignment.findFirst({
      where: { id: params.id, site: { orgId } },
      include: { farmer: { select: { fullName: true } } },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const trees = await prisma.tree.findMany({
      where: { assignmentId: params.id, treeTagId: { not: null } },
      select: { id: true, treeTagId: true, species: true },
      orderBy: { treeTagId: 'asc' },
    });

    return NextResponse.json({ farmerName: assignment.farmer.fullName, trees });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
