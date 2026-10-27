import * as THREE from "three";
import { sampleMegaCurve } from "./mega-ride-motion.js";
import { atollRecipe, atollStair } from "./atoll-slide-recipes.js";

export const DREAM_SEAT = -1.6,
  DREAM_WATER = -1.95,
  DREAM_RADIUS = 2.5;
const TAU = Math.PI * 2,
  V = (a) => new THREE.Vector3(...a),
  clamp = THREE.MathUtils.clamp,
  cache = new Map();
export const dreamStair = (height, u) => {
  const a = TAU * Math.max(1, Math.round(height / 8)) * u;
  return [
    -20 + Math.sin(a) * 3.4,
    0.16 + (height - 1.76) * u,
    -13 + Math.cos(a) * 3.4,
  ];
};
export function bowlHeight(b, r) {
  return b.base + b.depth * (r / b.radius) ** 1.7;
}
export function bowlNormal(b, x, z) {
  const r = Math.hypot(x - b.x, z - b.z),
    slope = r ? ((b.depth * 1.7) / b.radius) * (r / b.radius) ** 0.7 : 0;
  return new THREE.Vector3(
    (-(x - b.x) / (r || 1)) * slope,
    1,
    (-(z - b.z) / (r || 1)) * slope,
  ).normalize();
}
function helix(h, low, radius, turns = 2, phase = 0, z = -3, shrink = 0) {
  return Array.from({ length: 121 }, (_, i) => {
    const u = i / 120,
      a = phase + u * TAU * turns,
      r = radius * (1 - shrink * u);
    return [Math.sin(a) * r, h + (low - h) * u, z + Math.cos(a) * r];
  });
}
function loop(cx, cy, z, radius, drift = 6) {
  return Array.from({ length: 73 }, (_, i) => {
    const a = (i / 72) * TAU;
    return [
      cx + Math.sin(a) * radius,
      cy - Math.cos(a) * radius,
      z + (i / 72) * drift,
    ];
  });
}
function recipe(spec, lane = 0) {
  const h = spec.height,
    kind = spec.kind,
    pool = [3, 1.67, 12],
    parts = [],
    bowls = [],
    rings = [];
  const path = (points, options = {}) => {
      const s = { points, ...options };
      parts.push(s);
      return s;
    },
    flight = (end, duration) => parts.push({ flight: true, end, duration }),
    finish = (points, options = {}) => {
      path(points, options);
    },
    bowl = (b) => {
      bowls.push(b);
      const points = Array.from({ length: 145 }, (_, i) => {
        const u = i / 144,
          a = b.angle + u * TAU * 2.3,
          r = b.radius * (0.96 - 0.82 * u),
          x = b.x + Math.cos(a) * r,
          z = b.z + Math.sin(a) * r;
        return V([x, bowlHeight(b, r), z])
          .addScaledVector(bowlNormal(b, x, z), 2.08)
          .toArray();
      });
      return { points, bowl: b };
    };
  if (
    [
      "pearl-funnel",
      "orbital-shell",
      "luminous-vortex",
      "four-funnels",
    ].includes(kind)
  ) {
    const count = kind === "four-funnels" ? 4 : 1;
    let previous;
    for (let i = 0; i < count; i++) {
      const b = {
        x: count === 4 ? (i % 2 ? 5 : -5) : 0,
        z: count === 4 ? -9 + i * 4.5 : 1,
        radius: count === 4 ? 4.8 : 8.5,
        base: count === 4 ? 28 - i * 8.5 : 3.8,
        depth: count === 4 ? 3.2 : 7.8,
        angle: -Math.PI * 0.75,
      };
      const bs = bowl(b),
        first = bs.points[0];
      const start = previous || [-9, h, -14];
      const approach = previous
        ? [start, [start[0], start[1] - 1.5, start[2] + 1.2], first]
        : kind === "orbital-shell" || kind === "luminous-vortex"
          ? [
              [-9, h, -14],
              ...helix(h - 0.3, first[1] + 2, 11, 1.05, Math.PI, -3).slice(
                0,
                110,
              ),
              first,
            ]
          : [start, [-8, h - 1, -9], first];
      path(approach, { full: true, receiver: first });
      parts.push(bs);
      previous = bs.points.at(-1);
    }
    path(
      [
        previous,
        [previous[0], previous[1] - 0.3, previous[2] + 2],
        [2, 3.45, 9],
        [3, 3.45, 12],
      ],
      { full: true },
    );
  } else if (kind === "crystal-loops") {
    finish(
      [
        [-10, h, -16],
        [-10, h, -14],
        ...loop(-6, 21, -14, 6),
        ...loop(5, 15, -6, 5),
        ...loop(-4, 9, 2, 4),
        [3, 3.45, 12],
      ],
      {
        full: true,
        loops: [
          [2, 74],
          [75, 147],
          [148, 220],
        ],
      },
    );
  } else if (["rainbow-launch", "ring-launch"].includes(kind)) {
    path(
      [
        [-7, h, -14],
        [-7, h, -12],
        [-7, h * 0.66, -9],
        [-6, 8, -5],
        [-4, 7, -2],
        [-3, 9, 0],
      ],
      { rainbow: true },
    );
    flight(pool, kind === "ring-launch" ? 3.2 : 2.7);
    if (kind === "ring-launch") rings.push(0.22, 0.47, 0.72);
  } else if (kind === "waterfall-arch") {
    finish([
      [-4, h, -11],
      [-4, h, -9],
      [-4, h - 3, -7],
      [-4, 8, -5],
      [-3, 4, 0],
      [3, 3.45, 12],
    ]);
  } else if (kind === "canyon-twins") {
    finish([...helix(h, 4.2, 10, 1.5, lane * Math.PI, -3), [3, 3.45, 12]], {
      full: true,
    });
  } else if (kind === "ocean-tunnel") {
    path(
      [
        [-9, h, -14],
        [-9, h, -12],
        [-10, 19, -9],
        [-8, 8, -7],
        [0, 5.3, -4],
        [9, 5.3, 0],
        [8, 6, 5],
        [2, 8, 7],
      ],
      { full: true, underwater: true },
    );
    flight(pool, 1.8);
  } else if (kind === "blossom-tree") {
    finish([...helix(h, 4, 10.5, 2, 0, -3), [3, 3.45, 12]], { full: true });
  } else if (kind === "ice-tunnel") {
    finish(
      [
        [-7, h, -14],
        [-7, h, -12],
        [-8, 23, -7],
        [-3, 18, -5],
        [5, 14, -2],
        [6, 8, 2],
        [3, 3.45, 12],
      ],
      { full: true },
    );
  } else if (kind === "terrace-cascades") {
    finish(
      [
        [-9, h, -14],
        [-9, h, -12],
        [9, 23, -9],
        [-9, 16, -3],
        [9, 9, 3],
        [3, 3.45, 12],
      ],
      { pieces: 4 },
    );
  } else if (kind === "canyon-eight") {
    const p = Array.from({ length: 145 }, (_, i) => {
      const u = i / 144,
        a = u * TAU;
      return [Math.sin(a) * 11, h - (h - 4) * u, -3 + Math.sin(a * 2) * 7];
    });
    finish([...p, [3, 3.45, 12]], { full: true });
  } else if (kind === "ribbon-tower") {
    finish([...helix(h, 4, 10, 1.6, (lane * TAU) / 3, -3), [3, 3.45, 12]], {
      full: true,
    });
  } else if (kind === "tidal-wave") {
    path([
      [-8, h, -15],
      [-8, h, -13],
      [-9, 15, -10],
      [-8, 8, -8],
      [-6, 11, -5],
    ]);
    flight([-2, 10, -1], 1.25);
    path([
      [-2, 10, -1],
      [0, 5, 0],
      [3, 8, 3],
    ]);
    flight([5, 6, 6], 1.1);
    path([
      [5, 6, 6],
      [6, 4, 8],
      [3, 3.45, 12],
    ]);
  } else if (kind === "water-lift") {
    path(
      [
        [-9, 3.45, -11],
        [-9, h - 6, -11],
        [-9, h, -10.5],
        [-9, h, -8],
      ],
      { lift: true, full: true },
    );
    path(
      [
        [-9, h, -8],
        [-9, h, -5.5],
        [-9, h - 3, -3],
        [-8, 7, 1],
        [-2, 3.45, 7],
        [3, 3.45, 12],
      ],
      { full: true },
    );
  } else if (kind === "dragon-tail") {
    finish([...helix(h, 4.1, 11, 1.7, 0.3, -3, 0.3), [3, 3.45, 12]], {
      full: true,
    });
  } else if (kind === "sky-bridge") {
    finish(
      [
        [-12, h, -14],
        [-12, h, -12],
        [0, h - 1, -12],
        [11, h - 2, -10],
        [11, 20, -5],
        [9, 8, -1],
        [5, 3.45, 6],
        [3, 3.45, 12],
      ],
      { full: true },
    );
  } else if (kind === "cave-loop") {
    finish(
      [
        [-10, h, -14],
        [-10, h, -12],
        [-8, 20, -9],
        ...loop(0, 16, -7, 8, 7),
        [3, 3.45, 12],
      ],
      { full: true, loops: [[3, 75]] },
    );
  } else if (kind === "twin-flights") {
    const side = lane ? 1 : -1;
    path(
      [
        [side * 10, h, -14],
        [side * 10, h, -12],
        [side * 10, 13, -8],
        [side * 8, 6, -3],
        [side * 6, 9, 1],
      ],
      { full: true },
    );
    flight(pool, 2.6);
  } else if (kind === "lighthouse") {
    finish([...helix(h, 4.1, 8.5, 2, 0, -3), [3, 3.45, 12]], { full: true });
  } else if (kind === "twin-shell") {
    finish(
      [
        [-8, h, -13],
        [-8, h, -11],
        [-7, 10, -6],
        [-3, 8, -2],
        [2, 22, 2],
        [8, 18, 5],
        [9, 7, 7],
        [3, 3.45, 12],
      ],
      { pieces: 2 },
    );
  } else if (kind === "royal-aqueduct") {
    finish(
      [
        [-10, h, -14],
        [-10, h, -12],
        [9, 28, -11],
        [10, 25, -6],
        [-10, 21, -5],
        [-10, 18, 1],
        [9, 14, 2],
        [9, 10, 7],
        [3, 3.45, 12],
      ],
      { pieces: 4 },
    );
  } else if (kind === "cloud-star") {
    finish([...helix(h, 3.45, 12, 2.25, 0.4, -3, 0.65), [3, 3.45, 12]], {
      full: true,
    });
  } else throw Error("Missing authored slide recipe: " + kind);
  // Match centreline tangents through each bowl mouth, then match the same
  // transported floor normal below. A route seam is never a teleport.
  for (let i = 0; i < parts.length - 1; i++) {
    const a = parts[i],
      b = parts[i + 1];
    if (!a.points || !b.points) continue;
    if (b.bowl)
      a.points[a.points.length - 2] = V(b.points[0])
        .addScaledVector(V(b.points[1]).sub(V(b.points[0])).normalize(), -2.5)
        .toArray();
    if (a.bowl)
      b.points[1] = V(a.points.at(-1))
        .addScaledVector(
          V(a.points.at(-1))
            .sub(V(a.points.at(-2)))
            .normalize(),
          2.5,
        )
        .toArray();
  }
  return { parts, bowls, rings };
}

