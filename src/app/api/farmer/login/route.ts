export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function hashOTP(otp: string) { return crypto.createHash('sha256').update(otp).digest('hex'); }
function makeToken(farmer: any) {
  return Buffer.from(JSON.stringify({
    farmerId: farmer.id, mobile: farmer.mobile, role: 'FARMER',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString('base64');
}

// POST /api/farmer/login
// action: 'password' | 'otp_send' | 'otp_verify' | 'forgot_send' | 'forgot_verify' | 'reset'
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, mobile, password, otp, newPassword } = body;

    if (!mobile) return NextResponse.json({ error: 'Mobile number required' }, { status: 400 });
    const normalMobile = '+91' + mobile.replace(/^(\+91|91)/, '');

    const farmer = await prisma.farmer.findUnique({ where: { mobile: normalMobile } });

    // ── Password Login ──────────────────────────────────────
    if (action === 'password') {
      if (!farmer)
        return NextResponse.json({ error: 'No account found. Please register first.', code: 'NO_ACCOUNT' }, { status: 404 });
      if (!farmer.password)
        return NextResponse.json({
          error: 'No password has been set for this account. Continue with OTP or create a password.',
          code: 'NO_PASSWORD',
        }, { status: 400 });
      if (!farmer.fullName || farmer.fullName === 'Pending')
        return NextResponse.json({ error: 'Please complete your registration first.', code: 'INCOMPLETE' }, { status: 400 });

      const match = await bcrypt.compare(password, farmer.password);
      if (!match)
        return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });

      await prisma.farmer.update({ where: { id: farmer.id }, data: { lastLoginAt: new Date() } });
      await prisma.auditLog.create({ data: { farmerId: farmer.id, actorRole: 'FARMER', action: 'LOGIN_PASSWORD' } }).catch(()=>{});

      return NextResponse.json({ success: true, token: makeToken(farmer), farmerId: farmer.id, farmerName: farmer.fullName });
    }

    // ── OTP Send ────────────────────────────────────────────
    if (action === 'otp_send' || action === 'forgot_send') {
      if (!farmer)
        return NextResponse.json({ error: 'No account found with this mobile number.' }, { status: 404 });

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry  = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.farmer.update({
        where: { id: farmer.id },
        data:  { otpHash: hashOTP(otpCode), otpExpiry: expiry },
      });

      // TODO: Send via MSG91 in production
      console.log(`[OTP] ${normalMobile}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your mobile',
        devOtp:  process.env.NODE_ENV !== 'production' ? otpCode : undefined,
      });
    }

    // ── OTP Verify ──────────────────────────────────────────
    if (action === 'otp_verify') {
      if (!farmer?.otpHash || !farmer?.otpExpiry)
        return NextResponse.json({ error: 'No OTP requested' }, { status: 400 });
      if (new Date() > farmer.otpExpiry)
        return NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 });
      if (farmer.otpHash !== hashOTP(otp))
        return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });

      await prisma.farmer.update({ where: { id: farmer.id }, data: { otpHash: null, otpExpiry: null, lastLoginAt: new Date() } });
      await prisma.auditLog.create({ data: { farmerId: farmer.id, actorRole: 'FARMER', action: 'LOGIN_OTP' } }).catch(()=>{});

      return NextResponse.json({ success: true, token: makeToken(farmer), farmerId: farmer.id, farmerName: farmer.fullName });
    }

    // ── Forgot: verify OTP then reset ──────────────────────
    if (action === 'forgot_verify') {
      if (!farmer?.otpHash || !farmer?.otpExpiry)
        return NextResponse.json({ error: 'No OTP requested' }, { status: 400 });
      if (new Date() > farmer.otpExpiry)
        return NextResponse.json({ error: 'OTP expired.' }, { status: 400 });
      if (farmer.otpHash !== hashOTP(otp))
        return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });
      return NextResponse.json({ success: true, verified: true });
    }

    if (action === 'reset') {
      if (!newPassword || newPassword.length < 8)
        return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
      if (!farmer?.otpHash)
        return NextResponse.json({ error: 'Session expired. Please start over.' }, { status: 400 });
      if (farmer.otpHash !== hashOTP(otp))
        return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.farmer.update({ where: { id: farmer!.id }, data: { password: hashed, otpHash: null, otpExpiry: null } });
      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
