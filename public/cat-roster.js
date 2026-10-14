import { NEIGHBORS } from "./game-data.js";
export function catAvailable(game, profile) {
  return profile.adoption
    ? (game.adoption?.cats || []).some((c) => c.id === profile.id)
    : game.unlocked.includes(profile.biome);
}
export function activeCats(game) {
  return NEIGHBORS.filter((n) => catAvailable(game, n)).map((n) => ({
    ...n,
    biome: game.unlocked.includes(game.catDestinations?.[n.id])
      ? game.catDestinations[n.id]
      : game.adoption?.cats?.find((c) => c.id === n.id)?.homeBiome || n.biome,
  }));
}
