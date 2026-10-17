import { courtObject, courtSeats, courtGroundY } from "./foodcourt-data.js";
import {
  courtObstacles,
  courtPath,
  courtSegment,
  courtWalkable,
  nearestCourtGround,
} from "./foodcourt-navigation.js";
import { spaDistance } from "./spa-navigation.js";
export function createCourtRuntime({
  getObstacles = () => courtObstacles(),
  isReady = () => true,
  onComplete = () => {},
} = {}) {
  const visits = new Map(),
    locks = new Map();
  let serial = 0;
  function cancel(id) {
    const v = visits.get(id);
    if (v && locks.get(v.objectId) === id) locks.delete(v.objectId);
    visits.delete(id);
  }
  function path(v, goal, phase) {
    const p = courtPath(v.position, goal, v.radius, getObstacles());
    if (!p) return false;
    v.path = p;
    v.phase = phase;
    v.elapsed = 0;
    return true;
  }
  function queuePoint(o, slot) {
    return { x: o.x, z: o.z + (slot ? 3.3 : 0.65), y: 0.16 };
  }
  function start({
    catId,
    objectId,
    position,
    radius = 0.55,
    now = Date.now(),
  }) {
    const o = courtObject(objectId);
    if (!o || !isReady(o.id)) return null;
    cancel(catId);
    const seats = courtSeats(o),
      agents = [...visits.values()],
      index = seats.findIndex(
        (s) =>
          courtWalkable(s, radius, getObstacles()) &&
          !agents.some(
            (v) => spaDistance(s, v.seat) < radius + v.radius + 0.35,
          ),
      );
    if (index < 0) return null;
    const orders = agents.filter(
      (v) =>
        v.objectId === o.id &&
        ["approach", "queue", "order", "prepare", "serve"].includes(v.phase),
    );
    if (o.kind !== "cinema" && orders.length >= 2) return null;
    const origin = nearestCourtGround(position, radius, [
      ...getObstacles(),
      ...agents.map((v) => ({ ...v.position, radius: v.radius + 0.15 })),
    ]);
    if (!origin) return null;
    const v = {
      id: `court-${now.toString(36)}-${++serial}-${Math.random().toString(36).slice(2, 8)}`,
      catId,
      objectId,
      kind: o.kind,
      radius,
      seat: { ...seats[index] },
      seatIndex: index,
      position: origin,
      phase: "approach",
      elapsed: 0,
      walking: true,
      yaw: 0,
      path: [],
      reaction: null,
      slot: orders.length,
    };
    const goal =
      o.kind === "cinema"
        ? { ...v.seat, y: 0.16 }
        : { x: o.x - 1.5 + v.slot * 3, z: o.z + 13.2, y: 0.16 };
    if (!path(v, goal, "approach")) return null;
    visits.set(catId, v);
    return v;
  }
  function step(dt, time, external = []) {
    const agents = [...visits.values()];
    for (const v of agents) {
      v.elapsed += dt;
      v.walking = false;
      v.reaction = null;
      v.holding =
        ["table", "settle", "consume"].includes(v.phase) && v.kind !== "cinema";
      if (v.path.length) {
        const target = v.path[0],
          d = spaDistance(v.position, target),
          f = d ? Math.min(d, 2.3 * Math.min(dt, 0.05)) / d : 1,
          next = {
            x: v.position.x + (target.x - v.position.x) * f,
            z: v.position.z + (target.z - v.position.z) * f,
            y: 0.16,
          };
        next.y =
          v.position.y +
          (courtGroundY(next) - v.position.y) * Math.min(1, dt * 10);
        const blockers = [...agents, ...external].filter(
          (a) =>
            a !== v &&
            a.catId !== v.catId &&
            spaDistance(next, a.position || a) <
              v.radius + (a.radius || 0.55) + 0.05,
        );
        if (!blockers.length) {
          v.yaw = Math.atan2(target.x - v.position.x, target.z - v.position.z);
          v.position = next;
          v.walking = d > 0.03;
          v.blocked = 0;
          if (d < 0.075) {
            v.position = { ...target, y: next.y };
            v.path.shift();
          }
        } else {
          v.blocked = (v.blocked || 0) + dt;
          if (v.blocked > 1.6) {
            const avoid = [...agents, ...external]
                .filter((a) => a !== v && a.catId !== v.catId)
                .map((a) => ({
                  ...(a.position || a),
                  radius: a.radius + 0.055,
                })),
              goal = v.path.at(-1),
              obs = [...getObstacles(), ...avoid];
            let p = courtPath(v.position, goal, v.radius, obs);
            if (p && courtSegment(v.position, p[0], v.radius, obs)) v.path = p;
            else {
              // Step into a free passing pocket before replanning, never snap an
              // obstructed origin through a cat when nearest-ground projects it.
              for (let j = 0; j < 16; j++) {
                const a = (j / 16) * Math.PI * 2,
                  q = {
                    x: v.position.x + Math.sin(a) * 0.45,
                    z: v.position.z + Math.cos(a) * 0.45,
                    y: 0.16,
                  };
                if (
                  !courtSegment(v.position, q, v.radius, getObstacles()) ||
                  !courtWalkable(q, v.radius, obs)
                )
                  continue;
                const blocked = [...agents, ...external].some(
                  (a) =>
                    a !== v &&
                    spaDistance(q, a.position) < v.radius + a.radius + 0.06,
                );
                if (blocked) continue;
                p = courtPath(q, goal, v.radius, obs);
                if (p) {
                  v.path = [q, ...p];
                  break;
                }
              }
            }
            v.blocked = 0;
          }
        }
        continue;
      }
      const o = courtObject(v.objectId);
      if (v.phase === "approach" || v.phase === "queue") {
        if (v.kind === "cinema") {
          v.phase = "settle";
          v.elapsed = 0;
          continue;
        }
        v.phase = "queue";
        if (locks.has(o.id) && locks.get(o.id) !== v.catId) continue;
        // A customer leaving the tables has priority over a new order in the door.
        if (
          agents.some(
            (a) =>
              a !== v &&
              a.objectId === o.id &&
              a.phase === "consume" &&
              a.elapsed > 17,
          )
        )
          continue;
        locks.set(o.id, v.catId);
        if (path(v, queuePoint(o, 0), "order")) continue;
      } else if (v.phase === "order") {
        v.phase = "prepare";
        v.elapsed = 0;
      } else if (v.phase === "prepare") {
        v.yaw = Math.PI;
        v.reaction = { paw: 0.12, headRoll: Math.sin(time * 2) * 0.04 };
        if (v.elapsed >= 4.5) {
          v.phase = "serve";
          v.elapsed = 0;
        }
      } else if (v.phase === "serve") {
        v.yaw = Math.PI;
        v.reaction = { paw: 0.42, headPitch: 0.12 };
        if (v.elapsed >= 1.8) path(v, { ...v.seat, y: 0.16 }, "table");
      } else if (v.phase === "table") {
        if (locks.get(o.id) === v.catId) locks.delete(o.id);
        v.phase = "settle";
        v.elapsed = 0;
      } else if (v.phase === "settle") {
        const t = Math.min(1, v.elapsed / 1.1),
          f = t * t * (3 - 2 * t),
          floor = courtGroundY(v.seat);
        v.position = {
          ...v.seat,
          y: floor + (v.seat.y - floor) * f + Math.sin(t * Math.PI) * 0.12,
        };
        v.yaw = Math.PI;
        v.reaction = {
          crouch: Math.sin(t * Math.PI) * 0.12,
          headRoll: Math.sin(t * Math.PI) * 0.04,
        };
        if (t === 1) {
          v.phase = "consume";
          v.elapsed = 0;
        }
      } else if (v.phase === "stand") {
        const t = Math.min(1, v.elapsed / 1.1),
          f = t * t * (3 - 2 * t);
        v.position.y =
          v.seat.y +
          (courtGroundY(v.seat) - v.seat.y) * f +
          Math.sin(t * Math.PI) * 0.15;
        if (t === 1) {
          v.path = v.exitPath;
          delete v.exitPath;
          v.phase = "leave";
          v.elapsed = 0;
        }
      } else if (v.phase === "consume") {
        v.position = { ...v.seat };
        v.yaw = Math.PI;
        v.holding = v.kind !== "cinema";
        v.reaction =
          v.kind === "cinema"
            ? { headPitch: -0.07, crouch: 0.12, earRelax: -0.04 }
            : {
                paw: 0.32 + Math.sin(time * 3) * 0.09,
                headPitch: 0.13 + Math.sin(time * 3) * 0.045,
                headRoll: Math.sin(time * 1.3) * 0.025,
              };
        if (
          v.elapsed > (v.kind === "cinema" ? 30 : 17) &&
          (!locks.has(o.id) || locks.get(o.id) === v.catId)
        ) {
          const goal = nearestCourtGround(
            {
              x: o.x + (v.seatIndex % 2 ? 1 : -1) * 1.8,
              z: o.z + (o.kind === "cinema" ? 10 : 9.7),
            },
            v.radius,
            getObstacles(),
          );
          if (goal && path(v, goal, "leave")) {
            locks.set(o.id, v.catId);
            v.exitPath = v.path;
            v.path = [];
            v.phase = "stand";
            v.elapsed = 0;
          }
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
    clear: () => {
      visits.clear();
      locks.clear();
    },
  };
}