function runData(part) {
  const data = sampleMegaCurve(part.points, {
      seat: DREAM_SEAT,
      coaster: true,
      terminalUpright: false,
    }),
    samples = data.samples,
    m = new THREE.Matrix4();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i],
      forward = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q);
    let insideLoop = false;
    if (part.loops) {
      const knot =
          data.curve.getUtoTmapping(i / 600) * (part.points.length - 1),
        range = part.loops.find(([a, b]) => knot >= a && knot <= b);
      if (range) {
        insideLoop = true;
        const right = new THREE.Vector3(0, 0, -1)
            .addScaledVector(forward, forward.z)
            .normalize(),
          up = new THREE.Vector3().crossVectors(forward, right).normalize(),
          q = new THREE.Quaternion().setFromRotationMatrix(
            m.makeBasis(right, up, forward),
          ),
          alpha = Math.min(
            THREE.MathUtils.smoothstep(knot, range[0], range[0] + 4),
            THREE.MathUtils.smoothstep(range[1] - knot, 0, 4),
          );
        s.q.slerp(q, alpha);
        s.up.set(0, 1, 0).applyQuaternion(s.q);
        s.right.set(1, 0, 0).applyQuaternion(s.q);
      }
    }
    if (part.bowl) {
      const up = bowlNormal(part.bowl, s.p.x, s.p.z);
      forward.addScaledVector(up, -forward.dot(up)).normalize();
      const right = new THREE.Vector3().crossVectors(up, forward).normalize();
      s.up.copy(up);
      s.right.copy(right);
      s.q.setFromRotationMatrix(m.makeBasis(right, up, forward));
    } else if (i >= 450 && !(part.keepInversion && insideLoop)) {
      const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
      if (right.lengthSq() < 0.5) continue;
      const up = new THREE.Vector3().crossVectors(forward, right).normalize(),
        q = new THREE.Quaternion().setFromRotationMatrix(
          m.makeBasis(right, up, forward),
        );
      s.q.slerp(q, THREE.MathUtils.smoothstep(i, 450, 600));
      s.up.set(0, 1, 0).applyQuaternion(s.q);
      s.right.set(1, 0, 0).applyQuaternion(s.q);
    }
  }
  return data;
}
function anchor(data, target, end) {
  const count = 120,
    m = new THREE.Matrix4();
  for (let j = 0; j <= count; j++) {
    const i = end ? 600 - count + j : j,
      s = data.samples[i],
      forward = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q),
      up = target.up
        .clone()
        .addScaledVector(forward, -target.up.dot(forward))
        .normalize(),
      right = new THREE.Vector3().crossVectors(up, forward).normalize(),
      q = new THREE.Quaternion().setFromRotationMatrix(
        m.makeBasis(right, up, forward),
      ),
      w = THREE.MathUtils.smoothstep(end ? j : count - j, 0, count);
    q.slerp(
      target.q,
      THREE.MathUtils.smoothstep(end ? j : count - j, count - 25, count),
    );
    s.q.slerp(q, w);
    s.up.set(0, 1, 0).applyQuaternion(s.q);
    s.right.set(1, 0, 0).applyQuaternion(s.q);
  }
}

