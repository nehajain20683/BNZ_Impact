export const runtime = 'nodejs';
// src/app/api/admin/updates/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { notifyFarmer } from '@/lib/notifications';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — review queue, tenant-scoped via the farmer's own orgId
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';

    const updates = await (prisma as any).communityUpdate.findMany({
      where: { status, farmer: { orgId } },
      include: {
        farmer: { select: { id: true, fullName: true, mobile: true } },
        land: { select: { id: true, surveyGutNumber: true, surveyNumber: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ updates });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — approve / reject / request new photo
export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();
    const { id, action, reviewNotes } = body;

    if (!id || !['APPROVE', 'REJECT', 'REQUEST_NEW_PHOTO'].includes(action))
      return NextResponse.json({ error: 'id and a valid action are required' }, { status: 400 });

    const update = await (prisma as any).communityUpdate.findFirst({
      where: { id, farmer: { orgId } },
    });
    if (!update) return NextResponse.json({ error: 'Update not found' }, { status: 404 });

    const statusMap: Record<string, string> = {
      APPROVE: 'APPROVED', REJECT: 'REJECTED', REQUEST_NEW_PHOTO: 'NEEDS_REVIEW',
    };

    const updated = await (prisma as any).communityUpdate.update({
      where: { id },
      data: {
        status: statusMap[action],
        reviewNotes: reviewNotes || null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    if (action === 'APPROVE') {
      await notifyFarmer(update.farmerId, 'UPDATE_APPROVED', 'Your update was approved',
        reviewNotes || undefined, '/farmer/updates');
    } else if (action === 'REJECT') {
      await notifyFarmer(update.farmerId, 'UPDATE_REJECTED', 'Your update was rejected',
        reviewNotes || undefined, '/farmer/updates');
    } else if (action === 'REQUEST_NEW_PHOTO') {
      await notifyFarmer(update.farmerId, 'UPDATE_REJECTED', 'A new photo was requested',
        reviewNotes || undefined, '/farmer/updates');
    }

    return NextResponse.json({ success: true, update: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
