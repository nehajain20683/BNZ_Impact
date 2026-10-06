export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AGREEMENT_LITE, signedCopyIds } from '@/lib/lite-select';

// GET — farmer views their agreements
export async function GET(req: Request) {
  const params   = new URL(req.url).searchParams;
  const farmerId = params.get('farmerId');
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  const rows = await prisma.farmerAgreement.findMany({
    where: { farmerId }, select: AGREEMENT_LITE, orderBy: { createdAt: 'desc' },
  });
  // The generated HTML (opened via the viewer) and the signed copy (a base64
  // file) are no longer sent with every list. signedPdfUrl becomes a URL.
  const signed = await signedCopyIds(prisma, rows.map((r: any) => r.id));
  const agreements = rows.map((r: any) => ({
    ...r, hasSignedCopy: signed.has(r.id),
    signedPdfUrl: signed.has(r.id) ? `/api/farmer/agreements/${r.id}/signed?farmerId=${encodeURIComponent(farmerId)}&v=${+new Date(r.updatedAt)}` : null,
  }));
  return NextResponse.json({ agreements });
}

// PATCH — farmer acknowledges or uploads a signed copy.
//
// Hardening over the original, which accepted any agreementId from anyone
// and stored any string as the "signed copy":
//  • The caller must name the farmer who owns the agreement (every existing
//    caller already sends farmerId). NOTE: the farmer portal has no session
//    token — farmerId is client-supplied everywhere — so this is a
//    consistency check, not authentication.
//  • signedPdfUrl must be an image/PDF data URL within the size limit. It is
//    rendered as a clickable link on both farmer and admin pages, so a
//    "javascript:" value would have been stored XSS.
//  • A verified (COMPLETED) document is locked.
//  • The landowner consent declaration can only be signed once an admin has
//    requested a signature.
const SIGNED_COPY_PATTERN = /^data:(image\/(png|jpe?g|webp|gif|heic|heif)|application\/pdf);base64,/i;
const MAX_SIGNED_COPY_CHARS = 11_200_000; // ≈ 8 MB of file once base64-encoded

export async function PATCH(req: Request) {
  try {
    const { agreementId, farmerId, action, signedPdfUrl } = await req.json();
    if (!agreementId) return NextResponse.json({ error: 'agreementId required' }, { status: 400 });

    const existing = await prisma.farmerAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, farmerId: true, agreementType: true, status: true, signatureRequestedAt: true, signatureHistory: true },
    });
    if (!existing) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const isConsent = existing.agreementType === 'LANDOWNER_CONSENT';
    if (farmerId ? farmerId !== existing.farmerId : isConsent)
      return NextResponse.json({ error: 'This document does not belong to this farmer' }, { status: 403 });

    if (existing.status === 'COMPLETED')
      return NextResponse.json({ error: 'This document is already verified and can no longer be changed.' }, { status: 400 });

    const update: any = { updatedAt: new Date() };

    if (action === 'acknowledge') {
      // Only ever moves forward from a freshly shared document — never
      // downgrades one that's already signed.
      if (existing.status === 'GENERATED' || existing.status === 'SHARED') {
        update.status = 'ACKNOWLEDGED';
        update.acknowledgedAt = new Date();
      }
    }

    if (action === 'upload_signed') {
      if (!signedPdfUrl || typeof signedPdfUrl !== 'string' || !SIGNED_COPY_PATTERN.test(signedPdfUrl))
        return NextResponse.json({ error: 'Please upload a photo (JPG/PNG) or a PDF of the signed document.' }, { status: 400 });
      if (signedPdfUrl.length > MAX_SIGNED_COPY_CHARS)
        return NextResponse.json({ error: 'File too large. Maximum size is 8MB.' }, { status: 400 });
      if (isConsent && !existing.signatureRequestedAt)
        return NextResponse.json({ error: 'A signature has not been requested for this document yet.' }, { status: 400 });

      update.signedPdfUrl = signedPdfUrl;
      update.status = 'SIGNED';
      update.signedAt = new Date();
      if (isConsent) {
        // A fresh upload clears any earlier rejection so the farmer isn't
        // told something is wrong with the new copy; the rejection itself
        // stays in the audit history.
        update.verificationStatus = null;
        update.verificationNote = null;
        const history = (Array.isArray(existing.signatureHistory) ? existing.signatureHistory : []) as any[];
        update.signatureHistory = [...history, { action: 'SIGNED_COPY_UPLOADED', by: 'farmer', at: new Date().toISOString() }];
      }
    }

    const agreement = await prisma.farmerAgreement.update({
      where: { id: agreementId },
      data: update,
      select: { id: true, status: true },
    });
    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
