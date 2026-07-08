export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const schema = z.object({
  farmerId:            z.string(),
  surveyGutNumber:     z.string().optional(),
  surveyNumber:        z.string().optional(), // backward compat
  gutNumber:           z.string().optional(), // backward compat
  khataNumber:         z.string().optional(),
  areaAcres:           z.union([z.number(), z.string()]).optional().transform(v => v === "" || v === undefined ? undefined : Number(v)),
  areaOfferedAcres:    z.union([z.number(), z.string()]).optional().transform(v => v === "" || v === undefined ? undefined : Number(v)),
  areaOfferedUnit:     z.string().optional(),
  landType:            z.string().optional(),
  gpsLatitude:         z.union([z.number(), z.string()]).optional().transform(v => v === "" || v === undefined ? undefined : Number(v)),
  gpsLongitude:        z.union([z.number(), z.string()]).optional().transform(v => v === "" || v === undefined ? undefined : Number(v)),
  polygonGeoJson:      z.any().optional(),
  village:             z.string().optional(),
  taluka:              z.string().optional(),
  district:            z.string().optional(),
  state:               z.string().optional(),
  pincode:             z.string().optional(),
  waterAvailability:   z.string().optional(),
  securityStatus:      z.string().optional(),
  ownershipType:       z.string().optional(),
  jointOwnerCount:     z.union([z.number(), z.string()]).optional().transform(v => v === "" || v === undefined ? undefined : Number(v)),
  plantationPreference:z.string().optional(),
  speciesPreference:   z.array(z.string()).optional(),
  targetTreeCount:     z.union([z.number(), z.string()]).optional().transform(v => v === "" || v === undefined ? undefined : Number(v)),
  plantationStartDate: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    // Merge surveyGutNumber into surveyNumber for backward compat
    const surveyNum = data.surveyGutNumber || data.surveyNumber;

    const land = await prisma.land.create({
      data: {
        farmerId:            data.farmerId,
        surveyGutNumber:     data.surveyGutNumber,
        surveyNumber:        surveyNum,
        gutNumber:           data.gutNumber,
        khataNumber:         data.khataNumber,
        areaAcres:           data.areaAcres,
        areaHectares:        data.areaAcres ? data.areaAcres * 0.404686 : undefined,
        areaOfferedAcres:    data.areaOfferedAcres,
        areaOfferedUnit:     data.areaOfferedUnit,
        landType:            data.landType as any,
        gpsLatitude:         data.gpsLatitude,
        gpsLongitude:        data.gpsLongitude,
        polygonGeoJson:      data.polygonGeoJson,
        village:             data.village,
        taluka:              data.taluka,
        district:            data.district,
        state:               data.state,
        pincode:             data.pincode,
        ownershipType:       data.ownershipType,
        jointOwnerCount:     data.jointOwnerCount,
        plantationPreference:data.plantationPreference as any,
        speciesPreference:   data.speciesPreference || [],
        targetTreeCount:     data.targetTreeCount,
        plantationStartDate: data.plantationStartDate ? new Date(data.plantationStartDate) : undefined,
      },
    });
    await prisma.farmer.update({
      where: { id: data.farmerId },
      data:  { status: 'DOCUMENTS_PENDING' },
    });
    await prisma.auditLog.create({
      data: { farmerId: data.farmerId, actorRole: 'FARMER', action: 'LAND_ADDED', details: { landId: land.id } }
    }).catch(() => {});
    return NextResponse.json({ success: true, landId: land.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const params   = new URL(req.url).searchParams;
  const farmerId = params.get('farmerId');
  const mobile   = params.get('mobile');

  if (!farmerId && !mobile)
    return NextResponse.json({ error: 'farmerId or mobile required' }, { status: 400 });

  // Resolve farmerId from mobile if needed
  let resolvedFarmerId = farmerId;
  if (!resolvedFarmerId && mobile) {
    const farmer = await prisma.farmer.findUnique({ where: { mobile } });
    resolvedFarmerId = farmer?.id || null;
  }
  if (!resolvedFarmerId)
    return NextResponse.json({ lands: [] });

  const lands = await prisma.land.findMany({
    where: { farmerId: resolvedFarmerId },
    include: { documents: { take: 10 } },
  });
  return NextResponse.json({ lands });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { landId, ownershipType, jointOwnerCount, nocUploaded } = body;
    if (!landId) return NextResponse.json({ error: 'landId required' }, { status: 400 });
    const land = await prisma.land.update({
      where: { id: landId },
      data: {
        ownershipType:   ownershipType || undefined,
        jointOwnerCount: jointOwnerCount || undefined,
        nocUploaded:     nocUploaded ?? undefined,
      },
    });
    return NextResponse.json({ success: true, land });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
