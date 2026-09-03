export const runtime = 'nodejs';
// src/app/api/field-officer/issue/route.ts
// One-tap issue reporting from the field — animal damage, flood, fire,
// pest attack, missing trees, wrong species. Notifies admin immediately
// through the existing Notification system, same pattern already used for
// a tree being marked dead during health monitoring.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ISSUE_LABELS: Record<string, string> = {
  ANIMAL_DAMAGE: 'Animal Damage', FLOOD: 'Flood', FIRE: 'Fire',
  PEST_ATTACK: 'Pest Attack', MISSING_TREES: 'Missing Trees',
  WRONG_SPECIES: 'Wrong Species Planted', OTHER: 'Other Issue',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { officerId, farmerId, treeId, issueType, severity, description, photos, latitude, longitude } = body;

    if (!officerId || !farmerId || !issueType)
      return NextResponse.json({ error: 'officerId, farmerId and issueType are required' }, { status: 400 });
    if (!ISSUE_LABELS[issueType])
      return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 });

    const officer = await prisma.fieldOfficer.findUnique({ where: { id: officerId } });
    if (!officer || !officer.active)
      return NextResponse.json({ error: 'Field officer account not found or inactive' }, { status: 401 });

    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      select: { orgId: true, assignedOfficerId: true, fullName: true, landAssignments: { select: { siteId: true } } },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    if (officer.orgId && officer.orgId !== farmer.orgId)
      return NextResponse.json({ error: 'This farmer does not belong to your organisation' }, { status: 403 });
    if (farmer.assignedOfficerId !== officer.id)
      return NextResponse.json({ error: 'This farmer is not assigned to you.' }, { status: 403 });

    const siteId = farmer.landAssignments[0]?.siteId;
    if (!siteId) return NextResponse.json({ error: 'This farmer has no active land assignment yet.' }, { status: 400 });

    const issue = await prisma.fieldIssue.create({
      data: {
        siteId, farmerId, treeId: treeId || undefined, reportedById: officer.id,
        issueType, severity: severity || 'MEDIUM',
        description: description || undefined,
        photos: photos || [],
        gpsLat: typeof latitude === 'number' ? latitude : undefined,
        gpsLng: typeof longitude === 'number' ? longitude : undefined,
      },
    });

    const severityWord = (severity || 'MEDIUM') === 'CRITICAL' || severity === 'HIGH' ? '⚠️ Urgent: ' : '';
    await prisma.notification.create({
      data: {
        recipientType: 'ADMIN_ORG', recipientId: farmer.orgId!,
        type: 'FIELD_ISSUE',
        title: `${severityWord}${ISSUE_LABELS[issueType]} reported — ${farmer.fullName}`,
        message: description || `Reported by ${officer.name}`,
        link: `/admin/farmers/${farmerId}`,
      },
    }).catch(() => {});

    // Also lands in the site's general Activity timeline, same principle as
    // monitoring visits — a supervisor scanning site activity shouldn't
    // need to check yet another separate screen to see something happened.
    await prisma.plantationActivity.create({
      data: {
        siteId, date: new Date(), activityType: 'ISSUE',
        description: `${ISSUE_LABELS[issueType]} reported by ${officer.name} — ${farmer.fullName}`,
        remarks: description || undefined, photos: photos || [], loggedById: officer.id,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, issue });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const farmerId = params.get('farmerId');
  const officerId = params.get('officerId');
  const siteId = params.get('siteId');
  if (!farmerId && !officerId && !siteId)
    return NextResponse.json({ error: 'farmerId, officerId or siteId is required' }, { status: 400 });

  const issues = await prisma.fieldIssue.findMany({
    where: {
      ...(farmerId ? { farmerId } : {}),
      ...(officerId ? { reportedById: officerId } : {}),
      ...(siteId ? { siteId } : {}),
    },
    include: {
      reportedBy: { select: { name: true } },
      farmer: { select: { fullName: true } },
      tree: { select: { treeTagId: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ issues });
}
