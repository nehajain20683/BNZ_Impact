export const runtime = 'nodejs';
// src/app/api/field-officer/dashboard/route.ts
// Read-only, officer-scoped — matches the farmer-self-route security model
// used throughout this app (ID-based, no signed session token verified
// server-side beyond confirming the account is real and active). Returns
// only this specific officer's own assigned farmers, never anyone else's.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computeDueStatus } from '@/lib/monitoring-schedule';

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
    _max: { visitDate: true },
  });
  const monitoringCountByFarmer: Record<string, number> = {};
  const lastVisitByFarmer: Record<string, Date | null> = {};
  for (const g of monitoringCounts) {
    if (g.farmerId) {
      monitoringCountByFarmer[g.farmerId] = g._count._all;
      lastVisitByFarmer[g.farmerId] = g._max.visitDate;
    }
  }

  // Phase 2 — real due-date computation, not just "ever visited or not."
  // Falls back to the platform default (30 days) if this org has never
  // configured TenantEngineConfig at all, so this works immediately on
  // every existing org without a manual setup step.
  const engineConfig = await (prisma as any).tenantEngineConfig.findUnique({ where: { orgId: officer.orgId } });
  const intervalDays = engineConfig?.defaultMonitoringIntervalDays ?? 30;

  const farmersWithStatus = farmers.map(f => {
    const due = computeDueStatus(lastVisitByFarmer[f.id] || null, intervalDays);
    return {
      ...f,
      // Quick, at-a-glance flags for the dashboard list — a farmer never
      // inspected or never health-checked is what an officer should notice
      // first, without opening every single farmer to find out.
      needsVerification: f._count.inspections === 0,
      needsHealthCheck: (monitoringCountByFarmer[f.id] || 0) === 0,
      monitoringDueStatus: due.status,
      daysSinceLastVisit: due.daysSinceVisit,
    };
  });

  const STATUS_URGENCY: Record<string, number> = { OVERDUE: 0, NEVER_VISITED: 1, DUE_SOON: 2, OK: 3 };
  farmersWithStatus.sort((a, b) => STATUS_URGENCY[a.monitoringDueStatus] - STATUS_URGENCY[b.monitoringDueStatus]);

  return NextResponse.json({ officer, farmers: farmersWithStatus });
}
