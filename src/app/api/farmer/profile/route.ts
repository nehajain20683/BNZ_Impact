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
        lands:     { include: { landAssignments: { select: { speciesPlanted: true, driveLinks: true, treesPlanted: true, treesSurviving: true, stage: true } } } },
        documents: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    const totalLandAcres = farmer.lands.reduce((s: number, l: any) => s + (l.areaAcres || 0), 0);

    return NextResponse.json({
      farmer,
      stats: { totalLandAcres, totalTreesPlanted: 0, totalTreesSurviving: 0, totalRevenue: 0, totalCO2: 0 },
    });
  } catch (e: any) {
    console.error('[profile GET]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body     = await req.json();
    const { farmerId, ...data } = body;
    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    const allowed = [
      'fullName','fatherName','gender','dob','aadhaarNumber','panNumber',
      'email','alternateMobile','occupation','farmingExperience','isFarmer',
      'village','taluka','district','state','pincode',
      'bankAccountName','bankName','accountNumber','ifscCode',
      'nomineeName','nomineeRelation','nomineeMobile','nomineeAddress','nomineeAadhaar',
      'registrationStep','status','draftData',
    ];

    const update: any = {};
    for (const k of allowed) {
      if (data[k] !== undefined) update[k] = data[k];
    }

    // Handle date fields safely — convert string to Date or null
    const dateFields = ['dob', 'nomineeDob'];
    for (const df of dateFields) {
      if (data[df] !== undefined) {
        if (data[df] && data[df] !== '') {
          try {
            update[df] = new Date(data[df]);
            // Validate it's a real date
            if (isNaN(update[df].getTime())) update[df] = null;
          } catch { update[df] = null; }
        } else {
          update[df] = null;
        }
      }
    }

    const farmer = await prisma.farmer.update({ where: { id: farmerId }, data: update });
    return NextResponse.json({ success: true, farmer });
  } catch (e: any) {
    console.error('[profile PATCH]', e.message);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
