import { NEIGHBORS } from "./game-data.js";
import {isRetiredBiome} from './world-layout.js';
export function venueCatHome(game, profile, now = Date.now()) {
  if (!profile.venue) return null;
  return (
    (game.placements || [])
      .filter(
        (p) =>
          p.item === profile.venue &&
          game.unlocked.includes(p.biome) &&
          (!p.readyAt || p.readyAt <= now),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0] || null
  );
}
export function catAvailable(game, profile) {
  if (profile.venue)
    return (
      !!venueCatHome(game, profile) ||
      game.unlocked.includes(game.catDestinations?.[profile.id])
    );
  return profile.adoption
    ? (game.adoption?.cats || []).some((c) => c.id === profile.id)
    : game.unlocked.includes(profile.biome) ||
      (isRetiredBiome(profile.biome) && game.unlocked.includes(game.catDestinations?.[profile.id]));
}
export function activeCats(game) {
  return NEIGHBORS.filter((n) => catAvailable(game, n)).map((n) => {
    const home = venueCatHome(game, n),
      moved = game.unlocked.includes(game.catDestinations?.[n.id]);
    return {
      ...n,
      biome: moved
        ? game.catDestinations[n.id]
        : home?.biome ||
          game.adoption?.cats?.find((c) => c.id === n.id)?.homeBiome ||
          n.biome,
      ...(home
        ? { homeVenueId: home.id, ...(!moved ? { venueHome: home } : {}) }
        : {}),
    };
  });
}
