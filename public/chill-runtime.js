import {
  chillObject,
  chillSeats,
  chillEntrance,
  CHILL_FLOOR,
  CHILL_WATER_Y,
} from "./chill-data.js";
import { chillPath, nearestChillGround } from "./chill-navigation.js";
import { spaDistance, spaClear } from "./spa-navigation.js";
const point = (x, z, y = 0.16) => ({ x, z, y });
// Visits are transient reservations. Only completed, idempotent needs receipts
// enter the existing saved SPA ledger; a reload can never strand a cat in a tub.
export function createChillRuntime({
  getObstacles = () => [],
  onComplete = () => {},
  reduced = false,
  getObject = chillObject,
  getSeats = chillSeats,
  getEntrance = chillEntrance,
  findPath = chillPath,
  nearestGround = nearestChillGround,
} = {}) {
  const visits = new Map(),
    locks = new Map();
  let serial = 0;
  function cancel(id) {
    const v = visits.get(id);
    if (!v) return;
    visits.delete(id);
    if (locks.get(v.objectId) === id) locks.delete(v.objectId);
  }
  function interior(v) {
    const o = getObject(v.objectId),
      s = v.seat,
      e = v.entrance;
    if (o.kind === "bed")
      return [
        point(s.x, e.z - 0.9, 0.28),
        point(s.x, e.z - 1.8, CHILL_FLOOR),
        point(s.x, o.z + 2.3, CHILL_FLOOR),
        point(s.x, o.z + 1.55, 0.78),
        { ...s },
      ];
    // The broad timber steps clear the tub rim before lowering into the water.
    return [
      point(o.x, e.z - 0.9, 0.28),
      point(o.x, e.z - 1.8, CHILL_FLOOR),
      point(o.x, o.z + 2.5, 0.72),
      point(o.x, o.z + 1.95, 1.0),
      point(o.x, o.z + 1.4, 1.63),
      { ...s },
    ];
  }
  function start({
    catId,
    objectId,
    position,
    radius = 0.55,
    now = Date.now(),
  }) {
    const o = getObject(objectId);
    if (!o) return null;
    cancel(catId);
    const obstacles = getObstacles(),
      seats = getSeats(o),
      seatIndex = seats.findIndex(
        (s) =>
          spaClear(s, radius, obstacles) &&
          ![...visits.values()].some(
            (v) => spaDistance(v.seat, s) < radius + v.radius + 0.35,
          ),
      );
    if (seatIndex < 0) return null;
    const occupied = [...visits.values()].map((v) => ({
        ...v.position,
        radius: v.radius + 0.15,
      })),
      origin = nearestGround(position, radius, [...obstacles, ...occupied]),
      entrance = getEntrance(o, seatIndex);
    if (!origin) return null;
    const path = findPath(origin, entrance, radius, obstacles);
    if (!path?.length) return null;
    const v = {
      id: `chill-${now.toString(36)}-${++serial}-${Math.random().toString(36).slice(2, 8)}`,
      catId,
      objectId,
      kind: o.kind,
      radius,
      seatIndex,
      seat: seats[seatIndex],
      entrance,
      position: origin,
      path,
      phase: "approach",
      elapsed: 0,
      hold: o.kind === "bed" ? 24 : 20,
      walking: true,
      yaw: 0,
      reaction: null,
    };
    visits.set(catId, v);
    return v;
  }
  function step(dt, time, external = []) {
    const agents = [...visits.values()];
    for (const v of agents) {
      v.elapsed += dt;
      v.walking = false;
      v.reaction = null;
      if (v.path.length) {
        const target = v.path[0],
          d = spaDistance(v.position, target),
          f = d ? Math.min(d, 1.9 * Math.min(dt, 0.05)) / d : 1,
          next = {
            x: v.position.x + (target.x - v.position.x) * f,
            z: v.position.z + (target.z - v.position.z) * f,
            y:
              v.position.y +
              (target.y - v.position.y) * Math.min(1, Math.max(f, dt * 7)),
          };
        const intersects = (a) =>
            a.catId !== v.catId &&
            a.id !== v.catId &&
            spaDistance(next, a.position || a) < v.radius + a.radius + 0.08;
        const blocked = agents.some(intersects) || external.some(intersects);
        if (!blocked) {
          v.yaw = Math.atan2(target.x - v.position.x, target.z - v.position.z);
          v.position = next;
          v.walking = d > 0.04;
          if (d < 0.07) {
            v.position = { ...target };
            v.path.shift();
          }
        } else if (v.phase === "approach" && v.elapsed > (v.repathAt || 1)) {
          v.repathAt = v.elapsed + 2;
          const avoid = agents
              .filter((a) => a !== v && !a.walking)
              .map((a) => ({ ...a.position, radius: a.radius + 0.15 })),
            path = findPath(v.position, v.entrance, v.radius, [
              ...getObstacles(),
              ...avoid,
            ]);
          if (path?.length) v.path = path;
        }
        continue;
      }
      if (v.phase === "approach") {
        if (v.kind === "bath" && locks.has(v.objectId)) continue;
        if (v.kind === "bath") locks.set(v.objectId, v.catId);
        v.phase = "enter";
        v.path = interior(v);
        v.elapsed = 0;
      } else if (v.phase === "enter") {
        locks.delete(v.objectId);
        v.phase = "relax";
        v.elapsed = 0;
      } else if (v.phase === "relax") {
        v.position = { ...v.seat };
        v.yaw = v.seat.yaw;
        const sway = reduced ? 0 : Math.sin(time * 1.4 + v.seatIndex);
        v.position.y += sway * (v.kind === "bed" ? 0.012 : 0.025);
        v.reaction = {
          headPitch: 0.1,
          headRoll: sway * 0.025,
          earRelax: -0.035,
          tailSway: sway * 0.025,
          crouch: v.kind === "bed" ? 0.16 : 0.025,
        };
        if (v.elapsed > v.hold && !locks.has(v.objectId)) {
          locks.set(v.objectId, v.catId);
          v.phase = "leave";
          v.path = interior(v).slice(0, -1).reverse();
          v.path.push({ ...v.entrance });
          v.elapsed = 0;
        }
      } else if (v.phase === "leave") {
        const receipt = {
          id: v.id,
          catId: v.catId,
          objectId: v.objectId,
          position: { x: v.position.x, z: v.position.z },
        };
        cancel(v.catId);
        onComplete(receipt);
      }
    }
  }
  return {
    visits,
    start,
    step,
    cancel,
    get: (id) => visits.get(id),
    clear() {
      for (const id of [...visits.keys()]) cancel(id);
    },
  };
}
