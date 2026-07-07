export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendDonationConfirmationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { donationId, type } = await req.json();
    if (!donationId) return NextResponse.json({ error: 'donationId required' }, { status: 400 });

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { campaign: true },
    });
    if (!donation) return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    if (!donation.donorEmail) return NextResponse.json({ error: 'No email on file for this donor' }, { status: 400 });

    // Reuse the existing email function
    const sent = await sendDonationConfirmationEmail({
      donorName:       donation.donorName,
      donorEmail:      donation.donorEmail,
      amount:          donation.amount,
      numberOfTrees:   donation.numberOfTrees,
      campaignName:    donation.campaign.name,
      receiptNumber:   donation.receiptNumber || donation.id.slice(0,10),
      dedicationName:  donation.dedicationName || undefined,
      donationId:      donation.id,
      donorPan:        donation.donorPan || undefined,
      paymentGatewayId:donation.paymentGatewayId || undefined,
      donationDate:    donation.createdAt,
    });

    if (!sent) return NextResponse.json({ error: 'Email send failed — check RESEND_API_KEY' }, { status: 500 });

    // Mark as sent if certificate
    if (type === 'certificate') {
      await prisma.donation.update({
        where: { id: donationId },
        data: { certificateSent: true, certificateSentAt: new Date() } as any,
      }).catch(()=>{});
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
