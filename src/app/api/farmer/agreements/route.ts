export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET — farmer views their agreements
export async function GET(req: Request) {
  const params   = new URL(req.url).searchParams;
  const farmerId = params.get('farmerId');
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  const agreements = await prisma.farmerAgreement.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ agreements });
}

// PATCH — farmer acknowledges or uploads signed copy
export async function PATCH(req: Request) {
  try {
    const { agreementId, action, signedPdfUrl } = await req.json();
    if (!agreementId) return NextResponse.json({ error: 'agreementId required' }, { status: 400 });

    const update: any = { updatedAt: new Date() };
    if (action === 'acknowledge') {
      update.status = 'ACKNOWLEDGED';
      update.acknowledgedAt = new Date();
    }
    if (action === 'upload_signed' && signedPdfUrl) {
      update.signedPdfUrl = signedPdfUrl;
      update.status = 'SIGNED';
      update.signedAt = new Date();
    }

    const agreement = await prisma.farmerAgreement.update({
      where: { id: agreementId },
      data: update,
    });
    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
