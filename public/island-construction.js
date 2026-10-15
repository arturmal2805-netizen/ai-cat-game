import { COTTON_OBJECTS, COTTON_RIDES } from "./cotton-data.js";

const projects = COTTON_OBJECTS.filter((o) => !o.type.startsWith("ride-pig-"));
// A single, write-once opening timestamp keeps every deadline identical on
// both phones. Finished rides need no background job or recurring save write.
export function normalizeIslandConstruction(raw) {
  const start = raw?.clockwork;
  return Number.isSafeInteger(start) && start > 0 && start < 1e15
    ? { clockwork: start }
    : {};
}
export function mergeIslandConstruction(...states) {
  const starts = states
    .map((v) => normalizeIslandConstruction(v).clockwork)
    .filter(Boolean);
  return starts.length ? { clockwork: Math.min(...starts) } : {};
}
export function startIslandConstruction(game, biome, now = Date.now()) {
  if (biome !== "clockwork" || game.islandConstruction?.clockwork) return game;
  return {
    ...game,
    islandConstruction: { ...game.islandConstruction, clockwork: now },
  };
}
export function islandProject(game, id, now = Date.now()) {
  const o = projects.find((o) => o.id === id);
  if (!o || !game.unlocked.includes(o.biome)) return null;
  const spec = COTTON_RIDES.find((r) => r.id === o.type),
    startedAt =
      normalizeIslandConstruction(game.islandConstruction).clockwork || 0,
    readyAt = startedAt ? startedAt + spec.buildMinutes * 60000 : 0;
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
  return projects
    .filter((o) => o.biome === biome)
    .map((o) => islandProject(game, o.id, now))
    .filter(Boolean)
    .sort((a, b) => a.readyAt - b.readyAt);
}
