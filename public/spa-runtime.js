import { SPA_SEATS, SPA_POOL, spaObject } from "./spa-data.js";
import {
  spaPath,
  spaDistance,
  nearestSpaGround,
  spaClear,
} from "./spa-navigation.js";
const point = (x, z, y = 0.16) => ({ x, z, y });
export function createSpaRuntime({
  onComplete = () => {},
  getObstacles = () => [],
  reduced = false,
} = {}) {
  const visits = new Map(),
    locks = new Map();
  let serial = 0;
  function entranceFor(v) {
    const s = v.seat;
    if (v.objectId === "spa-lounge")
      return point(s.x, s.row === 0 ? -5.2 : 5.2);
    if (v.objectId === "spa-bar") return v.seatIndex < 0 ? s : point(s.x, -5.7);
    if (v.objectId === "lake-water")
      return [
        point(-3.8, 10.5),
        point(-1.4, 12),
        point(1.4, 12),
        point(3.8, 10.5),
      ][v.seatIndex];
    return [
      point(11.5, 10.3),
      point(13.7, 11.5),
      point(16, 10.3),
      point(17.6, 8.7),
    ][v.seatIndex];
  }
  const pathTo = (v, goal) =>
    spaPath(v.position, goal, v.radius, getObstacles()) || [];
  const needsLock = (v) => ["lake-water", "spa-jacuzzi"].includes(v.objectId);
  function release(v) {
    visits.delete(v.catId);
    if (locks.get(v.objectId) === v.catId) locks.delete(v.objectId);
  }
  function start({
    catId,
    objectId,
    position,
    radius = 0.55,
    drinkId = "milk",
    now = Date.now(),
  }) {
    if (!spaObject(objectId)) return null;
    cancel(catId);
    const seats = SPA_SEATS[objectId],
      seatIndex = seats.findIndex(
        (s) =>
          (objectId !== "lake-water" ||
            spaClear(s, radius + 0.65, getObstacles())) &&
          ![...visits.values()].some(
            (v) =>
              v.objectId === objectId &&
              spaDistance(v.seat, s) < v.radius + radius + 0.35,
          ),
      );
    // A short bar queue is a real place, not a stack of overlapping cats.
    const waiting = [...visits.values()].filter(
      (v) => v.objectId === objectId && v.seatIndex < 0,
    ).length;
    if (seatIndex < 0 && (objectId !== "spa-bar" || waiting >= 3)) return null;
    let origin = { ...position };
    if (
      [...visits.values()].some(
        (v) => spaDistance(origin, v.position) < radius + v.radius + 0.1,
      )
    ) {
      origin = nearestSpaGround(origin, radius, [
        ...getObstacles(),
        ...[...visits.values()].map((v) => ({
          ...v.position,
          radius: v.radius + 0.15,
        })),
      ]);
      if (!origin) return null;
    }
    const v = {
      catId,
      objectId,
      seatIndex,
      seat: seats[seatIndex] || point(15.1, -4 + waiting * 2.1),
      radius,
      drinkId,
      id:
        "spa-" +
        now.toString(36) +
        "-" +
        ++serial +
        "-" +
        Math.random().toString(36).slice(2, 8),
      position: origin,
      phase: "approach",
      elapsed: 0,
      hold: objectId === "spa-bar" ? 11 : objectId === "lake-water" ? 15 : 18,
      yaw: 0,
      walking: true,
    };
    v.entrance = entranceFor(v);
    v.path = pathTo(v, v.entrance);
    if (!v.path.length) return null;
    if (objectId === "lake-water" && !poolPath(v)) return null;
    visits.set(catId, v);
    return v;
  }
  function cancel(id) {
    const v = visits.get(id);
    if (v) release(v);
  }
  function poolPath(v) {
    const wet = (p, r, obstacles) =>
      spaClear(p, r, obstacles) &&
      (Math.hypot(
        (p.x - SPA_POOL.x) / (SPA_POOL.rx - r - 0.1),
        (p.z - SPA_POOL.z) / (SPA_POOL.rz - r - 0.1),
      ) < 1 ||
        (Math.abs(p.x) < 1.55 - r && p.z >= 5 && p.z <= 9.9));
    const path = spaPath(point(0, 8.1), v.seat, v.radius, getObstacles(), wet);
    return path
      ? [
          point(0, 9.8),
          ...path.map((p) => ({
            ...p,
            y: p.z > 7 ? 0.16 : p.z > 6 ? -0.12 : -0.28,
          })),
          { ...v.seat },
        ]
      : null;
  }
  function insidePath(v) {
    const s = v.seat;
    if (v.objectId === "lake-water") return poolPath(v) || [];
    if (v.objectId === "spa-jacuzzi")
      return [
        point(14.1, 9.3),
        point(14.1, 8.3, 0.28),
        point(14.1, 6.7, 0.02),
        point(14.1, 4.5, 0.02),
        { ...s },
      ];
    if (v.objectId === "spa-lounge" && s.row === 0)
      // The back row climbs over the continuous soft backrest. Keep both
      // directions above its top instead of walking through the cushion.
      return [
        point(s.x, -4.2),
        point(s.x, -3.2, 2.05),
        point(s.x, -1.3, 2.05),
        { ...s },
      ];
    if (v.objectId === "spa-lounge")
      return [point(s.x, 3.8, 0.35), point(s.x, 2.8, 0.75), { ...s }];
    return [point(s.x, -6.4), { ...s }];
  }
  function step(dt, time, external = []) {
    const agents = [...visits.values()];
    for (const v of agents) {
      v.walking = false;
      v.reaction = null;
      v.elapsed += dt;
      if (v.phase === "queue" && v.seatIndex < 0) {
        const seats = SPA_SEATS[v.objectId],
          i = seats.findIndex(
            (s) =>
              !agents.some(
                (o) =>
                  o !== v &&
                  o.objectId === v.objectId &&
                  o.seatIndex >= 0 &&
                  spaDistance(o.seat, s) < o.radius + v.radius + 0.35,
              ),
          );
        if (i >= 0) {
          v.seatIndex = i;
          v.seat = seats[i];
          v.phase = "approach";
          v.entrance = entranceFor(v);
          v.path = pathTo(v, v.entrance);
        }
      }
      if (v.path.length) {
        const target = v.path[0],
          d = spaDistance(v.position, target),
          speed = 1.7,
          amount = Math.min(d, speed * Math.min(dt, 0.05)),
          f = d ? amount / d : 1;
        const next = {
          x: v.position.x + (target.x - v.position.x) * f,
          z: v.position.z + (target.z - v.position.z) * f,
          y:
            v.position.y +
            ((target.y ?? 0.16) - v.position.y) *
              Math.min(1, Math.max(f, dt * 6)),
        };
        const collision =
          agents.some(
            (o) =>
              o !== v &&
              spaDistance(next, o.position) < o.radius + v.radius + 0.08,
          ) ||
          external.some(
            (o) =>
              o.id !== v.catId &&
              spaDistance(next, o) < o.radius + v.radius + 0.08,
          );
        if (!collision) {
          v.yaw = Math.atan2(target.x - v.position.x, target.z - v.position.z);
          v.position = next;
          v.walking = d > 0.05;
          if (d < 0.08) {
            v.position = { ...target };
            v.path.shift();
          }
        } else if (v.elapsed > (v.repathAt || 1) && v.phase === "approach") {
          const avoid = agents
            .filter((o) => o !== v && !o.walking)
            .map((o) => ({ ...o.position, radius: o.radius + 0.15 }));
          v.repathAt = v.elapsed + 2;
          const route = spaPath(v.position, v.entrance, v.radius, [
            ...getObstacles(),
            ...avoid,
          ]);
          if (route?.length) v.path = route;
        }
        continue;
      }
      if (v.phase === "approach") {
        if (v.seatIndex < 0) {
          v.phase = "queue";
          continue;
        }
        if (
          needsLock(v) &&
          locks.has(v.objectId) &&
          locks.get(v.objectId) !== v.catId
        )
          continue;
        if (needsLock(v)) locks.set(v.objectId, v.catId);
        v.phase = "enter";
        v.path = insidePath(v);
        v.elapsed = 0;
      } else if (v.phase === "enter") {
        locks.delete(v.objectId);
        v.phase = "relax";
        v.elapsed = 0;
      } else if (v.phase === "relax") {
        v.yaw = v.seat.yaw;
        v.position = { ...v.seat };
        if (v.objectId === "lake-water") {
          const t = reduced ? 0 : v.elapsed * 0.65,
            a = v.seatIndex * 1.7;
          v.position.x += Math.sin(t + a) * 0.58;
          v.position.z += Math.cos(t + a) * 0.52;
          v.position.y += reduced
            ? 0
            : Math.sin(time * 2 + v.seatIndex) * 0.025;
          v.yaw = Math.atan2(Math.cos(t + a), -Math.sin(t + a));
          v.reaction = {
            paw: reduced ? 0 : Math.sin(time * 4) * 0.65,
            swim: 1,
            headPitch: 0.12,
          };
          v.walking = true;
        } else if (v.objectId === "spa-bar") {
          v.drinking = v.elapsed > 4;
          v.reaction = {
            headPitch: v.drinking ? 0.18 + Math.sin(time * 3) * 0.05 : 0,
            paw: v.drinking ? 0.32 : 0,
          };
        } else {
          v.position.y += reduced
            ? 0
            : Math.sin(time * 1.7 + v.seatIndex) * 0.014;
          v.reaction = {
            headPitch: 0.12,
            crouch: v.objectId === "spa-lounge" ? 0.2 : 0.06,
          };
        }
        if (
          v.elapsed > v.hold &&
          (!needsLock(v) ||
            !locks.has(v.objectId) ||
            locks.get(v.objectId) === v.catId)
        ) {
          if (needsLock(v)) locks.set(v.objectId, v.catId);
          v.phase = "leave";
          v.path = insidePath(v).slice(0, -1).reverse();
          v.path.push({ ...v.entrance, y: 0.16 });
          v.elapsed = 0;
        }
      } else if (v.phase === "leave") {
        const receipt = {
          id: v.id,
          catId: v.catId,
          objectId: v.objectId,
          drinkId: v.drinkId,
          position: { x: v.position.x, z: v.position.z },
        };
        release(v);
        onComplete(receipt);
      }
    }
  }
  return {
    visits,
    start,
    cancel,
    step,
    get: (id) => visits.get(id),
    clear() {
      for (const v of visits.values()) release(v);
    },
    nearestGround: nearestSpaGround,
  };
}
