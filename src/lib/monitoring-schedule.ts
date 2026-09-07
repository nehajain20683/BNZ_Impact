// src/lib/monitoring-schedule.ts
// dMRV Roadmap Phase 2. Pure function, no database access — callers fetch
// the last visit date and applicable interval themselves (already
// org/tenant-scoped by their own query), this just does the date math
// consistently in one place rather than reimplemented per call site.

export type DueStatus = 'OVERDUE' | 'DUE_SOON' | 'OK' | 'NEVER_VISITED';

export function computeDueStatus(
  lastVisitDate: Date | null,
  intervalDays: number,
  referenceDate: Date = new Date()
): { status: DueStatus; daysSinceVisit: number | null; daysUntilDue: number | null } {
  if (!lastVisitDate) return { status: 'NEVER_VISITED', daysSinceVisit: null, daysUntilDue: null };

  const daysSinceVisit = Math.floor((referenceDate.getTime() - lastVisitDate.getTime()) / 86_400_000);
  const daysUntilDue = intervalDays - daysSinceVisit;

  if (daysUntilDue < 0) return { status: 'OVERDUE', daysSinceVisit, daysUntilDue };
  if (daysUntilDue <= 7) return { status: 'DUE_SOON', daysSinceVisit, daysUntilDue };
  return { status: 'OK', daysSinceVisit, daysUntilDue };
}
