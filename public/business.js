import { DIAMOND_MINE } from "./diamond-data.js";
import { courtType, courtBusinessVenues } from "./foodcourt-data.js";
import { byItem } from "./game-data.js";
import { BUSINESSES } from "./business-data.js";
import { addXP, addBusinessXP } from "./progression.js";
export const BUSINESS_CAP_HOURS = 8;
export const BUSINESS_LEVELS = [
  {
    name: "Уютное начало",
    coins: 1,
    xp: 1,
    decor: "Знакомая маленькая лавочка",
  },
  {
    name: "Тёплые огоньки",
    coins: 1.45,
    xp: 1.5,
    decor: "Гирлянды, фонари и полосатый навес",
  },
  {
    name: "Любимое место",
    coins: 2.05,
    xp: 2.2,
    decor: "Богатая витрина, цветы и столик для гостей",
  },
  {
    name: "Звезда острова",
    coins: 2.85,
    xp: 3.1,
    decor: "Золотая вывеска, праздничные флажки и ещё больше товаров",
  },
  {
    name: "Легендарный бизнес",
    coins: 3.8,
    xp: 4.2,
    decor: "Цветочная арка, сияющая корона и роскошный декор",
  },
];
export const normalizeBusinessLevel = (value) =>
  Number.isSafeInteger(value)
    ? Math.max(1, Math.min(BUSINESS_LEVELS.length, value))
    : 1;
export const businessLevel = (game, id) =>
  normalizeBusinessLevel(game.business?.levels?.[id]);
export function businessUpgradeCost(item, level = 1) {
  if (!revenueRate(item) || level >= BUSINESS_LEVELS.length) return 0;
  return (
    Math.round(
      (Math.max(120, (byItem(item)?.price || 720) * 0.65) *
        1.85 ** (level - 1)) /
        10,
    ) * 10
  );
}
export function businessVenues(game) {
  return [
    ...game.placements,
    ...courtBusinessVenues(game),
    ...(game.unlocked.includes("water")
      ? [
          {
            id: "spa-bar",
            item: "cat-barista",
            biome: "water",
            x: 9.2,
            z: -13,
            rotation: 0,
            readyAt: 0,
          },
        ]
      : []),
  ].filter((p) => revenueRate(p.item));
}
export function businessXP(item, level = 1) {
  const rate = revenueRate(item);
  return rate
    ? Math.round(
        Math.max(30, Math.round(rate * 0.38)) *
          BUSINESS_LEVELS[normalizeBusinessLevel(level) - 1].xp,
      )
    : 0;
}
export const revenueRate = (item, level = 1) => {
  const base = baseRevenue(item);
  return Math.round(
    base * BUSINESS_LEVELS[normalizeBusinessLevel(level) - 1].coins,
  );
};
export const incomeCurrency = (item) =>
  item === DIAMOND_MINE.id ? "diamonds" : "coins";
export const incomeSymbol = (item) =>
  incomeCurrency(item) === "diamonds" ? "💎" : "✦";
