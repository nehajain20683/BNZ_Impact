export const runtime = 'nodejs';
// src/app/api/field-officer/login/route.ts
// Deliberately separate from NextAuth (matching the existing Farmer auth
// pattern) — a localStorage-based token, not a NextAuth session. Field
// Officers are admin-created accounts (see /admin/field-officers), so
// unlike Farmer login there's no self-registration or OTP flow — just
// password, set/reset by an admin.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function makeToken(officer: any) {
  return Buffer.from(JSON.stringify({
    officerId: officer.id, email: officer.email, role: 'FIELD_OFFICER',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString('base64');
}

export async function POST(req: Request) {
  try {
    const { email, mobile, password } = await req.json();
    if ((!email && !mobile) || !password)
      return NextResponse.json({ error: 'Email or mobile, and password are required' }, { status: 400 });

    const officer = await prisma.fieldOfficer.findFirst({
      where: email ? { email } : { mobile },
    });
    if (!officer)
      return NextResponse.json({ error: 'No field officer account found with these details.' }, { status: 404 });
    if (!officer.active)
      return NextResponse.json({ error: 'This account has been deactivated. Contact your administrator.' }, { status: 403 });

    const match = await bcrypt.compare(password, officer.password);
    if (!match)
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });

    await prisma.fieldOfficer.update({ where: { id: officer.id }, data: { lastLoginAt: new Date() } });

    return NextResponse.json({
      success: true,
      token: makeToken(officer),
      officerId: officer.id,
      officerName: officer.name,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
