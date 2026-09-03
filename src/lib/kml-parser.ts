// src/lib/kml-parser.ts
// Deliberately dependency-free — no XML parsing library, since sandbox
// network access is disabled here and can't npm install one, and more
// importantly KML's <coordinates> tag is simple enough text that a real
// XML parser is overkill: it's always "lon,lat,alt lon,lat,alt ..."
// whitespace-separated, regardless of how deeply it's nested inside
// <Polygon><outerBoundaryIs><LinearRing>. A KML file can contain several
// placemarks/polygons (e.g. one per field boundary drawn in Google Earth);
// this takes the one with the most points as the best guess at "the real
// boundary" rather than the first, since stray single-point placemarks
// (pins someone dropped while sketching) are common in real-world exports.

export type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };

export function parseKmlToGeoJson(kmlText: string): { polygon: GeoJsonPolygon | null; error?: string } {
  if (!kmlText || typeof kmlText !== 'string') return { polygon: null, error: 'Empty file' };

  const coordBlocks = [...kmlText.matchAll(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi)]
    .map(m => m[1]);

  if (coordBlocks.length === 0) return { polygon: null, error: 'No <coordinates> tag found — this may be a LineString/point file, or not a valid KML.' };

  let best: number[][] | null = null;

  for (const block of coordBlocks) {
    const points = block
      .trim()
      .split(/\s+/)
      .map(triplet => triplet.split(',').map(Number))
      .filter(p => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([lon, lat]) => [lon, lat]);

    // Sanity range check — KML is lon,lat, easy to get backwards from a
    // hand-edited file; reject anything outside real-world bounds rather
    // than silently storing a polygon that plots in the ocean.
    const valid = points.every(([lon, lat]) => lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90);
    if (!valid || points.length < 3) continue;

    if (!best || points.length > best.length) best = points;
  }

  if (!best) return { polygon: null, error: 'Found coordinate data but not a usable closed boundary (need at least 3 valid points).' };

  // A closed ring needs first === last point — KML sometimes already closes
  // it, sometimes doesn't.
  const first = best[0], last = best[best.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) best = [...best, first];

  return { polygon: { type: 'Polygon', coordinates: [best] } };
}

// Data URIs from the upload flow look like "data:...;base64,XXXX" — this
// decodes just the KML/XML text portion out of that.
export function decodeKmlDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:[^;]*;base64,(.*)$/s);
  const base64 = match ? match[1] : dataUri;
  return Buffer.from(base64, 'base64').toString('utf-8');
}
