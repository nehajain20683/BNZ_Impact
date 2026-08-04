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

export async function POST(req: Request) {
  try {
    const actor  = await requireAdmin();
    const orgId  = await getActiveOrgId();
    const org    = await resolveTenantFromRequest(req);
    const { rows } = await req.json();

    if (!rows?.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({
      where: { slug: 'individual' }
    });
    if (!campaign) return NextResponse.json({ error: 'Default campaign not found' }, { status: 404 });

    let created = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        if (!row.donorName || !row.amount) { errors.push(`Row missing name/amount`); continue; }
        const count         = await prisma.donation.count({ where: { orgId } });
        const refId         = `#${org.donationRefPrefix || 'JGL'}-${String(count + 1).padStart(5, '0')}`;
        const receiptNumber = `${org.donationRefPrefix || 'JGL'}${Date.now().toString().slice(-10)}`;

        await prisma.donation.create({
          data: {
            campaignId:      campaign.id,
            orgId,
            donorName:       row.donorName,
            certificateName: row.certificateName || row.donorName,
            donorEmail:      row.donorEmail      || '',
            donorMobile:     row.donorMobile     || undefined,
            donorPan:        row.donorPan        || undefined,
            donorChapter:    row.donorChapter    || undefined,
            dedicationName:  row.dedicationName  || undefined,
            numberOfTrees:   parseInt(row.numberOfTrees) || 11,
            amount:          parseFloat(row.amount),
            paymentStatus:   'COMPLETED',
            paymentMode:     row.paymentMode     || 'CASH',
            refId,
            receiptNumber,
            createdById:     actor.id,
          } as any,
        });
        created++;
      } catch (e: any) {
        errors.push(`Row ${row.donorName}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, created, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
