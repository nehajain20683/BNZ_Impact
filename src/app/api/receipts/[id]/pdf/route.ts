export const runtime = 'nodejs';
// src/app/api/receipts/[id]/pdf/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateReceiptPDF } from '@/lib/pdf';
import { getOrgConfig, resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const donation = await prisma.donation.findUnique({
    where: { id: params.id },
    include: { campaign: true },
  });
  if (!donation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Prefer the org this donation actually belongs to; fall back to whatever
  // tenant this request resolves to (covers older donations with no orgId).
  const org = ((donation as any).orgId && await getOrgConfig((donation as any).orgId))
    || await resolveTenantFromRequest(req);

  const html = generateReceiptPDF({
    receiptNumber: donation.receiptNumber!,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    donorPan: donation.donorPan || undefined,
    amount: donation.amount,
    numberOfTrees: donation.numberOfTrees,
    campaignName: donation.campaign.name,
    isIndividual: (donation.campaign as any).isIndividual || false,
    paymentGatewayId: donation.paymentGatewayId || undefined,
    date: donation.createdAt,
    org: { name: org.name, logoUrl: org.logoUrl, org80gNumber: org.org80gNumber },
  });

  // Return HTML that auto-prints as PDF
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="receipt-${donation.receiptNumber}.html"`,
    },
  });
}
