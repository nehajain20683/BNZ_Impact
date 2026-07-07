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

// POST — create manual donation entry
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body  = await req.json();

    // Find or use campaign
    const campaign = await prisma.campaign.findFirst({
      where: { slug: body.campaignSlug || 'individual' }
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const amount = body.numberOfTrees * 500;
    const refId  = await generateRefId();
    const receiptNumber = `JGL${Date.now().toString().slice(-10)}`;

    const donation = await prisma.donation.create({
      data: {
        campaignId:      campaign.id,
        donorName:       body.donorName,
        donorEmail:      body.donorEmail || '',
        donorMobile:     body.donorMobile || undefined,
        donorAddress:    body.donorAddress || undefined,
        donorPan:        body.donorPan || undefined,
        donorChapter:    body.donorChapter || undefined,
        dedicationName:  body.dedicationName || undefined,
        numberOfTrees:   parseInt(body.numberOfTrees),
        amount:          body.amount || amount,
        paymentStatus:   'COMPLETED',
        paymentMode:     body.paymentMode || 'CASH',
        paymentBank:     body.paymentBank || undefined,
        paymentBranch:   body.paymentBranch || undefined,
        paymentGatewayId:body.paymentRef || undefined,
        chequeNumber:    body.chequeNumber || undefined,
        notes:           body.notes || undefined,
        receiptNumber,
        refId,
        createdById:     actor.id,
      },
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

// PATCH — update donation (status, WA sent, cert sent, 80G sent, notes, paymentRef)
export async function PATCH(req: Request) {
  try {
    const actor  = await requireAdmin();
    const body   = await req.json();
    const { donationId, ...updates } = body;
    if (!donationId) return NextResponse.json({ error: 'donationId required' }, { status: 400 });

    const allowed = ['paymentStatus','paymentGatewayId','waMessageSent','certificateSent',
                     'form80GSent','notes','paymentMode','paymentBank','paymentBranch','chequeNumber'];
    const data: any = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) data[k] = updates[k];
    }
    if (updates.waMessageSent)   data.waMessageSentAt   = new Date();
    if (updates.certificateSent) data.certificateSentAt = new Date();

    const donation = await prisma.donation.update({ where: { id: donationId }, data });
    return NextResponse.json({ success: true, donation });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
