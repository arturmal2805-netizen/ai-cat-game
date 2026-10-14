import { NEIGHBORS, CROPS, byItem } from "./game-data.js";
export const CARE_VERSION = 1,
  NEEDS_MINUTE = 60000,
  BOWL_CAPACITY = 160;
const clamp = (n) => Math.max(0, Math.min(100, n));
const number = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
export const foodYield = (crop) =>
  6 + Math.min(10, Math.floor(crop.value / 15));
export const foodNutrition = (crop) =>
  18 + Math.min(12, Math.floor(crop.value / 25));
export function newCare(now = Date.now()) {
  return {
    version: CARE_VERSION,
    lastTick: now,
    resting: null,
    bowl: [],
    residents: Object.fromEntries(
      NEIGHBORS.map((n, i) => [
        n.id,
        { hunger: 30 + (i % 3) * 4, happiness: 72, lastMealAt: 0 },
      ]),
    ),
    mealId: 0,
    recentMeals: [],
  };
}
export function normalizeCare(raw, game, now = Date.now()) {
  const care = newCare(now);
  if (raw?.version !== CARE_VERSION) return care;
  care.lastTick = Math.max(0, number(raw.lastTick, now));
  care.mealId = Math.max(0, Math.floor(number(raw.mealId)));
  let capacity = BOWL_CAPACITY;
  for (const batch of (Array.isArray(raw.bowl) ? raw.bowl : []).slice(0, 24)) {
    const crop = CROPS.find((c) => c.id === batch?.crop);
    if (!crop) continue;
    const portions = Math.min(
      capacity,
      Math.max(0, Math.floor(number(batch.portions))),
    );
    if (portions) {
      care.bowl.push({ crop: crop.id, portions });
      capacity -= portions;
    }
  }
  for (const n of NEIGHBORS) {
    const old = raw.residents?.[n.id];
    if (old)
      care.residents[n.id] = {
        hunger: clamp(number(old.hunger, 35)),
        happiness: clamp(number(old.happiness, 72)),
        lastMealAt: Math.max(0, number(old.lastMealAt)),
      };
  }
  const r = raw.resting;
  if (
    r &&
    typeof r.activityId === "string" &&
    (r.activityId === "chichi-bed" ||
      game.placements.some(
        (p) =>
          p.id === r.activityId &&
          byItem(p.item).actions.includes("rest") &&
          (!p.readyAt || p.readyAt <= now),
      ))
  )
    care.resting = {
      activityId: r.activityId,
      since: Math.max(0, number(r.since, now)),
    };
  return care;
}
export const bowlPortions = (game) =>
  (game.care?.bowl || []).reduce((n, b) => n + b.portions, 0);
