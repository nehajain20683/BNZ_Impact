export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const farmerId = new URL(req.url).searchParams.get('farmerId');
    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    const lands = await prisma.land.findMany({
      where:   { farmerId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ lands });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { farmerId, landPhotoBase64, kmlPhotoBase64, kmlFileName, ...landData } = body;

    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    // Verify farmer exists
    const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    // Build photos array for storage
    const photos: string[] = [];
    if (landPhotoBase64) photos.push(landPhotoBase64);
    if (kmlPhotoBase64)  photos.push(kmlPhotoBase64);

    const land = await prisma.land.create({
      data: {
        farmerId,
        orgId:            farmer.orgId,
        surveyGutNumber:  landData.surveyGutNumber  || null,
        khataNumber:      landData.khataNumber      || null,
        areaAcres:        landData.areaAcres        ? parseFloat(landData.areaAcres)        : null,
        areaOfferedAcres: landData.areaOfferedAcres ? parseFloat(landData.areaOfferedAcres) : null,
        landType:         landData.landType         || null,
        currentLandUse:   landData.currentLandUse   || null,
        village:          landData.village          || null,
        taluka:           landData.taluka           || null,
        district:         landData.district         || null,
        state:            landData.state            || 'Maharashtra',
        pincode:          landData.pincode          || null,
        gpsLatitude:      landData.gpsLatitude      ? parseFloat(landData.gpsLatitude)      : null,
        gpsLongitude:     landData.gpsLongitude     ? parseFloat(landData.gpsLongitude)     : null,
        waterAvailability:landData.waterAvailability|| null,
        securityStatus:   landData.securityStatus   || null,
        photos:           photos.length ? photos : [],
        kmlFileName:      kmlFileName || null,
        ownershipType:    landData.ownershipType    || 'sole',
        jointOwnerCount:  landData.jointOwnerCount  ? parseInt(landData.jointOwnerCount) : null,
      } as any,
    });

    return NextResponse.json({ success: true, land });
  } catch (e: any) {
    console.error('[farmer/land POST]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — edit an existing land parcel. Blocked once an admin has verified
// it, since the approved record is what downstream site assignment relies on.
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { landId, farmerId, landPhotoBase64, kmlPhotoBase64, kmlFileName, ...landData } = body;

    if (!landId || !farmerId) return NextResponse.json({ error: 'landId and farmerId are required' }, { status: 400 });

    const existing = await prisma.land.findUnique({ where: { id: landId } });
    if (!existing) return NextResponse.json({ error: 'Land parcel not found' }, { status: 404 });
    if (existing.farmerId !== farmerId) return NextResponse.json({ error: 'Not authorised to edit this land parcel' }, { status: 403 });
    if (existing.verified)
      return NextResponse.json({ error: 'This land parcel has been approved and can no longer be edited. Contact your field officer for changes.' }, { status: 400 });

    const photos = [
      landPhotoBase64 || existing.photos?.[0] || null,
      kmlPhotoBase64  || existing.photos?.[1] || null,
    ].filter((p): p is string => !!p);

    const land = await prisma.land.update({
      where: { id: landId },
      data: {
        surveyGutNumber:  landData.surveyGutNumber  ?? existing.surveyGutNumber,
        khataNumber:      landData.khataNumber      ?? existing.khataNumber,
        areaAcres:        landData.areaAcres        ? parseFloat(landData.areaAcres)        : existing.areaAcres,
        areaOfferedAcres: landData.areaOfferedAcres ? parseFloat(landData.areaOfferedAcres) : existing.areaOfferedAcres,
        landType:         landData.landType         ?? existing.landType,
        currentLandUse:   landData.currentLandUse   ?? existing.currentLandUse,
        village:          landData.village          ?? existing.village,
        taluka:           landData.taluka           ?? existing.taluka,
        district:         landData.district         ?? existing.district,
        state:            landData.state            ?? existing.state,
        pincode:          landData.pincode          ?? existing.pincode,
        gpsLatitude:      landData.gpsLatitude      ? parseFloat(landData.gpsLatitude)      : existing.gpsLatitude,
        gpsLongitude:     landData.gpsLongitude     ? parseFloat(landData.gpsLongitude)     : existing.gpsLongitude,
        waterAvailability:landData.waterAvailability?? existing.waterAvailability,
        securityStatus:   landData.securityStatus   ?? existing.securityStatus,
        photos,
        kmlFileName:      kmlFileName ?? existing.kmlFileName,
        speciesPreference: Array.isArray(landData.speciesPreference) ? landData.speciesPreference : existing.speciesPreference,
        plantationPreference: landData.plantationPreference ?? existing.plantationPreference,
        plantationTypeOtherText: landData.plantationTypeOtherText ?? existing.plantationTypeOtherText,
        targetTreeCount:  landData.targetTreeCount  ? parseInt(landData.targetTreeCount)  : existing.targetTreeCount,
        ownershipType:    landData.ownershipType    ?? existing.ownershipType,
        jointOwnerCount:  landData.jointOwnerCount  !== undefined
          ? (landData.jointOwnerCount ? parseInt(landData.jointOwnerCount) : null)
          : existing.jointOwnerCount,
      } as any,
    });

    return NextResponse.json({ success: true, land });
  } catch (e: any) {
    console.error('[farmer/land PATCH]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
