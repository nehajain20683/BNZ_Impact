// src/lib/device-id.ts
// A persistent, per-device identifier for the field officer app — not
// tied to login (the same officer account could be used on more than
// one phone), generated once and stored in localStorage, reused for
// every photo capture on that device. Feeds EvidenceAudit's chain-of-
// custody record; genuinely optional everywhere it's used, so an older
// cached app or a browser with localStorage disabled just captures
// without it rather than failing.
export function getDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = 'bnz_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `dev_${crypto.randomUUID()}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return null; // localStorage unavailable — capture still proceeds without it
  }
}
