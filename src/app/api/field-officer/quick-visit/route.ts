export const runtime = 'nodejs';
// src/app/api/field-officer/quick-visit/route.ts
// The same aggregate-level "Log Visit" capability admin already has on the
// plantation site page (survival count, dead trees, avg height, disease
// notes, recommendations) — now available to a field officer directly for
// their own assigned farmer, without needing to go tree-by-tree when a
// quick summary is all that's needed for that visit.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { officerId, farmerId, survivalCount, deadTrees, avgHeight, diseaseNotes, recommendations, photos, driveLink, latitude, longitude } = body;

    if (!officerId || !farmerId)
      return NextResponse.json({ error: 'officerId and farmerId are required' }, { status: 400 });

    const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      select: { orgId: true, assignedOfficerId: true, landAssignments: { select: { id: true, siteId: true, treesPlanted: true } } },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    if (officer.orgId && officer.orgId !== farmer.orgId)
      return NextResponse.json({ error: 'This farmer does not belong to your organisation' }, { status: 403 });
    if (farmer.assignedOfficerId !== officer.id)
      return NextResponse.json({ error: 'This farmer is not assigned to you.' }, { status: 403 });

    const assignment = farmer.landAssignments[0]; // an officer's farmer visit covers their one active assignment
    if (!assignment) return NextResponse.json({ error: 'This farmer has no active land assignment yet.' }, { status: 400 });

    const survival = survivalCount && assignment.treesPlanted
      ? Math.round((survivalCount / assignment.treesPlanted) * 100) : undefined;

    const visit = await prisma.monitoringVisit.create({
      data: {
        siteId: assignment.siteId, assignmentId: assignment.id, farmerId,
        visitDate: new Date(), officerId: officer.id,
        survivalCount: survivalCount ? parseInt(survivalCount) : undefined,
        deadTrees: deadTrees ? parseInt(deadTrees) : undefined,
        avgHeight: avgHeight ? parseFloat(avgHeight) : undefined,
        diseaseNotes: diseaseNotes || undefined,
        recommendations: recommendations || undefined,
        photos: photos || [],
        driveLink: driveLink || undefined,
        gpsLat: typeof latitude === 'number' ? latitude : undefined,
        gpsLng: typeof longitude === 'number' ? longitude : undefined,
        survivalPct: survival, mortalityPct: survival !== undefined ? 100 - survival : undefined,
      },
    });

    await prisma.plantationActivity.create({
      data: {
        siteId: assignment.siteId, date: new Date(), activityType: 'MONITORING',
        description: `Monitoring visit by ${officer.name}${survivalCount ? ` — ${survivalCount} trees surviving` : ''}${deadTrees ? `, ${deadTrees} dead` : ''}`,
        remarks: diseaseNotes || recommendations || undefined,
        photos: photos || [], loggedById: officer.id,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, visit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
