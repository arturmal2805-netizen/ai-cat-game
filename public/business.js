import { byItem } from "./game-data.js";
import { BUSINESSES } from "./business-data.js";
import { addXP } from "./progression.js";
export const BUSINESS_CAP_HOURS = 8;
export function businessXP(item) {
  const rate = revenueRate(item);
  return rate ? Math.max(12, Math.round(rate * 0.25)) : 0;
}
export const revenueRate = (item) => {
  const business = BUSINESSES.find((b) => b.id === item);
  if (business) return business.rate;
  const product = byItem(item);
  if (!product) return 0;
  if (["cafe", "cat-barista"].includes(item))
    return item === "cat-barista" ? 320 : 140;
  if (["rides", "transport"].includes(product.category))
    return Math.max(45, Math.min(420, Math.round(product.price * 0.075)));
  return 0;
};
export const newBusiness = () => ({
  version: 1,
  accounts: {},
  totalCollected: 0,
});
export function normalizeBusiness(raw, game, now = Date.now()) {
  const state = newBusiness();
  state.totalCollected = Number.isFinite(raw?.totalCollected)
    ? Math.max(0, Math.floor(raw.totalCollected))
    : 0;
  for (const p of game.placements.filter((p) => revenueRate(p.item))) {
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
export function incomeFor(game, id, now = Date.now()) {
  const p = game.placements.find((p) => p.id === id);
  if (!p || (p.readyAt && p.readyAt > now)) return 0;
  const rate = revenueRate(p.item);
  if (!rate) return 0;
  const start = Math.max(
    game.business?.accounts?.[id]?.collectedAt ?? now,
    p.readyAt || 0,
  );
  const hours = Math.min(
    BUSINESS_CAP_HOURS,
    Math.max(0, now - start) / 3600000,
  );
  return Math.floor(hours * rate + 1e-9);
}
export function collectIncome(game, id, now = Date.now()) {
  const amount = incomeFor(game, id, now);
  if (amount < 1) throw Error("Монетки ещё копятся. Загляните чуть позже.");
  const next = structuredClone(game),
    item = next.placements.find((p) => p.id === id).item,
    rate = revenueRate(item),
    rawXP =
      (next.business.accounts[id]?.xpRemainder || 0) +
      (amount * businessXP(item)) / rate,
    xp = Math.floor(rawXP + 1e-9);
  const old = next.business.accounts[id]?.collectedAt ?? now;
  // Preserve the unfinished fraction of a coin. Time beyond the full cash
  // register is intentionally capped, so long absences cannot break prices.
  const start = Math.max(old, now - BUSINESS_CAP_HOURS * 3600000);
  next.business.accounts[id] = {
    collectedAt: start + (amount / rate) * 3600000,
    xpRemainder: Math.max(0, rawXP - xp),
  };
  next.business.totalCollected += amount;
  next.coins += amount;
  next.totalEarned += amount;
  const rewarded = addXP(next, xp, now);
  return {
    game: rewarded,
    amount,
    xp: rewarded.progression.xp - game.progression.xp,
  };
}
