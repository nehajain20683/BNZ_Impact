export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// The 123456 bypass exists purely to make local testing possible without a
// real SMS provider wired up. It must never be reachable in production —
// gating it here (not just hiding the UI hint) is what actually matters.
const TEST_OTP = process.env.NODE_ENV !== 'production' ? '123456' : null;

function hashOTP(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function isCompleteProfile(farmer: any) {
  return farmer.fullName !== 'Pending' && farmer.fullName !== '' && (farmer.registrationStep || 0) >= 8;
}

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const { mobile, otp, action, password, purpose } = body;
    const org    = await resolveTenantFromRequest(req);
    const mobile_formatted = `+91${mobile.replace(/\D/g,'')}`;

    // ── SEND OTP ──────────────────────────────────────────────
    if (action === 'send') {
      if (!mobile) return NextResponse.json({ error: 'Mobile required' }, { status: 400 });

      // Registration flow only: don't silently re-send an OTP over an
      // already-complete account — tell the caller so the UI can offer
      // login instead, rather than creating confusion mid-registration.
      if (purpose === 'register') {
        const existing = await prisma.farmer.findUnique({ where: { mobile: mobile_formatted } });
        if (existing && isCompleteProfile(existing)) {
          return NextResponse.json({
            error: 'An account already exists with this mobile number.',
            code: 'ACCOUNT_EXISTS',
          }, { status: 409 });
        }
      }

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
        _testOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
      });
    }

    // ── REGISTER WITH PASSWORD (no OTP) ────────────────────────
    if (action === 'register_password') {
      if (!mobile || !password) return NextResponse.json({ error: 'Mobile and password required' }, { status: 400 });
      if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

      const existing = await prisma.farmer.findUnique({ where: { mobile: mobile_formatted } });
      if (existing && isCompleteProfile(existing)) {
        return NextResponse.json({
          error: 'An account already exists with this mobile number.',
          code: 'ACCOUNT_EXISTS',
        }, { status: 409 });
      }

      const hash = await bcrypt.hash(password, 10);
      const farmer = await prisma.farmer.upsert({
        where:  { mobile: mobile_formatted },
        update: { password: hash },
        create: { mobile: mobile_formatted, fullName: 'Pending', password: hash, orgId: org.id },
      });

      return NextResponse.json({ success: true, farmerId: farmer.id, isProfileComplete: false });
    }

    // ── VERIFY OTP ────────────────────────────────────────────
    if (action === 'verify') {
      if (!mobile || !otp) return NextResponse.json({ error: 'Mobile and OTP required' }, { status: 400 });

      const farmer = await prisma.farmer.findUnique({ where: { mobile: mobile_formatted } });

      if (!farmer) return NextResponse.json({ error: 'Mobile not registered. Please register first.' }, { status: 404 });

      const isTestOtp = TEST_OTP !== null && otp === TEST_OTP;

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

      const isProfileComplete = isCompleteProfile(farmer);

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
