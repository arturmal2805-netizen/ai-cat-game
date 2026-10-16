import { SPA_RADIUS, SPA_POOL, SPA_JACUZZI } from "./spa-data.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const spaDistance = distance;
export const spaClear = (p, radius, obstacles = []) =>
  !obstacles.some((o) =>
    o.radius
      ? distance(p, o) < o.radius + radius
      : Math.abs(p.x - o.x) < o.w / 2 + radius &&
        Math.abs(p.z - o.z) < o.d / 2 + radius,
  );
export function spaWalkable(p, radius = 0.5, obstacles = []) {
  if (Math.hypot(p.x, p.z) > SPA_RADIUS - radius - 0.55) return false;
  for (const pool of [SPA_POOL, SPA_JACUZZI])
    if (
      Math.hypot(
        (p.x - pool.x) / (pool.rx + radius + 0.25),
        (p.z - pool.z) / (pool.rz + radius + 0.25),
      ) < 1
    )
      return false;
  if (Math.abs(p.x + 14.2) < 3.65 + radius && Math.abs(p.z) < 3.25 + radius)
    return false;
  if (Math.abs(p.x - 9.2) < 4.05 + radius && Math.abs(p.z + 13) < 2.05 + radius)
    return false;
  return !obstacles.some((o) =>
    o.radius
      ? distance(p, o) < o.radius + radius
      : Math.abs(p.x - o.x) < o.w / 2 + radius &&
        Math.abs(p.z - o.z) < o.d / 2 + radius,
  );
}
export function nearestSpaGround(point, radius = 0.5, obstacles = []) {
  if (spaWalkable(point, radius, obstacles))
    return { x: point.x, z: point.z, y: 0.16 };
  for (let r = 0.4; r < 42; r += 0.4)
    for (let i = 0; i < Math.ceil(r * 12); i++) {
      const a = (i / Math.ceil(r * 12)) * Math.PI * 2,
        p = {
          x: point.x + Math.cos(a) * r,
          z: point.z + Math.sin(a) * r,
          y: 0.16,
        };
      if (spaWalkable(p, radius, obstacles)) return p;
    }
  return null;
}
// Local A* is built only when a visit starts/changes phase, never per frame.
// All samples, including diagonals, clear the real furniture/pool footprints.
export function spaPath(
  start,
  goal,
  radius = 0.5,
  obstacles = [],
  walkable = spaWalkable,
) {
  const cell = 0.6,
    extent = 32,
    size = extent * 2 + 1,
    key = (x, z) => (z + extent) * size + x + extent;
  const from =
      walkable === spaWalkable
        ? nearestSpaGround(start, radius, obstacles)
        : start,
    to =
      walkable === spaWalkable
        ? nearestSpaGround(goal, radius, obstacles)
        : goal;
  if (!from || !to) return null;
  if (!walkable(from, radius, obstacles) || !walkable(to, radius, obstacles))
    return null;
  const valid = (x, z) =>
    Math.abs(x) <= extent &&
    Math.abs(z) <= extent &&
    walkable({ x: x * cell, z: z * cell }, radius, obstacles);
  const snap = (p) => {
    let best = null,
      d = Infinity;
    for (
      let x = Math.round(p.x / cell) - 3;
      x <= Math.round(p.x / cell) + 3;
      x++
    )
      for (
        let z = Math.round(p.z / cell) - 3;
        z <= Math.round(p.z / cell) + 3;
        z++
      ) {
        const dd = distance(p, { x: x * cell, z: z * cell });
        if (dd < d && valid(x, z)) {
          best = { x, z };
          d = dd;
        }
      }
    return best;
  };
  const a = snap(from),
    b = snap(to);
  if (!a || !b) return null;
  const nodes = new Map(),
    open = [];
  const first = { ...a, g: 0, f: distance(a, b), parent: null };
  nodes.set(key(a.x, a.z), first);
  open.push(first);
  let last = null;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const n = open.splice(bi, 1)[0];
    if (n.closed) continue;
    n.closed = true;
    if (n.x === b.x && n.z === b.z) {
      last = n;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const x = n.x + dx,
        z = n.z + dz;
      if (
        !valid(x, z) ||
        (dx && dz && (!valid(n.x + dx, n.z) || !valid(n.x, n.z + dz)))
      )
        continue;
      const k = key(x, z),
        g = n.g + Math.hypot(dx, dz),
        old = nodes.get(k);
      if (old && old.g <= g) continue;
      const v = { x, z, g, f: g + distance({ x, z }, b), parent: n };
      nodes.set(k, v);
      open.push(v);
    }
  }
  if (!last) return null;
  const path = [];
  for (let n = last; n; n = n.parent)
    path.push({ x: n.x * cell, z: n.z * cell, y: 0.16 });
  path.reverse();
  path.push(to);
  return path;
}
