export const runtime = 'nodejs';
// src/app/api/admin/land-assignments/[id]/assign-trees/route.ts
// Closes a real gap: Tree rows are created at donation time with no siteId
// at all, and nothing anywhere previously connected them to an actual
// plantation site or farmer afterward. This is what makes that connection
// real — pulling from the pool of a tenant's unassigned, already-paid-for
// trees and linking them to a specific farmer's land. This is also the
// moment each tree gets a real Tree Tag ID — the first point it has an
// actual location, so it's the natural point it gets an identity.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { generateTreeTagIds } from '@/lib/tree-tag';
import { computeSpeciesAllocation } from '@/lib/species-allocation';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const assignment = await prisma.landAssignment.findFirst({ where: { id: params.id, site: { orgId } } });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const [linkedCount, availableCount] = await Promise.all([
      prisma.tree.count({ where: { assignmentId: params.id } }),
      prisma.tree.count({ where: { siteId: null, assignmentId: null, donation: { orgId, paymentStatus: 'COMPLETED' } } }),
    ]);

    // A tree can only be linked once it's an actual sapling in the ground —
    // this land can never hold more linked donor trees than it has
    // genuinely planted (LandAssignment.treesPlanted), regardless of how
    // many unassigned sponsored trees exist in the wider org pool.
    const plantedCapacity = Math.max(0, (assignment.treesPlanted || 0) - linkedCount);

    return NextResponse.json({ linkedCount, availableCount, treesPlanted: assignment.treesPlanted, plantedCapacity });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { count, species, allocationMode } = await req.json();

    const n = parseInt(count);
    if (!n || n < 1) return NextResponse.json({ error: 'A positive count is required' }, { status: 400 });

    const assignment = await prisma.landAssignment.findFirst({
      where: { id: params.id, site: { orgId } },
      include: { land: { select: { state: true, district: true } } },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    // A tree can only be linked once it's an actual sapling in the ground —
    // never claim more donor trees for this land than it genuinely has
    // planted. Anything beyond that stays untouched in the shared pool,
    // ready to be linked to the next farmer's land instead.
    const linkedCount = await prisma.tree.count({ where: { assignmentId: params.id } });
    const plantedCapacity = Math.max(0, (assignment.treesPlanted || 0) - linkedCount);

    if (plantedCapacity <= 0) {
      return NextResponse.json({
        error: `This land has ${assignment.treesPlanted || 0} trees planted, and all of them are already linked to a donor. Report more planting via "Update Plantation Data" before linking further trees here.`,
      }, { status: 400 });
    }

    const cappedByPlantedLimit = n > plantedCapacity;
    const toLink = Math.min(n, plantedCapacity);

    // Pull the oldest unassigned, already-paid-for trees in this org's pool —
    // first-come-first-served matches donation order to planting order.
    const pending = await prisma.tree.findMany({
      where: { siteId: null, assignmentId: null, donation: { orgId, paymentStatus: 'COMPLETED' } },
      orderBy: { createdAt: 'asc' },
      take: toLink,
      select: { id: true },
    });

    if (pending.length === 0)
      return NextResponse.json({ error: 'No unassigned sponsored trees available in this organisation right now.' }, { status: 400 });

    // Each tree needs its own unique tag — updateMany can't set per-row
    // values, so this generates the batch of tags up front, then applies
    // them individually.
    const tags = await generateTreeTagIds(pending.length, orgId, assignment.land?.state, assignment.land?.district);

    // "auto" mode assigns each tree its own species so the batch hits the
    // org's Main/Side target ratio (e.g. 80% Mango, 20% Bamboo) instead of
    // one flat species for the whole batch. "manual" (the default,
    // pre-existing behaviour) is completely unchanged — a single species
    // value applied uniformly, or none at all.
    let perTreeSpecies: (string | undefined)[] = pending.map(() => species || undefined);
    let allocationSummary: { species: string; count: number }[] | null = null;
    let uncategorizedSpecies: string[] = [];

    if (allocationMode === 'auto') {
      const { allocations, uncategorized } = await computeSpeciesAllocation(
        orgId, (assignment.speciesPlanted as any[]) || [], pending.length,
      );
      uncategorizedSpecies = uncategorized;
      if (allocations.length > 0) {
        const expanded: string[] = [];
        for (const a of allocations) for (let i = 0; i < a.count; i++) expanded.push(a.species);
        perTreeSpecies = expanded;
        allocationSummary = allocations;
      }
      // If there's no species breakdown recorded for this land at all,
      // auto mode simply has nothing to allocate from — falls back to
      // leaving species unset, same as manual mode with none chosen.
    }

    const updated = await prisma.$transaction(
      pending.map((t, i) => prisma.tree.update({
        where: { id: t.id },
        data: {
          siteId: assignment.siteId,
          assignmentId: params.id,
          status: 'PLANTED',
          plantedDate: new Date(),
          species: perTreeSpecies[i],
          treeTagId: tags[i],
        },
      })),
      { timeout: 60000, maxWait: 10000 }, // large batches (100s-1000s of trees) need headroom
    );

    // Note: this deliberately does NOT touch the assignment's own
    // `treesPlanted` counter. "Trees planted" (real-world planting, tracked
    // via Log Activity) and "trees linked to a donor" (which specific
    // sponsored trees correspond to saplings on this land) are different
    // things — a tree can be physically planted long before or after it's
    // matched to a donor. Overwriting one with the other was a real bug.

    return NextResponse.json({
      success: true, assignedCount: updated.length,
      shortfall: n - updated.length > 0 ? n - updated.length : 0,
      cappedByPlantedLimit,
      plantedCapacity,
      allocationSummary,
      uncategorizedSpecies,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
