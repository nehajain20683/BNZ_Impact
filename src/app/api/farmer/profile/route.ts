export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { FARMER_LOCK_STATUS, isAtOrBeyondStage } from '@/lib/farmer-constants';

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

    // Once a farmer is fully "Registered" (personal + bank complete, identity
    // documents verified), self-service editing stops entirely — real
    // enforcement here, not just a disabled UI, since this route is
    // reachable directly. This route is farmer-only; Admin edits go through
    // separate admin-authenticated endpoints, so blocking everything here
    // when locked is always correct.
    const existingFarmer = await prisma.farmer.findUnique({ where: { id: farmerId }, select: { status: true, fullName: true } });
    if (existingFarmer && isAtOrBeyondStage(existingFarmer.status, FARMER_LOCK_STATUS)) {
      return NextResponse.json({
        error: 'Your registration is complete and can no longer be self-edited. Contact your administrator for changes.',
      }, { status: 403 });
    }

    // Name changes require Admin — once a farmer has completed registration
    // (fullName is no longer the 'Pending' placeholder), this route must not
    // let them change their own name. The UI already disables this field;
    // this is the real enforcement, since a disabled input alone is
    // trivially bypassed by calling the API directly.
    if (data.fullName !== undefined) {
      if (existingFarmer && existingFarmer.fullName !== 'Pending' && existingFarmer.fullName !== '') {
        delete data.fullName;
      }
    }

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

    // Handle date fields safely — 'dob' from the client maps to the
    // Farmer model's actual column name 'dateOfBirth'. This mismatch was
    // silently breaking every save that included a DOB (Prisma rejects
    // unknown fields), which is why DOB never persisted.
    const dateFieldMap: Record<string, string> = { dob: 'dateOfBirth', nomineeDob: 'nomineeDob' };
    for (const [clientKey, dbKey] of Object.entries(dateFieldMap)) {
      if (data[clientKey] !== undefined) {
        if (data[clientKey] && data[clientKey] !== '') {
          try {
            const d = new Date(data[clientKey]);
            update[dbKey] = isNaN(d.getTime()) ? null : d;
          } catch { update[dbKey] = null; }
        } else {
          update[dbKey] = null;
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
