export const runtime = 'nodejs';
// src/app/api/campaigns/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';
import { cardWithUrl } from '@/lib/campaign-media';

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);
    const campaigns = await prisma.campaign.findMany({
      where: { orgId: org.id, active: true, isIndividual: false },
      // galleryImages deliberately excluded — a base64 array only ever
      // used on the campaign detail page, never on this list view (the
      // homepage and /campaigns grid only render imageUrl, name,
      // description, and the package tiers). Selecting everything except
      // it keeps this list endpoint from pulling gallery photos for
      // every campaign on every homepage/campaigns-page load.
      select: {
        id: true, name: true, slug: true, description: true, treePrice: true,
        imageUrl: true, goal: true, subtitle: true, shortName: true,
        dedicationLabel: true, accentColor: true, accentBg: true, accentBorder: true,
        displayOrder: true, packages: true, perks: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ campaigns: campaigns.map(cardWithUrl) }, {
      // Public, unauthenticated, non-personalized — same reasoning as
      // /api/public/impact. A newly-created campaign takes at most 5
      // minutes to appear publicly, in exchange for not hitting the
      // database on every single homepage/campaigns-page load.
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error: any) {
    console.error('Campaigns API error:', error);
    return NextResponse.json(
      { campaigns: [], error: error.message },
      { status: 500 }
    );
  }
}
