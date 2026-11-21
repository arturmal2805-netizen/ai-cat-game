import * as T from "three";
import { WATERFRONT as W, waterfrontActivity } from "./waterfront-data.js";
import {
  waterfrontPath,
  waterfrontDrySupport,
  waterfrontTables,
  waterfrontWalkable,
  WATERFRONT_FOOT,
} from "./waterfront-navigation.js";
import {
  ballisticLaunch,
  ballisticFrame,
  diveLane,
} from "./waterfront-physics.js";
import { gatherTrip, gatherFrame } from "./gather-system.js";
const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.04;
export function createWaterfrontRuntime({
  origin,
  getActors,
  getTrampoline,
  effects,
  canSimulate = () => true,
  onComplete = () => {},
  onPark = () => {},
}) {
  const visits = new Map();
  let clock = 0,
    animationTime = 0,
    climber = null,
    player = null;
  const local = (p) => ({ x: p.x - origin.x, y: p.y, z: p.z - origin.z });
  function destination(a, slot) {
    if (a.kind === "bounce" || a.kind === "dive")
      return {
        x: W.trampoline.x + ((slot % 4) - 1.5) * 6,
        y: W.trampoline.y + WATERFRONT_FOOT,
        z: W.trampoline.z - 48 + Math.floor(slot / 4) * 10,
      };
    if (a.kind === "glass")
      return {
        x: ((slot % 3) - 1) * 20,
        y: W.y + WATERFRONT_FOOT,
        z: 8 + Math.floor(slot / 3) * 8,
      };
    if (a.kind === "terrace")
      return {
        x: (slot % 2 ? 1 : -1) * (200 + Math.floor(slot / 2) * 12),
        y: W.y + WATERFRONT_FOOT,
        z: 46,
      };
    if (a.kind === "walk")
      return { x: slot % 2 ? 292 : -292, y: W.y + WATERFRONT_FOOT, z: 18 };
    const t = waterfrontTables[slot % 16];
    return { x: t.x + 5.2, y: W.y + WATERFRONT_FOOT, z: t.z };
  }
  function phase(v, name) {
    v.phase = name;
    v.age = 0;
    v.frame.phase = name;
  }
  function route(v, to, next = "prepare") {
    const p = waterfrontPath(v.local, to, v.radius);
    if (!p) return false;
    v.path = p;
    v.next = next;
    phase(v, "approach");
    return true;
  }
  function finish(v, completed = true) {
    onPark(v.id, v.frame.position);
    visits.delete(v.id);
    if (player === v.id) player = null;
    if (climber === v.id) climber = null;
    onComplete(v.id, {
      completed: completed && !v.cancelled,
      action: v.activity.action,
      activityId: v.activity.id,
      ticket: v.ticket,
    });
  }
  function bounce(v, height, next) {
    getTrampoline()?.userData.impact(
      v.local.x - W.trampoline.x,
      v.local.z - W.trampoline.z,
      animationTime,
      Math.min(1.05, 0.35 + Math.sqrt(height / 60) * 0.65),
    );
    v.flight = ballisticLaunch(v.local, v.local, { height });
    v.afterFlight = next;
    phase(v, "bounce");
  }
  function pose(v) {
    const f = v.frame;
    f.position.set(v.local.x + origin.x, v.local.y, v.local.z + origin.z);
    f.yaw = v.yaw;
    f.phase = v.phase;
    return f;
  }
  function queuePoint(index, radius) {
    let seen = 0;
    for (let row = 0; row < 12; row++)
      for (let col = 0; col < 32; col++) {
        const p = {
          x: -279 + col * 18,
          y: W.y + WATERFRONT_FOOT,
          z: 64 + row * 3,
        };
        if (!waterfrontWalkable(p, radius + 0.3)) continue;
        if (seen++ === index) return p;
      }
    return null;
  }
  const activeVisits = () => [...visits.values()].filter((v) => v.active);
  function activate(v) {
    const active = activeVisits();
    if (
      active.length >= W.capacity ||
      active.filter((q) => q.activity.id === v.activity.id).length >=
        v.activity.capacity
    )
      return false;
    const used = new Set(active.map((q) => q.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    v.slot = slot;
    v.active = true;
    v.target = destination(v.activity, slot);
    return route(v, v.target);
  }
  function start(
    id,
    activityId,
    { invite = false, ticket = null, enqueue = false } = {},
  ) {
    const a = waterfrontActivity(activityId),
      actor = getActors().find((a) => a.id === id);
    if (
      !a ||
      !actor ||
      visits.has(id) ||
      (enqueue
        ? visits.size >= Math.min(384, getActors().length)
        : activeVisits().length >= W.capacity) ||
      (!enqueue &&
        activeVisits().filter((v) => v.activity.id === activityId).length >=
          a.capacity) ||
      !canSimulate()
    )
      return false;
    const used = new Set(activeVisits().map((v) => v.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const occupiedQueue = new Set(
      [...visits.values()].map((v) => v.queueIndex),
    );
    let queueIndex = 0;
    while (occupiedQueue.has(queueIndex)) queueIndex++;
    const p = local(actor.position),
      v = {
        id,
        active:
          !enqueue ||
          (activeVisits().length < W.capacity &&
            activeVisits().filter((v) => v.activity.id === activityId).length <
              a.capacity),
        queueIndex,
        activity: a,
        slot,
        radius: actor.radius || 0.6,
        local: { ...p },
        yaw: 0,
        age: 0,
        phase: "approach",
        frame: {
          position: new T.Vector3().copy(actor.position),
          yaw: 0,
          walking: false,
          reaction: {},
          locomotion: { mode: "walk", speed: 0, phase: 0 },
        },
        ticket,
        cancelled: false,
        bounces: 0,
      };
    v.target = v.active
      ? destination(a, slot)
      : queuePoint(v.queueIndex, v.radius);
    if (!v.target) return false;
    if (invite && !waterfrontDrySupport(p, v.radius)) {
      v.trip = gatherTrip(
        actor.position,
        {
          x: origin.x + (v.active ? W.arrival.x + (slot % 2) * 2 : v.target.x),
          y: W.y + WATERFRONT_FOOT,
          z:
            origin.z +
            (v.active ? W.arrival.z + Math.floor(slot / 2) * 2 : v.target.z),
        },
        0,
      );
      v.trip.start = clock * 1000;
      phase(v, "travel");
    } else if (!route(v, v.target, v.active ? "prepare" : "waiting"))
      return false;
    visits.set(id, v);
    return true;
  }
  const thisUnsafe = (v) =>
    ["bounce", "dive", "splash", "swim", "queue", "climb", "travel"].includes(
      v.phase,
    );
  function update(dt, time) {
    if (!canSimulate()) return;
    dt = Math.max(0, Math.min(0.1, dt));
    clock += dt;
    animationTime = time;
    for (const v of visits.values())
      if (!v.active && v.phase === "waiting") {
        if (v.cancelled) finish(v, false);
        else activate(v);
      }
    for (const v of [...visits.values()]) {
      if (v.redirect && !thisUnsafe(v)) {
        v.activity = waterfrontActivity(v.redirect);
        v.redirect = null;
        v.ticket = null;
        v.cancelled = false;
        v.bounces = 0;
        v.active = false;
        v.target = queuePoint(v.queueIndex, v.radius);
        if (!route(v, v.target, "waiting")) {
          finish(v, false);
          continue;
        }
      }
      const f = v.frame;
      v.age += dt;
      f.walking = false;
      f.locomotion.speed = 0;
      f.locomotion.mode = "walk";
      const reaction = f.reaction;
      for (const k of Object.keys(reaction)) delete reaction[k];
      if (v.phase === "travel") {
        const t = gatherFrame(v.trip, clock * 1000);
        v.local = local(t.position);
        v.yaw = t.yaw;
        Object.assign(reaction, t.reaction);
        if (t.done) {
          if (!v.active) phase(v, "waiting");
          else if (!route(v, v.target)) finish(v, false);
        }
      } else if (v.phase === "waiting") {
        reaction.crouch = 0.3;
        reaction.headRoll = Math.sin(time * 0.4 + v.queueIndex) * 0.06;
      } else if (v.phase === "approach" || v.phase === "exit") {
        let budget = dt * 5;
        while (budget > 0 && v.path?.length) {
          const p = v.path[0],
            d = Math.hypot(p.x - v.local.x, p.z - v.local.z),
            step = Math.min(budget, d);
          v.yaw = Math.atan2(p.x - v.local.x, p.z - v.local.z);
          if (d > 0.001) {
            v.local.x += ((p.x - v.local.x) * step) / d;
            v.local.z += ((p.z - v.local.z) * step) / d;
          }
          const support = waterfrontDrySupport(v.local, v.radius);
          v.local.y =
            support?.kind === "net"
              ? (getTrampoline()?.userData.height(
                  v.local.x - W.trampoline.x,
                  v.local.z - W.trampoline.z,
                  time,
                ) ?? W.trampoline.y) + WATERFRONT_FOOT
              : (support?.y ?? v.local.y);
          budget -= step;
          if (d <= step + 0.001) v.path.shift();
          else break;
        }
        f.walking = true;
        f.locomotion.speed = 5;
        f.locomotion.phase += dt * 11;
        if (!v.path?.length) phase(v, v.next || "prepare");
      } else if (v.phase === "prepare") {
        reaction.crouch = 0.3 * Math.sin((Math.min(1, v.age) * Math.PI) / 2);
        reaction.earRelax = 0.06;
        if (v.age > 0.8) {
          if (v.cancelled) phase(v, "return");
          else if (v.id === player) phase(v, "player");
          else if (["bounce", "dive"].includes(v.activity.kind))
            bounce(v, 1.8, "land");
          else phase(v, v.activity.kind);
        }
      } else if (v.phase === "bounce") {
        const p = ballisticFrame(v.flight, v.age);
        Object.assign(v.local, { x: p.x, y: p.y, z: p.z });
        Object.assign(reaction, {
          ride: true,
          frontLift: p.vy > 0 ? 0.25 : 0.1,
          hindTuck: 0.3,
          tailTrail: 0.15,
          headPitch: p.vy > 0 ? -0.12 : 0.15,
          pawSpread: 0.12,
        });
        if (p.done) {
          getTrampoline()?.userData.impact(
            v.local.x - W.trampoline.x,
            v.local.z - W.trampoline.z,
            time,
            0.8,
          );
          phase(v, v.afterFlight);
        }
      } else if (v.phase === "player") {
        const input = v.input || {},
          length = Math.max(1, Math.hypot(input.forward || 0, input.side || 0)),
          yaw = input.heading ?? v.yaw,
          dx =
            ((Math.sin(yaw) * (input.forward || 0) +
              Math.cos(yaw) * (input.side || 0)) *
              5 *
              dt) /
            length,
          dz =
            ((Math.cos(yaw) * (input.forward || 0) -
              Math.sin(yaw) * (input.side || 0)) *
              5 *
              dt) /
            length,
          p = { ...v.local, x: v.local.x + dx, z: v.local.z + dz };
        if (
          Math.hypot(p.x - W.trampoline.x, p.z - W.trampoline.z) <
          W.trampoline.radius - 7 - v.radius
        ) {
          v.local.x = p.x;
          v.local.z = p.z;
          if (Math.hypot(dx, dz) > 0.0001) {
            v.yaw = Math.atan2(dx, dz);
            f.walking = true;
            f.locomotion.speed = 5;
            f.locomotion.phase += dt * 11;
          }
        }
        v.local.y =
          (getTrampoline()?.userData.height(
            v.local.x - W.trampoline.x,
            v.local.z - W.trampoline.z,
            time,
          ) ?? W.trampoline.y) + WATERFRONT_FOOT;
        if (v.cancelled || v.id !== player) phase(v, "return");
        else if (input.jump) {
          v.chain =
            v.age > 1.5 ? 2.5 : Math.min(60, (v.chain || 1) * 1.4 + 1.5);
          bounce(v, v.chain, "player-land");
        }
      } else if (v.phase === "player-land") {
        reaction.crouch = 0.7 * Math.exp(-v.age * 8);
        if (v.age > 0.25) {
          if (v.id !== player || v.cancelled) phase(v, "return");
          else if (v.input?.jump) {
            v.chain = Math.min(60, (v.chain || 2.5) * 1.4 + 1.5);
            bounce(v, v.chain, "player-land");
          } else phase(v, "player");
        }
      } else if (v.phase === "land") {
        reaction.crouch = 0.65 * Math.exp(-v.age * 7);
        if (v.age > 0.5) {
          v.bounces++;
          if (v.id === player && !v.cancelled) phase(v, "player");
          else if (v.cancelled || v.bounces >= 4) phase(v, "return");
          else if (v.activity.kind === "dive" && v.bounces >= 2) {
            v.lane = diveLane(v.slot);
            if (!route(v, v.lane.launch, "launch")) phase(v, "return");
          } else bounce(v, v.bounces === 2 ? 26 : 4.5, "land");
        }
      } else if (v.phase === "launch") {
        reaction.crouch = 0.5;
        if (v.age > 0.55) {
          v.flight = ballisticLaunch(v.local, v.lane.water, { height: 18 });
          phase(v, "dive");
        }
      } else if (v.phase === "dive") {
        const p = ballisticFrame(v.flight, v.age);
        Object.assign(v.local, { x: p.x, y: p.y, z: p.z });
        Object.assign(reaction, {
          ride: true,
          bodyPitch: p.vy < 0 ? 0.22 : -0.15,
          frontLift: 0.35,
          hindTuck: 0.25,
          tailTrail: 0.4,
          headPitch: p.vy < 0 ? 0.16 : -0.1,
        });
        if (p.done) {
          effects?.splash(
            v.local.x,
            v.local.z,
            time,
            Math.min(2.6, 1.3 + Math.abs(p.vy) / 22),
          );
          phase(v, "splash");
        }
      } else if (v.phase === "splash") {
        v.local.y = -0.25 + Math.min(1, v.age / 0.65) * 0.245;
        reaction.headPitch = -0.08;
        if (v.age > 0.65) {
          v.swimStart = { ...v.local };
          phase(v, "swim");
        }
      } else if (v.phase === "swim" || v.phase === "queue") {
        const target = v.lane.climb,
          dx = target.x - v.local.x,
          dz = target.z - v.local.z,
          d = Math.hypot(dx, dz),
          step = Math.min(d, dt * 3.6);
        if (d > 0.1) {
          v.local.x += (dx / d) * step;
          v.local.z += (dz / d) * step;
          v.yaw = Math.atan2(dx, dz);
        }
        v.local.y = -0.005 + Math.sin(time * 3 + v.slot) * 0.025;
        f.locomotion.mode = "swim";
        f.locomotion.speed = d > 1 ? 3.6 : 1.2;
        f.locomotion.phase += dt * 6;
        reaction.headPitch = -0.08;
        if (Math.floor((v.age - dt) * 2) !== Math.floor(v.age * 2))
          effects?.splash(v.local.x, v.local.z, time, 0.1);
        if (d < 1) {
          if (!climber) {
            climber = v.id;
            v.climbFrom = { ...v.local };
            phase(v, "climb");
          } else phase(v, "queue");
        }
      } else if (v.phase === "climb") {
        const t = Math.min(1, v.age / 3.5),
          to = v.lane.exit;
        v.local.x = v.climbFrom.x + (to.x - v.climbFrom.x) * t;
        v.local.z = v.climbFrom.z + (to.z - v.climbFrom.z) * t;
        v.local.y = v.climbFrom.y + (to.y - v.climbFrom.y) * t;
        v.yaw = Math.PI;
        f.walking = true;
        f.locomotion.speed = 2;
        f.locomotion.phase += dt * 6;
        reaction.ride = true;
        reaction.bodyPitch = -0.1;
        if (t === 1) {
          climber = null;
          phase(v, "shake");
        }
      } else if (v.phase === "shake") {
        reaction.ride = true;
        reaction.bodyLean = Math.sin(v.age * 22) * 0.05 * Math.exp(-v.age);
        reaction.headRoll = Math.sin(v.age * 22) * 0.1 * Math.exp(-v.age);
        reaction.tailSway = Math.sin(v.age * 15) * 0.2;
        if (v.age > 2) phase(v, "return");
      } else if (v.phase === "dine") {
        reaction.crouch = 0.28;
        reaction.paw = 0.2 + 0.12 * Math.sin(time * 1.6);
        reaction.headPitch = 0.12;
        reaction.headYaw = 0.1 * Math.sin(time * 0.7);
        reaction.ride = true;
        if (v.age > v.activity.duration) phase(v, "return");
      } else if (v.phase === "glass") {
        reaction.headPitch = 0.3;
        reaction.headRoll = 0.09 * Math.sin(time * 0.7 + v.slot);
        reaction.tailSway = 0.08 * Math.sin(time);
        if (v.age > v.activity.duration) phase(v, "return");
      } else if (v.phase === "terrace") {
        reaction.crouch = 0.65;
        reaction.earRelax = -0.1;
        reaction.ride = true;
        reaction.eyeClose = 0.6;
        reaction.headRoll = 0.08;
        if (v.age > v.activity.duration) phase(v, "return");
      } else if (v.phase === "walk") {
        if (v.age > 2) {
          v.target = { x: -v.target.x, y: W.y + WATERFRONT_FOOT, z: 18 };
          if (v.bounces++ < 1) route(v, v.target, "walk");
          else phase(v, "return");
        }
      } else if (v.phase === "return") {
        if (
          !route(
            v,
            {
              x: W.arrival.x + (v.slot % 2) * 2,
              y: W.y + WATERFRONT_FOOT,
              z: W.arrival.z + Math.floor(v.slot / 2) * 2,
            },
            "done",
          )
        )
          finish(v, false);
      } else if (v.phase === "done") finish(v);
      if (visits.has(v.id)) pose(v);
    }
  }
  return {
    visits,
    redirect(id, activity) {
      const v = visits.get(id);
      if (!v || !waterfrontActivity(activity)) return false;
      if (v.activity.id === activity && !v.cancelled) return true;
      v.redirect = activity;
      return true;
    },
    requestPlayer(id = "chichi") {
      const v = visits.get(id);
      if (!v || !["bounce", "dive"].includes(v.activity.kind)) return false;
      player = id;
      v.chain = 1;
      return true;
    },
    get player() {
      return player;
    },
    get playerReady() {
      const v = visits.get(player);
      return (
        !!v &&
        ["player", "player-land", "bounce"].includes(v.phase) &&
        Math.hypot(v.local.x - W.trampoline.x, v.local.z - W.trampoline.z) < 68
      );
    },
    playerInput(input) {
      const v = visits.get(player);
      if (v) v.input = { ...input };
      return v?.frame || null;
    },
    releasePlayer() {
      const v = visits.get(player);
      if (v) {
        v.input = {};
        v.cancelled = true;
      }
      player = null;
    },
    start,
    update,
    has: (id) => visits.has(id),
    frame: (id) => visits.get(id)?.frame || null,
    get: (id) => visits.get(id),
    get animationTime() {
      return animationTime;
    },
    get clock() {
      return clock;
    },
    unsafe(id) {
      return [
        "bounce",
        "dive",
        "splash",
        "swim",
        "queue",
        "climb",
        "travel",
      ].includes(visits.get(id)?.phase);
    },
    cancel(id, { force = false } = {}) {
      const v = visits.get(id);
      if (!v) return true;
      if (this.unsafe(id) && !force) {
        v.cancelled = true;
        return false;
      }
      finish(v, false);
      return true;
    },
    safePosition(id) {
      const v = visits.get(id);
      if (!v) return null;
      if (this.unsafe(id))
        return new T.Vector3(
          origin.x + W.arrival.x,
          W.y + WATERFRONT_FOOT,
          origin.z + W.arrival.z,
        );
      return v.frame.position.clone();
    },
    dispose() {
      for (const v of visits.values()) onPark(v.id, this.safePosition(v.id));
      visits.clear();
      ((climber = null), (player = null));
    },
  };
}
