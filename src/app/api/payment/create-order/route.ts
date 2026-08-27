export const runtime = 'nodejs';
// src/app/api/payment/create-order/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createOrder } from '@/lib/razorpay';
import { generateReceiptNumber } from '@/lib/utils';
import { resolveTenantFromRequest } from '@/lib/tenant';

const schema = z.object({
  amount:          z.number().positive(),
  numberOfTrees:   z.number().int().positive(),
  campaignSlug:    z.string(),
  donorName:       z.string().min(2),
  donorEmail:      z.string().email(),
  donorMobile:     z.string().optional(),
  donorAddress:    z.string().optional(),
  donorPan:        z.string().optional(),
  certificateName: z.string().optional(),
  dedicationName:  z.string().optional(),
  dedicationType:  z.string().optional(),
  chapter:         z.string().optional(),
});

function mapDedicationType(value?: string): any {
  if (!value) return undefined;
  const map: Record<string, string> = {
    DADI: 'GRANDPARENTS', MAA: 'MOTHER', BETI: 'DAUGHTER', POTI: 'DAUGHTER',
    INDIVIDUAL: 'OTHER', MOTHER: 'MOTHER', FATHER: 'FATHER',
    GRANDPARENTS: 'GRANDPARENTS', DAUGHTER: 'DAUGHTER',
    MEMORIAL: 'MEMORIAL', CSR: 'CSR', OTHER: 'OTHER',
  };
  return map[value.toUpperCase()] ?? 'OTHER';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body    = await req.json();
    const data    = schema.parse(body);

    const campaign = await prisma.campaign.findUnique({ where: { slug: data.campaignSlug } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const org             = await resolveTenantFromRequest(req);

    // Amount must always equal trees × this org's configured price-per-tree —
    // never trust the client-supplied amount directly, or a tampered request
    // could get any number of trees for an arbitrary price.
    const expectedAmount = data.numberOfTrees * (org.treePrice || 500);
    if (Math.round(data.amount) !== Math.round(expectedAmount)) {
      return NextResponse.json({
        error: `Amount mismatch: ${data.numberOfTrees} trees at this organisation's price should be ₹${expectedAmount}.`,
      }, { status: 400 });
    }

    const receiptNumber   = generateReceiptNumber(org.donationRefPrefix || 'BNZ');
    const razorpayOrder   = await createOrder(data.amount, receiptNumber, org.slug, {
      keyId: org.razorpayKeyId, keySecret: org.razorpayKeySecret,
    });

    const donation = await prisma.donation.create({
      data: {
        orgId:           org.id,
        userId:          (session?.user as any)?.id || null,
        campaignId:      campaign.id,
        amount:          data.amount,
        numberOfTrees:   data.numberOfTrees,
        donorName:       data.donorName,
        donorEmail:      data.donorEmail,
        donorMobile:     data.donorMobile,
        donorAddress:    data.donorAddress,
        donorPan:        data.donorPan,
        donorChapter:    data.chapter || null,
        certificateName: data.certificateName || data.donorName,
        dedicationName:  data.dedicationName,
        dedicationType:  mapDedicationType(data.dedicationType),
        paymentStatus:   'PENDING',
        paymentOrderId:  razorpayOrder.id,
        receiptNumber,
      } as any,
    });

    return NextResponse.json({
      orderId:    razorpayOrder.id,
      donationId: donation.id,
      amount:     data.amount,
      currency:   'INR',
      // The Razorpay Checkout widget must be opened with the SAME key_id the
      // order was created under — critical when an org has its own Razorpay
      // account instead of the platform default.
      keyId:      org.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      successMessage: org.paymentSuccessMessage || undefined,
    });
  } catch (e: any) {
    console.error('Create order error:', e);
    return NextResponse.json({ error: e.message || 'Failed to create order' }, { status: 500 });
  }
}
