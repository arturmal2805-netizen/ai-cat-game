import { positionValue } from "./crypto-trading.js";
import {
  JOB_START,
  JOB_END,
  JOB_BUSINESSES,
  jobBusiness,
  jobStations,
  jobCar,
} from "./jobcity-data.js";
import { cityClock } from "./jobcity-system.js";
import {
  workplacePath,
  cityWalkPath,
  cityRoadPath,
  pathLength,
  pathFrame,
  nearestRoad,
} from "./jobcity-navigation.js";
const ease = (t) => t * t * (3 - 2 * t);
const WALK_PHASES = new Set([
  "to-work",
  "to-car",
  "walk",
  "leave",
  "to-visit",
  "leave-visit",
]);
const CAR_PHASES = new Set(["enter-car", "drive", "park", "exit-car"]);
const seed = (id) =>
  [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 5);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function streetFrame(path, travel) {
  const p = pathFrame(path, travel);
  // Rounded position and tangent at each junction, still inside the 4.2m street.
  let at = 0;
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1],
      b = path[i],
      c = path[i + 1],
      ab = distance(a, b),
      bc = distance(b, c),
      r = Math.min(1.5, ab * 0.25, bc * 0.25);
    at += ab;
    if (r > 0.05 && Math.abs(travel - at) < r) {
      const t = (travel - at + r) / (2 * r),
        u = 1 - t,
        A = {
          x: b.x + ((a.x - b.x) * r) / ab,
          z: b.z + ((a.z - b.z) * r) / ab,
        },
        C = {
          x: b.x + ((c.x - b.x) * r) / bc,
          z: b.z + ((c.z - b.z) * r) / bc,
        };
      p.x = u * u * A.x + 2 * u * t * b.x + t * t * C.x;
      p.z = u * u * A.z + 2 * u * t * b.z + t * t * C.z;
      p.yaw = Math.atan2(
        u * (b.x - A.x) + t * (C.x - b.x),
        u * (b.z - A.z) + t * (C.z - b.z),
      );
      break;
    }
  }
  if (p) {
    p.x += Math.cos(p.yaw) * 1.05;
    p.z -= Math.sin(p.yaw) * 1.05;
  }
  return p;
}

