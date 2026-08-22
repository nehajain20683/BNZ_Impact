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

    const where = farmerId ? { id: farmerId } : { mobile };

    const farmer = await prisma.farmer.findUnique({
      where: where as any,
      include: {
        lands:     true,
        documents: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    const totalLandAcres = farmer.lands.reduce((s: number, l: any) => s + (l.areaAcres || 0), 0);
    return NextResponse.json({ farmer, stats: { totalLandAcres } });
  } catch (e: any) {
    console.error('[profile GET]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { farmerId, ...data } = body;

    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    // Map ALL possible field names from register page → DB column names
    // Register page sends: aadhaar → DB has: aadhaarNumber
    const fieldMap: Record<string,string> = {
      'aadhaar':      'aadhaarNumber',
      'pan':          'panNumber',
    };

    // Build update object - only include fields that are in the schema
    const allowed = [
      'fullName', 'fatherName', 'gender', 'occupation',
      'alternateMobile', 'email',
      'aadhaarNumber', 'panNumber',
      'bankAccountName', 'bankName', 'accountNumber', 'ifscCode',
      'nomineeName', 'nomineeRelation', 'nomineeMobile',
      'nomineeAddress', 'nomineeAadhaar',
      'village', 'taluka', 'district', 'state', 'pincode',
      'registrationStep', 'status', 'speciesPreference',
    ];

    const update: any = {};

    for (const [key, val] of Object.entries(data)) {
      // Map old field names to correct ones
      const mappedKey = fieldMap[key] || key;
      if (allowed.includes(mappedKey) && val !== undefined) {
        // Skip empty strings for optional fields (don't overwrite with empty)
        update[mappedKey] = val;
      }
    }

    // Handle date fields safely
    for (const df of ['dob', 'nomineeDob']) {
      if (data[df] !== undefined) {
        if (data[df] && data[df] !== '') {
          try {
            const d = new Date(data[df]);
            update[df] = isNaN(d.getTime()) ? null : d;
          } catch { update[df] = null; }
        } else {
          update[df] = null;
        }
      }
    }

    // Only update if there's something to update
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' });
    }

    const farmer = await prisma.farmer.update({
      where: { id: farmerId },
      data:  update,
    });

    return NextResponse.json({ success: true, farmer });
  } catch (e: any) {
    console.error('[profile PATCH]', e.message, 'Data:', JSON.stringify(e));
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
