import { WORLD_CENTERS } from './world-layout.js';
// Expand land, never the player's existing buildings or their local addresses.
export const HOMESTEAD_EXPANSION = {
  originalRadius: 46.6 * Math.SQRT2,
  areaMultiplier: 12,
  center: [...WORLD_CENTERS.homestead],
};
export const HOMESTEAD_RADIUS = HOMESTEAD_EXPANSION.originalRadius * Math.sqrt(HOMESTEAD_EXPANSION.areaMultiplier);
