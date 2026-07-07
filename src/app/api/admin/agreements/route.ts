export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  generateParticipationAgreement, generateJointOwnerNOC,
  generatePaymentReceipt, generateSaplingReceipt, generatePlantationCertificate
} from '@/lib/doc-templates';

async function requireAdmin(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — list agreements for a farmer
export async function GET(req: Request) {
  await requireAdmin(req).catch(() => {});
  const params   = new URL(req.url).searchParams;
  const farmerId = params.get('farmerId');
  const where    = farmerId ? { farmerId } : {};
  const agreements = await prisma.farmerAgreement.findMany({
    where, orderBy: { createdAt: 'desc' },
    include: { farmer: { select: { fullName: true, mobile: true, farmerIdGenerated: true } } },
  });
  return NextResponse.json({ agreements });
}

// POST — admin generates a document for a farmer
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin(req);
    const body  = await req.json();
    const { farmerId, agreementType, templateData } = body;

    if (!farmerId || !agreementType)
      return NextResponse.json({ error: 'farmerId and agreementType required' }, { status: 400 });

    // Fetch farmer + land data
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: { lands: { take: 1 } },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    const land = farmer.lands[0];
    const baseData = {
      farmerName:   farmer.fullName,
      fatherName:   farmer.fatherName || undefined,
      mobile:       farmer.mobile,
      aadhaar:      farmer.aadhaarNumber || undefined,
      village:      farmer.village || land?.village || undefined,
      taluka:       farmer.taluka  || land?.taluka  || undefined,
      district:     farmer.district|| land?.district|| undefined,
      state:        farmer.state   || land?.state   || undefined,
      surveyNumber: land?.surveyGutNumber || land?.surveyNumber || undefined,
      areaAcres:    land?.areaAcres || undefined,
      farmerId:     farmer.farmerIdGenerated || undefined,
      gisId:        farmer.gisId || undefined,
    };

    let generatedHtml = '';
    let title = '';

    switch (agreementType) {
      case 'PARTICIPATION_AGREEMENT':
        title = 'Landowner Participation Agreement';
        generatedHtml = generateParticipationAgreement({ ...baseData, ...templateData });
        break;
      case 'JOINT_OWNER_NOC':
        title = 'अनापत्ति प्रमाण पत्र (Joint Owner NOC)';
        generatedHtml = generateJointOwnerNOC({
          ...baseData,
          ownerName: templateData?.ownerName || farmer.fullName,
          primaryOwnerName: farmer.fullName,
          ...templateData,
        });
        break;
      case 'PAYMENT_RECEIPT':
        title = `Payment Receipt — ${templateData?.paymentType || 'Incentive'}`;
        generatedHtml = generatePaymentReceipt({
          receiptNo: `JGL/PAY/${Date.now().toString().slice(-6)}`,
          farmerName: farmer.fullName,
          farmerId: farmer.farmerIdGenerated || undefined,
          village: farmer.village || land?.village || undefined,
          district: farmer.district || land?.district || undefined,
          surveyNumber: land?.surveyGutNumber || undefined,
          paymentDate: new Date().toLocaleDateString('en-IN'),
          ...templateData,
        });
        break;
      case 'SAPLING_RECEIPT':
        title = 'Sapling Receipt cum Handover Form';
        generatedHtml = generateSaplingReceipt({
          farmerName: farmer.fullName,
          farmerId: farmer.farmerIdGenerated || undefined,
          village: farmer.village || land?.village || undefined,
          surveyNumber: land?.surveyGutNumber || undefined,
          date: new Date().toLocaleDateString('en-IN'),
          species: templateData?.species || [{ name: 'Mixed Native Species', qty: 0 }],
          totalSaplings: templateData?.totalSaplings || 0,
          ...templateData,
        });
        break;
      case 'PLANTATION_CERTIFICATE':
        title = 'Plantation Completion Certificate';
        generatedHtml = generatePlantationCertificate({
          farmerName: farmer.fullName,
          farmerId: farmer.farmerIdGenerated || undefined,
          village: farmer.village || land?.village || undefined,
          surveyNumber: land?.surveyGutNumber || undefined,
          areaAcres: land?.areaAcres || undefined,
          gisId: farmer.gisId || undefined,
          species: templateData?.species || [],
          totalTrees: templateData?.totalTrees || 0,
          ...templateData,
        });
        break;
      default:
        return NextResponse.json({ error: 'Unknown agreementType' }, { status: 400 });
    }

    const agreement = await prisma.farmerAgreement.create({
      data: {
        farmerId,
        agreementType,
        title,
        generatedHtml,
        status: 'GENERATED',
        generatedById: actor.id,
        sharedAt: new Date(),
        templateData: templateData || {},
      },
    });

    await prisma.auditLog.create({
      data: { farmerId, actorId: actor.id, actorRole: actor.role,
              action: 'DOCUMENT_GENERATED', details: { agreementType, agreementId: agreement.id } }
    }).catch(() => {});

    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    console.error('Admin agreement generation error:', e);
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// PATCH — admin updates an agreement (approve signed copy, add notes)
export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin(req);
    const { agreementId, status, notes } = await req.json();
    const agreement = await prisma.farmerAgreement.update({
      where: { id: agreementId },
      data: { status, notes, updatedAt: new Date() },
    });
    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
