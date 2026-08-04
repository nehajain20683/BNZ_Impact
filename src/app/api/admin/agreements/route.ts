export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { generateDocumentHTML } from '@/lib/doc-templates';

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
    const farmerId = new URL(req.url).searchParams.get('farmerId');

    const where: any = {};
    if (farmerId) {
      // Verify farmer belongs to this org
      const farmer = await prisma.farmer.findFirst({ where: { id: farmerId, orgId } });
      if (!farmer) return NextResponse.json({ agreements: [] });
      where.farmerId = farmerId;
    } else {
      // Get all farmers for this org
      const farmers = await prisma.farmer.findMany({ where: { orgId }, select: { id: true } });
      where.farmerId = { in: farmers.map(f => f.id) };
    }

    const agreements = await prisma.farmerAgreement.findMany({
      where,
      include: { farmer: { select: { fullName: true, mobile: true, farmerIdGenerated: true } } },
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
    const body   = await req.json();
    const { farmerId, agreementType, templateData } = body;

    // Verify farmer belongs to this org
    const farmer = await prisma.farmer.findFirst({
      where: { id: farmerId, orgId },
      include: { lands: { take: 1 } },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found in this organisation' }, { status: 404 });

    const htmlContent = generateDocumentHTML(agreementType, { farmer, ...templateData });

    const agreement = await prisma.farmerAgreement.create({
      data: {
        farmerId,
        agreementType,
        htmlContent,
        generatedById: actor.id,
        sharedAt:      new Date(),
        status:        'SHARED',
      },
    });

    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