function makeLane(spec, lane) {
  const authored = spec.premiumWater ? atollRecipe(spec, lane) : recipe(spec, lane),
    legs = [],
    geometry = [],
    impacts = [],
    flights = [];
  const datasets = new Map(
    authored.parts.filter((p) => p.points).map((p) => [p, runData(p)]),
  );
  for (let i = 0; i < authored.parts.length - 1; i++) {
    const a = authored.parts[i],
      b = authored.parts[i + 1];
    if (!a.points || !b.points) continue;
    if (b.bowl) anchor(datasets.get(a), datasets.get(b).samples[0], true);
    else anchor(datasets.get(b), datasets.get(a).samples.at(-1), false);
  }
  let clock = 0,
    last;
  const leg = (duration, phase, fn) => {
    const l = { start: clock, duration, phase, fn };
    legs.push(l);
    clock += duration;
    return l;
  };
  const first = authored.parts[0].points[0],
    height = first[1],
    stair = spec.premiumWater ? atollStair : dreamStair,
    entry = stair(height, 0),
    top = stair(height, 1),
    board = datasets.get(authored.parts[0]).at(0).position;
  leg(1, "board", () => ({ position: entry, walking: false }));
  leg(Math.max(1, height * 0.25), "climb", (u) => ({
    position: stair(height, u),
    walking: true,
    yaw: spec.premiumWater ? Math.PI / 2 + u * TAU * Math.round(height / 9) : -u * TAU * Math.round(height / 8),
  }));
  leg(Math.max(1.2, V(top).distanceTo(V(board)) / 3.5), "board", (u) => ({
    position: top.map((x, i) => x + (board[i] - x) * u),
    walking: true,
    yaw: Math.atan2(board[0] - top[0], board[2] - top[2]),
  }));
  function run(part) {
    const data = datasets.get(part),
      samples = data.samples;
    const times = new Float32Array(samples.length);
    let total = 0;
    for (let i = 1; i < samples.length; i++) {
      const p = samples[i].p,
        speed = part.lift
          ? 4.3
          : clamp(
              Math.sqrt(Math.max(20, 64 + 2 * 9.81 * (spec.height - p.y))) *
                0.77,
              4.5,
              spec.premiumWater ? 40 : 28,
            );
      total += p.distanceTo(samples[i - 1].p) / speed;
      times[i] = total;
    }
    const phase = part.bowl ? "vortex" : part.lift ? "lift" : "ride";
    const stage = leg(total, phase, (u) => {
      const target = u * total;
      let lo = 0,
        hi = times.length - 1;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] < target) lo = mid;
        else hi = mid;
      }
      const a = (target - times[lo]) / (times[hi] - times[lo] || 1),
        f = data.at((lo + clamp(a, 0, 1)) / (samples.length - 1));
      return {
        ...f,
        walking: false,
        phase:
          part.underwater && f.position[1] + 3.1 < 11.7 ? "underwater" : phase,
      };
    });
    if (!part.bowl) {
      const pieces = part.pieces || 1;
      for (let k = 0; k < pieces; k++) {
        const section = Array.from(
          { length: 601 },
          (_, i) => samples[Math.round(((k + i / 600) / pieces) * 600)],
        );
        geometry.push({
          ...data,
          samples: section,
          full: !!part.full,
          rainbow: part.rainbow,
          wave: part.wave,
          halfpipe: part.halfpipe,
          laneColor: part.laneColor,
          coloredLoops: part.coloredLoops,
          lift: part.lift,
          receiver: part.receiver,
          stage,
          part,
          k,
          pieces,
        });
      }
    }
    last = data.at(1);
    return data;
  }
  for (let i = 0; i < authored.parts.length; i++) {
    const p = authored.parts[i];
    if (!p.flight) {
      run(p);
      continue;
    }
    const next = authored.parts[i + 1],
      from = [...last.position],
      to = next?.points ? datasets.get(next).at(0).position : [...p.end],
      T = p.duration,
      vy = (to[1] - from[1] + 0.5 * 9.81 * T * T) / T,
      vx = (to[0] - from[0]) / T,
      vz = (to[2] - from[2]) / T;
    const f = {
      start: clock,
      duration: T,
      from,
      to,
      vy,
      vx,
      vz,
      gravity: 9.81,
    };
    flights.push(f);
    leg(T, "flight", (u) => {
      const t = u * T,
        yaw = Math.atan2(vx, vz),
        pitch = -Math.atan2(vy - 9.81 * t, Math.hypot(vx, vz));
      return {
        position: [
          from[0] + vx * t,
          from[1] + vy * t - 0.5 * 9.81 * t * t,
          from[2] + vz * t,
        ],
        yaw,
        pitch,
        quaternion: new THREE.Quaternion()
          .setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"))
          .toArray(),
        paw: 0.9,
        surprise: 1,
      };
    });
    last = { position: to };
    if (i < authored.parts.length - 1) {
      const receiving = datasets.get(next).at(0),
        up = new THREE.Vector3(0, 1, 0).applyQuaternion(
          new THREE.Quaternion().fromArray(receiving.quaternion),
        );
      impacts.push({
        time: clock,
        point: to,
        power: 0.7,
        basin: false,
        waterPoint: V(to)
          .addScaledVector(up, DREAM_WATER - DREAM_SEAT)
          .toArray(),
      });
    }
  }
  const end = last.position,
    hit = spec.premiumWater ? [end[0], 1.67, spec.pool[1]] : [3, 1.67, 12];
  if (V(end).distanceTo(V(hit)) > 0.01)
    leg(0.65, "drain", (u) => ({
      position: end.map((x, i) => x + (hit[i] - x) * u),
      yaw: 0,
    }));
  impacts.push({ time: clock, point: hit, power: 2.4 });
  leg(1.5, "splash", (u) => ({
    position: [hit[0], 1.67 - Math.sin(u * Math.PI) * 0.3, hit[2]],
    paw: 0.2,
    surprise: (1 - u) * 0.8,
  }));
  const back = spec.premiumWater ? [hit,
      [hit[0], 1.67, spec.pool[1] + spec.pool[3]],
      [hit[0], .16, 49], [-53, .16, 49], [-53, .16, entry[2]], entry,
    ] : [
      hit,
      [3, 1.67, 17],
      [3, 0.16, 20],
      [-24, 0.16, 20],
      [-24, 0.16, entry[2]],
      entry,
    ],
    lengths = [0];
  for (let i = 1; i < back.length; i++)
    lengths[i] = lengths[i - 1] + V(back[i]).distanceTo(V(back[i - 1]));
  const returnLength = lengths.at(-1);
  leg(returnLength / 4, "return", (u) => {
    const distance = u * returnLength;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < distance) i++;
    const a = back[i - 1],
      b = back[i],
      t = clamp(
        (distance - lengths[i - 1]) / (lengths[i] - lengths[i - 1]),
        0,
        1,
      );
    return {
      position: a.map((x, j) => x + (b[j] - x) * t),
      walking: true,
      yaw: Math.atan2(b[0] - a[0], b[2] - a[2]),
    };
  });
  function frame(elapsed, reduced = false) {
    if (reduced)
      return { position: [...entry], yaw: 0, phase: "done", walking: false };
    if (elapsed >= clock)
      return { position: [...entry], yaw: 0, phase: "done", walking: false };
    const t = clamp(elapsed, 0, clock),
      l = legs.find((x) => t <= x.start + x.duration + 1e-8) || legs.at(-1),
      f = l.fn(clamp((t - l.start) / l.duration, 0, 1));
    return { phase: l.phase, paw: 0.35, surprise: 0, ...f };
  }
  return {
    ...authored,
    legs,
    geometry,
    impacts,
    flights,
    entry,
    top,
    board,
    height,
    duration: clock,
    frame,
  };
}
export function createReferenceRoute(spec) {
  if (cache.has(spec.id)) return cache.get(spec.id);
  const n = spec.lanes ||
      (spec.kind === "ribbon-tower"
        ? 3
        : ["canyon-twins", "twin-flights"].includes(spec.kind)
          ? 2
          : 1),
    lanes = Array.from({ length: n }, (_, i) => makeLane(spec, i)),
    first = lanes[0],
    route = {
      ...first,
      lanes,
      footprint: spec.footprint,
      geometry: lanes.flatMap((l) => l.geometry),
      duration: Math.max(...lanes.map((l) => l.duration)),
      frame: (elapsed, reduced = false, lane = 0) =>
        lanes[lane % lanes.length].frame(elapsed, reduced),
    };
  cache.set(spec.id, route);
  return route;
}
