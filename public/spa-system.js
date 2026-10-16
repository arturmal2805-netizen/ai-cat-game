import { SPA_DRINKS, spaObject } from "./spa-data.js";
const clamp = (v) => Math.max(0, Math.min(100, v));
export const newSpa = () => ({
  version: 1,
  selectedDrink: "milk",
  receipts: [],
  visits: {},
});
export function normalizeSpa(raw) {
  const state = newSpa();
  if (SPA_DRINKS.some((d) => d.id === raw?.selectedDrink))
    state.selectedDrink = raw.selectedDrink;
  state.receipts = [
    ...new Set(
      (Array.isArray(raw?.receipts) ? raw.receipts : []).filter(
        (id) => typeof id === "string" && /^[\w-]{1,80}$/.test(id),
      ),
    ),
  ].slice(-96);
  for (const [id, time] of Object.entries(raw?.visits || {}).slice(0, 100))
    if (/^[\w-]{1,60}$/.test(id) && Number.isFinite(time))
      state.visits[id] = Math.max(0, Math.min(1e15, time));
  return state;
}
export function selectSpaDrink(game, id) {
  if (!game.unlocked.includes("water"))
    throw Error("Спочатку відкрийте Cat SPA.");
  const drink = SPA_DRINKS.find((d) => d.id === id);
  if (!drink) throw Error("Цього напою немає в меню.");
  if (game.coins < drink.price) throw Error("Не вистачає монет на напій.");
  const next = structuredClone(game);
  next.spa = normalizeSpa(next.spa);
  next.spa.selectedDrink = id;
  return next;
}
// No charge for reserving a place or cancelling a visit. A served drink and
// its needs/currency changes are committed together in the normal save path.
export function completeSpaVisit(game, visit, now = Date.now()) {
  if (
    !game.unlocked.includes("water") ||
    !spaObject(visit?.objectId) ||
    !/^[\w-]{1,80}$/.test(visit?.id || "")
  )
    throw Error("Недійсний візит до SPA.");
  const next = structuredClone(game);
  next.spa = normalizeSpa(next.spa);
  if (next.spa.receipts.includes(visit.id)) return game;
  const hero = visit.catId === "chichi",
    needs = hero ? next.cat : next.care?.residents?.[visit.catId];
  if (!needs) return game;
  if (visit.objectId === "spa-bar") {
    const drink = SPA_DRINKS.find((d) => d.id === visit.drinkId);
    if (!drink) throw Error("Недійсний напій.");
    if (hero) {
      if (next.coins < drink.price)
        throw Error("Не вистачає монет на напій. Монети не списані.");
      next.coins -= drink.price;
      next.cat.energy = clamp(next.cat.energy + drink.energy);
    }
    needs.hunger = clamp(needs.hunger - drink.hunger);
    needs.happiness = clamp(needs.happiness + drink.happiness);
    needs.lastMealAt = now;
  } else {
    needs.happiness = clamp(
      needs.happiness + (visit.objectId === "lake-water" ? 12 : 9),
    );
    if (hero)
      next.cat.energy = clamp(
        next.cat.energy +
          (visit.objectId === "spa-lounge"
            ? 18
            : visit.objectId === "spa-jacuzzi"
              ? 12
              : -4),
      );
    if (visit.objectId === "lake-water") needs.lastSwimAt = now;
  }
  next.spa.receipts.push(visit.id);
  next.spa.receipts = next.spa.receipts.slice(-96);
  next.spa.visits[visit.catId] = now;
  if (
    hero &&
    Number.isFinite(visit.position?.x) &&
    Number.isFinite(visit.position?.z)
  )
    next.catPosition = {
      biome: "water",
      x: visit.position.x,
      z: visit.position.z,
    };
  return next;
}
