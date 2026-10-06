export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { AGREEMENT_LITE, signedCopyIds } from '@/lib/lite-select';
import {
  generateParticipationAgreement, generateJointOwnerNOC, generatePaymentReceipt,
  generateSaplingReceipt, generatePlantationCertificate,
} from '@/lib/doc-templates';
import { createHash } from 'crypto';
import { notifyFarmer } from '@/lib/notifications';
import { loadConsentInput } from '@/lib/consent-context';
import { buildConsentSnapshot, CONSENT_AGREEMENT_TYPE, CONSENT_TITLE } from '@/lib/consent-declaration';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId    = await getActiveOrgId();
    const params    = new URL(req.url).searchParams;
    const farmerId  = params.get('farmerId');
    const agreementType = params.get('agreementType');
    const where: any = {};

    if (farmerId) {
      const farmer = await prisma.farmer.findFirst({ where: { id: farmerId, orgId } });
      if (!farmer) return NextResponse.json({ agreements: [] });
      where.farmerId = farmerId;
    } else {
      const farmers = await prisma.farmer.findMany({ where: { orgId }, select: { id: true } });
      where.farmerId = { in: farmers.map(f => f.id) };
    }
    if (agreementType) where.agreementType = agreementType;

    const rows = await prisma.farmerAgreement.findMany({
      where,
      select: {
        ...AGREEMENT_LITE,   // no generated HTML, no signed-copy file
        farmer: { select: { fullName: true, mobile: true, farmerIdGenerated: true } },
        land: { select: { surveyGutNumber: true, village: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Every row used to carry its full HTML and its signed copy (a base64 file,
    // up to 8 MB). The signed copy is now a URL, fetched only when opened.
    const signed = await signedCopyIds(prisma, rows.map((r: any) => r.id));
    const agreements = rows.map((r: any) => ({
      ...r, hasSignedCopy: signed.has(r.id),
      // ?v= is the row's last-updated time: a re-uploaded copy gets a NEW url, so a reviewer's
      // browser can never show a stale (e.g. already-rejected) copy from its cache.
      signedPdfUrl: signed.has(r.id) ? `/api/admin/agreements/${r.id}/signed?v=${+new Date(r.updatedAt)}` : null,
    }));

    return NextResponse.json({ agreements });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor  = await requireAdmin();
    const orgId  = await getActiveOrgId();
    const { farmerId, agreementType, landId, templateData } = await req.json();

    // Landowner Consent & Participation Declaration — rendered from the
    // database records (never from client-supplied fields), org-specific,
    // and refused if one already exists for this parcel rather than silently
    // creating a second competing copy of a legal document.
    if (agreementType === CONSENT_AGREEMENT_TYPE) {
      const ctx = await loadConsentInput(farmerId, { landId, orgId });
      if (!ctx) return NextResponse.json({ error: 'Farmer not found in this organisation' }, { status: 404 });
      const dup = await prisma.farmerAgreement.findFirst({
        where: { farmerId, agreementType: CONSENT_AGREEMENT_TYPE, landId: ctx.land?.id ?? null },
        select: { id: true, status: true },
      });
      if (dup) return NextResponse.json({
        error: `A consent declaration already exists for this land (status: ${dup.status}). Delete it first if it genuinely needs to be regenerated.`,
        existingId: dup.id,
      }, { status: 409 });

      const now = new Date();
      const snap = buildConsentSnapshot(ctx.input, { consentSource: 'ADMIN_GENERATED', generatedById: actor.id });
      const agreement = await prisma.farmerAgreement.create({
        data: {
          farmerId, landId: ctx.land?.id ?? undefined, agreementType: CONSENT_AGREEMENT_TYPE, title: CONSENT_TITLE,
          generatedHtml: snap.html, templateData: snap.templateData as any, generatedById: actor.id,
          status: 'SHARED', sharedAt: now,
          signatureHistory: [{ action: 'GENERATED_BY_ADMIN', by: actor.name || actor.email || 'Admin', byId: actor.id, at: now.toISOString() }] as any,
        },
        select: { id: true, status: true },
      });
      return NextResponse.json({ success: true, agreement });
    }

    const farmer = await prisma.farmer.findFirst({
      where: { id: farmerId, orgId },
      include: { lands: true, organization: true, assignedOfficer: { select: { name: true, signatureImage: true } } },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found in this organisation' }, { status: 404 });

    // A farmer can have multiple land parcels; a document describes one
    // specific parcel, not "whichever was created first" — which is what
    // silently happened here before landId was passed through at all.
    const land = (landId ? farmer.lands.find(l => l.id === landId) : null) || farmer.lands[0];
    // Multi-tenant branding — every generated document carries the tenant's
    // own name/logo/email, never a hardcoded one.
    const org = {
      name: farmer.organization?.name || 'BNZ Impact',
      logoUrl: farmer.organization?.logo_url || null,
      email: farmer.organization?.email || null,
    };
    const td = templateData || {};

    // Real signatures, fetched once and reused across whichever document
    // type this call generates — the org's primary signatory for
    // "Authorised By" / "Project Authority" slots, and the farmer's own
    // assigned field officer's captured signature (not just a typed name)
    // for the "Field Officer" / "Prepared By" slots where one applies.
    const orgSignatoryRecord = await prisma.orgSignatory.findFirst({ where: { orgId, isPrimary: true } });
    const orgSignatory = orgSignatoryRecord
      ? { name: orgSignatoryRecord.name, designation: orgSignatoryRecord.designation, signatureImage: orgSignatoryRecord.signatureImage }
      : null;
    const fieldOfficerSignature = farmer.assignedOfficer?.signatureImage
      ? { name: farmer.assignedOfficer.name, designation: 'Field Officer', signatureImage: farmer.assignedOfficer.signatureImage }
      : null;
    const fieldOfficerName = td.fieldOfficer || farmer.assignedOfficer?.name || undefined;

    // Real templates from doc-templates.ts, farmer/land auto-filled from the
    // actual database record rather than whatever the caller happened to
    // send — this is what "Farmer details will be auto-filled from profile"
    // (already promised in the UI) is supposed to mean, and previously
    // never did for any of the 5 document types.
    let htmlContent: string;
    switch (agreementType) {
      case 'PARTICIPATION_AGREEMENT':
        htmlContent = generateParticipationAgreement({
          farmerName: farmer.fullName, fatherName: farmer.fatherName || undefined, mobile: farmer.mobile,
          aadhaar: farmer.aadhaarNumber || undefined, village: land?.village || undefined,
          taluka: land?.taluka || undefined, district: land?.district || undefined, state: land?.state || undefined,
          surveyNumber: land?.surveyGutNumber || undefined, areaAcres: land?.areaAcres || undefined,
          farmerId: farmer.farmerIdGenerated || undefined, org, orgSignatory,
        });
        break;
      case 'JOINT_OWNER_NOC':
        htmlContent = generateJointOwnerNOC({
          ownerName: td.ownerName || '', fatherName: td.fatherName || undefined, age: td.age || undefined,
          address: td.address || undefined, aadhaar: td.aadhaar || undefined,
          surveyNumber: land?.surveyGutNumber || undefined, village: land?.village || undefined,
          taluka: land?.taluka || undefined, district: land?.district || undefined, areaAcres: land?.areaAcres || undefined,
          primaryOwnerName: farmer.fullName, org,
        });
        break;
      case 'PAYMENT_RECEIPT':
        htmlContent = generatePaymentReceipt({
          receiptNo: `PAY-${Date.now().toString().slice(-8)}`, farmerName: farmer.fullName,
          farmerId: farmer.farmerIdGenerated || undefined, village: land?.village || undefined,
          district: land?.district || undefined, surveyNumber: land?.surveyGutNumber || undefined,
          paymentType: td.paymentType || 'Payment', amount: td.amount || 0, paymentMode: td.paymentMode || 'NEFT',
          utrNumber: td.utrNumber || undefined, paymentDate: td.paymentDate || new Date().toISOString().split('T')[0],
          notes: td.notes || undefined, org, orgSignatory, preparedBySignature: fieldOfficerSignature,
        });
        break;
      case 'SAPLING_RECEIPT':
        htmlContent = generateSaplingReceipt({
          farmerName: farmer.fullName, farmerId: farmer.farmerIdGenerated || undefined,
          village: land?.village || undefined, surveyNumber: land?.surveyGutNumber || undefined,
          date: td.date || new Date().toISOString().split('T')[0], projectName: td.projectName || undefined,
          species: Array.isArray(td.species) ? td.species : [], totalSaplings: td.totalSaplings || 0,
          fieldOfficer: fieldOfficerName, org, orgSignatory, fieldOfficerSignature,
        });
        break;
      case 'PLANTATION_CERTIFICATE':
        htmlContent = generatePlantationCertificate({
          farmerName: farmer.fullName, farmerId: farmer.farmerIdGenerated || undefined,
          village: land?.village || undefined, surveyNumber: land?.surveyGutNumber || undefined,
          areaAcres: land?.areaAcres || undefined, gisId: (land as any)?.gisId || undefined,
          plantationDate: td.plantationDate || undefined, completionDate: td.completionDate || undefined,
          species: Array.isArray(td.species) ? td.species : [], totalTrees: td.totalTrees || 0,
          plantationType: td.plantationType || undefined, fieldOfficer: fieldOfficerName,
          gpsCoords: land?.gpsLatitude ? `${land.gpsLatitude}, ${land.gpsLongitude}` : undefined,
          projectName: td.projectName || undefined, org, orgSignatory, fieldOfficerSignature,
        });
        break;
      default:
        // Unknown/future type — keep the old generic dump as a fallback so
        // nothing hard-fails, but every type we actually know about above
        // now gets a real, properly formatted document.
        htmlContent = `<html><body>
          <h1 style="font-family:sans-serif">${agreementType.replace(/_/g,' ')}</h1>
          <p><strong>Farmer:</strong> ${farmer.fullName}</p>
          <p><strong>Mobile:</strong> ${farmer.mobile}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          ${Object.entries(td).map(([k,v]) => `<p><strong>${k}:</strong> ${Array.isArray(v) ? v.map((x:any)=>typeof x==='object'?JSON.stringify(x):x).join(', ') : v}</p>`).join('')}
        </body></html>`;
    }

    const agreement = await prisma.farmerAgreement.create({
      data: {
        farmerId, agreementType, landId: land?.id || undefined,
        title: agreementType.replace(/_/g,' '),
        generatedHtml: htmlContent,
        generatedById: actor.id, sharedAt: new Date(), status: 'SHARED',
        templateData: templateData || undefined,
      },
    });

    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — two modes.
//  • action: 'request_signature' | 'verify' | 'reject'  — the structured
//    signature workflow (used by the landowner consent declaration). Every
//    step records who did it and when, and verification cannot be a bare
//    click: the reviewer must confirm what they actually checked.
//  • status: …  — the original status flip, unchanged for every other
//    document type. Blocked for the consent declaration so it can't be
//    marked complete without going through verification.
export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const { agreementId, status, action, checklist, note } = await req.json();

    if (!agreementId || (!status && !action))
      return NextResponse.json({ error: 'agreementId and status (or action) are required' }, { status: 400 });

    const existing = await prisma.farmerAgreement.findUnique({
      where: { id: agreementId },
      include: { farmer: { select: { orgId: true } } },
    });
    if (!existing || existing.farmer.orgId !== orgId)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    if (action) {
      const now = new Date();
      const history = (Array.isArray(existing.signatureHistory) ? existing.signatureHistory : []) as any[];
      const log = (e: Record<string, unknown>) =>
        [...history, { ...e, by: actor.name || actor.email || 'Admin', byId: actor.id, at: now.toISOString() }];
      const fingerprint = (v: string) => createHash('sha256').update(v).digest('hex').slice(0, 16);
      const out = { select: { id: true, status: true, verificationStatus: true, signatureRequestedAt: true } };

      if (action === 'request_signature') {
        if (existing.status === 'COMPLETED')
          return NextResponse.json({ error: 'This document is already verified — nothing to sign.' }, { status: 400 });
        const agreement = await prisma.farmerAgreement.update({
          where: { id: agreementId },
          data: {
            signatureRequestedAt: now, signatureRequestedById: actor.id,
            status: existing.status === 'GENERATED' ? 'SHARED' : existing.status,
            sharedAt: existing.sharedAt || now,
            signatureHistory: log({ action: 'SIGNATURE_REQUESTED', note: note || undefined }) as any,
          }, ...out,
        });
        await notifyFarmer(existing.farmerId, 'ACTIVITY_REMINDER', 'Signature requested',
          'Please download your consent declaration, sign it (signature or thumb impression, with two witnesses) and upload the signed copy.', '/farmer/documents');
        return NextResponse.json({ success: true, agreement });
      }

      if (action === 'verify') {
        if (existing.status !== 'SIGNED' || !existing.signedPdfUrl)
          return NextResponse.json({ error: 'There is no uploaded signed copy awaiting verification.' }, { status: 400 });
        const c = checklist || {};
        if (!c.ownerSignatureOrThumb || !c.witnessesPresent || !c.documentMatches)
          return NextResponse.json({ error: 'Confirm every verification check before verifying.' }, { status: 400 });
        const agreement = await prisma.farmerAgreement.update({
          where: { id: agreementId },
          data: {
            status: 'COMPLETED', verificationStatus: 'VERIFIED', verifiedById: actor.id, verifiedAt: now,
            verificationNote: note || null,
            signatureHistory: log({ action: 'VERIFIED', checklist: c, note: note || undefined, copyFingerprint: fingerprint(existing.signedPdfUrl) }) as any,
          }, ...out,
        });
        await notifyFarmer(existing.farmerId, 'DOCUMENT_VERIFIED', 'Signed declaration verified',
          'Your signed consent declaration has been checked and verified.', '/farmer/documents');
        return NextResponse.json({ success: true, agreement });
      }

      if (action === 'reject') {
        if (existing.status !== 'SIGNED')
          return NextResponse.json({ error: 'Only an uploaded signed copy can be rejected.' }, { status: 400 });
        if (!note || !String(note).trim())
          return NextResponse.json({ error: 'A reason is required so the farmer knows what to fix.' }, { status: 400 });
        const agreement = await prisma.farmerAgreement.update({
          where: { id: agreementId },
          data: {
            // Back to a state where the farmer can upload again. The rejected
            // copy's fingerprint stays in the history (the file itself is
            // replaced on re-upload, so the history is the record of it).
            status: 'SHARED', verificationStatus: 'REJECTED', verifiedById: actor.id, verifiedAt: now,
            verificationNote: String(note).trim(),
            signatureHistory: log({ action: 'REJECTED', note: String(note).trim(), copyFingerprint: existing.signedPdfUrl ? fingerprint(existing.signedPdfUrl) : undefined }) as any,
          }, ...out,
        });
        await notifyFarmer(existing.farmerId, 'DOCUMENT_REJECTED', 'Signed copy needs to be re-uploaded', String(note).trim(), '/farmer/documents');
        return NextResponse.json({ success: true, agreement });
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // ── Original status-flip path (all other document types) ──
    if (existing.agreementType === CONSENT_AGREEMENT_TYPE && (status === 'SIGNED' || status === 'COMPLETED'))
      return NextResponse.json({ error: 'The consent declaration must be verified through the signature verification step.' }, { status: 400 });

    const validStatuses = ['GENERATED', 'SHARED', 'ACKNOWLEDGED', 'SIGNED', 'COMPLETED'];
    if (!validStatuses.includes(status))
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });

    const data: any = { status };
    if (status === 'ACKNOWLEDGED') data.acknowledgedAt = new Date();
    if (status === 'SIGNED' || status === 'COMPLETED') data.signedAt = existing.signedAt || new Date();

    const agreement = await prisma.farmerAgreement.update({ where: { id: agreementId }, data, select: AGREEMENT_LITE });
    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// DELETE — removes the document entirely. Since the farmer's own "Shared
// With You" list reads from this exact same table, deleting it here also
// removes it from the farmer's side — there's no separate copy anywhere.
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const agreementId = new URL(req.url).searchParams.get('agreementId');
    if (!agreementId) return NextResponse.json({ error: 'agreementId is required' }, { status: 400 });

    const existing = await prisma.farmerAgreement.findUnique({
      where: { id: agreementId },
      include: { farmer: { select: { orgId: true } } },
    });
    if (!existing || existing.farmer.orgId !== orgId)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    await prisma.farmerAgreement.delete({ where: { id: agreementId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
