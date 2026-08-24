export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { getOrgConfig } from '@/lib/tenant';

function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function hashOTP(otp: string) { return crypto.createHash('sha256').update(otp).digest('hex'); }

// POST /api/auth/forgot-password
// Step 1: send OTP  { action: 'send', email }
// Step 2: verify    { action: 'verify', email, otp }
// Step 3: reset     { action: 'reset', email, otp, newPassword }

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, otp, newPassword } = body;

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null }
    });

    // Don't reveal if user exists for security
    if (!user) {
      return NextResponse.json({ success: true, message: 'If this email exists, an OTP has been sent.' });
    }

    // ── Step 1: Send OTP ──────────────────────────────────
    if (action === 'send') {
      const generatedOTP = generateOTP();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await prisma.user.update({
        where: { id: user.id },
        data:  { resetOtpHash: hashOTP(generatedOTP), resetOtpExpiry: expiry },
      });

      // TODO: Send via Resend/MSG91 in production
      console.log(`Password reset OTP for ${email}: ${generatedOTP}`);

      // Try send via Resend if configured
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const org = user.orgId ? await getOrgConfig(user.orgId) : null;
        const orgName = org?.name || process.env.FROM_NAME || 'BNZ Impact';
        await resend.emails.send({
          from:    `${orgName} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
          to:      email,
          subject: `Password Reset OTP — ${orgName}`,
          html:    `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#264422">Password Reset Request</h2>
              <p>You requested a password reset for your ${orgName} account.</p>
              <div style="background:#f6f9f4;border:2px solid #aecfa4;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
                <p style="color:#448039;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Your OTP</p>
                <p style="font-size:40px;font-weight:bold;color:#264422;letter-spacing:8px;margin:0">${generatedOTP}</p>
                <p style="color:#6a8050;font-size:12px;margin:8px 0 0">Valid for 10 minutes</p>
              </div>
              <p style="color:#888;font-size:12px">If you didn't request this, please ignore this email.</p>
            </div>
          `,
        }).catch(e => console.error('Resend error:', e));
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email address',
        devOtp:  process.env.NODE_ENV !== 'production' ? generatedOTP : undefined,
      });
    }

    // ── Step 2: Verify OTP ────────────────────────────────
    if (action === 'verify') {
      if (!otp) return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
      if (!user.resetOtpHash || !user.resetOtpExpiry)
        return NextResponse.json({ error: 'No OTP requested. Please request a new one.' }, { status: 400 });
      if (new Date() > user.resetOtpExpiry)
        return NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 });
      if (user.resetOtpHash !== hashOTP(otp))
        return NextResponse.json({ error: 'Invalid OTP. Please check and try again.' }, { status: 400 });

      return NextResponse.json({ success: true, verified: true });
    }

    // ── Step 3: Reset Password ────────────────────────────
    if (action === 'reset') {
      if (!otp || !newPassword)
        return NextResponse.json({ error: 'OTP and new password are required' }, { status: 400 });

      // Validate OTP again
      if (!user.resetOtpHash || !user.resetOtpExpiry)
        return NextResponse.json({ error: 'Session expired. Please start over.' }, { status: 400 });
      if (new Date() > user.resetOtpExpiry)
        return NextResponse.json({ error: 'OTP expired. Please start over.' }, { status: 400 });
      if (user.resetOtpHash !== hashOTP(otp))
        return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });

      // Validate password strength
      const pwRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!pwRules.test(newPassword))
        return NextResponse.json({
          error: 'Password must be 8+ characters with uppercase, lowercase, number and special character'
        }, { status: 400 });

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data:  { password: hashed, resetOtpHash: null, resetOtpExpiry: null,
                 isLocked: false, loginAttempts: 0 },
      });

      await prisma.auditLog.create({
        data: { actorId: user.id, actorRole: user.role, action: 'PASSWORD_RESET_COMPLETED',
                details: { email } }
      }).catch(() => {});

      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('Forgot password error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
