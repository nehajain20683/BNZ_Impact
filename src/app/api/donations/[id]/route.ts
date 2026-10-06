export const runtime = 'nodejs';
// src/app/api/donations/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CAMPAIGN_CARD } from '@/lib/lite-select';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const donation = await prisma.donation.findUnique({
    where: { id: params.id },
    include: { campaign: { select: CAMPAIGN_CARD }, trees: true },
  });
  if (!donation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ donation });
}
