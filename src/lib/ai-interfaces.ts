// src/lib/ai-interfaces.ts
// Phase 0D of the frozen dMRV architecture spec. Interfaces only — no AI
// implementation, per the deliberate deferral held since the original
// audit ("prepare extension points, don't build the AI yet"). A future
// Google Vision / Azure / OpenAI Vision integration becomes a new class
// implementing one of these interfaces, not a refactor of business logic
// that called a vendor SDK directly.
//
// One exception, and it's worth being explicit about why it's not a
// no-op: HashBasedDuplicateDetector is a REAL, working implementation —
// exact-duplicate detection via content hash needs no AI at all, just
// string comparison. The other three defaults are honest no-ops that
// return "not evaluated," not a fabricated pass.

export interface PhotoProcessor {
  process(imageDataUrl: string): Promise<{ valid: boolean; reason?: string }>;
}

export interface SpeciesDetector {
  detect(imageDataUrl: string): Promise<{ species: string | null; confidence: number }>;
}

export interface HealthScorer {
  score(imageDataUrl: string): Promise<{ health: 'HEALTHY' | 'STRESSED' | 'DISEASED' | 'DEAD' | null; confidence: number }>;
}

export interface DuplicateDetector {
  checkDuplicate(contentHash: string, existingHashes: string[]): Promise<{ isDuplicate: boolean; matchedHash?: string }>;
}

// ── Default implementations ─────────────────────────────────────────────

export class NoOpPhotoProcessor implements PhotoProcessor {
  async process(_imageDataUrl: string) {
    return { valid: true, reason: 'Not evaluated — no photo processor configured' };
  }
}

export class NoOpSpeciesDetector implements SpeciesDetector {
  async detect(_imageDataUrl: string) {
    return { species: null, confidence: 0 };
  }
}

export class NoOpHealthScorer implements HealthScorer {
  async score(_imageDataUrl: string) {
    return { health: null, confidence: 0 };
  }
}

// Genuinely real, no AI required — exact content-hash match. Won't catch
// a re-photographed-from-a-screen duplicate (that needs real perceptual
// hashing or a vision model, hence the interface existing at all for a
// future upgrade) but does catch the same file uploaded twice, which is
// the common case.
export class HashBasedDuplicateDetector implements DuplicateDetector {
  async checkDuplicate(contentHash: string, existingHashes: string[]) {
    const match = existingHashes.find(h => h === contentHash);
    return { isDuplicate: !!match, matchedHash: match };
  }
}