function baseRevenue(item) {
  if (item === DIAMOND_MINE.id) return DIAMOND_MINE.rate;
  if (courtType(item)) return courtType(item).rate;
  const business = BUSINESSES.find((b) => b.id === item);
  if (business) return business.rate;
  const product = byItem(item);
  if (!product) return 0;
  if (product.referenceSlide && Number.isSafeInteger(product.incomePerHour)) return product.incomePerHour;
  if (["cafe", "cat-barista"].includes(item))
    return item === "cat-barista" ? 320 : 140;
  if (["rides", "transport"].includes(product.category))
    return Math.max(70, Math.min(650, Math.round(product.price * 0.1)));
  return 0;
}
export const newBusiness = () => ({
  version: 1,
  accounts: {},
  levels: {},
  totalCollected: 0,
  totalDiamonds: 0,
});
export function normalizeBusiness(raw, game, now = Date.now()) {
  const state = newBusiness();
  state.totalCollected = Number.isFinite(raw?.totalCollected)
    ? Math.max(0, Math.floor(raw.totalCollected))
    : 0;
  state.totalDiamonds = Number.isSafeInteger(raw?.totalDiamonds)
    ? Math.max(0, raw.totalDiamonds)
    : 0;
  for (const p of businessVenues(game)) {
    const level = normalizeBusinessLevel(raw?.levels?.[p.id]);
    if (level > 1) state.levels[p.id] = level;
    const old = raw?.accounts?.[p.id];
    const start = Number.isFinite(old?.collectedAt)
      ? Math.max(0, Math.min(1e15, old.collectedAt))
      : now;
    state.accounts[p.id] = {
      collectedAt: Math.max(start, p.readyAt || 0),
      xpRemainder: Number.isFinite(old?.xpRemainder)
        ? Math.max(0, Math.min(0.999999999, old.xpRemainder))
        : 0,
    };
  }
  return state;
}
function businessStart(game, p, now) {
  const old = game.business?.accounts?.[p.id]?.collectedAt ?? now;
  return Math.max(
    p.boostBaseReadyAt && old === p.boostBaseReadyAt ? p.readyAt : old,
    p.readyAt || 0,
  );
}
export function incomeFor(game, id, now = Date.now()) {
  const p =
    id === "spa-bar" && game.unlocked.includes("water")
      ? { id, item: "cat-barista", readyAt: 0 }
      : businessVenues(game).find((p) => p.id === id);
  return incomeForVenue(game, p, now);
}
// Bulk HUD/menu reads already know the venue. Avoid rebuilding and searching
// the entire register list once for every business on every timer tick.
export function incomeForVenue(game, p, now = Date.now()) {
  if (!p || (p.readyAt && p.readyAt > now)) return 0;
  const rate = revenueRate(p.item, businessLevel(game, p.id));
  if (!rate) return 0;
  const start = businessStart(game, p, now);
  const hours = Math.min(
    BUSINESS_CAP_HOURS,
    Math.max(0, now - start) / 3600000,
  );
  return Math.floor(hours * rate + 1e-9);
}
export function collectIncome(game, id, now = Date.now()) {
  const amount = incomeFor(game, id, now);
  if (amount < 1)
    throw Error("Монетки и алмазы ещё копятся. Загляните чуть позже.");
  const next = structuredClone(game),
    item = businessVenues(next).find((p) => p.id === id).item,
    level = businessLevel(game, id),
    rate = revenueRate(item, level),
    rawXP =
      (next.business.accounts[id]?.xpRemainder || 0) +
      (amount * businessXP(item, level)) / rate,
    xp = Math.floor(rawXP + 1e-9);
  const old = businessStart(
    game,
    businessVenues(game).find((p) => p.id === id),
    now,
  );
  // Preserve the unfinished fraction of a coin. Time beyond the full cash
  // register is intentionally capped, so long absences cannot break prices.
  const start = Math.max(old, now - BUSINESS_CAP_HOURS * 3600000);
  next.business.accounts[id] = {
    collectedAt: start + (amount / rate) * 3600000,
    xpRemainder: Math.max(0, rawXP - xp),
  };
  const currency = incomeCurrency(item);
  if (currency === "diamonds") {
    next.diamonds = (next.diamonds || 0) + amount;
    next.business.totalDiamonds = (next.business.totalDiamonds || 0) + amount;
  } else {
    next.business.totalCollected += amount;
    next.coins += amount;
    next.totalEarned += amount;
  }
  const rewarded = addBusinessXP(next, xp, now);
  return {
    game: rewarded,
    amount,
    currency,
    xp: rewarded.progression.xp - game.progression.xp,
  };
}
// Settle the old rate first. Only future time earns the upgraded rate; the
// unfinished fraction of a coin is carried forward instead of disappearing.
export function upgradeBusiness(game, id, now = Date.now()) {
  const venue = businessVenues(game).find((p) => p.id === id),
    level = businessLevel(game, id);
  if (!venue || (venue.readyAt || 0) > now)
    throw Error("Спочатку дочекайтеся завершення будівництва.");
  if (level >= BUSINESS_LEVELS.length)
    throw Error("Цей бізнес уже легендарний!");
  const cost = businessUpgradeCost(venue.item, level);
  if (game.coins < cost) throw Error("Недостатньо монет для покращення.");
  const start = businessStart(game, venue, now),
    oldRate = revenueRate(venue.item, level),
    exact =
      Math.min(BUSINESS_CAP_HOURS, Math.max(0, now - start) / 3600000) *
      oldRate,
    amount = incomeFor(game, id, now),
    settled = amount
      ? collectIncome(game, id, now).game
      : structuredClone(game);
  settled.coins -= cost;
  settled.business.levels ||= {};
  settled.business.levels[id] = level + 1;
  settled.business.accounts[id] = {
    ...settled.business.accounts[id],
    collectedAt:
      now -
      (Math.max(0, exact - amount) / revenueRate(venue.item, level + 1)) *
        3600000,
  };
  const next = addXP(
    settled,
    Math.min(80, Math.max(15, Math.round(cost * 0.04))),
    now,
  );
  return { game: next, level: level + 1, cost, collected: amount };
}
// A single confirmed snapshot for the whole collection; repeated clicks at
// this same instant cannot collect the same income or experience twice.
export function collectAllIncome(game, now = Date.now()) {
  let next = game,
    amount = 0,
    diamonds = 0,
    count = 0;
  for (const p of businessVenues(game)) {
    if (incomeFor(next, p.id, now) < 1) continue;
    const result = collectIncome(next, p.id, now);
    next = result.game;
    if (result.currency === "diamonds") diamonds += result.amount;
    else amount += result.amount;
    count++;
  }
  if (!count) throw Error("Монетки ещё копятся. Загляните чуть позже.");
  return {
    game: next,
    amount,
    diamonds,
    count,
    xp: next.progression.xp - game.progression.xp,
  };
}
