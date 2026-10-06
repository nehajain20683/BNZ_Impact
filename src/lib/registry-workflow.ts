// src/lib/registry-workflow.ts
// The state machine for ProjectDesignDocument.status, closing the
// "Registry Submission Workflow" gap that was intentionally left open
// pending a real registry-bound tenant. Models a realistic registry
// review cycle: a submission can be sent back for clarification and
// resubmitted, not just move linearly forward.
export const PDD_STATUSES = ['DRAFT', 'SUBMITTED', 'VALIDATION', 'CLARIFICATION', 'VERIFICATION', 'ISSUED'] as const;
export type PDDStatus = typeof PDD_STATUSES[number];

const VALID_TRANSITIONS: Record<PDDStatus, PDDStatus[]> = {
  DRAFT:         ['SUBMITTED'],
  SUBMITTED:     ['VALIDATION'],
  VALIDATION:    ['CLARIFICATION', 'VERIFICATION'],
  CLARIFICATION: ['VALIDATION'], // resubmitted after providing what was requested
  VERIFICATION:  ['CLARIFICATION', 'ISSUED'],
  ISSUED:        [], // terminal — a real registry doesn't let you un-issue
};

export function canTransition(from: string, to: string): boolean {
  const validFrom = VALID_TRANSITIONS[from as PDDStatus];
  return !!validFrom && validFrom.includes(to as PDDStatus);
}

export function nextValidStatuses(from: string): PDDStatus[] {
  return VALID_TRANSITIONS[from as PDDStatus] || [];
}

export type StatusHistoryEntry = { status: string; changedAt: string; changedBy?: string; note?: string };

export function appendStatusHistory(existing: unknown, entry: StatusHistoryEntry): StatusHistoryEntry[] {
  const history = Array.isArray(existing) ? (existing as StatusHistoryEntry[]) : [];
  return [...history, entry];
}

// ─────────────────────────────────────────────────────────────────────────
// Carbon Credit Lifecycle — a separate state machine from PDD status
// above (different model, different real-world process), matching the
// enum extended in the schema: PENDING → ISSUED → LISTED → SOLD →
// TRANSFERRED → RETIRED. Listing is optional (a credit can be sold
// privately without ever being listed on a marketplace), and a sold
// credit can be retired directly without a separate transfer step — not
// every buyer's process includes both. RETIRED is terminal: a real
// registry doesn't let you un-retire a credit once claimed.
// ─────────────────────────────────────────────────────────────────────────
export const CREDIT_STATUSES = ['PENDING', 'ISSUED', 'LISTED', 'SOLD', 'TRANSFERRED', 'RETIRED'] as const;
export type CreditStatusType = typeof CREDIT_STATUSES[number];

const CREDIT_VALID_TRANSITIONS: Record<CreditStatusType, CreditStatusType[]> = {
  PENDING:     ['ISSUED'],
  ISSUED:      ['LISTED', 'SOLD'],
  LISTED:      ['SOLD'],
  SOLD:        ['TRANSFERRED', 'RETIRED'],
  TRANSFERRED: ['RETIRED'],
  RETIRED:     [],
};

export function canTransitionCredit(from: string, to: string): boolean {
  const validFrom = CREDIT_VALID_TRANSITIONS[from as CreditStatusType];
  return !!validFrom && validFrom.includes(to as CreditStatusType);
}

export function nextValidCreditStatuses(from: string): CreditStatusType[] {
  return CREDIT_VALID_TRANSITIONS[from as CreditStatusType] || [];
}
