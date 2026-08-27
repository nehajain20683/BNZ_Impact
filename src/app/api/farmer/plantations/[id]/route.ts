export const runtime = 'nodejs';
// src/app/api/farmer/plantations/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const assignment = await prisma.landAssignment.findUnique({
    where: { id: params.id },
    include: {
      site: {
        select: {
          id: true, siteName: true, currentPhase: true, startDate: true,
          district: true, state: true, plannedTrees: true,
          organization: { select: { name: true } },
          project: { select: { name: true, code: true } },
        },
      },
      land: true,
      stageHistory: { orderBy: { date: 'desc' } },
      monitoring: { orderBy: { visitDate: 'desc' } },
    },
  });
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Tree KPIs — from real monitoring records, not hardcoded. Falls back to
  // the assignment's own running totals if no monitoring visits exist yet.
  const latestVisit = assignment.monitoring[0];
  const totalTrees   = assignment.treesPlanted || assignment.treesAssigned || 0;
  const alive        = latestVisit?.survivalCount ?? assignment.treesSurviving ?? 0;
  const dead          = latestVisit?.deadTrees ?? Math.max(0, totalTrees - alive);
  const survivalRate = totalTrees > 0 ? Math.round((alive / totalTrees) * 1000) / 10 : null;

  // Build a unified chronological timeline from stage history + monitoring
  // visits — this is the "Activity Timeline" the farmer sees.
  const timeline = [
    ...assignment.stageHistory.map(h => ({
      type: 'STAGE', title: h.stage.replace(/_/g, ' '),
      date: h.date, photos: h.photos, notes: h.remarks, person: h.updatedById,
    })),
    ...assignment.monitoring.map(m => ({
      type: 'MONITORING', title: 'Official Monitoring',
      date: m.visitDate, photos: m.photos,
      notes: [m.diseaseNotes && `Disease/Issues: ${m.diseaseNotes}`, m.recommendations && `Recommendations: ${m.recommendations}`].filter(Boolean).join(' · ') || undefined,
      person: m.officerId,
      meta: { survivalCount: m.survivalCount, deadTrees: m.deadTrees, avgHeight: m.avgHeight },
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      stage: assignment.stage,
      treesAssigned: assignment.treesAssigned,
      speciesAlloc: assignment.speciesAlloc,
      consentSigned: assignment.consentSigned,
      assignedAt: assignment.assignedAt,
    },
    site: {
      id: assignment.site.id, name: assignment.site.siteName, phase: assignment.site.currentPhase,
      startDate: assignment.site.startDate, district: assignment.site.district, state: assignment.site.state,
      orgName: assignment.site.organization?.name || null,
      projectName: assignment.site.project?.name || null, projectCode: assignment.site.project?.code || null,
    },
    land: assignment.land ? {
      id: assignment.land.id,
      surveyNumber: assignment.land.surveyGutNumber || assignment.land.surveyNumber,
      areaAcres: assignment.land.areaAcres,
      gpsLatitude: assignment.land.gpsLatitude, gpsLongitude: assignment.land.gpsLongitude,
      polygonGeoJson: assignment.land.polygonGeoJson,
      village: assignment.land.village, district: assignment.land.district, state: assignment.land.state,
    } : null,
    treeSummary: { total: totalTrees, alive, dead, survivalRate, lastMonitored: latestVisit?.visitDate || null },
    timeline,
  });
}
