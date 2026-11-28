import { squishCatActing } from "./squish-cat-choreography.js";
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
    if (!interior || (v.squishDone && !v.squishWanted && !owned.has(v.id)))
      return false;
    let s = owned.get(v.id);
    if (!s) {
      if (owned.size >= 4) return false;
      const available = interior.userData.toys.filter(
        (t) => ![...owned.values()].some((s) => s.toy === t),
      );
      if (!available.length) return false;
      const toy =
        available.find(
          (t) =>
            (t.userData.sectorId || t.userData.material) ===
            v.squishMaterialWanted,
        ) ||
        available.reduce((best, t) => {
          const p = t.getWorldPosition(interior.userData.scratch),
            rest = v.activity?.action === "rest",
            key =
              [...v.id].reduce(
                (n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) | 0,
                7,
              ) >>> 0,
            preferred = rest
              ? ["cloud", "foam"][key % 2]
              : [
                  "jelly",
                  "butter",
                  "slime",
                  "cloud",
                  "foam",
                  "crunchy",
                  "mochi",
                  "giant",
                ][key % 8],
            score =
              Math.hypot(
                p.x - origin.x - v.local.x,
                p.z - origin.z - v.local.z,
              ) *
                0.15 +
              (t.userData.material === preferred ? 0 : 32);
          return !best || score < best.score ? { toy: t, score } : best;
        }, null).toy;
      s = {
        visitor: v,
        toy,
        phase: "inspect",
        age: 0,
        route: null,
        waypoint: 0,
        impact: 0,
      };
      v.squishDone = false;
      owned.set(v.id, s);
    }
    s.age += dt;
    const world = s.toy.getWorldPosition(interior.userData.scratch),
      base = { x: world.x - origin.x, y: A.foot, z: world.z - origin.z + 4.8 },
      top = s.toy.userData.surface(world.x, world.z);
    if (
      v.manualWanted &&
      ["inspect", "approach", "anticipate", "return-aisle"].includes(s.phase)
    ) {
      owned.delete(v.id);
      v.squishWanted = false;
      v.squishDone = true;
      return false;
    }
    if (
      v.cancelled &&
      ["inspect", "approach", "anticipate"].includes(s.phase)
    ) {
      s.phase = "return-aisle";
      const r = s.route?.slice(0, s.waypoint) || [];
      s.route = [...r].reverse();
      s.route.push({
        x: W.x + (v.boat - 1) * 30,
        y: A.foot,
        z: A.lobby.z - 40,
      });
      s.waypoint = 0;
    }
    v.frame.squishState =
      s.phase === "inspect"
        ? "SquishInspect"
        : s.phase === "approach"
          ? "SquishApproach"
          : s.phase === "jump"
            ? "SquishJump"
            : null;
    if (s.phase === "inspect") {
      v.frame.reaction = {
        ride: true,
        headPitch: 0.12,
        headYaw: Math.sin(s.age * 1.5) * 0.09,
        earRelax: 0.05,
      };
      if (s.age > 1.2) {
        s.phase = "approach";
        s.age = 0;
      }
    } else if (s.phase === "approach") {
      if (!s.route) {
        const anchor = interior.getWorldPosition(interior.userData.scratch),
          tx = base.x - (anchor.x - origin.x),
          aisle = (tx < 0 ? -1 : 1) * (Math.abs(tx) > 42 ? 42 : 15),
          ax = anchor.x - origin.x + aisle;
        s.route = [
          { x: ax, y: A.foot, z: anchor.z - origin.z + 12 },
          { x: ax, y: A.foot, z: base.z + 10 },
          { ...base, z: base.z + 10 },
          base,
        ];
        s.waypoint = 0;
      }
      if (walk(v, s.route[s.waypoint], dt)) s.waypoint++;
      if (s.waypoint >= s.route.length) {
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
        s.impact = Math.max(0, 9.81 * s.duration - s.vy);
        s.phase = "knead";
        s.age = 0;
        v.age = 0;
      }
    } else if (s.phase === "knead") {
      const acting = squishCatActing(s.toy.userData.material, s.age),
        material = s.toy.userData.material;
      let airborne = false;
      if (s.bounce || (acting.bounce && !v.cancelled && !v.manualWanted)) {
        if (!s.bounce) {
          s.bounce = {
            t: 0,
            velocity:
              material === "giant" ? 2.4 : material === "jelly" ? 3.5 : 1.2,
          };
        }
        const b = s.bounce;
        b.t += dt;
        const h = b.velocity * b.t - 0.5 * 9.81 * b.t * b.t;
        if (h > 0) {
          v.local.y = top + 0.012 + h;
          airborne = true;
        } else {
          s.impact = b.velocity;
          s.bounce = null;
          v.local.y = top + 0.012;
        }
      } else {
        s.bounce = null;
        v.local.y = top + 0.012;
      }
      v.yaw +=
        Math.atan2(Math.sin(0.1 - v.yaw), Math.cos(0.1 - v.yaw)) *
        (1 - Math.exp(-dt * 4));
      v.frame.reaction = acting.reaction;
      v.frame.squishState = acting.state;
      if (airborne)
        v.frame.reaction = {
          ride: true,
          paw: 0.25,
          hindTuck: 0.2,
          tailSway: 0.1,
        };
      else
        v.frame.squish = {
          toy: s.toy,
          age: acting.age,
          state: acting.state,
          blend: acting.blend,
          impact: s.impact,
          bodyContact: acting.bodyContact,
        };
      s.impact *= Math.exp(-dt * 12);
      if ((v.cancelled || v.manualWanted || acting.done) && !airborne) {
        s.phase = "exit";
        s.age = 0;
        v.squishWanted = false;
      }
    } else if (s.phase === "exit") {
      if (flight(s, v, base, dt)) {
        v.squishDone = true;
        v.frame.squish = null;
        if (v.manualWanted) {
          owned.delete(v.id);
          return false;
        }
        s.phase = "return-aisle";
        s.waypoint = 0;
        const r = s.route || [base];
        s.route = [...r].reverse().slice(1);
        s.route.push({
          x: W.x + (v.boat - 1) * 30,
          y: A.foot,
          z: A.lobby.z - 40,
        });
      }
    }
    if (s.phase === "return-aisle") {
      if (walk(v, s.route[s.waypoint], dt)) s.waypoint++;
      if (s.waypoint >= s.route.length) {
        owned.delete(v.id);
        v.squishDone = true;
        return false;
      }
    }
    return true;
  }
  return {
    update,
    get: (id) => owned.get(id),
    unsafe: (id) => ["jump", "knead", "exit"].includes(owned.get(id)?.phase),
    cancel(id) {
      const s = owned.get(id);
      if (
        s &&
        ["inspect", "approach", "anticipate", "return-aisle"].includes(s.phase)
      ) {
        s.visitor.squishWanted = false;
        s.visitor.squishDone = true;
        owned.delete(id);
        return;
      }
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
