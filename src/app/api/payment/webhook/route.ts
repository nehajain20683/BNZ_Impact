export const runtime = 'nodejs';
// src/app/api/payment/webhook/route.ts
import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import prisma from '@/lib/prisma';
import { getOrgConfig } from '@/lib/tenant';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  // Signature must be verified against the RAW body text (not a re-serialized
  // copy), using the webhook secret belonging to whichever org's Razorpay
  // account this event came from. We don't know the org until we peek at the
  // order_id inside the (still-unverified) payload, so: look it up, try that
  // org's secret, and fall back to the platform-wide secret if that fails —
  // this keeps existing single-tenant webhooks working unchanged.
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const orderId = event.payload?.payment?.entity?.order_id;
  let webhookSecret: string | null | undefined = undefined;
  if (orderId) {
    const donation = await prisma.donation.findFirst({ where: { paymentOrderId: orderId } });
    if (donation?.orgId) {
      const org = await getOrgConfig(donation.orgId);
      webhookSecret = org?.razorpayWebhookSecret;
    }
  }

  const isValid = verifyWebhookSignature(body, signature, webhookSecret);
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  if (event.event === 'payment.captured') {
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;

    if (orderId) {
      await prisma.donation.updateMany({
        where: { paymentOrderId: orderId, paymentStatus: 'PENDING' },
        data: { paymentStatus: 'COMPLETED', paymentGatewayId: paymentId },
      });
    }
  }

  if (event.event === 'payment.failed') {
    const orderId = event.payload?.payment?.entity?.order_id;
    if (orderId) {
      await prisma.donation.updateMany({
        where: { paymentOrderId: orderId },
        data: { paymentStatus: 'FAILED' },
      });
    }
  }

  return NextResponse.json({ received: true });
}
