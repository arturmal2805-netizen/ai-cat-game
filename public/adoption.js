import {gatherCandidates} from './gather-system.js';
import { ADOPTION_CATS } from "./cat-breeds.js";
import { activeCats } from "./cat-roster.js";
import { byBiome } from "./game-data.js";
import { addXP, levelRequirement } from "./progression.js";
export const newAdoption = () => ({ version: 1, cats: [] });
export function normalizeAdoption(raw, game) {
  const state = newAdoption(),
    seen = new Set();
  for (const record of (Array.isArray(raw?.cats) ? raw.cats : []).slice(
    0,
    ADOPTION_CATS.length,
  )) {
    if (!ADOPTION_CATS.some((c) => c.id === record?.id) || seen.has(record.id))
      continue;
    seen.add(record.id);
    state.cats.push({
      id: record.id,
      adoptedAt: Number.isFinite(record.adoptedAt)
        ? Math.max(0, record.adoptedAt)
        : 0,
      homeBiome: game.unlocked.includes(record.homeBiome)
        ? record.homeBiome
        : "moon",
      centerId:
        typeof record.centerId === "string" ? record.centerId.slice(0, 40) : "",
    });
  }
  return state;
}
export function adoptionCenters(game, now = Date.now()) {
  return game.placements.filter(
    (p) => p.item === "adoption-center" && (!p.readyAt || p.readyAt <= now),
  );
}
export function adoptCat(game, catId, centerId, now = Date.now()) {
  const profile = ADOPTION_CATS.find((c) => c.id === catId),
    center = adoptionCenters(game, now).find((p) => p.id === centerId);
  if (!center) throw Error("Сначала постройте Cat Adoption Center.");
  if (!profile) throw Error("Котик не найден.");
  if (game.adoption.cats.some((c) => c.id === catId))
    throw Error("Этот котик уже дома.");
  const requirement = levelRequirement(game, profile.requiredLevel);
  if (requirement) throw Error(requirement);
  if (game.coins < profile.price)
    throw Error("Недостаточно монет для усыновления.");
  const next = structuredClone(game);
  next.coins -= profile.price;
  next.adoption.cats.push({
    id: catId,
    adoptedAt: now,
    homeBiome: center.biome,
    centerId,
  });
  next.catDestinations[catId] = center.biome;
  next.care.residents[catId] = {
    hunger: 25,
    happiness: 65,
    lastMealAt: now,
    lastSwimAt: 0,
  };
  return addXP(next, 45, now);
}
export function gatherCats(game, biome, {ids=null,now=Date.now()}={}) {
  if (!byBiome(biome) || !game.unlocked.includes(biome))
    throw Error("Сначала откройте остров.");
  const next = structuredClone(game);
  const selected=new Set(ids||gatherCandidates(game,now));
  for (const cat of activeCats(game)) if(selected.has(cat.id))next.catDestinations[cat.id] = biome;
  const arrival = byBiome(biome).arrival || [0, 0];
  if(selected.has("chichi")){next.catPosition = { biome, x: arrival[0], z: arrival[1] };next.care.resting = null;}
  return next;
}
export function normalizeDestinations(raw, game) {
  return Object.fromEntries(
    activeCats({ ...game, catDestinations: raw || {} })
      .filter((cat) => game.unlocked.includes(raw?.[cat.id]))
      .map((cat) => [cat.id, raw[cat.id]]),
  );
}
