export const runtime = 'nodejs';
// This route is not used - farmer registration uses /api/farmer/otp + /api/farmer/profile
// Keeping as stub to prevent build errors
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Use /api/farmer/otp for registration' }, { status: 400 });
}
