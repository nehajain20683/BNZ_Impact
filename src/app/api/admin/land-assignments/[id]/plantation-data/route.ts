export const runtime = 'nodejs';
// src/app/api/admin/land-assignments/[id]/plantation-data/route.ts
// The explicit, correctable source of truth for a land assignment's real
// planting numbers — separate from the narrative Activity Log. Every change
// is diffed and recorded to AuditLog so mistakes are always traceable and
// reversible, unlike the old increment-based activity side effects.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — current values + change history for this assignment
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const assignment = await prisma.landAssignment.findUnique({
      where: { id: params.id },
      select: { treesPlanted: true, treesSurviving: true, treesAssigned: true, speciesPlanted: true, plantationDate: true, farmerId: true },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const history = await prisma.auditLog.findMany({
      where: { farmerId: assignment.farmerId, action: 'PLANTATION_DATA_UPDATED', details: { path: ['assignmentId'], equals: params.id } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).catch(() => []);

    return NextResponse.json({ assignment, history });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// PATCH — explicitly set (not increment) the real numbers. Always
// overwrites with what's provided, so correcting a mistake is just
// re-submitting the right values — no undo mechanism needed.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const body  = await req.json();

    const existing = await prisma.landAssignment.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const data: any = {};
    const before: any = {};
    const after: any = {};

    if (body.treesPlanted !== undefined) {
      const requested = parseInt(body.treesPlanted) || 0;
      // Trees planted can never exceed what was actually assigned/approved
      // for this land — that number represents the committee-approved
      // quota for this specific farmer's parcel, and no matter which
      // screen this value is entered from, it must respect that ceiling.
      if (existing.treesAssigned && requested > existing.treesAssigned) {
        return NextResponse.json({
          error: `Trees planted (${requested}) cannot exceed the ${existing.treesAssigned} trees assigned to this land.`,
        }, { status: 400 });
      }
      data.treesPlanted = requested;
      before.treesPlanted = existing.treesPlanted; after.treesPlanted = data.treesPlanted;
    }
    if (body.treesSurviving !== undefined) {
      data.treesSurviving = parseInt(body.treesSurviving) || 0;
      before.treesSurviving = existing.treesSurviving; after.treesSurviving = data.treesSurviving;
    }
    if (Array.isArray(body.speciesPlanted)) {
      data.speciesPlanted = body.speciesPlanted.filter((s: any) => s.species && s.qty)
        .map((s: any) => ({ species: s.species, qty: parseInt(s.qty) || 0 }));
      before.speciesPlanted = existing.speciesPlanted; after.speciesPlanted = data.speciesPlanted;
    }
    if (body.plantationDate !== undefined) {
      data.plantationDate = body.plantationDate ? new Date(body.plantationDate) : null;
      before.plantationDate = existing.plantationDate; after.plantationDate = data.plantationDate;
    }

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const updated = await prisma.landAssignment.update({ where: { id: params.id }, data });

    await prisma.auditLog.create({
      data: {
        farmerId: existing.farmerId, actorId: actor.id, actorRole: actor.role,
        action: 'PLANTATION_DATA_UPDATED',
        details: { assignmentId: params.id, before, after, reason: body.reason || undefined },
      },
    }).catch(() => {});

    // Site-wide treesPlanted is derived as the sum across all its
    // assignments — recomputed fresh here rather than incremented, so it
    // can never drift from reality no matter how many corrections happen.
    const siteTotal = await prisma.landAssignment.aggregate({
      where: { siteId: existing.siteId },
      _sum: { treesPlanted: true },
    });
    await prisma.plantationSite.update({
      where: { id: existing.siteId },
      data: { treesPlanted: siteTotal._sum.treesPlanted || 0 },
    }).catch(() => {});

    return NextResponse.json({ success: true, assignment: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
