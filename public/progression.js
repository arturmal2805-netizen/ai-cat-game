export const PROGRESSION_VERSION = 1,
  MAX_LEVEL = 30,
  DAILY_XP_LIMIT = 1800;
export const gameDay = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
export const xpForLevel = (level) =>
  level <= 1 ? 0 : Math.round(80 * (level - 1) ** 1.55 + 40 * (level - 1));
export function levelForXP(xp = 0) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}
export function newProgression() {
  return {
    version: PROGRESSION_VERSION,
    xp: 0,
    dailyXP: 0,
    xpDay: null,
    visits: 0,
    lastVisitDay: null,
    discoveries: [],
    lastAdventureAt: 0,
  };
}
export function normalizeProgression(raw, game) {
  const p = newProgression();
  if (raw?.version !== PROGRESSION_VERSION) {
    p.xp = Math.min(
      6000,
      (game.farm?.harvests || 0) * 10 +
        Math.max(0, game.unlocked.length - 1) * 160 +
        game.placements.filter((x) => !x.id.startsWith("welcome-")).length * 45,
    );
    p.visits = game.lastVisit ? 1 : 0;
    p.lastVisitDay = game.lastVisit;
    return p;
  }
  for (const key of ["xp", "dailyXP", "visits", "lastAdventureAt"])
    p[key] = Number.isFinite(raw[key])
      ? Math.max(
          0,
          Math.min(
            key === "xp"
              ? 1000000
              : key === "dailyXP"
                ? DAILY_XP_LIMIT
                : key === "visits"
                  ? 10000
                  : 1e15,
            Math.floor(raw[key]),
          ),
        )
      : 0;
  for (const key of ["xpDay", "lastVisitDay"])
    p[key] = /^\d{4}-\d{2}-\d{2}$/.test(raw[key] || "") ? raw[key] : null;
  p.discoveries = [
    ...new Set(
      (Array.isArray(raw.discoveries) ? raw.discoveries : []).filter(
        (id) => typeof id === "string" && /^[\w-]{1,40}$/.test(id),
      ),
    ),
  ].slice(0, 200);
  return p;
}
export function addXP(game, amount, now = Date.now()) {
  const p = game.progression,
    day = gameDay(now);
  if (p.xpDay && day < p.xpDay) return game;
  const next = structuredClone(game),
    n = next.progression,
    before = levelForXP(n.xp);
  if (n.xpDay !== day) {
    n.xpDay = day;
    n.dailyXP = 0;
  }
  const gain = Math.min(
    Math.max(0, Math.floor(amount)),
    DAILY_XP_LIMIT - n.dailyXP,
    Math.max(0, xpForLevel(MAX_LEVEL) - n.xp),
  );
  n.xp += gain;
  n.dailyXP += gain;
  const after = levelForXP(n.xp);
  for (let level = before + 1; level <= after; level++) {
    const coins = 30 + level * 15;
    next.coins += coins;
    next.totalEarned += coins;
  }
  return next;
}
export function visitXP(game, now = Date.now()) {
  const day = gameDay(now);
  if (game.progression.lastVisitDay && day <= game.progression.lastVisitDay)
    return game;
  const next = structuredClone(game);
  next.progression.lastVisitDay = day;
  next.progression.visits++;
  return addXP(next, 40, now);
}
export function purchaseXP(game, id, price, now = Date.now()) {
  if (game.progression.discoveries.includes(id)) return game;
  const next = structuredClone(game);
  next.progression.discoveries.push(id);
  return addXP(
    next,
    Math.max(25, Math.min(240, Math.round(price * 0.08))),
    now,
  );
}
export function adventureXP(game, now = Date.now()) {
  if (now - game.progression.lastAdventureAt < 180000) return game;
  const next = structuredClone(game);
  next.progression.lastAdventureAt = now;
  return addXP(next, 16, now);
}
export function levelRequirement(game, level = 1) {
  const current = levelForXP(game.progression?.xp || 0);
  return current < level
    ? `Откроется на уровне ${level} · ваш уровень ${current}`
    : "";
}
export function levelStatus(game) {
  const xp = game.progression.xp,
    level = levelForXP(xp),
    start = xpForLevel(level),
    end = xpForLevel(level + 1);
  return {
    level,
    xp,
    needed: level === MAX_LEVEL ? 0 : end - xp,
    progress: level === MAX_LEVEL ? 100 : ((xp - start) / (end - start)) * 100,
  };
}
