// src/lib/get-active-org.ts
// Resolves which org's data to show for the current admin session
// SUPER_ADMIN: reads activeOrgId from cookie (set by org switcher)
// ADMIN: always uses their own orgId from session

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function getActiveOrgId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const user = session.user as any;

  // Regular ADMIN — always their own org
  if (user.role === 'ADMIN') {
    return user.orgId || 'org_jito_mumbai';
  }

  // SUPER_ADMIN — check cookie for selected org
  if (user.role === 'SUPER_ADMIN') {
    const cookieStore = cookies();
    const activeOrgId = cookieStore.get('activeOrgId')?.value;
    // If cookie set and valid, use it — otherwise default to JITO
    if (activeOrgId) return activeOrgId;
    return user.orgId || 'org_jito_mumbai';
  }

  return user.orgId || 'org_jito_mumbai';
}