export function createJobCityRuntime({
  onAttendance = () => {},
  onTripDone = () => {},
  onVisitDone = () => {},
} = {}) {
  const states = new Map(),
    slots = new Map(),
    completedTrips = new Map();
  let lastDay = -1;
  function cancel(id, notify = true) {
    const v = states.get(id);
    if (!v) return;
    if (v.job && notify && v.phase === "work") onAttendance(id, v.job, false);
    if (v.slotKey) slots.delete(v.slotKey);
    states.delete(id);
  }
  function step(
    game,
    actors,
    dt,
    time,
    { blocked = () => false, now = Date.now() } = {},
  ) {
    if (!game.unlocked.includes("jobcity") || !game.jobCity) {
      for (const id of states.keys()) cancel(id);
      return;
    }
    const clock = cityClock(game.jobCity, now);
    if (lastDay !== clock.day) {
      if (lastDay >= 0) for (const id of states.keys()) cancel(id);
      lastDay = clock.day;
    }
    for (const actor of actors) {
      const id = actor.id,
        p = game.jobCity.profiles[id];
      if (!p) continue;
      let v = states.get(id);
      if (blocked(actor)) {
        cancel(id);
        continue;
      }
      const trip = p.trip?.id === completedTrips.get(id) ? null : p.trip,
        job =
          clock.working &&
          p.schedule?.day === clock.day &&
          p.schedule.job !== "rest"
            ? p.schedule.job
            : null;
      if (v?.job && (v.job !== job || trip) && v.phase !== "leave") {
        const b = jobBusiness(v.job),
          front = v.path.findIndex(
            (p) =>
              Math.abs(p.x - b.x) < 0.1 && Math.abs(p.z - b.z - 11.7) < 0.1,
          ),
          reached =
            v.phase === "to-work"
              ? v.path.slice(0, Math.max(1, (v.segmentEnd || 1) - 1))
              : v.path,
          exit = reached.slice(Math.max(0, front)).reverse();
        if (v.phase === "work") onAttendance(id, v.job, false);
        if (v.slotKey) slots.delete(v.slotKey);
        v = {
          ...v,
          job: null,
          slotKey: null,
          phase: "leave",
          path: [{ ...v.position }, ...exit],
          distance: 0,
          phaseTime: 0,
        };
        states.set(id, v);
      }
      if (
        v &&
        v.phase !== "leave" &&
        ((trip && v.tripId !== trip.id) ||
          (!trip && v.tripId) ||
          (!v.job && job && !v.visitor && v.phase === "rest"))
      ) {
        cancel(id);
        v = null;
      }
      if (!v) {
        if (trip) {
          // The last parking receipt is history, not a summons to walk back
            // across the city: this owned car is currently in the inventory.
          const roadParking = nearestRoad(actor.local),
            drive = cityRoadPath(roadParking, trip.destination),
            parking = drive && streetFrame(drive, 0),
            door = parking && {
              x: parking.x + Math.cos(parking.yaw) * 1.8,
              z: parking.z - Math.sin(parking.yaw) * 1.8,
              y: 0.32,
            },
            walk = door && cityWalkPath(actor.local, door);
          if (!walk || !drive) continue;
          v = {
            id,
            phase: "to-car",
            path: walk,
            distance: 0,
            car: trip.car,
            tripId: trip.id,
            drivePath: drive,
            driveLength: pathLength(drive),
            parking,
            position: { ...actor.local },
            yaw: 0,
            phaseTime: 0,
            speed: 0,
          };
        } else if (job) {
          const b = jobBusiness(job);
          let slot = -1;
          for (const i of [0, 2, 4, 1, 3, 5])
            if (!slots.has(b.id + "-" + i)) {
              slot = i;
              break;
            }
          if (slot < 0) continue;
          const path = workplacePath(actor.local, b, slot);
          if (!path) continue;
          const key = b.id + "-" + slot;
          slots.set(key, id);
          v = {
            id,
            job,
            slot,
            slotKey: key,
            phase: "to-work",
            path,
            distance: 0,
            position: { ...actor.local },
            yaw: 0,
            phaseTime: 0,
          };
        } else if (
          actor.biome === "jobcity" ||
          Math.hypot(actor.local.x, actor.local.z) < 66 ||
          v
        ) {
          if (!clock.working && p.schedule?.evening === "rest") {
            const a = actor.index * 2.4,
              goal = { x: Math.sin(a) * 11, z: 7 + Math.cos(a) * 2, y: 0.32 },
              path = cityWalkPath(actor.local, goal);
            if (!path) continue;
            v = {
              id,
              sleep: true,
              phase: "walk",
              path,
              distance: 0,
              position: { ...actor.local },
              yaw: 0,
              phaseTime: 0,
            };
            states.set(id, v);
          } else {
            const b =
              JOB_BUSINESSES[
                (seed(id) + Math.floor(time / 55)) % JOB_BUSINESSES.length
              ];
            let slot = -1;
            for (const i of [0, 2, 4, 1, 3, 5])
              if (!slots.has("visitor-" + b.id + "-" + i)) {
                slot = i;
                break;
              }
            const path =
              slot >= 0 ? workplacePath(actor.local, b, slot, true) : null;
            if (path) {
              const slotKey = "visitor-" + b.id + "-" + slot;
              slots.set(slotKey, id);
              v = {
                id,
                visitor: b.kind,
                slot,
                slotKey,
                phase: "to-visit",
                path,
                distance: 0,
                position: { ...actor.local },
                yaw: 0,
                phaseTime: 0,
              };
            } else {
              const goal = {
                x: Math.sin(actor.index * 2.4) * 10,
                z: 7 + Math.cos(actor.index * 2.4) * 2,
                y: 0.32,
              };
              const walk = cityWalkPath(actor.local, goal);
              if (!walk) continue;
              v = {
                id,
                phase: "walk",
                path: walk,
                distance: 0,
                position: { ...actor.local },
                yaw: 0,
                phaseTime: 0,
              };
            }
          }
        } else continue;
        states.set(id, v);
      }
      const purchase = p.transactions.at(-1);
      v.joy =
        purchase?.kind === "purchase" &&
        now - purchase.at >= 0 &&
        now - purchase.at < 7000;
      v.phaseTime += dt;
      if (WALK_PHASES.has(v.phase)) {
        const nextDistance = v.distance + dt * (3.5 + (seed(id) % 5) * 0.12),
          f = pathFrame(v.path, nextDistance);
        let obstructed = false;
        if (f)
          for (const other of states.values())
            if (
              other !== v &&
              other.position &&
              Math.abs((other.position.y || 0) - f.y) < 0.6 &&
              WALK_PHASES.has(other.phase) &&
              other.id < id &&
              distance(other.position, f) < 1.1 &&
              distance(other.position, v.position) > distance(other.position, f)
            ) {
              obstructed = true;
              break;
            }
        if (obstructed) continue;
        v.distance = nextDistance;
        // Record the reached segment so a cancelled commute reverses only real steps.
        let traversed = 0;
        v.segmentEnd = 1;
        for (let i = 1; i < v.path.length; i++) {
          traversed += Math.hypot(
            v.path[i].x - v.path[i - 1].x,
            v.path[i].z - v.path[i - 1].z,
            (v.path[i].y || 0) - (v.path[i - 1].y || 0),
          );
          v.segmentEnd = i + 1;
          if (traversed >= v.distance) break;
        }

        if (f) {
          v.position = f;
          v.yaw = f.yaw;
          if (f.done) {
            v.phaseTime = 0;
            if (v.phase === "to-work") {
              v.phase = "work";
              v.yaw = 0;
              onAttendance(id, v.job, true);
            } else if (v.phase === "to-car") {
              v.phase = "enter-car";
              v.position = { ...v.parking };
              v.yaw = v.parking.yaw || 0;
            } else if (v.phase === "to-visit") {
              v.phase = "talk";
              v.yaw = Math.PI;
            } else if (v.phase === "leave-visit") {
              if (v.slotKey) slots.delete(v.slotKey);
              if (v.manual) onVisitDone(v.id, v.decision);
              v.manual = false;
              v.visitor = null;
              v.slotKey = null;
              v.phase = "rest";
            } else v.phase = "rest";
          }
        }
      } else if (v.phase === "talk" && v.phaseTime > 12 + (seed(id) % 7)) {
        const b = jobBusiness(v.visitor),
          front = v.path.findIndex(
            (p) =>
              Math.abs(p.x - b.x) < 0.1 && Math.abs(p.z - b.z - 11.7) < 0.1,
          );
        v.path = [
          { ...v.position },
          ...v.path.slice(Math.max(0, front)).reverse(),
        ];
        v.distance = 0;
        v.phase = "leave-visit";
        v.phaseTime = 0;
      } else if (v.phase === "rest" && !v.sleep && v.phaseTime > 8) {
        states.delete(id);
      } else if (v.phase === "enter-car" && v.phaseTime > 1.4) {
        v.phase = "drive";
        v.distance = 0;
        v.phaseTime = 0;
      } else if (v.phase === "drive") {
        const car = jobCar(v.car),
          remaining = Math.max(0, v.driveLength - v.distance),
          target = Math.min(car.speed, Math.sqrt(remaining * 5));
        v.speed += (target - v.speed) * Math.min(1, dt * 2.5);
        v.distance += v.speed * dt;
        const f = streetFrame(v.drivePath, v.distance),
          ahead = streetFrame(
            v.drivePath,
            v.distance + Math.max(1, v.speed * 0.2),
          );
        if (f) {
          v.position = f;
          const targetYaw = Math.atan2(ahead.x - f.x, ahead.z - f.z);
          let delta = Math.atan2(
            Math.sin(targetYaw - v.yaw),
            Math.cos(targetYaw - v.yaw),
          );
          v.yaw += delta * Math.min(1, dt * 5);
          v.steer = delta;
          // Ordered lane yielding: two cars never occupy the same road patch.
          for (const other of states.values())
            if (
              other !== v &&
              CAR_PHASES.has(other.phase) &&
              Math.hypot(
                other.position.x - v.position.x,
                other.position.z - v.position.z,
              ) < 4.4 &&
              Math.abs(
                (other.position.x - f.x) * Math.cos(v.yaw) -
                  (other.position.z - f.z) * Math.sin(v.yaw),
              ) < 1.98 &&
              distance(other.position, f) <
                distance(
                  other.position,
                  streetFrame(
                    v.drivePath,
                    Math.max(0, v.distance - v.speed * dt),
                  ),
                )
            ) {
              v.distance = Math.max(0, v.distance - v.speed * dt);
              v.speed = 0;
              v.position = streetFrame(v.drivePath, v.distance);
              break;
            }
          if (f.done || remaining < 0.08) {
            v.phase = "park";
            v.phaseTime = 0;
            v.speed = 0;
          }
        }
      } else if (v.phase === "park" && v.phaseTime > 1) {
        v.phase = "exit-car";
        v.phaseTime = 0;
      } else if (v.phase === "exit-car" && v.phaseTime > 1.2) {
        completedTrips.set(id, v.tripId);
        onTripDone(id, v.tripId, v.position);
        states.delete(id);
      }
    }
    for (const v of states.values())
      if (v.phase === "work") {
        v.investments = v.job === "crypto" ? game.jobCity.profiles[v.id]?.investments : null;
        v.customer = false;
        for (const peer of states.values())
          if (
            peer.visitor === v.job &&
            peer.slot === v.slot &&
            peer.phase === "talk"
          ) {
            v.customer = true;
            break;
          }
      }
    for (const id of [...states.keys()])
      if (!actors.some((a) => a.id === id)) cancel(id);
  }
  return {
    states,
    slots,
    step,
    cancel,
    visit(id, businessId, origin, decision) {
      const b = jobBusiness(businessId);
      if (!b) return false;
      let slot = -1;
      for (const i of [0, 2, 4, 1, 3, 5])
        if (!slots.has("visitor-" + b.id + "-" + i)) {
          slot = i;
          break;
        }
      if (slot < 0) return false;
      const path = workplacePath(origin, b, slot, true);
      if (!path) return false;
      cancel(id);
      const slotKey = "visitor-" + b.id + "-" + slot;
      slots.set(slotKey, id);
      const v = {
        id,
        manual: true,
        decision,
        visitor: b.kind,
        slot,
        slotKey,
        phase: "to-visit",
        path,
        distance: 0,
        position: { ...origin },
        yaw: 0,
        phaseTime: 0,
      };
      states.set(id, v);
      return v;
    },
    get: (id) => states.get(id),
    has: (id) => states.has(id),
    clear() {
      for (const id of [...states.keys()]) cancel(id);
    },
  };
}
export function jobCatFrame(v, time, reduced = false, now = Date.now()) {
  const t = reduced ? 0 : time + (seed(v.id) % 23) * 0.17,
    s = Math.sin(t * 3.5),
    phase = v.phase;
  const f = {
    position: v.position,
    yaw: v.yaw,
    walking: WALK_PHASES.has(phase),
    phase,
    car: v.car,
    carVisible: phase === "to-car" || CAR_PHASES.has(phase),
    speed: v.speed || 0,
    steer: v.steer || 0,
    reaction: null,
  };
  if (phase === "work")
    f.position = {
      ...v.position,
      y: v.position.y + 0.8 * ease(Math.min(1, v.phaseTime / 1.2)),
    };
  if (phase === "talk")
    f.reaction = {
      paw: 0.18 + Math.max(0, s) * 0.28,
      headPitch: Math.sin(t * 1.5) * 0.08,
      tailSway: 0.25,
    };
  if (phase === "work") {
    const kind = v.job,
      typing = ["crypto", "estate", "bank"].includes(kind);
    f.reaction = {
      crouch: 0.08,
      headPitch: 0.04 + s * 0.035,
      paw: typing ? 0.14 + Math.max(0, s) * 0.16 : 0.16 + Math.max(0, s) * 0.46,
      tailSway: 0.12,
      ride: true,
      frontLift: typing ? 0.08 : 0.16,
    };
    if (v.customer) {
      f.reaction.headYaw = Math.sin(t * 1.3) * 0.12;
      f.reaction.paw = 0.25 + Math.max(0, s) * 0.4;
      f.reaction.earRelax = 0.12;
    }
    if (kind === "crypto" && v.investments?.current) {
      const trade=v.investments.current,value=positionValue(trade,now);
      if(value && trade.status==='open') {
        f.reaction.headYaw = reduced ? 0 : Math.sin(t*.9)*.075;
        f.reaction.paw = .17 + (reduced ? 0 : Math.max(0,Math.sin(t*6))*.2);
        f.reaction.tailSway = .2;
      } else if(value && now-trade.closedAt<6000 && now>=trade.closedAt) {
        const positive=trade.pnl>Math.max(1,trade.margin*.01),negative=trade.pnl<-Math.max(1,trade.margin*.01);
        f.cryptoOutcome=positive?'profit':negative?'loss':'calm';
        f.reaction.headRoll=reduced?0:s*(positive?.13:.035);
        f.reaction.headPitch=positive?-.12:negative?.12:.02;
        f.reaction.frontLift=positive?.24:.08;
        f.reaction.paw=positive?.34:.14;
        f.reaction.tailSway=positive?.5:.15;
        f.reaction.eyeClose=negative?.28:positive?.1:.2;
        f.reaction.earRelax=negative?.2:.08;
      }
    }
    if (kind === "furniture" || kind === "cars") {
      f.yaw = Math.sin(t * 0.7) * 0.18;
      f.reaction.paw = 0.22 + Math.max(0, s) * 0.3;
    }
  }
  if (phase === "rest")
    f.reaction = { crouch: 0.3, headPitch: 0.08, ride: true, eyeClose: 0.25 };
  if (v.joy && !f.carVisible)
    f.reaction = {
      ...f.reaction,
      paw: 0.3 + Math.max(0, s) * 0.2,
      headRoll: s * 0.1,
      headPitch: -0.08,
      tailSway: 0.45,
      ride: true,
      frontLift: 0.12,
    };
  if (f.carVisible)
    f.carPosition = phase === "to-car" ? v.parking : { ...v.position };
  if (CAR_PHASES.has(phase)) {
    f.position = {
      x: v.position.x - Math.cos(v.yaw) * 0.36 - Math.sin(v.yaw) * 0.25,
      y: 1.26,
      z: v.position.z + Math.sin(v.yaw) * 0.36 - Math.cos(v.yaw) * 0.25,
    };
    f.reaction = {
      crouch: 0.3,
      paw: 0.4,
      headPitch: -0.03,
      ride: true,
      grip: 0.4,
    };
    if (phase === "enter-car" || phase === "exit-car") {
      const entering = phase === "enter-car",
        e = ease(Math.min(1, v.phaseTime / (entering ? 1.4 : 1.2))),
        k = entering ? e : 1 - e;
      const door = {
        x: v.position.x + Math.cos(v.yaw) * 1.8,
        z: v.position.z - Math.sin(v.yaw) * 1.8,
      };
      f.position = {
        x: door.x + (f.position.x - door.x) * k,
        z: door.z + (f.position.z - door.z) * k,
        y: 0.32 + k * 0.94 + Math.sin(k * Math.PI) * 0.25,
      };
    }
  }
  return f;
}
