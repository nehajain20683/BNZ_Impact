export const runtime = 'nodejs';
// src/app/api/payment/verify/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { sendDonationConfirmationEmail } from '@/lib/email';
import { getOrgConfig } from '@/lib/tenant';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, donationId } = body;

    // The order was created using this donation's own org's credentials (see
    // create-order/route.ts), so verification must use that same secret.
    const existingDonation = await prisma.donation.findUnique({ where: { id: donationId } });
    const org = existingDonation?.orgId ? await getOrgConfig(existingDonation.orgId) : null;

    const isValid = verifyPaymentSignature(
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      org?.razorpayKeySecret
    );
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    // Mark donation as completed
    const donation = await prisma.donation.update({
      where: { id: donationId },
      data: {
        paymentStatus:    'COMPLETED',
        paymentGatewayId: razorpay_payment_id,
        paymentMethod:    'razorpay',
      },
      include: { campaign: true },
    });

    // Create tree records
    await prisma.tree.createMany({
      data: Array.from({ length: donation.numberOfTrees }, () => ({
        donationId:  donation.id,
        status:      'PENDING' as const,
        expectedCO2: 22,
      })),
    });

    // Create receipt and certificate DB records
    await prisma.receipt.create({ data: { donationId: donation.id } });
    await prisma.certificate.create({ data: { donationId: donation.id } });

    // Send email with PDF attachments via Resend (non-blocking)
    sendDonationConfirmationEmail({
      donorName:        donation.donorName,
      donorEmail:       donation.donorEmail,
      amount:           donation.amount,
      numberOfTrees:    donation.numberOfTrees,
      campaignName:     donation.campaign.name,
      receiptNumber:    donation.receiptNumber!,
      dedicationName:   donation.dedicationName || undefined,
      donationId:       donation.id,
      donorPan:         donation.donorPan || undefined,
      paymentGatewayId: donation.paymentGatewayId || undefined,
      donationDate:     donation.createdAt,
      orgId:            (donation as any).orgId || undefined,
    }).catch(console.error);

    return NextResponse.json({ success: true, donationId: donation.id });
  } catch (e: any) {
    console.error('Verify error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
