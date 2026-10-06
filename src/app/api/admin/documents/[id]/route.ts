export const runtime = 'nodejs';
// src/app/api/admin/documents/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyFarmer } from '@/lib/notifications';
import { assignFarmerId } from '@/lib/farmer-id';
import { FARMER_DOC_TYPE_KEYS, FARMER_LOCK_STATUS, isAtOrBeyondStage, isFarmerEntityComplete } from '@/lib/farmer-constants';
import { guardFarmerDocument } from '@/lib/admin-guard';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// PATCH — action: VERIFY | REJECT
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const adminScope = await guardFarmerDocument(params.id);
  if (adminScope instanceof Response) return adminScope;
  try {
    const actor = await requireAdmin();
    const body  = await req.json();
    const { action, rejectionReason } = body;

    if (!['VERIFY', 'REJECT'].includes(action))
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    if (action === 'REJECT' && !rejectionReason)
      return NextResponse.json({ error: 'A reason is required when rejecting a document' }, { status: 400 });

    const doc = await prisma.farmerDocument.findUnique({ where: { id: params.id } });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const updated = await prisma.farmerDocument.update({
      where: { id: params.id },
      data: {
        status: action === 'VERIFY' ? 'VERIFIED' : 'REJECTED',
        rejectionReason: action === 'REJECT' ? rejectionReason : null,
        verifiedById: actor.id,
        verifiedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        farmerId: doc.farmerId, actorRole: actor.role, actorId: actor.id,
        action: action === 'VERIFY' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
        details: { docType: doc.docType, rejectionReason: rejectionReason || undefined },
      },
    }).catch(() => {});

    // Farmer-entity auto-advance: only farmer-level identity documents
    // (Aadhaar/PAN/Cancelled Cheque) count toward this — land documents never
    // affect the farmer's own registration stage, since a farmer can have
    // many lands each on their own independent approval track.
    if (action === 'VERIFY' && FARMER_DOC_TYPE_KEYS.includes(doc.docType as any)) {
      const farmer = await prisma.farmer.findUnique({ where: { id: doc.farmerId } });
      if (farmer && !isAtOrBeyondStage(farmer.status, FARMER_LOCK_STATUS)) {
        const verifiedDocs = await prisma.farmerDocument.findMany({
          where: { farmerId: doc.farmerId, status: 'VERIFIED', docType: { in: FARMER_DOC_TYPE_KEYS as any } },
          select: { docType: true },
        });
        const verifiedTypes = new Set(verifiedDocs.map(d => d.docType));
        if (isFarmerEntityComplete(farmer, verifiedTypes)) {
          await prisma.farmer.update({ where: { id: farmer.id }, data: { status: FARMER_LOCK_STATUS as any } });
          // The farmer ID is issued at this moment — verification by an admin.
          // A failure here must never undo or block the verification itself;
          // the manual status change (or the backfill script) can issue it later.
          let idNote = '';
          try {
            const issued = await assignFarmerId(farmer.id, { role: actor.role, id: actor.id });
            if (issued.id) idNote = ` Your Farmer ID is ${issued.id}.`;
          } catch (e: any) { console.error('Farmer ID issuing failed (verification kept):', e.message); }
          await notifyFarmer(farmer.id, 'DOCUMENT_VERIFIED', 'Your registration is now complete',
            `Your profile is verified.${idNote} Contact your administrator for any further changes.`, '/farmer/dashboard');
        }
      }
    }

    await notifyFarmer(doc.farmerId,
      action === 'VERIFY' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
      action === 'VERIFY' ? `${doc.docType.replace(/_/g,' ')} verified` : `${doc.docType.replace(/_/g,' ')} rejected`,
      action === 'REJECT' ? rejectionReason : undefined,
      '/farmer/documents');

    return NextResponse.json({ success: true, document: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
