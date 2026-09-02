export const runtime = 'nodejs';
// src/app/api/field-officer/dashboard/route.ts
// Read-only, officer-scoped — matches the farmer-self-route security model
// used throughout this app (ID-based, no signed session token verified
// server-side beyond confirming the account is real and active). Returns
// only this specific officer's own assigned farmers, never anyone else's.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const officerId = new URL(req.url).searchParams.get('officerId');
  if (!officerId) return NextResponse.json({ error: 'officerId required' }, { status: 400 });

  const officer = await prisma.fieldOfficer.findUnique({
    where: { id: officerId },
    select: { id: true, name: true, email: true, mobile: true, designation: true, district: true, state: true, active: true, orgId: true },
  });
  if (!officer || !officer.active) return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 });

  const farmers = await prisma.farmer.findMany({
    where: { assignedOfficerId: officerId },
    select: {
      id: true, fullName: true, mobile: true, village: true, district: true, status: true,
      farmerIdGenerated: true,
      lands: { select: { id: true, surveyGutNumber: true, village: true, status: true } },
      _count: { select: { inspections: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // MonitoringVisit has no declared back-relation on Farmer, so this needs
  // its own grouped query rather than a _count include like inspections above.
  const monitoringCounts = await prisma.monitoringVisit.groupBy({
    by: ['farmerId'],
    where: { farmerId: { in: farmers.map(f => f.id) } },
    _count: { _all: true },
  });
  const monitoringCountByFarmer: Record<string, number> = {};
  for (const g of monitoringCounts) {
    if (g.farmerId) monitoringCountByFarmer[g.farmerId] = g._count._all;
  }

  const farmersWithStatus = farmers.map(f => ({
    ...f,
    // Quick, at-a-glance flags for the dashboard list — a farmer never
    // inspected or never health-checked is what an officer should notice
    // first, without opening every single farmer to find out.
    needsVerification: f._count.inspections === 0,
    needsHealthCheck: (monitoringCountByFarmer[f.id] || 0) === 0,
  }));

  return NextResponse.json({ officer, farmers: farmersWithStatus });
}
