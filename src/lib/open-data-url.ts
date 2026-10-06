// src/lib/open-data-url.ts
// Opens a base64 data URL (how signed copies are stored) in a new tab.
// Browsers block top-level navigation to data: URLs (Chrome since v60), so a
// plain <a href="data:…" target="_blank"> can silently do nothing — which
// would make a signed copy impossible to actually look at before verifying
// it. A Blob URL has no such restriction.
export function openDataUrlInNewTab(dataUrl: string): boolean {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl || '');
  if (!m) return false;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: m[1] }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    return true;
  } catch { return false; }
}
