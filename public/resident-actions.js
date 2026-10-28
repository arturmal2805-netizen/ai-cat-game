import {harvestMagicFruit} from './magic-bed-state.js';
import { activeCats } from "./cat-roster.js";
import { byBiome, CROPS } from "./game-data.js";
import { worldSnapshot, harvestField, plantCrop } from "./economy.js";
import { eatFromBowl, residentSwam } from "./care-system.js";
import { resolveInteraction } from "./interactions.js";
import {harvestOrchard} from './magic-farm-state.js';
import {farmActivity} from './magic-farms-data.js';
// A manual move commits only this cat's island through the normal shared save.
export function moveResidentToBiome(game, id, biome) {
  if (
    !activeCats(game).some((c) => c.id === id) ||
    !byBiome(biome) ||
    !game.unlocked.includes(biome)
  )
    throw Error("Цього котика або острів ще не відкрито.");
  const next = structuredClone(game);
  next.catDestinations[id] = biome;
  return next;
}
export function completeResidentAction(game, id, decision, now = Date.now(), result = {}) {
  if (!activeCats(game).some((c) => c.id === id))
    throw Error("Котик поки недоступний.");
  const d = resolveInteraction(worldSnapshot(game, now), decision);
  if (d.action === "eat") return eatFromBowl(game, id, now).game;
  if (d.action === "swim") return residentSwam(game, id, now);
  let next = structuredClone(game);
  if(d.action==='farm'&&result.bedHarvest){if(d.activityId!==result.bedHarvest.field)throw Error('Невідповідна грядка.');next=harvestMagicFruit(next,result.bedHarvest,now).game;}
  else if(d.action==='farm'&&result.magicHarvest){if(farmActivity(d.activityId)?.id!==result.magicHarvest.farm)throw Error('Невідповідна ферма.');next=harvestOrchard(next,result.magicHarvest,now).game;}
  else if (d.action === "farm") {
    const cells = next.farm.fields[d.activityId] || [];
    if (cells.some((c) => c.crop && c.readyAt <= now))
      next = harvestField(next, d.activityId, now).game;
    else {
      const empty = cells.findIndex((c) => !c.crop),
        crop = CROPS.find(
          (c) => game.unlocked.includes(c.biome) && c.seed <= game.coins,
        );
      if (empty >= 0 && crop)
        next = plantCrop(next, d.activityId, empty, crop.id, now);
    }
  }
  const needs = next.care.residents[id];
  needs.happiness = Math.min(
    100,
    needs.happiness + (d.action === "rest" ? 5 : 8),
  );
  if (d.action !== "rest") needs.hunger = Math.min(100, needs.hunger + 2);
  return next;
}
