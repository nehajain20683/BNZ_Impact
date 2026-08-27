export const runtime = 'nodejs';
// src/app/api/farmer/updates/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateUpload } from '@/lib/upload-validation';
import { notifyOrgAdmins } from '@/lib/notifications';

const CATEGORIES = ['WATERING', 'WEEDING', 'FERTILIZER', 'PEST', 'DAMAGE', 'GENERAL'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmerId = searchParams.get('farmerId');
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  const updates = await (prisma as any).communityUpdate.findMany({
    where: { farmerId },
    orderBy: { submittedAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ updates });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { farmerId, assignmentId, landId, category, photoUrl, notes, gpsLatitude, gpsLongitude, deviceInfo } = body;

    if (!farmerId || !category || !photoUrl)
      return NextResponse.json({ error: 'farmerId, category, and a photo are required' }, { status: 400 });
    if (!CATEGORIES.includes(category))
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });

    const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    // Phase 6 — run available validation checks before accepting the upload.
    let land: any = null;
    if (landId) land = await prisma.land.findUnique({ where: { id: landId }, select: { gpsLatitude: true, gpsLongitude: true } });

    const recent = await (prisma as any).communityUpdate.findMany({
      where: { farmerId, submittedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { photoUrl: true },
      take: 50,
    });

    const validation = validateUpload({
      gpsLatitude: gpsLatitude ?? null,
      gpsLongitude: gpsLongitude ?? null,
      timestamp: new Date(),
      photoUrl,
      boundaryGpsLatitude: land?.gpsLatitude ?? null,
      boundaryGpsLongitude: land?.gpsLongitude ?? null,
      recentPhotoUrls: recent.map((r: any) => r.photoUrl),
    });

    const update = await (prisma as any).communityUpdate.create({
      data: {
        farmerId, assignmentId: assignmentId || null, landId: landId || null,
        category, photoUrl, notes: notes || null,
        gpsLatitude: gpsLatitude ?? null, gpsLongitude: gpsLongitude ?? null,
        deviceInfo: deviceInfo || null,
        status: validation.status,
        reviewNotes: validation.reasons.length ? `Auto-flagged: ${validation.reasons.join('; ')}` : null,
      },
    });

    if (farmer.orgId) {
      await notifyOrgAdmins(farmer.orgId, 'PENDING_REVIEW', `New ${category.toLowerCase()} update from ${farmer.fullName}`,
        undefined, '/admin/community-updates');
    }

    return NextResponse.json({ success: true, update, validation });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
