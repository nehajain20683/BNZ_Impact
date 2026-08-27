export const runtime = 'nodejs';
// src/app/api/admin/lands/[id]/route.ts
// A farmer can register many lands — each has its own independent approval
// pipeline (LandStatus), separate from the farmer's own registration stage.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyFarmer } from '@/lib/notifications';
import { LAND_DOC_TYPES, LAND_STATUS_ORDER, LAND_LOCK_STATUS, isAtOrBeyondLandStage } from '@/lib/farmer-constants';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// PATCH — set a land's status directly (DOCUMENTS_PENDING | DOCUMENTS_VERIFIED |
// INSPECTION_PENDING | INSPECTION_COMPLETED | APPROVED | ACTIVE).
// `verified`/`verifiedAt`/`verifiedById` stay in sync automatically for
// backward compatibility with existing lock checks.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const body  = await req.json();
    const { status, force } = body;

    if (!LAND_STATUS_ORDER.includes(status))
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });

    const land = await prisma.land.findUnique({ where: { id: params.id } });
    if (!land) return NextResponse.json({ error: 'Land parcel not found' }, { status: 404 });

    const willBeLocked = isAtOrBeyondLandStage(status, LAND_LOCK_STATUS);

    // Moving into APPROVED (or beyond) for the first time — require required
    // land documents to be verified first, same as before.
    if (willBeLocked && !isAtOrBeyondLandStage(land.status, LAND_LOCK_STATUS)) {
      const docs = await prisma.farmerDocument.findMany({
        where: { landId: params.id, status: 'VERIFIED' },
        select: { docType: true },
      });
      const verifiedTypes = new Set(docs.map(d => d.docType));
      const missing = LAND_DOC_TYPES.filter(d => d.required && !verifiedTypes.has(d.key as any));

      if (missing.length > 0 && !force) {
        return NextResponse.json({
          error: `Missing verified documents: ${missing.map(d => d.label).join(', ')}`,
          missingDocs: missing.map(d => d.key),
          canForce: true,
        }, { status: 400 });
      }
    }

    const updated = await prisma.land.update({
      where: { id: params.id },
      data: {
        status: status as any,
        verified:     willBeLocked,
        verifiedAt:   willBeLocked ? (land.verifiedAt || new Date()) : null,
        verifiedById: willBeLocked ? (land.verifiedById || actor.id) : null,
      },
    });

    await prisma.auditLog.create({
      data: { farmerId: land.farmerId, actorRole: actor.role, actorId: actor.id, action: 'LAND_STATUS_CHANGED',
              details: { landId: params.id, from: land.status, to: status } },
    }).catch(() => {});

    if (willBeLocked && !isAtOrBeyondLandStage(land.status, LAND_LOCK_STATUS)) {
      await notifyFarmer(land.farmerId, 'PLANTATION_ASSIGNED',
        `Land parcel approved${land.surveyGutNumber ? ` — Survey ${land.surveyGutNumber}` : ''}`,
        'This land is now locked from further edits. Contact your administrator for any changes.',
        '/farmer/dashboard');
    }

    return NextResponse.json({ success: true, land: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
