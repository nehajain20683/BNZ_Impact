export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    TENANT_SLUG:  process.env.TENANT_SLUG  || 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
  });
}
