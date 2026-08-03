// src/lib/get-active-org.ts
// Resolves which org's data to show for the current admin session
// ADMIN: always their own orgId from session — never overridable
// SUPER_ADMIN: reads activeOrgId cookie, falls back to their own orgId

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function getActiveOrgId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const user = session.user as any;
  const userOrgId = user.orgId || 'org_jito_mumbai';

  // Regular ADMIN — ALWAYS their own org, cookie is ignored
  if (user.role === 'ADMIN') {
    return userOrgId;
  }

  // SUPER_ADMIN — cookie overrides, fallback to their own org
  if (user.role === 'SUPER_ADMIN') {
    try {
      const cookieStore = cookies();
      const activeOrgId = cookieStore.get('activeOrgId')?.value;
      if (activeOrgId) return activeOrgId;
    } catch {}
    return userOrgId;
  }

  return userOrgId;
}
