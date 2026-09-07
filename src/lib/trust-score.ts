// src/lib/trust-score.ts
// Phase 0D of the frozen dMRV architecture spec. Deliberately honest about
// what can and can't be scored today: EvidenceAudit (deviceId/contentHash)
// is brand new from Phase 0C and will be null on every photo captured
// before it existed — those checks correctly show as "not available,"
// not silently passed. A trust score that always shows 100/100 regardless
// of what data actually exists would be worse than no score at all.

export type TrustCheck = { label: string; passed: boolean | null; points: number; note?: string };
export type TrustScoreResult = { score: number; maxPossible: number; checks: TrustCheck[] };

const GPS_ACCURACY_THRESHOLD_METERS = 30;

export function computeTrustScore(input: {
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracy?: number | null;
  contentHash?: string | null;
  deviceId?: string | null;
  officerActive?: boolean | null; // null = officer record couldn't be resolved at all
}): TrustScoreResult {
  const checks: TrustCheck[] = [];

  // GPS present at all
  const hasGps = input.latitude != null && input.longitude != null;
  checks.push({ label: 'GPS coordinates recorded', passed: hasGps, points: 25 });

  // GPS accuracy within a reasonable threshold — null = accuracy metadata
  // itself wasn't captured (older records), genuinely different from "GPS
  // was captured but inaccurate."
  if (input.gpsAccuracy == null) {
    checks.push({ label: 'GPS accuracy verified', passed: null, points: 25, note: 'Accuracy metadata not recorded for this photo' });
  } else {
    checks.push({ label: 'GPS accuracy verified', passed: input.gpsAccuracy <= GPS_ACCURACY_THRESHOLD_METERS, points: 25,
      note: `${Math.round(input.gpsAccuracy)}m accuracy` });
  }

  // Chain-of-custody hash — will be null for any photo captured before
  // Phase 0C existed. That's correct, not a bug.
  if (!input.contentHash) {
    checks.push({ label: 'Chain-of-custody hash recorded', passed: null, points: 25, note: 'No EvidenceAudit record — captured before this check existed, or not yet processed' });
  } else {
    checks.push({ label: 'Chain-of-custody hash recorded', passed: true, points: 25 });
  }

  // Officer identity resolves to an active, real FieldOfficer record
  if (input.officerActive == null) {
    checks.push({ label: 'Officer identity verified', passed: null, points: 25, note: 'Officer record could not be resolved' });
  } else {
    checks.push({ label: 'Officer identity verified', passed: input.officerActive, points: 25,
      note: input.officerActive ? undefined : 'Officer account is no longer active' });
  }

  // Only checks that actually ran (passed !== null) count toward the
  // denominator — an unavailable check is excluded from the score
  // entirely rather than silently counted as a pass or a fail.
  const applicable = checks.filter(c => c.passed !== null);
  const earned = applicable.filter(c => c.passed).reduce((s, c) => s + c.points, 0);
  const maxPossible = applicable.reduce((s, c) => s + c.points, 0);

  return {
    score: maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0,
    maxPossible,
    checks,
  };
}
