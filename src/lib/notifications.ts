// src/lib/notifications.ts
// Thin helpers over the Notification model — every trigger point in the app
// should go through these rather than calling prisma.notification.create
// directly, so the recipientType/Id convention stays consistent everywhere.
import prisma from '@/lib/prisma';

type NotifyType =
  | 'PLANTATION_ASSIGNED' | 'MONITORING_SCHEDULED' | 'UPDATE_APPROVED'
  | 'UPDATE_REJECTED' | 'ACTIVITY_REMINDER' | 'MONITORING_DUE' | 'PENDING_REVIEW'
  | 'DOCUMENT_VERIFIED' | 'DOCUMENT_REJECTED';

export async function notifyFarmer(farmerId: string, type: NotifyType, title: string, message?: string, link?: string) {
  try {
    return await (prisma as any).notification.create({
      data: { recipientType: 'FARMER', recipientId: farmerId, type, title, message, link },
    });
  } catch (e: any) {
    console.error('notifyFarmer failed:', e.message);
  }
}

export async function notifyFieldOfficer(officerId: string, type: NotifyType, title: string, message?: string, link?: string) {
  try {
    return await (prisma as any).notification.create({
      data: { recipientType: 'FIELD_OFFICER', recipientId: officerId, type, title, message, link },
    });
  } catch (e: any) {
    console.error('notifyFieldOfficer failed:', e.message);
  }
}

// Fans out to every admin/super-admin of the org — resolved to a single
// per-org row (recipientType='ADMIN_ORG'), read by any admin session for
// that org, rather than duplicating a row per admin user.
export async function notifyOrgAdmins(orgId: string, type: NotifyType, title: string, message?: string, link?: string) {
  if (!orgId) return;
  try {
    return await (prisma as any).notification.create({
      data: { recipientType: 'ADMIN_ORG', recipientId: orgId, type, title, message, link },
    });
  } catch (e: any) {
    console.error('notifyOrgAdmins failed:', e.message);
  }
}
