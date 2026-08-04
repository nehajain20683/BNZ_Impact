export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';
import crypto from 'crypto';

function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function hashOTP(otp: string) { return crypto.createHash('sha256').update(otp).digest('hex'); }

export async function POST(req: Request) {
  try {
    const { mobile, otp, action } = await req.json();
    const org = await resolveTenantFromRequest(req);

    if (action === 'send') {
      if (!mobile) return NextResponse.json({ error: 'Mobile required' }, { status: 400 });
      const otpCode = generateOTP();
      const expiry  = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await prisma.farmer.upsert({
        where:  { mobile: `+91${mobile.replace(/\D/g,'')}` },
        update: { otpHash: hashOTP(otpCode), otpExpiry: expiry },
        create: {
          mobile:   `+91${mobile.replace(/\D/g,'')}`,
          fullName: 'Pending',
          otpHash:  hashOTP(otpCode),
          otpExpiry: expiry,
          orgId:    org.id,   // ← assign to correct org
        },
      });

      // TODO: Send via MSG91 SMS
      console.log(`OTP for ${mobile}: ${otpCode}`); // remove in production
      return NextResponse.json({ success: true, message: 'OTP sent' });
    }

    if (action === 'verify') {
      if (!mobile || !otp) return NextResponse.json({ error: 'Mobile and OTP required' }, { status: 400 });
      const mobileFormatted = `+91${mobile.replace(/\D/g,'')}`;
      const farmer = await prisma.farmer.findUnique({ where: { mobile: mobileFormatted } });

      if (!farmer?.otpHash || !farmer?.otpExpiry)
        return NextResponse.json({ error: 'OTP not found. Please request again.' }, { status: 400 });
      if (new Date() > farmer.otpExpiry)
        return NextResponse.json({ error: 'OTP expired. Please request again.' }, { status: 400 });
      // TEST BYPASS: accept 123456 as universal OTP during development
      const isTestOtp = otp === '123456';
      if (!isTestOtp && farmer.otpHash !== hashOTP(otp))
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });

      await prisma.farmer.update({
        where: { mobile: mobileFormatted },
        data:  { otpHash: null, otpExpiry: null, orgId: org.id }, // ensure orgId set
      });

      const isProfileComplete = farmer.fullName !== 'Pending' && farmer.fullName !== '';
      const token = Buffer.from(JSON.stringify({
        farmerId: farmer.id, mobile: mobileFormatted, role: 'FARMER',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })).toString('base64');

      return NextResponse.json({ success: true, token, farmerId: farmer.id, isProfileComplete });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('OTP error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
