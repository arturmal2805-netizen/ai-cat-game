import {
  JOB_CITY_RADIUS,
  JOB_BUSINESSES,
  JOB_PARKING,
  JOB_CITY_GATE,
  jobStations,
} from "./jobcity-data.js";
const d = (a, b) => Math.hypot(a.x - b.x, (a.y || 0) - (b.y || 0), a.z - b.z);
export const CITY_ROAD_NODES = [];
for (const z of [-38, 0, 40])
  for (const x of [-50, -16, 16, 50]) CITY_ROAD_NODES.push({ x, z, y: 0.24 });
export const CITY_ROAD_EDGES = [];
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 3; col++)
    if (row !== 1 || col !== 1)
      CITY_ROAD_EDGES.push([row * 4 + col, row * 4 + col + 1]);
for (let row = 0; row < 2; row++)
  for (let col = 0; col < 4; col++)
    CITY_ROAD_EDGES.push([row * 4 + col, (row + 1) * 4 + col]);
const parkingStart = CITY_ROAD_NODES.length;
for (const x of [-36, -16, 16, 36]) CITY_ROAD_NODES.push({ x, z: 48, y: 0.24 });
CITY_ROAD_EDGES.push(
  [9, parkingStart + 1],
  [10, parkingStart + 2],
  [parkingStart, parkingStart + 1],
  [parkingStart + 1, parkingStart + 2],
  [parkingStart + 2, parkingStart + 3],
);
export const CITY_ROADS = CITY_ROAD_EDGES.map(([a, b]) => ({
  a: CITY_ROAD_NODES[a],
  b: CITY_ROAD_NODES[b],
}));
export function cityPoint(p, radius = 0.6) {
  return (
    !!p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    Math.hypot(p.x, p.z) < JOB_CITY_RADIUS - radius - 0.5
  );
}
export function nearestRoad(p) {
  let best = null,
    score = Infinity;
  for (let i = 0; i < CITY_ROADS.length; i++) {
    const { a, b } = CITY_ROADS[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
        ),
      ),
      q = { x: a.x + t * dx, y: 0.24, z: a.z + t * dz },
      n = d(p, q);
    if (n < score) {
      score = n;
      best = { ...q, edge: i };
    }
  }
  return best;
}
export function cityRoadPath(start, goal) {
  if (!cityPoint(goal, 0.8)) return null;
  const from = nearestRoad(start),
    to = nearestRoad(goal);
  if (!from || !to) return null;
  if (from.edge === to.edge) return [from, to];
  const nodes = [...CITY_ROAD_NODES, from, to],
    count = nodes.length,
    edges = [...CITY_ROAD_EDGES],
    a = count - 2,
    b = count - 1;
  for (const n of CITY_ROAD_EDGES[from.edge]) edges.push([a, n]);
  for (const n of CITY_ROAD_EDGES[to.edge]) edges.push([b, n]);
  const costs = new Float64Array(count).fill(Infinity),
    previous = new Int16Array(count).fill(-1),
    used = new Uint8Array(count);
  costs[a] = 0;
  for (let k = 0; k < count; k++) {
    let u = -1;
    for (let i = 0; i < count; i++)
      if (!used[i] && (u < 0 || costs[i] < costs[u])) u = i;
    if (u === b) break;
    used[u] = 1;
    for (const [n, m] of edges) {
      const v = n === u ? m : m === u ? n : -1;
      if (v < 0) continue;
      const cost = costs[u] + d(nodes[u], nodes[v]);
      if (cost < costs[v]) {
        costs[v] = cost;
        previous[v] = u;
      }
    }
  }
  if (!Number.isFinite(costs[b])) return null;
  const path = [];
  for (let i = b; i >= 0; i = previous[i]) {
    path.unshift({ ...nodes[i] });
    if (i === a) break;
  }
  return path;
}
// Ground paths skirt all six footprints. Interiors have a separate, authored
// corridor and stair path, so an outside shortcut cannot cut through a wall.
export function cityGroundClear(a, b, radius = 0.65) {
  const length = d(a, b),
    steps = Math.max(1, Math.ceil(length / 0.4));
  for (let i = 0; i <= steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps,
      z = a.z + ((b.z - a.z) * i) / steps;
    if (!cityPoint({ x, z }, radius) || Math.hypot(x, z) < 3.9 + radius)
      return false;
    for (const o of JOB_BUSINESSES)
      if (
        Math.abs(x - o.x) < o.w / 2 + radius &&
        Math.abs(z - o.z) < o.d / 2 + radius
      )
        return false;
  }
  return true;
}
export function cityWalkPath(from, to, radius = 0.65) {
  if (!cityPoint(to, radius)) return null;
  let origin = cityPoint(from, radius)
    ? { ...from, y: 0.32 }
    : { ...JOB_CITY_GATE, y: 0.32 };
  // Cats coming from a saved interior leave by its front doorway first.
  const inside = JOB_BUSINESSES.find(
    (b) =>
      Math.abs(origin.x - b.x) < b.w / 2 + radius &&
      Math.abs(origin.z - b.z) < b.d / 2 + radius,
  );
  const prefix = inside
    ? [origin, { x: inside.x, y: 0.32, z: inside.z + 11.7 }]
    : [origin];
  origin = prefix.at(-1);
  const nodes = [origin, { ...to, y: 0.32 }];
  for (const o of JOB_BUSINESSES)
    for (const dx of [-1, 1])
      for (const dz of [-1, 1]) {
        const n = {
          x: o.x + dx * (o.w / 2 + radius + 0.18),
          z: o.z + dz * (o.d / 2 + radius + 0.18),
          y: 0.32,
        };
        if (cityPoint(n, radius)) nodes.push(n);
      }
  for (let k = 0; k < 12; k++)
    nodes.push({
      x: Math.sin((k * Math.PI) / 6) * 6.3,
      z: Math.cos((k * Math.PI) / 6) * 6.3,
      y: 0.32,
    });
  const costs = new Float64Array(nodes.length).fill(Infinity),
    prev = new Int16Array(nodes.length).fill(-1),
    used = new Uint8Array(nodes.length);
  costs[0] = 0;
  for (let k = 0; k < nodes.length; k++) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!used[i] && (u < 0 || costs[i] < costs[u])) u = i;
    if (u === 1 || !Number.isFinite(costs[u])) break;
    used[u] = 1;
    for (let v = 0; v < nodes.length; v++)
      if (
        !used[v] &&
        costs[u] + d(nodes[u], nodes[v]) < costs[v] &&
        cityGroundClear(nodes[u], nodes[v], radius)
      ) {
        costs[v] = costs[u] + d(nodes[u], nodes[v]);
        prev[v] = u;
      }
  }
  if (!Number.isFinite(costs[1])) return null;
  const route = [];
  for (let i = 1; i >= 0; i = prev[i]) {
    route.unshift(nodes[i]);
    if (i === 0) break;
  }
  return [...prefix.slice(0, -1), ...route];
}
export function workplacePath(from, b, slot, visitor = false) {
  const seat = jobStations(b)[slot],
    front = { x: b.x, z: b.z + 11.7, y: 0.32 },
    path = cityWalkPath(from, front);
  if (!path) return null;
  if (seat.floor) {
    path.push(
      { x: b.x, z: b.z + 8, y: 0.32 },
      { x: b.x + 10, z: b.z + 8, y: 0.32 },
      { x: b.x + 10, z: b.z - 8, y: 4.92 },
    );
    if (seat.floor === 2) path.push({ x: b.x + 10, z: b.z + 8, y: 9.52 });
    path.push(
      { x: b.x + 7, z: seat.floor === 1 ? b.z - 8 : b.z + 8, y: seat.y },
      { x: b.x + 7, z: b.z + 8, y: seat.y },
    );
  }
  path.push({ x: b.x, z: b.z + 8, y: seat.y });
  const end = visitor ? { ...seat, z: seat.z + 4.25 } : seat;
  path.push(
    { x: b.x, z: end.z + (visitor ? 1 : -1.3), y: seat.y },
    { x: end.x, z: end.z + (visitor ? 1 : -1.3), y: seat.y },
    end,
  );
  return path;
}
export function pathLength(path) {
  let n = 0;
  for (let i = 1; i < path.length; i++) n += d(path[i - 1], path[i]);
  return n;
}
export function pathFrame(path, distance) {
  if (!path?.length) return null;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      length = d(a, b);
    if (distance <= length || i === path.length - 1) {
      const t = Math.min(1, Math.max(0, distance / (length || 1)));
      return {
        x: a.x + (b.x - a.x) * t,
        y: (a.y || 0) + ((b.y || 0) - (a.y || 0)) * t,
        z: a.z + (b.z - a.z) * t,
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
        done: i === path.length - 1 && distance >= length,
      };
    }
    distance -= length;
  }
  return { ...path[0], yaw: 0, done: true };
}
export function cityParking(index) {
  return JOB_PARKING[index % JOB_PARKING.length];
}

