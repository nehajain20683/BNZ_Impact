export const runtime = 'nodejs';
// src/app/api/field-officer/lookup-tag/route.ts
// Resolves a scanned QR code (just the raw treeTagId text — see the admin
// QR generation modal) to the specific tree and which of the officer's own
// assigned farmers it belongs to, so scanning can jump straight there
// instead of the officer manually navigating to find it.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tag = params.get('tag');
  const officerId = params.get('officerId');
  if (!tag || !officerId) return NextResponse.json({ error: 'tag and officerId are required' }, { status: 400 });

  const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
  if (!officer || !officer.active)
    return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

  const tree = await prisma.tree.findUnique({
    where: { treeTagId: tag.trim() },
    select: {
      id: true, treeTagId: true, species: true,
      assignment: { select: { farmerId: true, farmer: { select: { fullName: true, orgId: true, assignedOfficerId: true } } } },
    },
  });
  if (!tree) return NextResponse.json({ error: `No tree found with tag "${tag}"` }, { status: 404 });
  if (!tree.assignment?.farmer)
    return NextResponse.json({ error: 'This tree is not yet linked to a farmer.' }, { status: 400 });
  if (tree.assignment.farmer.assignedOfficerId !== officer.id)
    return NextResponse.json({ error: 'This tree is on land assigned to a different officer.' }, { status: 403 });

  return NextResponse.json({
    treeId: tree.id, treeTagId: tree.treeTagId, species: tree.species,
    farmerId: tree.assignment.farmerId, farmerName: tree.assignment.farmer.fullName,
  });
}
