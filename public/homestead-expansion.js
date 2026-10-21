// Expand land, never the player's existing buildings or their local addresses.
export const HOMESTEAD_EXPANSION = {
  originalRadius: 46.6 * Math.SQRT2,
  areaMultiplier: 4,
  center: [-270, -240],
};
export const HOMESTEAD_RADIUS = HOMESTEAD_EXPANSION.originalRadius * Math.sqrt(HOMESTEAD_EXPANSION.areaMultiplier);
