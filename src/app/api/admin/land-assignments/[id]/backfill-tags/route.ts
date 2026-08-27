export const runtime = 'nodejs';
// src/app/api/admin/land-assignments/[id]/backfill-tags/route.ts
// For trees that were already linked to this assignment before Tree Tag
// generation existed — a one-time catch-up so existing data doesn't stay
// permanently untagged. Safe to run more than once; it only ever touches
// trees that still have no tag.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { generateTreeTagIds } from '@/lib/tree-tag';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — how many of this assignment's already-linked trees are missing a tag
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const assignment = await prisma.landAssignment.findFirst({ where: { id: params.id, site: { orgId } } });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const untaggedCount = await prisma.tree.count({ where: { assignmentId: params.id, treeTagId: null } });
    return NextResponse.json({ untaggedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const assignment = await prisma.landAssignment.findFirst({
      where: { id: params.id, site: { orgId } },
      include: { land: { select: { state: true, district: true } } },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const untagged = await prisma.tree.findMany({
      where: { assignmentId: params.id, treeTagId: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (untagged.length === 0)
      return NextResponse.json({ success: true, taggedCount: 0, message: 'Every tree here already has a tag.' });

    const tags = await generateTreeTagIds(untagged.length, orgId, assignment.land?.state, assignment.land?.district);

    // Large existing datasets (1000s of trees) need real headroom, and
    // batching in chunks keeps any single transaction from growing unbounded.
    const CHUNK = 200;
    let taggedCount = 0;
    for (let i = 0; i < untagged.length; i += CHUNK) {
      const slice = untagged.slice(i, i + CHUNK);
      const sliceTags = tags.slice(i, i + CHUNK);
      const result = await prisma.$transaction(
        slice.map((t, j) => prisma.tree.update({ where: { id: t.id }, data: { treeTagId: sliceTags[j] } })),
        { timeout: 60000, maxWait: 10000 },
      );
      taggedCount += result.length;
    }

    return NextResponse.json({ success: true, taggedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
