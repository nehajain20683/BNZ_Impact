export const runtime = 'nodejs';
// src/app/api/field-officer/farmer/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const officerId = new URL(req.url).searchParams.get('officerId');
  if (!officerId) return NextResponse.json({ error: 'officerId required' }, { status: 400 });

  const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
  if (!officer || !officer.active) return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 });

  const farmer = await prisma.farmer.findFirst({
    where: { id: params.id, assignedOfficerId: officerId }, // only this officer's own assigned farmer
    select: {
      id: true, fullName: true, mobile: true, village: true, district: true, farmerIdGenerated: true,
      lands: { select: { id: true, surveyGutNumber: true, village: true, gpsLatitude: true, gpsLongitude: true, photos: true, kmlFileName: true, areaAcres: true } },
    },
  });
  if (!farmer) return NextResponse.json({ error: 'Farmer not found or not assigned to you' }, { status: 404 });

  const trees = await prisma.tree.findMany({
    where: { assignment: { farmerId: farmer.id } },
    select: {
      id: true, treeTagId: true, species: true, status: true, plantedDate: true,
      images: { select: { imageUrl: true, capturedAt: true }, orderBy: { capturedAt: 'desc' }, take: 1 },
      _count: { select: { images: true } },
      monitoringSamples: { select: { health: true, height: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Status awareness — so the officer sees what's already been done and
  // when, instead of a blank "Start" button every time. Not everything
  // gets captured in a single visit, so this also frames the next action
  // as continuing/updating a record rather than only ever starting fresh.
  function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  const [latestInspection, latestMonitoring, todayCheckIn] = await Promise.all([
    prisma.siteInspection.findFirst({
      where: { farmerId: farmer.id },
      orderBy: { createdAt: 'desc' },
      select: {
        inspectedAt: true, status: true, ownershipVerified: true, boundaryVerified: true,
        farmerMetPersonally: true, plantationFeasible: true, waterSourceAvailable: true,
      },
    }),
    prisma.monitoringVisit.findFirst({
      where: { farmerId: farmer.id },
      orderBy: { visitDate: 'desc' },
      select: { visitDate: true, survivalPct: true, _count: { select: { treeSamples: true } } },
    }),
    prisma.farmCheckIn.findFirst({
      where: { farmerId: farmer.id, officerId, checkedInAt: { gte: startOfDay(new Date()) } },
      orderBy: { checkedInAt: 'desc' },
    }),
  ]);

  return NextResponse.json({ farmer, trees, latestInspection, latestMonitoring, checkedInToday: !!todayCheckIn });
}
