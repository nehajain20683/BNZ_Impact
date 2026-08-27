export const runtime = 'nodejs';
// src/app/api/public/individual-campaign/route.ts
// Every org needs exactly one permanent "Individual" bucket for donations
// that aren't tied to any specific campaign. Previously there was no
// guarantee this existed — the donate page would silently fall back to
// whatever campaign happened to be first, misattributing every individual
// donation. This resolves (or lazily creates) that bucket per org.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);

    let campaign = await prisma.campaign.findFirst({
      where: { orgId: org.id, isIndividual: true },
    });

    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          orgId: org.id,
          name: 'Individual Tree Donation',
          slug: `${org.slug}-individual`,
          shortName: 'Individual',
          isIndividual: true,
          active: true,
          treePrice: org.treePrice || 500,
        },
      });
    }

    return NextResponse.json({ campaign: { id: campaign.id, slug: campaign.slug, name: campaign.name } });
  } catch (error: any) {
    console.error('Individual campaign resolution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
