export const runtime = 'nodejs';
// src/app/api/campaigns/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);
    const campaigns = await prisma.campaign.findMany({
      where: { orgId: org.id, active: true, isIndividual: false },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Campaigns API error:', error);
    return NextResponse.json(
      { campaigns: [], error: error.message },
      { status: 500 }
    );
  }
}
