export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const params   = new URL(req.url).searchParams;
    const farmerId = params.get('farmerId');
    const mobile   = params.get('mobile');
    const where    = farmerId ? { id: farmerId } : mobile ? { mobile } : null;
    if (!where) return NextResponse.json({ error: 'farmerId or mobile required' }, { status: 400 });

    const farmer = await prisma.farmer.findUnique({
      where: where as any,
      include: {
        lands:     {
          include: {
            documents:   { take: 10, orderBy: { createdAt: 'desc' } },
            plantations: { take: 5 },
          }
        },
        documents: { take: 20, orderBy: { createdAt: 'desc' } },
        payments:  { take: 10 },
        carbonCredits: { take: 5 },
        auditLogs: { take: 10, orderBy: { createdAt: 'desc' } },
        // Note: agreements fetched separately via /api/farmer/agreements
      },
    });

    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    // Stats
    const totalLandAcres      = farmer.lands.reduce((s, l) => s + (l.areaAcres || 0), 0);
    const totalTreesPlanted   = farmer.lands.reduce((s, l) => s + l.plantations.reduce((p, pl) => p + pl.treesPlanted, 0), 0);
    const totalTreesSurviving = farmer.lands.reduce((s, l) => s + l.plantations.reduce((p, pl) => p + pl.treesSurviving, 0), 0);
    const totalRevenue        = farmer.payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);
    const totalCO2            = farmer.carbonCredits.reduce((s, c) => s + (c.creditsIssued || 0), 0);

    return NextResponse.json({
      farmer,
      stats: { totalLandAcres, totalTreesPlanted, totalTreesSurviving, totalRevenue, totalCO2 }
    });
  } catch (e: any) {
    console.error('Profile API error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { farmerId, ...data } = await req.json();
    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    // Only allow safe fields to be updated via this endpoint
    const allowed = [
      'email','alternateMobile','occupation','isFarmer','farmingExperience',
      'village','taluka','district','state','pincode',
      'bankAccountName','bankName','accountNumber','ifscCode','cancelledChequeUrl',
      'nomineeName','nomineeRelation','nomineeDob','nomineeMobile','nomineeAddress','nomineeAadhaar',
      'registrationStep','draftData','status',
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
