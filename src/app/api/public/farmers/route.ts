export const runtime = 'nodejs';
// src/app/api/public/farmers/route.ts
// Powers the public "Meet the Farmers" gallery — no login required. Same
// privacy rule as the site story page: only fullName, village, district,
// and aggregate tree counts. Never mobile, Aadhaar, bank details, or any
// document. Only farmers who've completed full registration (a real,
// verified identity) are eligible to appear — never an incomplete profile.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);

    const farmers = await prisma.farmer.findMany({
      where: { orgId: org.id, status: 'VERIFIED_LAND_OWNER' as any, publiclyVisible: true },
      select: {
        id: true, fullName: true, photo: true, village: true, district: true, state: true,
        landAssignments: { select: { treesPlanted: true, site: { select: { id: true, siteName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = farmers
      .map(f => {
        const totalTrees = f.landAssignments.reduce((s, a) => s + (a.treesPlanted || 0), 0);
        const sites = [...new Map(f.landAssignments.filter(a => a.site).map(a => [a.site!.id, a.site!.siteName])).values()];
        return { id: f.id, fullName: f.fullName, photo: f.photo, village: f.village, district: f.district, state: f.state, totalTrees, sites };
      })
      // Only show farmers with at least one real, planted tree — an
      // onboarded-but-not-yet-planting farmer isn't a story to tell yet.
      .filter(f => f.totalTrees > 0)
      .sort((a, b) => b.totalTrees - a.totalTrees);

    return NextResponse.json({ farmers: result, orgName: org.name });
  } catch (error: any) {
    console.error('Public farmers gallery error:', error);
    return NextResponse.json({ error: 'Failed to load farmers' }, { status: 500 });
  }
}
