export const BUILDER_BOOST_COST = 8,
  BUILDER_BOOST_MS = 3600000,
  BUILDER_BOOST_SPEED = 10;
export function normalizeBuilderBoosts(raw) {
  const events = new Map();
  for (const e of Array.isArray(raw) ? raw : [])
    if (
      typeof e?.id === "string" &&
      /^[\w-]{8,64}$/.test(e.id) &&
      Number.isSafeInteger(e.startedAt) &&
      e.startedAt > 0 &&
      e.startedAt < 1e15 &&
      e.until === e.startedAt + BUILDER_BOOST_MS
    )
      events.set(e.id, { id: e.id, startedAt: e.startedAt, until: e.until });
  return [...events.values()]
    .sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id))
    .slice(-64);
}
export function builderSpeed(game, now = Date.now()) {
  return (game.builderBoosts || []).some(
    (e) => e.startedAt <= now && now < e.until,
  )
    ? BUILDER_BOOST_SPEED
    : 1;
}
export function builderBoostUntil(game, now = Date.now()) {
  return Math.max(
    0,
    ...(game.builderBoosts || [])
      .filter((e) => e.startedAt <= now && now < e.until)
      .map((e) => e.until),
  );
}
// Integrate work across absolute saved intervals. An expired boost still counts
// toward completed construction; reloading never restarts an hour or multiplies
// a previously shortened deadline again. Overlapping intervals do not stack.
export function constructionDeadline(p, boosts = []) {
  const base = p.boostBaseReadyAt || p.readyAt;
  if (!base || !p.startedAt || base <= p.startedAt) return base || 0;
  let cursor = p.startedAt,
    work = base - cursor;
  for (const e of normalizeBuilderBoosts(boosts)) {
    if (e.until <= cursor) continue;
    const before = Math.max(0, e.startedAt - cursor);
    if (work <= before) return cursor + work;
    work -= before;
    cursor = Math.max(cursor, e.startedAt);
    const span = Math.max(0, e.until - cursor);
    if (work <= span * BUILDER_BOOST_SPEED)
      return Math.ceil(cursor + work / BUILDER_BOOST_SPEED);
    work -= span * BUILDER_BOOST_SPEED;
    cursor = e.until;
  }
  return Math.ceil(cursor + work);
}
export function resolveConstructionBoosts(game) {
  const boosts = normalizeBuilderBoosts(game.builderBoosts);
  if (!boosts.length) return game;
  let accounts = game.business?.accounts,
    changed = false;
  const placements = game.placements.map((p) => {
    const deadline = constructionDeadline(p, boosts);
    if (deadline === (p.readyAt || 0)) return p;
    changed = true;
    if (accounts?.[p.id]?.collectedAt === p.readyAt) {
      accounts = {
        ...accounts,
        [p.id]: { ...accounts[p.id], collectedAt: deadline },
      };
    }
    return {
      ...p,
      boostBaseReadyAt: p.boostBaseReadyAt || p.readyAt,
      readyAt: deadline,
    };
  });
  return changed
    ? { ...game, placements, business: { ...game.business, accounts } }
    : game;
}
export function activateBuilderBoost(game, now = Date.now()) {
  if (builderSpeed(game, now) > 1)
    throw Error("Котики уже ускорены. Дождитесь окончания этого часа.");
  if ((game.diamonds || 0) < BUILDER_BOOST_COST)
    throw Error(
      "Нужно " + BUILDER_BOOST_COST + " алмазов. Соберите их в алмазной шахте.",
    );
  const next = structuredClone(game);
  next.diamonds -= BUILDER_BOOST_COST;
  next.builderBoosts = normalizeBuilderBoosts([
    ...(next.builderBoosts || []),
    { id: crypto.randomUUID(), startedAt: now, until: now + BUILDER_BOOST_MS },
  ]);
  return resolveConstructionBoosts(next);
}
