import { byItem, BIOMES } from "./game-data.js";
import { islandObjects } from "./world-objects.js";
import { HOME_OBJECTS, activityActions } from "./interactions.js";
import { courtObject, COURT_MENU } from "./foodcourt-data.js";
import { SPA_DRINKS } from "./spa-data.js";
import { bowlPortions } from "./care-system.js";
import { familyPartner } from "./family-system.js";
export function leisurePlanOwner(game, id) {
  const partner = familyPartner(game, id);
  if (!partner) return id;
  if (id === "chichi" || partner === "chichi") return "chichi";
  return game.jobCity?.profiles[id]?.sex === "male" ? id : partner;
}
const priorities = [
  "eat",
  "ride",
  "swim",
  "play",
  "rest",
  "explore",
  "farm",
  "party",
];
export function leisureOffers(game, now = Date.now()) {
  const objects = [
    ...HOME_OBJECTS,
    ...islandObjects(game, { now }),
    ...game.placements
      .filter((p) => !p.readyAt || p.readyAt <= now)
      .map((p) => ({ ...p, type: p.item })),
  ];
  const seen = new Set();
  return objects.flatMap((o) => {
    if (seen.has(o.id) || !game.unlocked.includes(o.biome)) return [];
    seen.add(o.id);
    const item = byItem(o.type),
      actions = activityActions(o),
      action = priorities.find((a) => actions.includes(a));
    if (!item || !action) return [];
    const venue = courtObject(o.id),
      menu = venue && COURT_MENU[venue.kind];
    if (
      action === "eat" &&
      (menu
        ? game.coins < menu.price
        : o.id === "spa-bar"
          ? game.coins <
            (
              SPA_DRINKS.find((d) => d.id === game.spa?.selectedDrink) ||
              SPA_DRINKS[0]
            ).price
          : bowlPortions(game) <= 0)
    )
      return [];
    return [
      {
        id: o.id,
        type: o.type,
        biome: o.biome,
        name: o.name || item.name,
        action,
      },
    ];
  });
}
export function validateLeisureOffers(raw = []) {
  if (!Array.isArray(raw) || raw.length > 1024)
    throw Error("Invalid leisure catalogue");
  const seen = new Set();
  return raw.map((o) => {
    if (
      !o ||
      typeof o.id !== "string" ||
      !/^[\w-]{1,90}$/.test(o.id) ||
      seen.has(o.id) ||
      !BIOMES.some((b) => b.id === o.biome) ||
      !activityActions(o).includes(o.action) ||
      !priorities.includes(o.action)
    )
      throw Error("Invalid leisure offer");
    seen.add(o.id);
    return {
      id: o.id,
      type: o.type,
      biome: o.biome,
      name: String(o.name || byItem(o.type).name).slice(0, 80),
      action: o.action,
    };
  });
}
export function completeLeisure(game, id, day, index, biome) {
  const p = game.jobCity?.profiles[id];
  if (
    !p ||
    p.schedule?.day !== day ||
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index > 2 ||
    (p.leisureProgress?.day === day && p.leisureProgress.done > index)
  )
    return game;
  const next = structuredClone(game),
    profile = next.jobCity.profiles[id];
  profile.leisureProgress = {
    day,
    done: Math.max(
      index + 1,
      profile.leisureProgress?.day === day ? profile.leisureProgress.done : 0,
    ),
  };
  if (next.unlocked.includes(biome)) {
    if (id !== "chichi") next.catDestinations[id] = biome;
  }
  return next;
}
