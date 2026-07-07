export const runtime = 'nodejs';
// src/app/api/payment/create-order/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createOrder } from '@/lib/razorpay';
import { generateReceiptNumber } from '@/lib/utils';

const schema = z.object({
  amount: z.number().positive(),
  numberOfTrees: z.number().int().positive(),
  campaignSlug: z.string(),
  donorName: z.string().min(2),
  donorEmail: z.string().email(),
  donorMobile: z.string().optional(),
  donorAddress: z.string().optional(),
  donorPan: z.string().optional(),
  certificateName: z.string().optional(),
  dedicationName: z.string().optional(),
  dedicationType: z.string().optional(),
  chapter: z.string().optional(),
});

// Map any frontend value → valid Prisma DedicationType enum
function mapDedicationType(value?: string): any {
  if (!value) return undefined;
  const map: Record<string, string> = {
    DADI:         'GRANDPARENTS',
    MAA:          'MOTHER',
    BETI:         'DAUGHTER',
    POTI:         'DAUGHTER',
    INDIVIDUAL:   'OTHER',
    MOTHER:       'MOTHER',
    FATHER:       'FATHER',
    GRANDPARENTS: 'GRANDPARENTS',
    DAUGHTER:     'DAUGHTER',
    MEMORIAL:     'MEMORIAL',
    CSR:          'CSR',
    OTHER:        'OTHER',
  };
  return map[value.toUpperCase()] ?? 'OTHER';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const data = schema.parse(body);

    const campaign = await prisma.campaign.findUnique({ where: { slug: data.campaignSlug } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const receiptNumber = generateReceiptNumber();
    const razorpayOrder = await createOrder(data.amount, receiptNumber);

    const donation = await prisma.donation.create({
      data: {
        userId: (session?.user as any)?.id || null,
        campaignId: campaign.id,
        amount: data.amount,
        numberOfTrees: data.numberOfTrees,
        donorName: data.donorName,
        donorEmail: data.donorEmail,
        donorMobile: data.donorMobile,
        donorAddress: data.donorAddress,
        donorPan: data.donorPan,
        donorChapter: data.chapter || null,
        certificateName: body.certificateName || body.name,
        dedicationName: data.dedicationName,
        dedicationType: mapDedicationType(data.dedicationType),
        paymentStatus: 'PENDING',
        paymentOrderId: razorpayOrder.id,
        receiptNumber,
      },
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      donationId: donation.id,
      amount: data.amount,
      currency: 'INR',
    });
  } catch (e: any) {
    console.error('Create order error:', e);
    return NextResponse.json({ error: e.message || 'Failed to create order' }, { status: 500 });
  }
}
