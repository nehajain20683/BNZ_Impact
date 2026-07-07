export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actor = session.user as any;

    const { rows } = await req.json(); // array of donation rows from CSV
    if (!Array.isArray(rows) || rows.length === 0)
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });

    // Find default campaign
    const campaigns = await prisma.campaign.findMany();
    const campaignMap = Object.fromEntries(campaigns.map(c => [c.slug.toLowerCase(), c.id]));

    let created = 0, skipped = 0, errors: string[] = [];

    for (const row of rows) {
      try {
        const name   = (row['Donor Name'] || row['Name'] || '').trim();
        const certName = (row['Certificate Name'] || '').trim();
        const email  = (row['Email'] || '').trim().toLowerCase();
        const mobile = (row['Mobile'] || row['Phone'] || '').trim();
        const trees  = parseInt(row['Trees'] || row['Number of Trees'] || '0');
        const amount = parseFloat(row['Amount'] || String(trees * 500));
        const chapter= (row['Chapter'] || '').trim();
        const dedName= (row['Dedication'] || row['Dedication Name'] || '').trim();
        const payMode= (row['Payment Mode'] || 'CASH').trim().toUpperCase();
        const payRef = (row['Payment Ref'] || row['Transaction ID'] || '').trim();
        const payBank= (row['Bank'] || '').trim();
        const campaignSlug = (row['Campaign'] || 'individual').trim().toLowerCase();
        const pan    = (row['PAN'] || '').trim();

        if (!name || !trees) { skipped++; continue; }

        const campaignId = campaignMap[campaignSlug] || campaigns[0]?.id;
        if (!campaignId) { errors.push(`No campaign for row: ${name}`); continue; }

        const count = await prisma.donation.count();
        const refId = `#JITO-${String(count + 1).padStart(5, '0')}`;
        const receiptNumber = `JGL${Date.now().toString().slice(-10)}${created}`;

        await prisma.donation.create({
          data: {
            campaignId, donorName: name,
            certificateName: certName || name, donorEmail: email,
            donorMobile: mobile || undefined,
            donorPan: pan || undefined,
            donorChapter: chapter || undefined,
            dedicationName: dedName || undefined,
            numberOfTrees: trees, amount,
            paymentStatus: 'COMPLETED',
            paymentMode: payMode,
            paymentBank: payBank || undefined,
            paymentGatewayId: payRef || undefined,
            receiptNumber, refId,
            createdById: actor.id,
          },
        });
        created++;
      } catch (e: any) {
        errors.push(`Row error: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, created, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
