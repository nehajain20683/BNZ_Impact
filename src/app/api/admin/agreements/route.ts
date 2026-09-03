export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import {
  generateParticipationAgreement, generateJointOwnerNOC, generatePaymentReceipt,
  generateSaplingReceipt, generatePlantationCertificate,
} from '@/lib/doc-templates';

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

    const agreements = await prisma.farmerAgreement.findMany({
      where,
      include: {
        farmer: { select: { fullName: true, mobile: true, farmerIdGenerated: true } },
        land: { select: { surveyGutNumber: true, village: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

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
          areaAcres: land?.areaAcres || undefined, gisId: farmer.gisId || undefined,
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

// PATCH — admin approves a farmer's signed/uploaded copy. Was previously
// missing entirely: the admin UI called this and always showed "approved"
// regardless of whether anything actually happened.
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { agreementId, status } = await req.json();

    if (!agreementId || !status)
      return NextResponse.json({ error: 'agreementId and status are required' }, { status: 400 });

    const validStatuses = ['GENERATED', 'SHARED', 'ACKNOWLEDGED', 'SIGNED', 'COMPLETED'];
    if (!validStatuses.includes(status))
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });

    const existing = await prisma.farmerAgreement.findUnique({
      where: { id: agreementId },
      include: { farmer: { select: { orgId: true } } },
    });
    if (!existing || existing.farmer.orgId !== orgId)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const data: any = { status };
    if (status === 'ACKNOWLEDGED') data.acknowledgedAt = new Date();
    if (status === 'SIGNED' || status === 'COMPLETED') data.signedAt = existing.signedAt || new Date();

    const agreement = await prisma.farmerAgreement.update({ where: { id: agreementId }, data });
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
