export const runtime = 'nodejs';
// src/app/api/campaigns/[slug]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const org = await resolveTenantFromRequest(req);
    const campaign = await prisma.campaign.findFirst({
      where: { orgId: org.id, slug: params.slug, active: true, isIndividual: false },
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const related = await prisma.campaign.findMany({
      where: { orgId: org.id, active: true, isIndividual: false, id: { not: campaign.id } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      take: 5,
    });

    return NextResponse.json({ campaign, related });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
