export const runtime = 'nodejs';
// src/app/api/field-officer/tree/[id]/replace/route.ts
// Creates a genuinely new Tree row for a replacement, rather than
// recycling the dead one — see the schema comment on Tree.replacesTreeId
// for why: the dead tree's own photos/monitoring history stay intact and
// queryable on their own record. The replacement inherits the same
// donation and land assignment (the original donor's sponsorship carries
// forward), gets a freshly generated tag, and starts at PENDING.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateTreeTagIds } from '@/lib/tree-tag';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { officerId } = await req.json();
    if (!officerId) return NextResponse.json({ error: 'officerId is required' }, { status: 400 });

    const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    const deadTree = await prisma.tree.findUnique({
      where: { id: params.id },
      include: {
        replacedBy: { select: { id: true } },
        assignment: { select: { id: true, siteId: true, farmerId: true, farmer: { select: { orgId: true, assignedOfficerId: true } } } },
        plantationSite: { select: { id: true, orgId: true, state: true, district: true } },
      },
    });
    if (!deadTree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    if (deadTree.replacedBy) return NextResponse.json({ error: 'This tree already has a replacement.' }, { status: 400 });

    const treeOrgId = deadTree.plantationSite?.orgId || deadTree.assignment?.farmer?.orgId;
    if (!treeOrgId || (officer.orgId && officer.orgId !== treeOrgId))
      return NextResponse.json({ error: 'This tree does not belong to your organisation' }, { status: 403 });
    if (deadTree.assignment?.farmer && deadTree.assignment.farmer.assignedOfficerId !== officer.id)
      return NextResponse.json({ error: 'This tree is not on land assigned to you.' }, { status: 403 });

    const [newTag] = await generateTreeTagIds(1, treeOrgId, deadTree.plantationSite?.state, deadTree.plantationSite?.district);

    const replacement = await prisma.tree.create({
      data: {
        donationId: deadTree.donationId,
        siteId: deadTree.siteId,
        assignmentId: deadTree.assignmentId,
        species: deadTree.species,
        treeTagId: newTag,
        status: 'PENDING',
        replacesTreeId: deadTree.id,
      },
    });

    return NextResponse.json({ success: true, replacement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
