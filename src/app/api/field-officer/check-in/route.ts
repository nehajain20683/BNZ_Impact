export const runtime = 'nodejs';
// src/app/api/field-officer/check-in/route.ts
// The "Farm Visit" arrival step from the spec: GPS + arrival time + arrival
// photo, checked against the farmer's registered land GPS within the org's
// configured geofence radius. Not a hard block when outside it — see the
// schema comment on FarmCheckIn for why — but the pass/fail state and any
// override are always recorded, so admin has a real, honest record of
// which check-ins were GPS-verified.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { officerId, farmerId, latitude, longitude, arrivalPhoto, overridden } = body;

    if (!officerId || !farmerId)
      return NextResponse.json({ error: 'officerId and farmerId are required' }, { status: 400 });

    const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      select: { orgId: true, assignedOfficerId: true, lands: { select: { gpsLatitude: true, gpsLongitude: true } } },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    if (officer.orgId && officer.orgId !== farmer.orgId)
      return NextResponse.json({ error: 'This farmer does not belong to your organisation' }, { status: 403 });
    if (farmer.assignedOfficerId !== officer.id)
      return NextResponse.json({ error: 'This farmer is not assigned to you.' }, { status: 403 });

    const org = await prisma.organization.findUnique({ where: { id: farmer.orgId! }, select: { geofence_radius_meters: true } });
    const radius = org?.geofence_radius_meters ?? 200;

    const land = farmer.lands.find(l => l.gpsLatitude != null);
    let distance: number | undefined;
    let withinGeofence = false;
    if (land?.gpsLatitude != null && typeof latitude === 'number' && typeof longitude === 'number') {
      distance = distanceMeters(latitude, longitude, land.gpsLatitude, land.gpsLongitude!);
      withinGeofence = distance <= radius;
    }

    // If outside the geofence, an explicit override flag is required to
    // proceed — the officer has to actively confirm, not silently pass.
    if (distance !== undefined && !withinGeofence && !overridden) {
      return NextResponse.json({
        error: 'Outside geofence', requiresOverride: true, distanceMeters: distance, radiusMeters: radius,
      }, { status: 409 });
    }

    const checkIn = await prisma.farmCheckIn.create({
      data: {
        farmerId, officerId: officer.id,
        gpsLat: typeof latitude === 'number' ? latitude : undefined,
        gpsLng: typeof longitude === 'number' ? longitude : undefined,
        distanceMeters: distance, withinGeofence,
        overridden: !withinGeofence && !!overridden,
        arrivalPhoto: arrivalPhoto || undefined,
      },
    });

    return NextResponse.json({ success: true, checkIn });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const farmerId = params.get('farmerId');
  const officerId = params.get('officerId');
  if (!farmerId || !officerId) return NextResponse.json({ error: 'farmerId and officerId are required' }, { status: 400 });

  const todayCheckIn = await prisma.farmCheckIn.findFirst({
    where: { farmerId, officerId, checkedInAt: { gte: startOfDay(new Date()) } },
    orderBy: { checkedInAt: 'desc' },
  });

  return NextResponse.json({ checkedInToday: !!todayCheckIn, checkIn: todayCheckIn });
}
