// src/lib/geo.ts
// Pure, dependency-free geometry helpers — safe to import from both server
// routes and client components.
//
// Why this exists: every map in the app used to need a separate GPS point
// before it would draw anything, even for a parcel whose KML boundary had
// already been captured. The boundary itself says exactly where the parcel
// is, so when there's no GPS point we place the pin at the boundary's centre.
// This is a DISPLAY fallback only — it is never written into Land.gpsLatitude,
// which other features treat as a real surveyed reading.

type Ring = number[][]; // GeoJSON order: [lng, lat]

// Area-weighted centroid of a GeoJSON Polygon's outer ring. Falls back to the
// plain average of the vertices if the ring has no area (all points in a
// line). Returns null if there is no usable ring (< 3 valid points).
export function polygonCentroid(polygon: any): { lat: number; lng: number } | null {
  const raw: Ring | undefined = polygon?.coordinates?.[0];
  if (!Array.isArray(raw)) return null;

  const pts: [number, number][] = [];
  for (const p of raw) {
    const x = Number(p?.[0]), y = Number(p?.[1]);
    if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90) pts.push([x, y]);
  }
  if (pts.length < 3) return null;

  // GeoJSON rings repeat the first point at the end; drop the duplicate.
  const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
  if (pts.length > 3 && fx === lx && fy === ly) pts.pop();
  const n = pts.length;

  // Work relative to the first vertex: parcel-sized polygons sit at large
  // absolute coordinates (e.g. 73.78, 19.99), where the shoelace sums lose
  // precision to cancellation. Planar maths is accurate to well under a metre
  // at parcel scale.
  const ox = pts[0][0], oy = pts[0][1];
  let a2 = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const x0 = pts[i][0] - ox, y0 = pts[i][1] - oy;
    const x1 = pts[(i + 1) % n][0] - ox, y1 = pts[(i + 1) % n][1] - oy;
    const cross = x0 * y1 - x1 * y0;
    a2 += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  if (Math.abs(a2) < 1e-18) {
    return { lng: pts.reduce((s, p) => s + p[0], 0) / n, lat: pts.reduce((s, p) => s + p[1], 0) / n };
  }
  return { lng: ox + cx / (3 * a2), lat: oy + cy / (3 * a2) };
}

type PinLike = { lat?: number | null; lng?: number | null; polygons?: any[] | null };

// Every pin the map can draw: keeps pins that already have coordinates as-is
// (0 is a valid coordinate — null/undefined is the only "missing"), and for
// the rest places the pin at the centre of their boundary/boundaries. Pins
// with neither are dropped. Does not mutate its input.
export function resolvePins<T extends PinLike>(sites: T[]): (T & { lat: number; lng: number })[] {
  const out: (T & { lat: number; lng: number })[] = [];
  for (const s of sites) {
    if (s.lat != null && s.lng != null) { out.push(s as T & { lat: number; lng: number }); continue; }
    const centres = (s.polygons || []).map(polygonCentroid).filter((c): c is { lat: number; lng: number } => !!c);
    if (centres.length === 0) continue;
    // A site with several parcels is pinned at the middle of them.
    out.push({
      ...s,
      lat: centres.reduce((t, c) => t + c.lat, 0) / centres.length,
      lng: centres.reduce((t, c) => t + c.lng, 0) / centres.length,
    });
  }
  return out;
}
