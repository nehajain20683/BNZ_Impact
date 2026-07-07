export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateFarmerId, generateGisId } from '@/lib/farmer-id';

function sanitize(data: any) {
  const clean: any = {};
  for (const [k, v] of Object.entries(data)) {
    clean[k] = v === '' || v === null ? undefined : v;
  }
  if (clean.dateOfBirth) {
    const p = new Date(clean.dateOfBirth);
    clean.dateOfBirth = isNaN(p.getTime()) ? undefined : p;
  } else { clean.dateOfBirth = undefined; }
  if (clean.nomineeDob) {
    const p = new Date(clean.nomineeDob);
    clean.nomineeDob = isNaN(p.getTime()) ? undefined : p;
  } else { clean.nomineeDob = undefined; }
  return clean;
}

const schema = z.object({
  mobile:          z.string().min(10).max(13),
  fullName:        z.string().min(2),
  fatherName:      z.string().optional(),
  dateOfBirth:     z.string().optional(),
  gender:          z.enum(['MALE','FEMALE','OTHER']).optional(),
  aadhaarNumber:   z.string().optional(),
  panNumber:       z.string().optional(),
  email:           z.string().optional().transform(v => v === '' ? undefined : v),
  alternateMobile: z.string().optional(),
  occupation:      z.string().optional(),
  isFarmer:        z.boolean().optional(),
  farmingExperience: z.string().optional(),
  village:         z.string().optional(),
  taluka:          z.string().optional(),
  district:        z.string().optional(),
  state:           z.string().optional(),
  pincode:         z.string().optional(),
  carbonConsent:   z.boolean().default(false),
  // Bank
  bankAccountName: z.string().optional(),
  bankName:        z.string().optional(),
  accountNumber:   z.string().optional(),
  ifscCode:        z.string().optional(),
  // Nominee
  nomineeName:     z.string().optional(),
  nomineeRelation: z.string().optional(),
  nomineeDob:      z.string().optional(),
  nomineeMobile:   z.string().optional(),
  nomineeAddress:  z.string().optional(),
  nomineeAadhaar:  z.string().optional(),
  // Registration step for progress tracking
  registrationStep: z.number().optional(),
  password:        z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const raw  = await req.json();
    const data = schema.parse(raw);
    const safe = sanitize(data);

    // Hash password if provided
    if (safe.password) {
      safe.password = await bcrypt.hash(safe.password, 12);
    }

    const existing = await prisma.farmer.findUnique({ where: { mobile: data.mobile } });

    // Generate Farmer ID and GIS ID for new approved registrations
    let farmerIdGenerated = existing?.farmerIdGenerated;
    let gisId             = existing?.gisId;
    if (!farmerIdGenerated && safe.state && safe.district) {
      farmerIdGenerated = await generateFarmerId(safe.state, safe.district);
      gisId             = generateGisId(farmerIdGenerated);
    }

    const saveData = {
      fullName:          safe.fullName,
      fatherName:        safe.fatherName,
      dateOfBirth:       safe.dateOfBirth,
      gender:            safe.gender,
      aadhaarNumber:     safe.aadhaarNumber,
      panNumber:         safe.panNumber,
      email:             safe.email,
      alternateMobile:   safe.alternateMobile,
      occupation:        safe.occupation,
      isFarmer:          safe.isFarmer,
      farmingExperience: safe.farmingExperience,
      village:           safe.village,
      taluka:            safe.taluka,
      district:          safe.district,
      state:             safe.state,
      pincode:           safe.pincode,
      carbonConsent:     safe.carbonConsent,
      bankAccountName:   safe.bankAccountName,
      bankName:          safe.bankName,
      accountNumber:     safe.accountNumber,
      ifscCode:          safe.ifscCode,
      nomineeName:       safe.nomineeName,
      nomineeRelation:   safe.nomineeRelation,
      nomineeDob:        safe.nomineeDob,
      nomineeMobile:     safe.nomineeMobile,
      nomineeAddress:    safe.nomineeAddress,
      nomineeAadhaar:    safe.nomineeAadhaar,
      registrationStep:  safe.registrationStep || 1,
      ...(safe.password ? { password: safe.password } : {}),
      ...(farmerIdGenerated ? { farmerIdGenerated, gisId } : {}),
    };

    const farmer = await prisma.farmer.upsert({
      where:  { mobile: data.mobile },
      update: { ...saveData, status: 'DOCUMENTS_PENDING' },
      create: { ...saveData, mobile: data.mobile, status: 'REGISTERED' },
    });

    await prisma.auditLog.create({
      data: { farmerId: farmer.id, actorRole: 'FARMER', action: 'PROFILE_UPDATED',
              details: { step: safe.registrationStep } }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      farmerId: farmer.id,
      farmerIdGenerated: farmer.farmerIdGenerated,
      gisId:    farmer.gisId,
      status:   farmer.status,
    });
  } catch (e: any) {
    console.error('Farmer register error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
