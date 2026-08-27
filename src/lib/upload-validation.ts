// src/lib/upload-validation.ts
// Validation pipeline for photo evidence (community updates + monitoring
// photos). Runs available checks now; the architecture is ready to plug in
// a real AI/vision service later without changing callers.

export type ValidationInput = {
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  timestamp?: Date | string | null;
  photoUrl?: string | null;
  // Boundary to check GPS against, if the land/site has one recorded
  boundaryGpsLatitude?: number | null;
  boundaryGpsLongitude?: number | null;
  boundaryRadiusMeters?: number; // default 500m if a boundary point (not polygon) is all we have
  // For duplicate detection — recent photo URLs/hashes from the same farmer/site
  recentPhotoUrls?: string[];
};

export type ValidationResult = {
  passed: boolean;
  status: 'PENDING' | 'NEEDS_REVIEW';
  checks: {
    gpsInBoundary: 'PASS' | 'FAIL' | 'SKIPPED';
    timestampValid: 'PASS' | 'FAIL' | 'SKIPPED';
    notDuplicate: 'PASS' | 'FAIL' | 'SKIPPED';
    notBlurry: 'PASS' | 'SKIPPED'; // placeholder — no real blur detection yet
    treePresence: 'PASS' | 'SKIPPED'; // placeholder — no AI vision service yet
  };
  reasons: string[];
};

// Haversine distance in meters between two lat/lng points
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function validateUpload(input: ValidationInput): ValidationResult {
  const reasons: string[] = [];
  const checks: ValidationResult['checks'] = {
    gpsInBoundary: 'SKIPPED',
    timestampValid: 'SKIPPED',
    notDuplicate: 'SKIPPED',
    notBlurry: 'SKIPPED',
    treePresence: 'SKIPPED',
  };

  // 1. GPS inside boundary
  if (input.gpsLatitude != null && input.gpsLongitude != null &&
      input.boundaryGpsLatitude != null && input.boundaryGpsLongitude != null) {
    const dist = distanceMeters(
      input.gpsLatitude, input.gpsLongitude,
      input.boundaryGpsLatitude, input.boundaryGpsLongitude,
    );
    const radius = input.boundaryRadiusMeters ?? 500;
    if (dist <= radius) {
      checks.gpsInBoundary = 'PASS';
    } else {
      checks.gpsInBoundary = 'FAIL';
      reasons.push(`GPS location is ${Math.round(dist)}m from the expected plantation area (max ${radius}m)`);
    }
  }

  // 2. Timestamp validation — not in the future, not implausibly old (>1 year)
  if (input.timestamp) {
    const ts = new Date(input.timestamp).getTime();
    const now = Date.now();
    if (isNaN(ts)) {
      checks.timestampValid = 'FAIL';
      reasons.push('Invalid timestamp');
    } else if (ts > now + 5 * 60 * 1000) { // more than 5 min in the future — clock skew tolerance
      checks.timestampValid = 'FAIL';
      reasons.push('Timestamp is in the future');
    } else if (now - ts > 365 * 24 * 60 * 60 * 1000) {
      checks.timestampValid = 'FAIL';
      reasons.push('Timestamp is more than a year old');
    } else {
      checks.timestampValid = 'PASS';
    }
  }

  // 3. Duplicate detection — exact URL/data match against recent uploads.
  // A real implementation would hash image bytes (perceptual hash) rather
  // than comparing full data URLs; this is a correct but coarse first pass.
  if (input.photoUrl && input.recentPhotoUrls?.length) {
    if (input.recentPhotoUrls.includes(input.photoUrl)) {
      checks.notDuplicate = 'FAIL';
      reasons.push('This photo appears to have been submitted before');
    } else {
      checks.notDuplicate = 'PASS';
    }
  }

  // 4. Blur detection — placeholder. Wire a real check here (e.g. Laplacian
  // variance on decoded image data) when ready; until then this always passes
  // rather than blocking every upload on an unimplemented check.
  checks.notBlurry = 'SKIPPED';

  // 5. Tree presence detection — placeholder for a future AI vision service.
  checks.treePresence = 'SKIPPED';

  const anyFail = Object.values(checks).includes('FAIL');
  return {
    passed: !anyFail,
    status: anyFail ? 'NEEDS_REVIEW' : 'PENDING',
    checks,
    reasons,
  };
}
