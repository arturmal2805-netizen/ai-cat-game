import { jobCar, JOB_CITY_CENTER } from "./jobcity-data.js";
import { byBiome } from "./game-data.js";
import { pathFrame, pathLength } from "./jobcity-navigation.js";

const point = p => ({ x: p.x, y: p.y ?? .16, z: p.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const validPoint = p => p && [p.x, p.y ?? .16, p.z].every(Number.isFinite);
const pose = p => ({ ...point(p), biome: p.biome, yaw: p.yaw || 0 });
export const ownedCatCar = p => p?.worldCar && p.inventory?.[p.worldCar.car]
  ? p.worldCar.car : Object.keys(p?.inventory || {}).find(id => jobCar(id) && p.inventory[id] > 0);

// One durable start and one durable parking receipt, never a write per frame.
// Old clients can omit this field without erasing another device's parked car.
export function normalizeCatCar(raw, inventory) {
  if (!raw || !jobCar(raw.car) || !inventory?.[raw.car] ||
      !validPoint(raw.parked) || !byBiome(raw.parked.biome)) return null;
  const result = { car: raw.car, parked: pose(raw.parked), lastJourney: String(raw.lastJourney || "").slice(0, 180) };
  const t = raw.trip;
  if (t && typeof t.id === "string" && typeof t.key === "string" &&
      Number.isFinite(t.startedAt) && Number.isFinite(t.duration) && t.duration > 0 &&
      validPoint(t.destination) && byBiome(t.destination.biome) &&
      Array.isArray(t.walk) && t.walk.length > 0 && t.walk.every(validPoint) &&
      Array.isArray(t.route) && t.route.length > 1 && t.route.every(validPoint)) {
    result.trip = { id: t.id.slice(0, 180), key: t.key.slice(0, 180), startedAt: t.startedAt,
      duration: t.duration, walk: t.walk.map(point), route: t.route.map(point),
      destination: pose(t.destination) };
  }
  return result;
}
export function setCatCarState(game, id, state) {
  const p = game.jobCity?.profiles[id];
  if (!p) return game;
  const value = normalizeCatCar(state, p.inventory);
  if (!value || JSON.stringify(value) === JSON.stringify(p.worldCar)) return game;
  const next = structuredClone(game);
  next.jobCity.profiles[id].worldCar = value;
  return next;
}

export function createCatCommute({ getProfile, locate, parking, route, walk,
  onChange = () => true, getParked = () => [], clock = () => Date.now() }) {
  const states = new Map(), retries = new Map(), completed = new Map();
  let nextRoute = 0;
  function saved(id) { return states.get(id)?.saved || getProfile(id)?.worldCar; }
  function occupied(except) {
    const points = getParked(except).filter(Boolean);
    for (const [id, v] of states) if (id !== except) points.push(v.saved.trip?.destination || v.saved.parked);
    return points;
  }
  function frame(id) {
    const v = states.get(id);
    if (!v?.saved.trip) return null;
    const t = v.saved.trip, elapsed = v.elapsed,
      walkTime = pathLength(t.walk) / 4,
      driving = Math.max(0, elapsed - walkTime - 1.2),
      travel = pathLength(t.route), driveTime = travel / (jobCar(v.saved.car).speed * 3),
      progress = Math.min(1, driving / Math.max(.001, driveTime)),
      driveDistance = progress*progress*(3-2*progress)*travel,
      carFrame = pathFrame(t.route, driveDistance),
      behind = pathFrame(t.route, Math.max(0,driveDistance-1)), ahead=pathFrame(t.route,Math.min(travel,driveDistance+1));
    carFrame.yaw = Math.atan2(ahead.x-behind.x,ahead.z-behind.z);
    let phase, position, yaw, carPosition;
    const doorAt = p => ({ x: p.x + Math.cos(p.yaw || 0) * 1.8,
      y: p.y ?? .16, z: p.z - Math.sin(p.yaw || 0) * 1.8 });
    if (elapsed < walkTime) {
      phase = "to-car"; position = pathFrame(t.walk, elapsed * 4);
      yaw = position.yaw; carPosition = v.saved.parked;
    } else if (elapsed < walkTime + 1.2) {
      phase = "enter-car"; carPosition = v.saved.parked; yaw = carPosition.yaw;
      const k = (elapsed - walkTime) / 1.2, a = doorAt(carPosition);
      position = { x: a.x + (carPosition.x - a.x - .36 * Math.cos(yaw) - .25 * Math.sin(yaw)) * k,
        z: a.z + (carPosition.z - a.z + .36 * Math.sin(yaw) - .25 * Math.cos(yaw)) * k,
        y: a.y + k * 1.02 + Math.sin(k * Math.PI) * .25 };
    } else {
      carPosition = driving < driveTime ? carFrame : t.destination;
      yaw = carPosition.yaw || 0;
      phase = driving < driveTime ? "drive" : driving < driveTime + .8 ? "park" : "exit-car";
      const k = phase === "exit-car" ? Math.max(0, 1 - (driving - driveTime - .8) / 1.2) : 1,
        a = doorAt(carPosition);
      position = { x: a.x + (carPosition.x - .36 * Math.cos(yaw) - .25 * Math.sin(yaw) - a.x) * k,
        z: a.z + (carPosition.z + .36 * Math.sin(yaw) - .25 * Math.cos(yaw) - a.z) * k,
        y: a.y + k * 1.02 };
    }
    return { position, yaw, phase, car: v.saved.car, carPosition, carVisible: true,
      walking: phase === "to-car", distance: driveDistance,
      reaction: phase === "to-car" ? null : { crouch: .3, paw: .4, ride: true, grip: .4 } };
  }
  function cancel(id) {
    const v = states.get(id), f = frame(id);
    if (!v?.saved.trip || !f) return;
    // Manual control has priority. Keep the actual car where it stopped.
    const at = f.carPosition;
    const data = { car: v.saved.car, parked: { ...pose(at), biome: locate(at).id }, lastJourney: "" };
    if (onChange(id, data) !== false) { v.saved = data; v.elapsed = 0; }
  }
  return {
    states,
    has: id => !!states.get(id)?.saved.trip,
    frame,
    parked: id => saved(id)?.parked,
    car: id => saved(id)?.car,
    cancel,
    forget(id) { states.delete(id); retries.delete(id); completed.delete(id); },
    clear() { states.clear(); retries.clear(); completed.clear(); },
    arrive(actor, goal, key, now = clock()) {
      const p = getProfile(actor.id), car = ownedCatCar(p);
      if (!car) return true;
      let v = states.get(actor.id);
      if (v?.saved.trip) return false;
      if (v?.saved.lastJourney === key || p.worldCar?.lastJourney === key || completed.get(actor.id) === key) return true;
      const origin = locate(actor.position), target = locate(goal);
      if (origin.id === target.id && origin.section === target.section) return true;
      if (now < nextRoute || now < (retries.get(actor.id) || 0)) return false;
      nextRoute = now + 120; retries.set(actor.id, now + 3000);
      const old = saved(actor.id),
        legacy = !old && p.parkedCar === car && p.parkedAt
          ? { ...p.parkedAt, x: p.parkedAt.x + JOB_CITY_CENTER[0], z: p.parkedAt.z + JOB_CITY_CENTER[1], y: .16, biome: "jobcity", yaw: 0 } : null,
        start = old?.car === car ? old.parked : legacy || parking(actor.position, origin, occupied(actor.id)),
        end = parking(goal, target, [...occupied(actor.id), ...(start ? [start] : [])]);
      if (!start || !end) return false;
      const door = { x: start.x + Math.cos(start.yaw || 0) * 1.8, y: start.y, z: start.z - Math.sin(start.yaw || 0) * 1.8 },
        walkPath = walk(actor.position, door, actor.radius || .55),
        drive = route(start, end);
      if (!walkPath?.length || !drive || drive.length < 2) return false;
      const duration = pathLength(walkPath) / 4 + 1.2 + pathLength(drive) / (jobCar(car).speed * 3) + 2;
      const data = { car, parked: pose(start), lastJourney: old?.lastJourney || "", trip: {
        id: key + "-" + now, key, startedAt: now, duration,
        walk: walkPath.map(point), route: drive.map(point), destination: pose(end) } };
      v = { saved: data, elapsed: 0 }; states.set(actor.id, v);
      if (onChange(actor.id, data) === false) {
        if (old) states.set(actor.id, { saved:old, elapsed:0 });
        else states.delete(actor.id);
      }
      return false;
    },
    step(actors, dt, now = clock(), blocked = () => false) {
      for (const a of actors) {
        const p = getProfile(a.id), data = p?.worldCar;
        let v = states.get(a.id);
        if (data?.trip && (!v || v.saved.trip?.id !== data.trip.id) && v?.saved.lastJourney !== data.trip.key) {
          v = { saved: data, elapsed: Math.max(0, (now - data.trip.startedAt) / 1000) };
          states.set(a.id, v);
        }
        if (!v?.saved.trip) continue;
        if (!p?.inventory[v.saved.car] || blocked(a.id)) { cancel(a.id); continue; }
        v.elapsed += dt;
        if (v.elapsed >= v.saved.trip.duration) {
          const t = v.saved.trip;
          if (now < (v.retrySaveAt || 0)) continue;
          const data = { car: v.saved.car, parked: pose(t.destination), lastJourney: t.key };
          if (onChange(a.id, data) === false) { v.retrySaveAt=now+3000;continue; }
          completed.set(a.id, t.key);
          v.saved = data;
          // Let the native destination navigator take over from the real door.
          a.position.set?.(t.destination.x + Math.cos(t.destination.yaw || 0) * 1.8,
            t.destination.y, t.destination.z - Math.sin(t.destination.yaw || 0) * 1.8);
          if (!a.position.set) Object.assign(a.position, { x: t.destination.x + Math.cos(t.destination.yaw || 0) * 1.8,
            y: t.destination.y, z: t.destination.z - Math.sin(t.destination.yaw || 0) * 1.8 });
        }
      }
    },
  };
}
