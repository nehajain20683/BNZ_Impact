export const runtime = 'nodejs';
// src/app/api/field-officer/tree-sample/route.ts
// Wires up MonitoringTreeSample — a model that already existed with the
// right fields (height, diameter, health, survived, photo, GPS) but had
// zero write path anywhere in the codebase. Each sample rolls up into its
// parent MonitoringVisit's aggregate stats (survivalPct, avgHeight, etc.),
// auto-created/reused per farmer/assignment/day so an officer working
// through many trees in one visit doesn't create a separate visit per tree.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

async function recomputeVisitAggregates(visitId: string) {
  const samples = await prisma.monitoringTreeSample.findMany({ where: { visitId } });
  const total = samples.length;
  if (total === 0) return;
  const survived = samples.filter(s => s.survived).length;
  const dead = total - survived;
  const heights = samples.map(s => s.height).filter((h): h is number => h != null);
  const avgHeight = heights.length ? heights.reduce((a, b) => a + b, 0) / heights.length : undefined;
  const survivalPct = Math.round((survived / total) * 100);

  await prisma.monitoringVisit.update({
    where: { id: visitId },
    data: {
      survivalCount: survived, deadTrees: dead,
      avgHeight, survivalPct, mortalityPct: 100 - survivalPct,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { officerId, treeId, height, diameter, health, survived, photo, notes, latitude, longitude } = body;

    if (!officerId || !treeId)
      return NextResponse.json({ error: 'officerId and treeId are required' }, { status: 400 });

    const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    const tree = await prisma.tree.findUnique({
      where: { id: treeId },
      include: {
        assignment: { select: { id: true, siteId: true, farmerId: true, farmer: { select: { orgId: true, assignedOfficerId: true } } } },
        plantationSite: { select: { id: true, orgId: true } },
      },
    });
    if (!tree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 });

    const treeOrgId = tree.plantationSite?.orgId || tree.assignment?.farmer?.orgId;
    if (!treeOrgId || (officer.orgId && officer.orgId !== treeOrgId))
      return NextResponse.json({ error: 'This tree does not belong to your organisation' }, { status: 403 });
    if (tree.assignment?.farmer && tree.assignment.farmer.assignedOfficerId !== officer.id)
      return NextResponse.json({ error: 'This tree is not on land assigned to you.' }, { status: 403 });

    const siteId = tree.assignment?.siteId || tree.siteId;
    if (!siteId) return NextResponse.json({ error: 'This tree has no plantation site yet — link it before recording health data.' }, { status: 400 });

    // Duplicate-tap guard, same pattern as tree-photo.
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const recentDuplicate = await prisma.monitoringTreeSample.findFirst({
      where: { treeId, createdAt: { gte: tenSecondsAgo } },
      orderBy: { createdAt: 'desc' },
    });
    if (recentDuplicate) return NextResponse.json({ success: true, sample: recentDuplicate, duplicate: true });

    // Find or create today's visit for this assignment/site + officer, so a
    // whole round of trees in one visit rolls into one report, not many.
    let visit = await prisma.monitoringVisit.findFirst({
      where: {
        siteId, officerId: officer.id,
        assignmentId: tree.assignment?.id || undefined,
        visitDate: { gte: startOfDay(new Date()) },
      },
    });
    let isNewVisit = false;
    if (!visit) {
      isNewVisit = true;
      visit = await prisma.monitoringVisit.create({
        data: {
          siteId, assignmentId: tree.assignment?.id || undefined,
          farmerId: tree.assignment?.farmerId || undefined,
          visitDate: new Date(), officerId: officer.id,
          gpsLat: typeof latitude === 'number' ? latitude : undefined,
          gpsLng: typeof longitude === 'number' ? longitude : undefined,
        },
      });
      // One activity entry per visit, not per tree — created once when this
      // day's visit first starts, so a round of 30 trees doesn't flood the
      // site's Activity timeline with 30 near-identical entries.
      await prisma.plantationActivity.create({
        data: {
          siteId, date: new Date(), activityType: 'MONITORING',
          description: `Tree health monitoring visit by ${officer.name}`,
          loggedById: officer.id,
        },
      }).catch(() => {});
    }

    const sample = await prisma.monitoringTreeSample.create({
      data: {
        visitId: visit.id, treeId,
        species: tree.species || undefined,
        height: typeof height === 'number' ? height : undefined,
        diameter: typeof diameter === 'number' ? diameter : undefined,
        health: health || undefined,
        survived: survived !== false, // defaults true unless explicitly marked otherwise
        photo: photo || undefined,
        gpsLat: typeof latitude === 'number' ? latitude : undefined,
        gpsLng: typeof longitude === 'number' ? longitude : undefined,
        notes: notes || undefined,
      },
    });

    await recomputeVisitAggregates(visit.id);

    // A dead/replacement-needed tree updates the tree's own status too, so
    // this shows up wherever else Tree.status is already surfaced (donor
    // Tree Story, admin views) without needing a separate sync step. Also
    // notifies admin through the existing notification system — matches
    // "Notify Admin automatically" from the field officer spec, no new
    // infrastructure needed since this table and its admin-facing reader
    // already existed.
    if (survived === false || health === 'DEAD') {
      await prisma.tree.update({ where: { id: treeId }, data: { status: 'DEAD' } }).catch(() => {});
      await prisma.notification.create({
        data: {
          recipientType: 'ADMIN_ORG', recipientId: treeOrgId,
          type: 'TREE_DEAD',
          title: `Tree ${tree.treeTagId || treeId} marked dead`,
          message: `${officer.name} reported this tree as dead during a health check. A replacement may be needed.`,
          link: tree.assignment?.farmerId ? `/admin/farmers/${tree.assignment.farmerId}` : undefined,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, sample, visitId: visit.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const params  = new URL(req.url).searchParams;
  const treeId  = params.get('treeId');
  const visitId = params.get('visitId');
  if (!treeId && !visitId) return NextResponse.json({ error: 'treeId or visitId is required' }, { status: 400 });

  const samples = await prisma.monitoringTreeSample.findMany({
    where: { ...(treeId ? { treeId } : {}), ...(visitId ? { visitId } : {}) },
    include: { tree: { select: { treeTagId: true, species: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ samples });
}
