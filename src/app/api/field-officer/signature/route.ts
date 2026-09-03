export const runtime = 'nodejs';
// src/app/api/field-officer/signature/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { officerId, signatureImage } = await req.json();
    if (!officerId || !signatureImage)
      return NextResponse.json({ error: 'officerId and signatureImage are required' }, { status: 400 });

    const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    await prisma.fieldOfficer.update({ where: { id: officerId }, data: { signatureImage } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const officerId = new URL(req.url).searchParams.get('officerId');
  if (!officerId) return NextResponse.json({ error: 'officerId required' }, { status: 400 });
  const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId }, select: { signatureImage: true, name: true } });
  return NextResponse.json({ signatureImage: officer?.signatureImage || null, name: officer?.name });
}
