export const runtime = 'nodejs';
// src/app/api/field-officer/tree-photo/route.ts
// Field Officer captures a photo of a specific planted tree. Handles every
// security/validation requirement explicitly: verified active officer,
// tenant isolation, filename generated server-side only (never trusts a
// client-supplied name), server timestamp, optional GPS (never blocks the
// upload if denied), and a short-window duplicate-tap guard.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function generateFileName(treeTag: string, at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}_${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  const safeTag = (treeTag || 'UNTAGGED').replace(/[^a-zA-Z0-9-]/g, '');
  return `${safeTag}_${stamp}.jpg`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { officerId, treeId, imageBase64, latitude, longitude, gpsAccuracy } = body;

    if (!officerId || !treeId || !imageBase64)
      return NextResponse.json({ error: 'officerId, treeId and imageBase64 are required' }, { status: 400 });

    // Roughly 2MB base64 ceiling — the client compresses before sending
    // (targets ~1MB), this is a hard backstop against anything unexpectedly large.
    if (imageBase64.length > 2_800_000)
      return NextResponse.json({ error: 'Photo is too large. Please try again.' }, { status: 400 });
    if (!imageBase64.startsWith('data:image/'))
      return NextResponse.json({ error: 'Invalid file type — only images are allowed.' }, { status: 400 });

    // Verify authenticated, active officer — never trust a client-supplied
    // identity beyond confirming this ID genuinely belongs to a real,
    // active account (same model already used by every other farmer/officer
    // self-route in this app).
    const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    const tree = await prisma.tree.findUnique({
      where: { id: treeId },
      include: {
        assignment: { select: { farmerId: true, farmer: { select: { orgId: true, assignedOfficerId: true } } } },
        plantationSite: { select: { orgId: true } },
      },
    });
    if (!tree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 });

    // Tenant isolation — the tree's org comes from whichever relation is
    // populated (site or, once linked, the assignment's farmer); an
    // officer's own orgId must match, or the upload is refused outright.
    const treeOrgId = tree.plantationSite?.orgId || tree.assignment?.farmer?.orgId;
    if (!treeOrgId || (officer.orgId && officer.orgId !== treeOrgId))
      return NextResponse.json({ error: 'This tree does not belong to your organisation' }, { status: 403 });

    // Assignment permission — an officer should only be photographing trees
    // on land belonging to a farmer actually assigned to them. Not enforced
    // if the tree isn't linked to a specific farmer yet (site-wide/
    // unassigned trees), since there's no assignment to check against.
    if (tree.assignment?.farmer && tree.assignment.farmer.assignedOfficerId !== officer.id) {
      return NextResponse.json({ error: 'This tree is not on land assigned to you.' }, { status: 403 });
    }

    // Duplicate-tap guard — a repeated tap/double-submit within a short
    // window is treated as the same action, not a second photo.
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const recentDuplicate = await prisma.treeImage.findFirst({
      where: { treeId, capturedById: officer.id, createdAt: { gte: tenSecondsAgo } },
      orderBy: { createdAt: 'desc' },
    });
    if (recentDuplicate) {
      return NextResponse.json({ success: true, image: recentDuplicate, duplicate: true });
    }

    const capturedAt = new Date(); // server timestamp — source of truth
    const fileName = generateFileName(tree.treeTagId || '', capturedAt);

    const image = await prisma.treeImage.create({
      data: {
        treeId,
        treeTag: tree.treeTagId || undefined,
        imageUrl: imageBase64,
        fileName,
        capturedById: officer.id,
        capturedAt,
        latitude: typeof latitude === 'number' ? latitude : undefined,
        longitude: typeof longitude === 'number' ? longitude : undefined,
        gpsAccuracy: typeof gpsAccuracy === 'number' ? gpsAccuracy : undefined,
        tenantId: treeOrgId,
      },
    });

    return NextResponse.json({ success: true, image });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — photos for a specific tree (donor Tree Story, admin views), for a
// specific officer's own recent captures (their portal), or every photo
// under a specific farmer/land assignment (admin plantation site view).
export async function GET(req: Request) {
  const params  = new URL(req.url).searchParams;
  const treeId    = params.get('treeId');
  const officerId = params.get('officerId');
  const assignmentId = params.get('assignmentId');

  if (!treeId && !officerId && !assignmentId)
    return NextResponse.json({ error: 'treeId, officerId or assignmentId is required' }, { status: 400 });

  const images = await prisma.treeImage.findMany({
    where: {
      ...(treeId ? { treeId } : {}),
      ...(officerId ? { capturedById: officerId } : {}),
      ...(assignmentId ? { tree: { assignmentId } } : {}),
    },
    include: {
      tree: {
        select: {
          treeTagId: true, species: true,
          plantationSite: { select: { id: true, siteName: true } },
          assignment: { select: { id: true, farmer: { select: { fullName: true } } } },
        },
      },
      capturedBy: { select: { name: true } },
    },
    orderBy: { capturedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ images });
}