export function fillBowl(game, cropId, quantity = 1) {
  const crop = CROPS.find((c) => c.id === cropId);
  if (!crop || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20)
    throw Error("Выберите урожай и количество от 1 до 20.");
  if ((game.farm.stock[cropId] || 0) < quantity)
    throw Error("На складе не хватает этого урожая.");
  const portions = foodYield(crop) * quantity;
  if (bowlPortions(game) + portions > BOWL_CAPACITY)
    throw Error("В миске пока недостаточно места. Добавьте меньше урожая.");
  const next = structuredClone(game);
  next.farm.stock[cropId] -= quantity;
  const existing = next.care.bowl.find((b) => b.crop === cropId);
  if (existing) existing.portions += portions;
  else next.care.bowl.push({ crop: cropId, portions });
  return next;
}
function consume(next, id, now, offline = false) {
  const needs = id === "chichi" ? next.cat : next.care.residents[id],
    batch = next.care.bowl[0];
  if (!needs || !batch) return null;
  const crop = CROPS.find((c) => c.id === batch.crop);
  batch.portions--;
  if (batch.portions === 0) next.care.bowl.shift();
  needs.hunger = clamp(needs.hunger - foodNutrition(crop));
  needs.happiness = clamp(needs.happiness + 4);
  if (id !== "chichi") needs.lastMealAt = now;
  const meal = {
    id: ++next.care.mealId,
    cat: id,
    crop: crop.id,
    at: now,
    offline,
  };
  next.care.recentMeals = [...(next.care.recentMeals || []), meal].slice(-12);
  return meal;
}
export function eatFromBowl(game, id = "chichi", now = Date.now()) {
  if (
    id !== "chichi" &&
    !NEIGHBORS.some((n) => n.id === id && game.unlocked.includes(n.biome))
  )
    throw Error("Котик пока недоступен.");
  if (!bowlPortions(game))
    throw Error("Миска пустая. Добавьте урожай со склада фермы.");
  const next = structuredClone(game),
    meal = consume(next, id, now);
  return { game: next, meal };
}
export function startRest(game, activityId, now = Date.now()) {
  if (
    activityId !== "chichi-bed" &&
    !game.placements.some(
      (p) =>
        p.id === activityId &&
        byItem(p.item).actions.includes("rest") &&
        (!p.readyAt || p.readyAt <= now),
    )
  )
    throw Error("Место для сна пока недоступно.");
  const next = structuredClone(game);
  next.care.resting = { activityId, since: now };
  return next;
}
export function advanceCare(game, now = Date.now(), { offline = false } = {}) {
  const elapsed = Math.floor(
    Math.max(0, now - game.care.lastTick) / NEEDS_MINUTE,
  );
  if (!elapsed) return game;
  const next = structuredClone(game),
    ticks = Math.min(elapsed, 4320),
    residents = NEIGHBORS.filter((n) => next.unlocked.includes(n.biome)).map(
      (n) => n.id,
    );
  for (let i = 1; i <= ticks; i++) {
    const time = next.care.lastTick + (elapsed - ticks + i) * NEEDS_MINUTE;
    if (
      next.care.resting &&
      next.care.resting.activityId !== "chichi-bed" &&
      !next.placements.some(
        (p) =>
          p.id === next.care.resting.activityId &&
          (!p.readyAt || p.readyAt <= time),
      )
    )
      next.care.resting = null;
    const resting = !!next.care.resting;
    next.cat.hunger = clamp(next.cat.hunger + (resting ? 0.65 : 1.8));
    next.cat.energy = clamp(next.cat.energy + (resting ? 3.2 : -0.8));
    next.cat.happiness = clamp(
      next.cat.happiness + (next.cat.hunger > 75 ? -1.2 : resting ? 0.3 : -0.1),
    );
    if (next.cat.energy >= 99 && resting) next.care.resting = null;
    for (const id of residents) {
      const pet = next.care.residents[id];
      pet.hunger = clamp(pet.hunger + 1.4);
      pet.happiness = clamp(
        pet.happiness +
          (pet.hunger > 75 ? -1.1 : pet.hunger < 25 ? 0.15 : -0.08),
      );
    }
    if (offline) {
      const ids = ["chichi", ...residents],
        turn = Math.floor(time / NEEDS_MINUTE) % ids.length;
      for (let j = 0; j < ids.length; j++) {
        const id = ids[(j + turn) % ids.length],
          needs = id === "chichi" ? next.cat : next.care.residents[id];
        if (
          needs.hunger >= 45 &&
          bowlPortions(next) > 0 &&
          !(id === "chichi" && next.care.resting)
        )
          consume(next, id, time, true);
      }
    }
  }
  next.care.lastTick += elapsed * NEEDS_MINUTE;
  return next;
}
export function colonyNeeds(game) {
  const residents = NEIGHBORS.filter((n) =>
    game.unlocked.includes(n.biome),
  ).map((n) => game.care.residents[n.id]);
  return {
    count: residents.length,
    hunger: residents.length
      ? residents.reduce((n, p) => n + p.hunger, 0) / residents.length
      : 0,
    happiness: residents.length
      ? residents.reduce((n, p) => n + p.happiness, 0) / residents.length
      : 100,
  };
}
