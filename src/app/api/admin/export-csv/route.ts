export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params  = new URL(req.url).searchParams;
  const json    = params.get('json') === '1';
  const template= params.get('template') === '1';
  const q       = params.get('q') || undefined;
  const status  = params.get('status') || undefined;
  const trees   = params.get('trees') ? parseInt(params.get('trees')!) : undefined;
  const mode    = params.get('mode') || undefined;

  // Return CSV template
  if (template) {
    const header = 'Donor Name,Email,Mobile,PAN,Chapter,Dedication,Trees,Amount,Campaign,Payment Mode,Payment Ref,Bank\n';
    const example = 'Ramesh Jain,ramesh@example.com,9876543210,ABCDE1234F,Ghatkopar Chapter,Savitri Devi,27,13500,individual,CASH,,Bank of Ghatkopar\n';
    return new Response(header + example, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="donation-import-template.csv"',
      }
    });
  }

  const where: any = {};
  if (status) where.paymentStatus = status;
  if (trees)  where.numberOfTrees = trees;
  if (mode)   where.paymentMode   = mode;
  if (q) {
    where.OR = [
      { donorName:     { contains: q, mode: 'insensitive' } },
      { donorEmail:    { contains: q, mode: 'insensitive' } },
      { donorMobile:   { contains: q } },
      { receiptNumber: { contains: q } },
      { refId:         { contains: q } },
    ];
  }

  const donations = await prisma.donation.findMany({
    where,
    include: { campaign: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  // JSON response for frontend
  if (json) return NextResponse.json({ donations });

  // CSV export
  const headers = [
    'Ref ID','Receipt No','Date','Donor Name','Email','Mobile','PAN','Chapter',
    'Dedication','Campaign','Trees','Amount','Payment Mode','Payment Bank',
    'Payment Ref','80G Eligible','WA Sent','Certificate Sent','Status','Notes'
  ];

  const rows = donations.map(d => [
    d.refId||'',
    d.receiptNumber||'',
    new Date(d.createdAt).toLocaleDateString('en-IN'),
    d.donorName,
    d.donorEmail,
    d.donorMobile||'',
    d.donorPan||'',
    d.donorChapter||'',
    d.dedicationName||'',
    (d as any).campaign?.name||'',
    d.numberOfTrees,
    d.amount,
    (d as any).paymentMode||'ONLINE',
    (d as any).paymentBank||'',
    d.paymentGatewayId||'',
    d.donorPan ? 'Yes' : 'No',
    (d as any).waMessageSent ? 'Yes' : 'No',
    (d as any).certificateSent ? 'Yes' : 'No',
    d.paymentStatus,
    (d as any).notes||'',
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="donations-${Date.now()}.csv"`,
    }
  });
}
