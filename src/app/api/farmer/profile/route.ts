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

    // Fetch farmer core data — minimal includes to avoid timeout
    const farmer = await prisma.farmer.findUnique({
      where: where as any,
      include: {
        lands:     true,   // just the land rows, no nested relations
        documents: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    // Fetch payments and stats separately with error isolation
    let payments:      any[] = [];
    let carbonCredits: any[] = [];
    let auditLogs:     any[] = [];

    try {
      payments = await prisma.farmerPayment.findMany({
        where: { farmerId: farmer.id }, take: 10,
      });
    } catch (_) {}

    try {
      carbonCredits = await prisma.carbonCredit.findMany({
        where: { farmerId: farmer.id }, take: 5,
      });
    } catch (_) {}

    try {
      auditLogs = await prisma.auditLog.findMany({
        where: { farmerId: farmer.id }, take: 10, orderBy: { createdAt: 'desc' },
      });
    } catch (_) {}

    // Stats
    const totalLandAcres      = farmer.lands.reduce((s, l) => s + (l.areaAcres || 0), 0);
    const totalRevenue        = payments.filter((p: any) => p.status === 'COMPLETED').reduce((s: number, p: any) => s + p.amount, 0);
    const totalCO2            = carbonCredits.reduce((s: number, c: any) => s + (c.creditsIssued || 0), 0);

    return NextResponse.json({
      farmer: { ...farmer, payments, carbonCredits, auditLogs },
      stats:  { totalLandAcres, totalTreesPlanted: 0, totalTreesSurviving: 0, totalRevenue, totalCO2 },
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
