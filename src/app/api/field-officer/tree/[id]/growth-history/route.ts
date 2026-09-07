export const runtime = 'nodejs';
// src/app/api/field-officer/tree/[id]/growth-history/route.ts
// dMRV Roadmap Phase 3. No new schema, no caching — the height/diameter/
// health data already exists per MonitoringTreeSample, just never queried
// as a time series before. Computed live, on demand for one tree at a
// time (not bundled into the main farmer/tree list fetch), since only
// one tree's history is ever being looked at at once.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const officerId = new URL(req.url).searchParams.get('officerId');
  if (!officerId) return NextResponse.json({ error: 'officerId required' }, { status: 400 });

  const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
  if (!officer || !officer.active)
    return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

  const tree = await prisma.tree.findUnique({
    where: { id: params.id },
    select: {
      id: true, treeTagId: true, species: true, plantedDate: true,
      assignment: { select: { farmer: { select: { orgId: true } } } },
      plantationSite: { select: { orgId: true } },
    },
  });
  if (!tree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 });

  const treeOrgId = tree.assignment?.farmer?.orgId || tree.plantationSite?.orgId;
  if (treeOrgId !== officer.orgId)
    return NextResponse.json({ error: 'This tree does not belong to your organisation' }, { status: 403 });

  const samples = await prisma.monitoringTreeSample.findMany({
    where: { treeId: params.id },
    select: { id: true, height: true, diameter: true, health: true, survived: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    tree: { id: tree.id, treeTagId: tree.treeTagId, species: tree.species, plantedDate: tree.plantedDate },
    samples,
  });
}
