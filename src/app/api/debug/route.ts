export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Deliberately NOT gated behind a NextAuth session — this endpoint exists
  // specifically to diagnose auth/session misconfigurations, so requiring a
  // working session to reach it creates exactly the chicken-and-egg failure
  // that would make it useless the one time it's actually needed (this is
  // literally what we used it for once already, diagnosing a broken
  // NEXTAUTH_URL). A shared secret, checked independently of the database
  // and NextAuth entirely, protects it without that risk.
  const key = new URL(req.url).searchParams.get('key');
  if (!process.env.DEBUG_ACCESS_KEY || key !== process.env.DEBUG_ACCESS_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    TENANT_SLUG:  process.env.TENANT_SLUG  || 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length || 0,
    DEPLOYMENT_TARGET: process.env.DEPLOYMENT_TARGET || 'NOT SET',
    VERCEL_ENV: process.env.VERCEL_ENV || 'NOT SET',
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'NOT SET',
  });
}
