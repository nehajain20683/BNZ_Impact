export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const type  = new URL(req.url).searchParams.get('type') || 'donations';

    let csv = '';

    if (type === 'donations') {
      const donations = await prisma.donation.findMany({
        where:   { orgId },
        orderBy: { createdAt: 'desc' },
        include: { campaign: { select: { name: true } } },
      });
      csv = [
        'Ref ID,Donor Name,Email,Mobile,PAN,Campaign,Trees,Amount,Status,Date',
        ...donations.map(d => [
          d.refId || '', d.donorName, d.donorEmail || '', d.donorMobile || '',
          d.donorPan || '', d.campaign?.name || '', d.numberOfTrees,
          d.amount, d.paymentStatus,
          new Date(d.createdAt).toLocaleDateString('en-IN'),
        ].map(v => `"${v}"`).join(',')),
      ].join('\n');
    }

    if (type === 'farmers') {
      const farmers = await prisma.farmer.findMany({
        where:   { orgId },
        orderBy: { createdAt: 'desc' },
      });
      csv = [
        'Farmer ID,Name,Mobile,Village,District,State,Status,Registered',
        ...farmers.map(f => [
          f.farmerIdGenerated || '', f.fullName, f.mobile,
          f.village || '', f.district || '', f.state || '',
          f.status, new Date(f.createdAt).toLocaleDateString('en-IN'),
        ].map(v => `"${v}"`).join(',')),
      ].join('\n');
    }

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="${type}-export-${Date.now()}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
