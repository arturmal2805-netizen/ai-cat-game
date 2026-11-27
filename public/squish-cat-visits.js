import { WAREHOUSE_ACCESS as A } from "./warehouse-access-data.js";
import { WAREHOUSE as W } from "./mosasaur-expansion-data.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
// Local sequence owned by the EXISTING Warehouse visitor, retaining the same
// native carrier/ship/safe-shore save. Ballistic ascent/descent never teleports.
export function createSquishCatVisits({ getInterior, origin }) {
  const owned = new Map();
  function walk(v, to, dt) {
    const d = distance(v.local, to),
      step = Math.min(d, 3.5 * dt);
    if (d > 0.001) {
      v.yaw = Math.atan2(to.x - v.local.x, to.z - v.local.z);
      for (const k of ["x", "y", "z"])
        v.local[k] += ((to[k] - v.local[k]) * step) / d;
      v.frame.walking = true;
      v.frame.locomotion = {
        mode: "walk",
        speed: 3.5,
        phase: (v.walkPhase += step * 2.2),
      };
    }
    return d <= step + 0.001;
  }
  function flight(s, v, to, dt) {
    if (!s.from) {
      s.from = { ...v.local };
      s.to = { ...to };
      s.t = 0;
      const dy = to.y - s.from.y;
      s.duration = Math.max(
        1.05,
        Math.sqrt((Math.max(0, dy) * 2) / 9.81) + 0.55,
      );
      s.vy = (dy + 0.5 * 9.81 * s.duration * s.duration) / s.duration;
    }
    s.t = Math.min(s.duration, s.t + dt);
    const u = s.t / s.duration;
    v.local.x = s.from.x + (s.to.x - s.from.x) * u;
    v.local.z = s.from.z + (s.to.z - s.from.z) * u;
    v.local.y = s.from.y + s.vy * s.t - 0.5 * 9.81 * s.t * s.t;
    v.yaw = Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z);
    v.frame.reaction = {
      ride: true,
      crouch: 0.14,
      hindTuck: 0.2,
      headPitch: -0.05,
    };
    if (u >= 1) {
      v.local = { ...s.to };
      s.from = null;
      return true;
    }
    return false;
  }
  function update(v, dt, time) {
    const interior = getInterior();
    if (!interior || (!v.squishWanted && !owned.has(v.id))) return false;
    let s = owned.get(v.id);
    if (!s) {
      if (owned.size >= 4) return false;
      const toy =
        interior.userData.toys.find(
          (t) => t.userData.material === v.squishMaterialWanted,
        ) || interior.userData.toys[0];
      s = { toy, phase: "approach", age: 0 };
      owned.set(v.id, s);
    }
    s.age += dt;
    const world = s.toy.getWorldPosition(interior.userData.scratch),
      base = { x: world.x - origin.x, y: A.foot, z: world.z - origin.z + 4.8 },
      top = s.toy.userData.surface(world.x, world.z);
    if (s.phase === "approach") {
      if (walk(v, base, dt)) {
        s.phase = "anticipate";
        s.age = 0;
      }
    } else if (s.phase === "anticipate") {
      v.frame.reaction = {
        crouch: Math.sin((Math.min(1, s.age / 0.45) * Math.PI) / 2) * 0.45,
        headPitch: -0.08,
      };
      if (s.age >= 0.45) {
        s.phase = "jump";
        s.age = 0;
      }
    } else if (s.phase === "jump") {
      if (
        flight(
          s,
          v,
          { x: world.x - origin.x, y: top + 0.012, z: world.z - origin.z },
          dt,
        )
      ) {
        s.phase = "knead";
        s.age = 0;
        v.age = 0;
      }
    } else if (s.phase === "knead") {
      v.local.y = top + 0.012;
      v.yaw = Math.PI;
      v.frame.reaction = { crouch: 0.08, headPitch: 0.07, eyeClose: 0.1 };
      v.frame.squish = { toy: s.toy, age: s.age, state: "AlternatingKnead" };
      if (v.cancelled || v.manualWanted || s.age > 18) {
        s.phase = "exit";
        s.age = 0;
        v.squishWanted = false;
      }
    } else if (s.phase === "exit") {
      if (flight(s, v, base, dt)) {
        owned.delete(v.id);
        v.frame.squish = null;
        return false;
      }
    }
    return true;
  }
  return {
    update,
    get: (id) => owned.get(id),
    cancel(id) {
      const s = owned.get(id);
      if (s && s.phase === "knead") {
        s.phase = "exit";
        s.age = 0;
      }
    },
    clear() {
      owned.clear();
    },
  };
}
