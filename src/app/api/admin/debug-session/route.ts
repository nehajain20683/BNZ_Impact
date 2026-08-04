export const runtime = 'nodejs';
// TEMPORARY DEBUG ENDPOINT - DELETE AFTER FIXING
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import { cookies } from 'next/headers';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user    = session?.user as any;
  let activeOrgId = 'error';
  try { activeOrgId = await getActiveOrgId(); } catch(e: any) { activeOrgId = e.message; }
  const cookieStore     = cookies();
  const activeOrgCookie = cookieStore.get('activeOrgId')?.value || 'not set';

  return NextResponse.json({
    sessionUser: {
      id:    user?.id,
      email: user?.email,
      role:  user?.role,
      orgId: user?.orgId,
    },
    activeOrgIdResolved: activeOrgId,
    activeOrgCookie,
  });
}
