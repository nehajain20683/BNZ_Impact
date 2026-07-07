export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

async function generateRefId(): Promise<string> {
  const count = await prisma.donation.count();
  return `#JITO-${String(count + 1).padStart(5, '0')}`;
}

// POST — create manual donation
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body  = await req.json();

    const campaign = await prisma.campaign.findFirst({
      where: { slug: body.campaignSlug || 'individual' }
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const amount        = parseFloat(body.amount) || (parseInt(body.numberOfTrees)||11) * 500;
    const refId         = await generateRefId();
    const receiptNumber = `JGL${Date.now().toString().slice(-10)}`;

    const donation = await prisma.donation.create({
      data: {
        campaignId:       campaign.id,
        donorName:        body.donorName,
        certificateName:  body.certificateName || body.donorName,
        donorEmail:       body.donorEmail || '',
        donorMobile:      body.donorMobile || undefined,
        donorPan:         body.donorPan || undefined,
        donorChapter:     body.donorChapter || undefined,
        dedicationName:   body.dedicationName || undefined,
        numberOfTrees:    parseInt(body.numberOfTrees) || 11,
        amount,
        paymentStatus:    'COMPLETED',
        paymentMode:      body.paymentMode || 'CASH',
        paymentBank:      body.paymentBank || undefined,
        paymentGatewayId: body.paymentRef || undefined,
        chequeNumber:     body.chequeNumber || undefined,
        notes:            body.notes || undefined,
        receiptNumber,
        refId,
        createdById:      actor.id,
      } as any,
    });

    await prisma.auditLog.create({
      data: { actorId: actor.id, actorRole: actor.role, action: 'MANUAL_DONATION_ADDED',
              details: { donationId: donation.id, donorName: body.donorName, amount } }
    }).catch(() => {});

    return NextResponse.json({ success: true, donation, refId, receiptNumber });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message==='Unauthorized'?401:500 });
  }
}

// PATCH — update any donation field
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { donationId, ...updates } = body;
    if (!donationId) return NextResponse.json({ error: 'donationId required' }, { status: 400 });

    const allowed = [
      'donorName','certificateName','donorEmail','donorMobile','donorPan','donorChapter',
      'dedicationName','numberOfTrees','amount','paymentStatus','paymentGatewayId',
      'paymentMode','paymentBank','chequeNumber','notes',
      'waMessageSent','certificateSent','form80GSent',
    ];
    const data: any = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) data[k] = updates[k];
    }
    if (updates.waMessageSent   === true) data.waMessageSentAt   = new Date();
    if (updates.certificateSent === true) data.certificateSentAt = new Date();

    const donation = await prisma.donation.update({ where: { id: donationId }, data });
    return NextResponse.json({ success: true, donation });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — delete a donation
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { donationId } = await req.json();
    if (!donationId) return NextResponse.json({ error: 'donationId required' }, { status: 400 });
    await prisma.donation.delete({ where: { id: donationId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
