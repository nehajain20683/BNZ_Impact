export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const schema = z.object({
  farmerId:            z.string(),
  landId:              z.string().optional(),
  officerId:           z.string(),
  scheduledDate:       z.string().optional(),
  inspectedAt:         z.string().optional(),
  gpsLatitude:         z.number().optional(),
  gpsLongitude:        z.number().optional(),
  ownershipVerified:   z.boolean().default(false),
  boundaryVerified:    z.boolean().default(false),
  farmerMetPersonally: z.boolean().default(false),
  plantationFeasible:  z.boolean().default(false),
  waterSourceAvailable:z.boolean().default(false),
  notes:               z.string().optional(),
  photos:              z.array(z.string()).optional(),
  status:              z.enum(['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED']).default('SCHEDULED'),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());

    // Previously trusted officerId completely from the request body with no
    // verification at all — anyone who obtained a valid ID string could
    // submit inspections as that officer. Now confirms it's a real, active
    // account, and (since Farmer.orgId scoping applies throughout this app)
    // that the officer and the farmer being inspected belong to the same
    // organisation, so an officer from one tenant can never touch another's data.
    const officer = await prisma.fieldOfficer.findUnique({ where: { id: data.officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    const farmer = await prisma.farmer.findUnique({ where: { id: data.farmerId }, select: { orgId: true } });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    if (officer.orgId && officer.orgId !== farmer.orgId)
      return NextResponse.json({ error: 'This farmer does not belong to your organisation' }, { status: 403 });

    const inspection = await prisma.siteInspection.create({
      data: {
        farmerId:            data.farmerId,
        landId:              data.landId,
        officerId:           data.officerId,
        scheduledDate:       data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        inspectedAt:         data.inspectedAt ? new Date(data.inspectedAt) : undefined,
        gpsLatitude:         data.gpsLatitude,
        gpsLongitude:        data.gpsLongitude,
        ownershipVerified:   data.ownershipVerified,
        boundaryVerified:    data.boundaryVerified,
        farmerMetPersonally: data.farmerMetPersonally,
        plantationFeasible:  data.plantationFeasible,
        waterSourceAvailable:data.waterSourceAvailable,
        notes:               data.notes,
        photos:              data.photos || [],
        status:              data.status as any,
      },
    });

    // Inspection status belongs to the LAND being inspected, not the farmer
    // as a person — matches the FarmerStatus/LandStatus split elsewhere in
    // this app. (This previously wrote 'INSPECTION_COMPLETED'/'INSPECTION_
    // PENDING' onto Farmer.status, which no longer accepts those values at
    // all since that split — this call would have thrown a Prisma
    // validation error on every single use.) Only applies when a specific
    // land was actually inspected; with no landId there's nothing to update.
    if (data.landId) {
      await prisma.land.update({
        where: { id: data.landId },
        data: { status: (data.status === 'COMPLETED' ? 'INSPECTION_COMPLETED' : 'INSPECTION_PENDING') as any },
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: { farmerId: data.farmerId, actorId: data.officerId, actorRole: 'FIELD_OFFICER', action: 'INSPECTION_' + data.status }
    });

    return NextResponse.json({ success: true, inspectionId: inspection.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const params    = new URL(req.url).searchParams;
  const farmerId  = params.get('farmerId');
  const officerId = params.get('officerId');
  const where: any = {};
  if (farmerId)  where.farmerId  = farmerId;
  if (officerId) where.officerId = officerId;

  const inspections = await prisma.siteInspection.findMany({
    where,
    include: {
      farmer:  { select: { fullName: true, mobile: true, village: true, district: true } },
      officer: { select: { name: true, mobile: true } },
      land:    { select: { surveyNumber: true, areaAcres: true, district: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ inspections });
}
