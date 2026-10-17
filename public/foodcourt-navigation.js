import { aquariumObstacles } from "./aquarium-data.js";
import {
  COURT_RADIUS,
  COURT_VENUES,
  COURT_FOUNTAIN,
  courtSeats,
  courtLayout,
} from "./foodcourt-data.js";
import { spaClear, spaDistance } from "./spa-navigation.js";
export function courtObstacles(extra = [], biome = "foodcourt") {
  if (biome === "aquarium") return aquariumObstacles(extra);
  const layout = courtLayout(biome);
  const r = [
    ...layout.pools.map((p) => ({
      ...p,
      radius: biome === "foodcourt" ? 3.4 : Math.max(p.rx, p.rz) + 0.7,
    })),
    ...layout.houses,
    ...extra,
  ];
  for (const o of layout.venues) {
    if (o.kind === "cinema") {
      r.push({ x: o.x, z: o.z - 6.5, w: 15, d: 0.6 });
      continue;
    }
    r.push(
      { x: o.x, z: o.z - o.d / 2, w: o.w + 0.3, d: 0.3 },
      { x: o.x - o.w / 2, z: o.z, w: 0.3, d: o.d },
      { x: o.x + o.w / 2, z: o.z, w: 0.3, d: o.d },
      { x: o.x, z: o.z - 2.7, w: o.w - 1.5, d: 3.5 },
    );
    for (const s of [-1, 1])
      r.push({
        x: o.x + (s * (o.w / 2 + 1.7)) / 2,
        z: o.z + o.d / 2,
        w: o.w / 2 - 1.7,
        d: 0.2,
      });
    for (const s of courtSeats(o))
      r.push({ x: s.x, z: s.z - 2.25, radius: 0.85 });
  }
  return r;
}
export function courtWalkable(
  p,
  radius = 0.55,
  obstacles = courtObstacles(),
  biome = "foodcourt",
) {
  return (
    Math.hypot(p.x, p.z) < courtLayout(biome).radius - radius - 0.5 &&
    spaClear(p, radius, obstacles)
  );
}
export function nearestCourtGround(
  p,
  radius = 0.55,
  obstacles = courtObstacles(),
  biome = "foodcourt",
) {
  if (courtWalkable(p, radius, obstacles, biome)) return { ...p, y: 0.16 };
  for (let r = 0.4; r < courtLayout(biome).radius * 2; r += 0.4)
    for (let i = 0, n = Math.ceil(r * 10); i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        q = { x: p.x + Math.sin(a) * r, z: p.z + Math.cos(a) * r, y: 0.16 };
      if (courtWalkable(q, radius, obstacles, biome)) return q;
    }
  return null;
}
// Idle cats need a resting spot outside the entrance lane. Visitors still use
// the ordinary walkable floor and can walk through the doorway to order.
const idleLanes = new WeakMap();
export function nearestCourtIdleGround(p, radius, obstacles, biome) {
  let layouts = idleLanes.get(obstacles);
  if (!layouts) {
    layouts = new Map();
    idleLanes.set(obstacles, layouts);
  }
  if (!layouts.has(biome))
    layouts.set(biome, [
      ...obstacles,
      ...courtLayout(biome)
        .venues.filter((o) => !["cinema", "aquarium"].includes(o.kind))
        .map((o) => ({ x: o.x, z: o.z + o.d / 2 - 0.4, w: 5.4, d: 5.6 })),
    ]);
  return nearestCourtGround(p, radius, layouts.get(biome), biome);
}
export function courtSegment(a, b, radius, obstacles, biome = "foodcourt") {
  if (biome === "aquarium") {
    if (
      !courtWalkable(a, radius, obstacles, biome) ||
      !courtWalkable(b, radius, obstacles, biome)
    )
      return false;
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length = dx * dx + dz * dz;
    for (const o of obstacles) {
      if (o.radius) {
        const t = length
          ? Math.max(
              0,
              Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / length),
            )
          : 0;
        if (
          Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) <
          o.radius + radius - 1e-8
        )
          return false;
      } else {
        let enter = 0,
          exit = 1;
        for (const [p, d, c, h] of [
          [a.x, dx, o.x, o.w / 2 + radius],
          [a.z, dz, o.z, o.d / 2 + radius],
        ]) {
          if (Math.abs(d) < 1e-12) {
            if (Math.abs(p - c) >= h - 1e-8) {
              enter = 2;
              break;
            }
          } else {
            let t0 = (c - h - p) / d,
              t1 = (c + h - p) / d;
            if (t0 > t1) [t0, t1] = [t1, t0];
            enter = Math.max(enter, t0);
            exit = Math.min(exit, t1);
          }
        }
        if (enter < exit - 1e-9 && exit > 1e-9 && enter < 1 - 1e-9)
          return false;
      }
    }
    return true;
  }
  const d = spaDistance(a, b),
    n = Math.ceil(d / 0.22);
  for (let i = 0; i <= n; i++) {
    const f = i / Math.max(1, n);
    if (
      !courtWalkable(
        { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f },
        radius,
        obstacles,
        biome,
      )
    )
      return false;
  }
  return true;
}
// Binary-heap A*, direct visibility fast path and string pulling. No per-frame
// grid rebuilding or linear sorting of thousands of open nodes on phones.
const masks = new WeakMap();
export function courtPath(
  start,
  goal,
  radius = 0.55,
  obstacles = courtObstacles(),
  biome = "foodcourt",
) {
  const from = nearestCourtGround(start, radius, obstacles, biome);
  if (!from || !courtWalkable(goal, radius, obstacles, biome)) return null;
  if (courtSegment(from, goal, radius, obstacles, biome))
    return [{ ...goal, y: goal.y ?? 0.16 }];
  const cell = 0.55,
    extent = Math.ceil(courtLayout(biome).radius / cell) + 1,
    size = extent * 2 + 1,
    heap = [],
    nodes = new Map(),
    key = (x, z) => (z + extent) * size + x + extent;
  function push(n) {
    heap.push(n);
    let i = heap.length - 1;
    while (i) {
      let p = (i - 1) >> 1;
      if (heap[p].f <= n.f) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = n;
  }
  function pop() {
    const first = heap[0],
      last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let c = i * 2 + 1;
        if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
        if (last.f <= heap[c].f) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return first;
  }
  let sizes = masks.get(obstacles);
  if (!sizes) {
    sizes = new Map();
    masks.set(obstacles, sizes);
  }
  const rk = biome + ":" + radius.toFixed(4);
  let mask = sizes.get(rk);
  if (!mask) {
    mask = new Int8Array(size * size);
    sizes.set(rk, mask);
  }
  const expanded = obstacles.map((o) =>
      o.radius
        ? { x: o.x, z: o.z, r2: (o.radius + radius) ** 2 }
        : { x: o.x, z: o.z, w: o.w / 2 + radius, d: o.d / 2 + radius },
    ),
    limit = (courtLayout(biome).radius - radius - 0.5) ** 2;
  const valid = (x, z) => {
      if (Math.abs(x) > extent || Math.abs(z) > extent) return false;
      const k = key(x, z);
      if (mask[k]) return mask[k] === 1;
      const px = x * cell,
        pz = z * cell;
      let ok = px * px + pz * pz < limit;
      if (ok)
        for (const o of expanded) {
          const dx = px - o.x,
            dz = pz - o.z;
          if (
            o.r2
              ? dx * dx + dz * dz < o.r2
              : Math.abs(dx) < o.w && Math.abs(dz) < o.d
          ) {
            ok = false;
            break;
          }
        }
      mask[k] = ok ? 1 : -1;
      return ok;
    },
    snap = (p) => {
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
          const q = { x: x * cell, z: z * cell },
            dd = spaDistance(p, q);
          if (
            dd < d &&
            valid(x, z) &&
            courtSegment(p, q, radius, obstacles, biome)
          ) {
            d = dd;
            best = { x, z };
          }
        }
      return best;
    };
  const a = snap(from),
    b = snap(goal);
  if (!a || !b) return null;
  const first = { ...a, g: 0, f: spaDistance(a, b), parent: null };
  nodes.set(key(a.x, a.z), first);
  push(first);
  let last = null;
  while (heap.length) {
    const n = pop();
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
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = n.x + dx,
        z = n.z + dz;
      if (
        !valid(x, z) ||
        (dx && dz && (!valid(n.x + dx, n.z) || !valid(n.x, n.z + dz)))
      )
        continue;
      // Both orthogonal neighbours above exclude every rectangular corner.
      // Only a circle can still intersect the chord between two valid cells.
      if (
        biome === "aquarium" &&
        expanded.some((o) => {
          if (!o.r2) return false;
          const ax = n.x * cell - o.x,
            az = n.z * cell - o.z,
            dxw = dx * cell,
            dzw = dz * cell;
          const t = Math.max(
            0,
            Math.min(1, -(ax * dxw + az * dzw) / (dxw * dxw + dzw * dzw)),
          );
          return (ax + t * dxw) ** 2 + (az + t * dzw) ** 2 < o.r2 - 1e-8;
        })
      )
        continue;
      const k = key(x, z),
        g = n.g + Math.hypot(dx, dz),
        old = nodes.get(k);
      if (old && old.g <= g) continue;
      const v = { x, z, g, f: g + Math.hypot(x - b.x, z - b.z), parent: n };
      nodes.set(k, v);
      push(v);
    }
  }
  if (!last) return null;
  const path = [];
  for (let n = last; n; n = n.parent)
    path.push({ x: n.x * cell, z: n.z * cell, y: 0.16 });
  path.reverse();
  path.push({ ...goal, y: goal.y ?? 0.16 });
  const clean = [];
  let p = from;
  for (let i = 0; i < path.length; ) {
    let j = path.length - 1;
    while (j > i && !courtSegment(p, path[j], radius, obstacles, biome)) j--;
    clean.push(path[j]);
    p = path[j];
    i = j + 1;
  }
  return clean;
}
