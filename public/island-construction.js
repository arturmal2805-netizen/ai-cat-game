import { constructionDeadline } from "./construction-boost.js";
import { COURT_VENUES, courtObject, courtProject } from "./foodcourt-data.js";
import { purchaseXP } from "./progression.js";
import { COTTON_OBJECTS, COTTON_RIDES } from "./cotton-data.js";

import {ZOO_EXHIBITS,ZOO_ID} from "./zoo-data.js";
const projects = COTTON_OBJECTS.filter((o) => !o.type.startsWith("ride-pig-"));
// A single, write-once opening timestamp keeps every deadline identical on
// both phones. Finished rides need no background job or recurring save write.
export function normalizeIslandConstruction(raw) {
  const state = {};
  for (const id of [
    "clockwork",
    ...COURT_VENUES.filter((o) => o.requiresBuild).map((o) => o.id),
  ]) {
    const t = raw?.[id];
    if (Number.isSafeInteger(t) && t > 0 && t < 1e15) state[id] = t;
  }
  return state;
}
export function mergeIslandConstruction(...states) {
  const out = {};
  for (const state of states)
    for (const [id, t] of Object.entries(normalizeIslandConstruction(state)))
      out[id] = Math.min(out[id] || t, t);
  return out;
}
export function startCourtConstruction(game, id, now = Date.now()) {
  const p = courtProject(game, id, now);
  if (!p || !p.requiresBuild) throw Error("Эта площадка недоступна.");
  if (!p.unstarted)
    throw Error("Строительство уже начато. Оплата не нужна повторно.");
  if (game.coins < p.price)
    throw Error("Не хватает монет для открытия заведения.");
  const next = structuredClone(game);
  next.coins -= p.price;
  next.islandConstruction = {
    ...normalizeIslandConstruction(next.islandConstruction),
    [id]: now,
  };
  next.business.accounts[id] = {
    collectedAt: constructionDeadline(
      { startedAt: now, readyAt: now + p.buildMinutes * 60000 },
      next.builderBoosts,
    ),
    xpRemainder: 0,
  };
  return purchaseXP(next, id, p.price, now);
}
export function startIslandConstruction(game, biome, now = Date.now()) {
  if (biome !== "clockwork" || game.islandConstruction?.clockwork) return game;
  return {
    ...game,
    islandConstruction: { ...game.islandConstruction, clockwork: now },
  };
}
export function islandProject(game, id, now = Date.now()) {
  if (courtObject(id)) return courtProject(game, id, now);
  const o = projects.find((o) => o.id === id);
  if (!o || !game.unlocked.includes(o.biome)) return null;
  const spec = COTTON_RIDES.find((r) => r.id === o.type),
    startedAt =
      normalizeIslandConstruction(game.islandConstruction).clockwork || 0,
    readyAt = startedAt
      ? constructionDeadline(
          { startedAt, readyAt: startedAt + spec.buildMinutes * 60000 },
          game.builderBoosts,
        )
      : 0;
  // Existing opened worlds keep their completed park; migration must never
  // take away a ride that a player could already use.
  return {
    ...o,
    name: spec.name,
    icon: spec.icon,
    startedAt,
    readyAt,
    built: !readyAt || now >= readyAt,
    progress: readyAt
      ? Math.max(0, Math.min(1, (now - startedAt) / (readyAt - startedAt)))
      : 1,
  };
}
export function islandProjects(game, biome, now = Date.now()) {
  return (biome === ZOO_ID ? ZOO_EXHIBITS : biome === "foodcourt" ? COURT_VENUES : projects)
    .filter((o) => o.biome === biome)
    .map((o) => islandProject(game, o.id, now))
    .filter(Boolean)
    .sort((a, b) => a.readyAt - b.readyAt);
}
