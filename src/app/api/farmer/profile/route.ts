export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FARMER_LITE, LAND_LITE, DOCUMENT_LITE } from '@/lib/lite-select';
import { FARMER_LOCK_STATUS, isAtOrBeyondStage } from '@/lib/farmer-constants';
import { getPublicUrl } from '@/lib/supabase-storage';

export async function GET(req: Request) {
  try {
    const params   = new URL(req.url).searchParams;
    const farmerId = params.get('farmerId');
    const mobile   = params.get('mobile');

    if (!farmerId && !mobile)
      return NextResponse.json({ error: 'farmerId or mobile required' }, { status: 400 });

    const where = farmerId ? { id: farmerId } : { mobile };

    // The farmer dashboard and registration pages call this on every visit and never
    // read the documents or land photos out of it — yet it used to return up to 20
    // uploaded documents AND every land photo (all base64). Admins (the one caller
    // that does use them) still get the full payload; everyone else gets the same
    // shape without the files.
    const session = await getServerSession(authOptions);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((session?.user as any)?.role);
    const assignedOfficer = { select: { id: true, name: true, mobile: true, designation: true } };
    const farmer = await prisma.farmer.findUnique({
      where: where as any,
      // Every column EXCEPT the photo (served from its own URL below).
      select: ({
        ...FARMER_LITE,
        ...(isAdmin
          ? { lands: true, documents: { take: 20, orderBy: { createdAt: 'desc' } }, assignedOfficer }
          : { lands: { select: LAND_LITE }, documents: { take: 20, orderBy: { createdAt: 'desc' }, select: DOCUMENT_LITE }, assignedOfficer }),
      }) as any,
    }) as any;

    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    // Only the admin branch returns land photos (everyone else gets the photo-free version).
    if (isAdmin && Array.isArray(farmer.lands)) {
      farmer.lands = farmer.lands.map((l: any) => ({ ...l, photos: (l.photos || []).map((p: string) => getPublicUrl('land-photos', p)).filter(Boolean) }));
    }

    // The photo is returned as a URL (existence checked without reading the image itself).
    const hasPhoto = await prisma.farmer.findFirst({ where: { id: farmer.id, photo: { not: null } }, select: { id: true } });
    farmer.photo = hasPhoto ? `/api/farmer/photo/${farmer.id}?v=${+new Date(farmer.updatedAt)}` : null;

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

    // photo may only ever be set by a genuine NEW image upload (an image data URL, size-capped). The
    // dashboard now displays the photo from a URL, so anything else — that URL, text, HTML — must never
    // be written into the column (the same trap the Land page fell into).
    if (data.photo !== undefined && !(typeof data.photo === 'string' && /^data:image\/(png|jpe?g|webp);base64,/i.test(data.photo) && data.photo.length <= 4_000_000)) delete data.photo;

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
      'fullName', 'fatherName', 'gender', 'occupation', 'farmingExperience',
      'alternateMobile', 'email', 'photo',
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