export function nearestCityGround(point, radius = 0.65) {
  if (cityGroundClear(point, point, radius)) return { ...point, y: 0.32 };
  const choices = [{ x: 0, z: 56, y: 0.32 }];
  for (const b of JOB_BUSINESSES) {
    choices.push({ x: b.x, z: b.z + 11.7, y: 0.32 });
    for (const dx of [-1, 1])
      for (const dz of [-1, 1])
        choices.push({
          x: b.x + dx * (b.w / 2 + radius + 0.3),
          z: b.z + dz * (b.d / 2 + radius + 0.3),
          y: 0.32,
        });
  }
  return (
    choices
      .filter((p) => cityGroundClear(p, p, radius))
      .sort((a, b) => d(a, point) - d(b, point))[0] || null
  );
}

// A close dollhouse view can sit behind the next row of houses. Temporarily
// mask only buildings intersecting its sight line, as interior cameras mask roofs.
// The normal island view keeps every building and its full geometry.
export function cityViewOccluders(targetId, camera) {
  const target = JOB_BUSINESSES.find((b) => b.id === targetId),
    hidden = new Set();
  if (!target) return hidden;
  const goal = { x: target.x, y: target.h * 0.55, z: target.z },
    delta = {
      x: goal.x - camera.x,
      y: goal.y - camera.y,
      z: goal.z - camera.z,
    };
  for (const b of JOB_BUSINESSES) {
    if (b === target) continue;
    let lo = 0,
      hi = 1;
    for (const [axis, min, max] of [
      ["x", b.x - b.w / 2 - 0.3, b.x + b.w / 2 + 0.3],
      ["y", 0, b.h + 2],
      ["z", b.z - b.d / 2 - 0.3, b.z + b.d / 2 + 0.3],
    ]) {
      if (Math.abs(delta[axis]) < 1e-8) {
        if (camera[axis] < min || camera[axis] > max) {
          hi = -1;
          break;
        }
      } else {
        let a = (min - camera[axis]) / delta[axis],
          c = (max - camera[axis]) / delta[axis];
        if (a > c) [a, c] = [c, a];
        lo = Math.max(lo, a);
        hi = Math.min(hi, c);
      }
    }
    if (lo <= hi && hi >= 0 && lo < 1) hidden.add(b.id);
  }
  return hidden;
}
