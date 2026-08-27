export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

const ALLOWED_FIELDS = [
  'name', 'subtitle', 'shortName', 'dedicationLabel', 'description',
  'imageUrl', 'accentColor', 'accentBg', 'accentBorder',
  'treePrice', 'goal', 'displayOrder', 'packages', 'active',
];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();

    const campaign = await prisma.campaign.findFirst({ where: { id: params.id, orgId } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    // Enforce: every tenant must always have at least one active campaign.
    if (body.active === false) {
      const otherActiveCount = await prisma.campaign.count({
        where: { orgId, active: true, id: { not: params.id } },
      });
      if (otherActiveCount === 0) {
        return NextResponse.json({
          error: 'This is your only active campaign. Activate another campaign before deactivating this one.',
        }, { status: 400 });
      }
    }

    const data: any = {};
    for (const k of ALLOWED_FIELDS) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if ('treePrice' in data) data.treePrice = Number(data.treePrice) || campaign.treePrice;
    if ('goal' in data) data.goal = data.goal ? parseInt(data.goal) : null;
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder) || 0;
    if ('name' in data && !String(data.name).trim()) delete data.name;

    const updated = await prisma.campaign.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, campaign: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const campaign = await prisma.campaign.findFirst({ where: { id: params.id, orgId } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    if (campaign.isIndividual) {
      return NextResponse.json({
        error: 'This is the system-managed "Individual" donation bucket and cannot be deleted — it keeps individual (non-campaign) donations separate from your real campaigns.',
      }, { status: 400 });
    }

    const totalCount = await prisma.campaign.count({ where: { orgId, isIndividual: false } });
    if (totalCount <= 1) {
      return NextResponse.json({
        error: 'You must have at least one public campaign. Create another campaign before deleting this one.',
      }, { status: 400 });
    }

    const donationCount = await prisma.donation.count({ where: { campaignId: params.id } });
    if (donationCount > 0) {
      // Preserve donation history — deactivate instead of hard-deleting a
      // campaign that real donations already reference.
      const otherActiveCount = await prisma.campaign.count({
        where: { orgId, active: true, id: { not: params.id } },
      });
      if (otherActiveCount === 0) {
        return NextResponse.json({
          error: 'This is your only active campaign. Activate another campaign before deactivating this one.',
        }, { status: 400 });
      }
      await prisma.campaign.update({ where: { id: params.id }, data: { active: false } });
      return NextResponse.json({ success: true, deactivatedInstead: true });
    }

    await prisma.campaign.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
