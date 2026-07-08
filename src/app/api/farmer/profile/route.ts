export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const params   = new URL(req.url).searchParams;
    const farmerId = params.get('farmerId');
    const mobile   = params.get('mobile');

    if (!farmerId && !mobile)
      return NextResponse.json({ error: 'farmerId or mobile required' }, { status: 400 });

    // Step 1: fetch just the farmer row — no joins
    const farmer = await prisma.farmer.findUnique({
      where: farmerId ? { id: farmerId } : { mobile: mobile! },
    });

    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    // Step 2: fetch lands separately (safe)
    const lands = await prisma.land.findMany({
      where: { farmerId: farmer.id },
      include: {
        landAssignments: {
          select: { speciesPlanted: true, driveLinks: true, treesPlanted: true, treesSurviving: true, stage: true }
        }
      }
    }).catch(() => []);

    // Step 3: fetch documents separately (safe)
    const documents = await prisma.farmerDocument.findMany({
      where: { farmerId: farmer.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const totalLandAcres = lands.reduce((s: number, l: any) => s + (l.areaAcres || 0), 0);

    return NextResponse.json({
      farmer: { ...farmer, lands, documents },
      stats:  { totalLandAcres, totalTreesPlanted: 0, totalTreesSurviving: 0, totalRevenue: 0, totalCO2: 0 },
    });

  } catch (e: any) {
    console.error('[profile] error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { farmerId, ...data } = await req.json();
    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    const allowed = [
      'email','alternateMobile','occupation','isFarmer','farmingExperience',
      'village','taluka','district','state','pincode',
      'bankAccountName','bankName','accountNumber','ifscCode',
      'nomineeName','nomineeRelation','nomineeDob','nomineeMobile','nomineeAddress','nomineeAadhaar',
      'registrationStep','status',
    ];
    const update: any = {};
    for (const k of allowed) {
      if (data[k] !== undefined) update[k] = data[k];
    }
    const farmer = await prisma.farmer.update({ where: { id: farmerId }, data: update });
    return NextResponse.json({ success: true, farmer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
