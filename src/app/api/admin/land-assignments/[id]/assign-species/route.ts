export const runtime = 'nodejs';
// src/app/api/admin/land-assignments/[id]/assign-species/route.ts
// Corrects/fills in species on trees that are already linked to this
// assignment — either linked before this feature existed (no species set)
// or linked with the wrong species by mistake. Deliberately simple: pick a
// species, pick how many of the currently-unlabeled trees get it.
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

// GET — how many of this assignment's trees currently have no species
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const assignment = await prisma.landAssignment.findFirst({ where: { id: params.id, site: { orgId } } });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const unlabeledCount = await prisma.tree.count({ where: { assignmentId: params.id, species: null } });
    return NextResponse.json({ unlabeledCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { species, count } = await req.json();

    if (!species || !species.trim())
      return NextResponse.json({ error: 'A species is required' }, { status: 400 });

    const assignment = await prisma.landAssignment.findFirst({ where: { id: params.id, site: { orgId } } });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const unlabeled = await prisma.tree.findMany({
      where: { assignmentId: params.id, species: null },
      orderBy: { createdAt: 'asc' },
      take: count ? parseInt(count) : undefined,
      select: { id: true },
    });

    if (unlabeled.length === 0)
      return NextResponse.json({ success: true, updatedCount: 0, message: 'No unlabeled trees to update.' });

    const result = await prisma.tree.updateMany({
      where: { id: { in: unlabeled.map(t => t.id) } },
      data: { species: species.trim() },
    });

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
