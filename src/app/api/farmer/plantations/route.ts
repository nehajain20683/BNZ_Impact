export const runtime = 'nodejs';
// src/app/api/farmer/plantations/route.ts
// Lists the logged-in farmer's LandAssignment records — "which plantation
// am I working on" for the redesigned dashboard. Reuses the existing,
// already-live LandAssignment model rather than the unused Plantation model.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmerId = searchParams.get('farmerId');
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  const assignments = await prisma.landAssignment.findMany({
    where: { farmerId },
    include: {
      site: {
        select: {
          id: true, siteName: true, currentPhase: true, district: true, state: true,
          organization: { select: { name: true } },
          project: { select: { name: true } },
        },
      },
      land: { select: { id: true, surveyGutNumber: true, areaAcres: true } },
      monitoring: { orderBy: { visitDate: 'desc' }, take: 1, select: { visitDate: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const plantations = assignments.map(a => ({
    id: a.id,
    siteName: a.site.siteName,
    siteId: a.site.id,
    orgName: a.site.organization?.name || null,
    projectName: a.site.project?.name || null,
    phase: a.site.currentPhase,
    district: a.site.district, state: a.site.state,
    landId: a.land?.id || null,
    landSurveyNumber: a.land?.surveyGutNumber || null,
    landAreaAcres: a.land?.areaAcres || null,
    stage: a.stage,
    treesAssigned: a.treesAssigned,
    treesPlanted: a.treesPlanted,
    treesSurviving: a.treesSurviving,
    lastMonitored: a.monitoring[0]?.visitDate || a.lastMonitored || null,
    assignedAt: a.assignedAt,
  }));

  return NextResponse.json({ plantations });
}
