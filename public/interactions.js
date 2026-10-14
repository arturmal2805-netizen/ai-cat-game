import { byItem, NEIGHBORS, byBiome } from "./game-data.js";

export const DECISION_PROTOCOL = "physical-objects-v1";

// These free, permanent objects are rendered in the reserved home/picnic areas.
// Their IDs are stable across saves, browser validation and Workers AI.
export const HOME_OBJECTS = [
  {
    id: "chichi-bed",
    type: "bed",
    biome: "moon",
    x: -6,
    z: -4,
    name: "Подушка Чичи у домика",
  },
  {
    id: "chichi-food",
    type: "picnic",
    biome: "moon",
    x: -2,
    z: 5,
    name: "Перекус Чичи на пледе",
  },
];
export function activityLocation(action, type) {
  return action === "rest"
    ? "home"
    : action === "eat"
      ? "picnic"
      : type === "pond"
        ? "pond"
        : "garden";
}
export function resolveInteraction(world, value) {
  const action = value?.action;
  if (action === "meet") {
    if (value.activityId || !world.friends.some((f) => f.id === value.friendId))
      throw Error("Friend is unavailable");
    return { action, friendId: value.friendId, target: "garden" };
  }
  if (value?.friendId) throw Error("Choose exactly one physical target");
  const object = world.activities.find((a) => a.id === value?.activityId);
  if (!object) throw Error("Choose an available physical object");
  if (!byItem(object.type)?.actions.includes(action))
    throw Error("Activity is unavailable");
  return {
    action,
    activityId: object.id,
    target: activityLocation(action, object.type),
  };
}
export function manualInteraction(world, selection, mood) {
  if (selection.friendId)
    return {
      mood,
      thought:
        "Пойду поздороваюсь с " +
        NEIGHBORS.find((n) => n.id === selection.friendId)?.name +
        "!",
      ...resolveInteraction(world, {
        action: "meet",
        friendId: selection.friendId,
      }),
    };
  const object = world.activities.find((a) => a.id === selection.activityId);
  if (!object) throw Error("Этот предмет ещё строится или больше недоступен.");
  const actions = byItem(object.type).actions;
  const action = [
    "ride",
    "play",
    "farm",
    "rest",
    "eat",
    "party",
    "explore",
  ].find((a) => actions.includes(a));
  return {
    mood,
    thought:
      "Хочу попробовать " +
      (HOME_OBJECTS.find((o) => o.id === object.id)?.name ||
        byItem(object.type).name) +
      "!",
    ...resolveInteraction(world, { action, activityId: object.id }),
  };
}
export function cleanRecent(recent, world) {
  if (!Array.isArray(recent)) return [];
  const result = [];
  for (const entry of recent.slice(-8)) {
    try {
      const choice = resolveInteraction(world, entry);
      result.push({
        ...choice,
        source: ["manual", "demo"].includes(entry.source) ? entry.source : "ai",
      });
    } catch {}
  }
  return result;
}
export function recordInteraction(game, decision, source = "ai") {
  const next = structuredClone(game);
  next.recentActivities = [
    ...(next.recentActivities || []),
    {
      action: decision.action,
      ...(decision.activityId ? { activityId: decision.activityId } : {}),
      ...(decision.friendId ? { friendId: decision.friendId } : {}),
      source: ["manual", "demo"].includes(source) ? source : "ai",
    },
  ].slice(-8);
  return next;
}
// Rotation-aware footprints are also used for toy play boundaries and drops.
export function footprintDistance(point, object) {
  const angle = ((object.rotation || 0) * Math.PI) / 2,
    dx = point.x - object.x,
    dz = point.z - object.z;
  const x = dx * Math.cos(angle) - dz * Math.sin(angle),
    z = dx * Math.sin(angle) + dz * Math.cos(angle);
  const [w, d] = byItem(object.type).footprint;
  return Math.hypot(
    Math.max(0, Math.abs(x) - w / 2),
    Math.max(0, Math.abs(z) - d / 2),
  );
}
export function dropTarget(point, objects, friends, { touch = false } = {}) {
  const nearby = friends
    .map((f) => ({ f, d: Math.hypot(point.x - f.x, point.z - f.z) }))
    .filter((v) => v.d <= (touch ? 1.25 : 0.95))
    .sort((a, b) => a.d - b.d);
  if (nearby.length) return { friendId: nearby[0].f.id };
  const margin = touch ? 0.45 : 0.2;
  const candidates = objects
    .map((o) => ({
      o,
      d: footprintDistance(point, o),
      centre: Math.hypot(point.x - o.x, point.z - o.z),
    }))
    .filter((v) => v.d <= margin)
    .sort((a, b) => a.d - b.d || a.centre - b.centre);
  if (!candidates.length) return null;
  const chosen = candidates[0].o;
  return chosen.built ? { activityId: chosen.id } : { unavailable: true };
}
export function objectPosition(object) {
  const biome = byBiome(object.biome);
  return { x: biome.center[0] + object.x, z: biome.center[1] + object.z };
}
