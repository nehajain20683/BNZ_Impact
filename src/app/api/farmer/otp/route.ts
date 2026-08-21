export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';
import crypto from 'crypto';

const TEST_OTP = '123456';

function hashOTP(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const { mobile, otp, action } = body;
    const org    = await resolveTenantFromRequest(req);
    const mobile_formatted = `+91${mobile.replace(/\D/g,'')}`;

    // ── SEND OTP ──────────────────────────────────────────────
    if (action === 'send') {
      if (!mobile) return NextResponse.json({ error: 'Mobile required' }, { status: 400 });

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry  = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.farmer.upsert({
        where:  { mobile: mobile_formatted },
        update: { otpHash: hashOTP(otpCode), otpExpiry: expiry },
        create: {
          mobile:    mobile_formatted,
          fullName:  'Pending',
          otpHash:   hashOTP(otpCode),
          otpExpiry: expiry,
          orgId:     org.id,
        },
      });

      // TODO: Send via MSG91
      console.log(`[OTP] ${mobile_formatted}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        message: 'OTP sent',
        // Remove this in production:
        _testOtp: otpCode,
      });
    }

    // ── VERIFY OTP ────────────────────────────────────────────
    if (action === 'verify') {
      if (!mobile || !otp) return NextResponse.json({ error: 'Mobile and OTP required' }, { status: 400 });

      const farmer = await prisma.farmer.findUnique({ where: { mobile: mobile_formatted } });

      if (!farmer) return NextResponse.json({ error: 'Mobile not registered. Please register first.' }, { status: 404 });

      // ✅ TEST BYPASS — always accept 123456
      const isTestOtp = otp === TEST_OTP;

      if (!isTestOtp) {
        if (!farmer.otpHash || !farmer.otpExpiry)
          return NextResponse.json({ error: 'OTP not found. Request a new one.' }, { status: 400 });
        if (new Date() > farmer.otpExpiry)
          return NextResponse.json({ error: 'OTP expired. Request a new one.' }, { status: 400 });
        if (farmer.otpHash !== hashOTP(otp))
          return NextResponse.json({ error: 'Incorrect OTP. Try again.' }, { status: 400 });
      }

      // Clear OTP after successful verify
      await prisma.farmer.update({
        where: { mobile: mobile_formatted },
        data:  { otpHash: null, otpExpiry: null, orgId: farmer.orgId || org.id },
      });

      // Check if profile is complete (fullName not 'Pending' and registrationStep >= 8)
      const isProfileComplete =
        farmer.fullName !== 'Pending' &&
        farmer.fullName !== '' &&
        (farmer as any).registrationStep >= 8;

      return NextResponse.json({
        success:           true,
        farmerId:          farmer.id,
        isProfileComplete,
        registrationStep:  (farmer as any).registrationStep || 0,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('[OTP]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
