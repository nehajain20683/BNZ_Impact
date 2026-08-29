export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    TENANT_SLUG:  process.env.TENANT_SLUG  || 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    // Booleans/lengths only — never the actual secret value, even in a
    // diagnostic endpoint. Enough to confirm presence and rule out an
    // empty string or truncated paste without exposing anything sensitive.
    NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length || 0,
    DEPLOYMENT_TARGET: process.env.DEPLOYMENT_TARGET || 'NOT SET',
    VERCEL_ENV: process.env.VERCEL_ENV || 'NOT SET',
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'NOT SET',
  });
}
