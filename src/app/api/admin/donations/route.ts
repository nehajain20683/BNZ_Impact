export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import { resolveTenantFromRequest } from '@/lib/tenant';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — list donations for active org
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId  = await getActiveOrgId();
    const params = new URL(req.url).searchParams;
    const search = params.get('search') || '';
    const status = params.get('status') || '';
    const page   = parseInt(params.get('page') || '1');
    const limit  = parseInt(params.get('limit') || '50');

    const where: any = { orgId };
    if (status) where.paymentStatus = status;
    if (search) where.OR = [
      { donorName:  { contains: search, mode: 'insensitive' } },
      { donorEmail: { contains: search, mode: 'insensitive' } },
      { donorMobile:{ contains: search } },
      { refId:      { contains: search, mode: 'insensitive' } },
    ];

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { campaign: { select: { name: true, slug: true } } },
      }),
      prisma.donation.count({ where }),
    ]);

    return NextResponse.json({ donations, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// POST — create manual donation
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const org   = await resolveTenantFromRequest(req);
    const body  = await req.json();

    const campaign = await prisma.campaign.findFirst({
      where: { slug: body.campaignSlug || 'individual' }
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const amount        = parseFloat(body.amount) || (parseInt(body.numberOfTrees)||11) * (org.treePrice || 500);
    const count         = await prisma.donation.count({ where: { orgId } });
    const refId         = `#${org.donationRefPrefix || 'JGL'}-${String(count + 1).padStart(5, '0')}`;
    const receiptNumber = `${org.donationRefPrefix || 'JGL'}${Date.now().toString().slice(-10)}`;

    const donation = await prisma.donation.create({
      data: {
        campaignId:       campaign.id,
        orgId,
        donorName:        body.donorName,
        certificateName:  body.certificateName || body.donorName,
        donorEmail:       body.donorEmail || '',
        donorMobile:      body.donorMobile || undefined,
        donorPan:         body.donorPan    || undefined,
        donorChapter:     body.donorChapter|| undefined,
        dedicationName:   body.dedicationName || undefined,
        numberOfTrees:    parseInt(body.numberOfTrees) || 11,
        amount,
        paymentStatus:    'COMPLETED',
        paymentMode:      body.paymentMode || 'CASH',
        paymentBank:      body.paymentBank || undefined,
        paymentGatewayId: body.paymentRef  || undefined,
        chequeNumber:     body.chequeNumber|| undefined,
        notes:            body.notes       || undefined,
        receiptNumber,
        refId,
        createdById:      actor.id,
      } as any,
    });

    // Manual entries are marked COMPLETED immediately (unlike the online
    // flow, which only completes on payment/verify) — so tree records must
    // be created here too. This was previously missing entirely, meaning
    // every manually-entered donation never got real Tree rows: it never
    // showed up in "Link Sponsored Trees", never counted toward a donor's
    // tree total, and could never be traced to a farmer's land.
    await prisma.tree.createMany({
      data: Array.from({ length: donation.numberOfTrees }, () => ({
        donationId:  donation.id,
        status:      'PENDING' as const,
        expectedCO2: 22,
      })),
    });

    return NextResponse.json({ success: true, donation, refId, receiptNumber });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { donationId, ...updates } = await req.json();
    if (!donationId) return NextResponse.json({ error: 'donationId required' }, { status: 400 });
    const allowed = ['donorName','certificateName','donorEmail','donorMobile','donorPan',
      'donorChapter','dedicationName','numberOfTrees','amount','paymentStatus',
      'paymentGatewayId','paymentMode','paymentBank','chequeNumber','notes',
      'waMessageSent','certificateSent','form80GSent'];
    const data: any = {};
    for (const k of allowed) { if (updates[k] !== undefined) data[k] = updates[k]; }
    if (updates.waMessageSent   === true) data.waMessageSentAt   = new Date();
    if (updates.certificateSent === true) data.certificateSentAt = new Date();
    const donation = await prisma.donation.update({ where: { id: donationId }, data });
    return NextResponse.json({ success: true, donation });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

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
