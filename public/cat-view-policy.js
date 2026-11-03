// A focused island's cats keep their native bodies through ordinary zoom.
// Remote islands retain their old wake radius; the caller still tests the
// final colour/shadow frusta before enabling a rig.
export function nativeCatView(distance, islandRadius, focused) {
  return focused || distance < Math.max(110, (islandRadius || 12) * 7);
}

// Preserve the close view, ease out the old abrupt 90-metre fog switch, and
// retain coat contrast at the target even on the largest island overview.
// Fog still grows with depth beyond that target. No cat material override,
// scale change or additional rendering pass is needed.
export function worldFogDensity(distance) {
  const d = Math.max(0, distance),
    t = Math.min(1, Math.max(0, (d - 65) / 55)),
    eased = t * t * (3 - 2 * t),
    density = .0035 + (.0007 - .0035) * eased;
  return Math.min(density, .35 / Math.max(1, d));
}
