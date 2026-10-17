import { courtGroundY } from "./foodcourt-data.js";
import { BIKINI_RESTAURANT as restaurant } from "./bikini-data.js";
import { createCarryWalk, carriedCatSize } from "./bikini-carry.js";
import {
  courtPath,
  courtSegment,
  courtWalkable,
  nearestCourtGround,
} from "./foodcourt-navigation.js";
import { courtFood } from "./foodcourt-assets.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// One SpongeBob switches between walking, friendship and the actual kitchen.
// Paths are rebuilt on destination changes, never on every animation frame.
export function createBikiniLife({
  groups,
  court,
  center,
  getObstacles,
  getActors = () => [],
}) {
  const states = new Map();
  let nextPatrick = 50;
  function state(g) {
    if (!states.has(g))
      states.set(g, { path: [], goal: null, index: 0, pause: 0 });
    return states.get(g);
  }
  function local(g) {
    return {
      x: g.position.x - center[0],
      z: g.position.z - center[1],
      y: g.position.y,
    };
  }
  function chefObstacles() {
    return [
      ...getObstacles().filter(
        (o) => !(o.x === restaurant.x && o.z === restaurant.z - 2.7),
      ),
      { x: restaurant.x - 1, z: restaurant.z - 1.5, w: 7.8, d: 1.35 },
    ];
  }
  function move(g, goal, dt, obs, time, radius = 1.1) {
    const s = state(g),
      from = local(g);
    if (!s.goal || distance(s.goal, goal) > 0.1) {
      s.goal = { ...goal };
      s.path = courtPath(from, goal, radius, obs, "bikini") || [];
    }
    let walking = false;
    if (s.path.length) {
      const target = s.path[0],
        d = distance(from, target),
        step = Math.min(d, dt * 3.8),
        f = d ? step / d : 1,
        next = {
          x: from.x + (target.x - from.x) * f,
          z: from.z + (target.z - from.z) * f,
        };
      const blocked = getActors().some(
        (a) =>
          a.biome === "bikini" &&
          distance(next, a.position) < radius + a.radius + 0.05 &&
          distance(from, a.position) > distance(next, a.position),
      );
      if (blocked) {
        s.blocked = (s.blocked || 0) + dt;
        if (s.blocked > 1.5) {
          const avoid = getActors()
            .filter((a) => a.biome === "bikini")
            .map((a) => ({ ...a.position, radius: a.radius + 0.08 }));
          const obstacles = [...obs, ...avoid];
          const revised = courtPath(from, goal, radius, obstacles, "bikini");
          if (
            revised &&
            courtSegment(from, revised[0], radius, obstacles, "bikini")
          )
            s.path = revised;
          else {
            // A customer may stop beside the chef's current position. Move into
            // a clear passing pocket before replanning, without snapping through them.
            for (let j = 0; j < 16; j++) {
              const angle = (j / 16) * Math.PI * 2;
              const q = {
                x: from.x + Math.sin(angle) * 0.65,
                z: from.z + Math.cos(angle) * 0.65,
              };
              if (
                !courtSegment(from, q, radius, obs, "bikini") ||
                !courtWalkable(q, radius, obstacles, "bikini")
              )
                continue;
              const path = courtPath(q, goal, radius, obstacles, "bikini");
              if (path) {
                s.path = [q, ...path];
                break;
              }
            }
          }
          s.blocked = 0;
        }
      }
      if (!blocked) {
        s.blocked = 0;
        g.position.set(
          center[0] + next.x,
          courtGroundY(next, "bikini"),
          center[1] + next.z,
        );
        g.userData.rig.rotation.y = Math.atan2(
          target.x - from.x,
          target.z - from.z,
        );
        walking = d > 0.05;
        if (d < 0.1) s.path.shift();
      }
    }
    g.userData.idlePose = { walking };
    return !s.path.length && distance(local(g), goal) < 0.25;
  }
  function bind(g) {
    if (g.userData.reserve) return;
    const d = g.userData;
    d.reserve = (intent = "play", visitor = {}) => {
      if (d.chefBusy || d.playing) return false;
      if (intent === "carry") {
        if (d.bikiniFriend !== "sponge" || !visitor.model) return false;
        const size = carriedCatSize(visitor.model),
          radius = Math.max(1.45, size.depth + size.width + 0.65),
          origin = local(g),
          obstacles = [
            ...getObstacles(),
            ...getActors()
              .filter(
                (a) =>
                  a.catId !== visitor.catId &&
                  Math.hypot(a.position.x - origin.x, a.position.z - origin.z) >
                    radius + a.radius,
              )
              .map((a) => ({ ...a.position, radius: a.radius + 0.1 })),
          ],
          route = createCarryWalk(origin, obstacles, radius);
        if (!route) return false;
        d.carryRoute = route;
        d.carrySize = size;
        d.carryCatId = visitor.catId;
      }
      if (d.bikiniFriend === "patrick") {
        court.cancel("bikini-patrick-guest");
        if (d.burger) d.burger.visible = false;
      }
      d.setIntent(intent);
      d.playing = true;
      d.pose = null;
      d.reserved = true;
      state(g).goal = null;
      return true;
    };
    d.releasePlay = (carrier) => {
      if (d.intent !== "carry" || !d.pose?.carry) return;
      const offset = d.rig.position,
        origin = local(g),
        actual = { x: origin.x + offset.x, z: origin.z + offset.z },
        released = {
          x: origin.x + d.pose.position[0],
          z: origin.z + d.pose.position[2],
        },
        ground = nearestCourtGround(
          released,
          Math.max(0.45, d.carrySize.width + 0.15),
          getObstacles(),
          "bikini",
        );
      if (carrier && ground) {
        carrier.position.set(
          center[0] + ground.x,
          courtGroundY(ground, "bikini"),
          center[1] + ground.z,
        );
        carrier.rotation.x = carrier.rotation.z = 0;
      }
      g.position.set(
        center[0] + actual.x,
        courtGroundY(actual, "bikini"),
        center[1] + actual.z,
      );
      d.carryRoute = null;
      d.carryCatId = null;
      d.playing = false;
      d.pose = null;
      d.applyPose(0, {});
      state(g).goal = null;
    };
    let approach = null,
      key = "";
    d.approachOffset = [0.5, 0, 2.65];
    d.approachFrame = (from, _to, t) => {
      const origin = local(g),
        k =
          from.join(":") +
          ":" +
          origin.x.toFixed(2) +
          ":" +
          origin.z.toFixed(2);
      if (key !== k) {
        key = k;
        const start = { x: origin.x + from[0], z: origin.z + from[2] },
          goal = { x: origin.x + 0.5, z: origin.z + 2.65 };
        const path = courtPath(start, goal, 0.72, getObstacles(), "bikini");
        approach = [{ ...start }, ...(path || [goal])];
      }
      const lengths = approach.slice(1).map((a, i) => distance(a, approach[i])),
        total = lengths.reduce((a, b) => a + b, 0);
      let travel = t * t * (3 - 2 * t) * total;
      for (let i = 0; i < lengths.length; i++) {
        if (travel <= lengths[i] || i === lengths.length - 1) {
          const f = lengths[i] ? Math.min(1, travel / lengths[i]) : 1,
            a = approach[i],
            b = approach[i + 1];
          return [
            a.x + (b.x - a.x) * f - origin.x,
            0,
            a.z + (b.z - a.z) * f - origin.z,
          ];
        }
        travel -= lengths[i];
      }
      return [0.5, 0, 2.65];
    };
  }
  function step(dt, time, reduced = false) {
    const sponge = groups.get("bikini-sponge"),
      patrick = groups.get("bikini-patrick"),
      building = groups.get(restaurant.id);
    if (!sponge || !patrick) return;
    bind(sponge);
    bind(patrick);
    const orders = [...court.visits.values()].filter(
        (v) =>
          v.objectId === restaurant.id &&
          ["approach", "queue", "order", "prepare", "serve"].includes(v.phase),
      ),
      active = orders.find((v) => ["prepare", "serve"].includes(v.phase));
    sponge.userData.chefBusy = orders.length > 0 && !sponge.userData.playing;
    for (const [i, g] of [sponge, patrick].entries()) {
      const d = g.userData,
        s = state(g);
      if (d.playing) {
        d.rig.rotation.y +=
          Math.atan2(Math.sin(-d.rig.rotation.y), Math.cos(-d.rig.rotation.y)) *
          Math.min(1, dt * 5);
        d.idlePose = { wave: Math.sin(time * 5) * 0.3, lean: 0.05 };
        if (!d.pose) d.applyPose(time, d.idlePose, reduced);
        continue;
      }
      if (d.reserved && i === 1) nextPatrick = time + 60;
      d.reserved = false;
      d.pose = null;
      if (i === 0 && d.chefBusy) {
        const ready = move(
          g,
          { x: restaurant.x, z: restaurant.z - 3.35 },
          dt,
          chefObstacles(),
          time,
          1.1,
        );
        d.chefReady = ready;
        if (ready) {
          d.rig.rotation.y = 0;
          d.idlePose = { chef: !!active, lean: active ? 0.08 : 0 };
        }
      } else if (i === 1 && court.get("bikini-patrick-guest")) {
        const v = court.get("bikini-patrick-guest");
        g.position.set(
          center[0] + v.position.x,
          v.position.y,
          center[1] + v.position.z,
        );
        d.rig.rotation.y = v.yaw;
        d.idlePose = {
          walking: v.walking,
          arm: v.holding ? 0.5 : 0,
          crouch: v.phase === "consume" ? 0.25 : 0,
        };
        if (!d.burger) {
          d.burger = courtFood("burger");
          g.add(d.burger);
        }
        d.burger.visible = !!v.holding;
        d.burger.position.set(
          0,
          2.4 + (reduced ? 0 : Math.sin(time * 3) * 0.09),
          1.2,
        );
        d.burger.rotation.y = v.yaw;
      } else {
        if (i === 0) d.chefReady = false;
        if (d.burger) d.burger.visible = false;
        if (i === 1 && time > nextPatrick) {
          nextPatrick = time + 110;
          court.start({
            catId: "bikini-patrick-guest",
            objectId: restaurant.id,
            position: local(g),
            radius: 0.9,
          });
        }
        const waypoints =
          i === 0
            ? [
                [-7, 7],
                [-17, -5],
                [-12, 16],
                [5, 12],
                [13, 2],
              ]
            : [
                [8, 17],
                [-12, 19],
                [-19, 13],
                [4, 9],
              ];
        if (s.pause > time) {
          d.idlePose = { wave: Math.sin(time * 2) * 0.04 };
          continue;
        }
        const goal = waypoints[s.index % waypoints.length];
        if (
          move(
            g,
            { x: goal[0], z: goal[1] },
            dt,
            i === 0 ? chefObstacles() : getObstacles(),
            time,
            i === 0 ? 1.1 : 0.9,
          )
        ) {
          s.index++;
          s.pause = time + 4;
          s.goal = null;
        }
      }
      d.update(time, reduced);
    }
    const food = building?.userData.servingFood;
    if (food) {
      food.visible = !!active && sponge.userData.chefReady;
      if (food.visible) {
        const f =
          active.phase === "serve" ? Math.min(1, active.elapsed / 1.8) : 0;
        food.position.set(-1.8 * (1 - f), 1.78, -1.6 + f * 1.3);
        food.rotation.z = reduced ? 0 : Math.sin(time * 5) * 0.025;
      }
    }
  }
  return {
    step,
    canPrepare: (o) =>
      o.id !== restaurant.id ||
      !!groups.get("bikini-sponge")?.userData.chefReady,
    reserve(id, intent, visitor) {
      const g = groups.get(id);
      if (!g) return false;
      bind(g);
      return g.userData.reserve(intent, visitor);
    },
    approach(id) {
      return groups.get(id)?.userData.approachOffset;
    },
    actors: () =>
      ["bikini-sponge", "bikini-patrick"]
        .map((id) => ({ id, g: groups.get(id) }))
        .filter(
          ({ g }) =>
            g &&
            !(
              g.userData.bikiniFriend === "patrick" &&
              court.get("bikini-patrick-guest")
            ),
        )
        .map(({ id, g }) => ({
          catId: id,
          biome: "bikini",
          position: g.userData.pose?.carry
            ? {
                ...local(g),
                x: local(g).x + g.userData.rig.position.x,
                z: local(g).z + g.userData.rig.position.z,
              }
            : local(g),
          radius: g.userData.pose?.carry ? g.userData.carryRoute.radius : 1.1,
        })),
    getStates: () => states,
  };
}
