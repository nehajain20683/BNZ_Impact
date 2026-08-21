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
      } as any,
    });

    return NextResponse.json({ success: true, land });
  } catch (e: any) {
    console.error('[farmer/land POST]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
