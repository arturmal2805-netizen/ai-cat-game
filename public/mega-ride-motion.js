import {paceWaterRoute,WATER_SLIDE_SPEED} from './water-ride-pace.js';
import * as THREE from "three";
const clamp = THREE.MathUtils.clamp,
  V = (p) => new THREE.Vector3(...p),
  TAU = Math.PI * 2;
export const MEGA_SEAT = { slide: -0.55, coaster: 0.52 };
export const FUNNEL_RADIUS = 7.1;
export const funnelFloor = (r) => 4 + 6 * (r / FUNNEL_RADIUS) ** 1.7;
export function funnelNormal(x, z) {
  const r = Math.hypot(x, z),
    slope = r ? ((6 * 1.7) / FUNNEL_RADIUS) * (r / FUNNEL_RADIUS) ** 0.7 : 0;
  return new THREE.Vector3(
    (-x / (r || 1)) * slope,
    1,
    (-z / (r || 1)) * slope,
  ).normalize();
}
function bowlPose(f) {
  const up = funnelNormal(f.position[0], f.position[2]),
    forward = new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw));
  forward.addScaledVector(up, -forward.dot(up)).normalize();
  const right = new THREE.Vector3().crossVectors(up, forward).normalize();
  f.quaternion = new THREE.Quaternion()
    .setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward))
    .toArray();
  return f;
}
export const stairPoint = (tower, height, t) => {
  const a = ((height * Math.PI) / 2) * t;
  return [
    tower[0] + Math.cos(a) * 1.65,
    0.22 + height * t,
    tower[1] + Math.sin(a) * 1.65,
  ];
};
// Arc-length samples and parallel-transported bases are computed once. The
// same bases build rail ties, place the cart and carry the cat through loops.
export function sampleMegaCurve(
  points,
  { seat = 0, coaster = false, orientation = null, terminalUpright = true, water = false } = {},
) {
  const curve = new THREE.CatmullRomCurve3(points.map(V), false, "centripetal");
  curve.arcLengthDivisions = 1200;
  curve.updateArcLengths();
  const count = 600,
    samples = [],
    tangent = new THREE.Vector3(),
    right = new THREE.Vector3(1, 0, 0),
    up = new THREE.Vector3(),
    matrix = new THREE.Matrix4();
  for (let i = 0; i <= count; i++) {
    const t = i / count,
      p = curve.getPointAt(t);
    if (coaster) p.y = Math.max(0.48, p.y);
    curve.getTangentAt(t, tangent).normalize();
    if (coaster && (i === 0 || i === count)) {
      const a = i === 0 ? points[0] : points.at(-2),
        b = i === 0 ? points[1] : points.at(-1);
      tangent.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    }
    if (i === 0 || (coaster && terminalUpright && (i > count - 5 || p.y < 2))) {
      right.set(tangent.z, 0, -tangent.x);
      if (right.lengthSq() < 0.001) right.set(1, 0, 0);
      right.normalize();
    } else {
      right.addScaledVector(tangent, -right.dot(tangent));
      if (right.lengthSq() < 1e-8) right.set(tangent.z, 0, -tangent.x);
      right.normalize();
    }
    if (orientation) {
      const knot = curve.getUtoTmapping(t) * (points.length - 1),
        [first, last] = orientation.range;
      if (knot >= first && knot <= last) {
        const u = (knot - first) / (last - first),
          alpha = THREE.MathUtils.smoothstep(knot - first, 0, 8),
          target = new THREE.Vector3(1, 0, 0);
        if (orientation.kind === "corkscrew")
          target
            .set(0, Math.cos(u * Math.PI * 4), Math.sin(u * Math.PI * 4))
            .cross(tangent);
        target.addScaledVector(tangent, -target.dot(tangent)).normalize();
        right.lerp(target, alpha).normalize();
      }
    }
    up.crossVectors(tangent, right).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(
      matrix.makeBasis(right, up, tangent),
    );
    samples.push({ p, right: right.clone(), up: up.clone(), q });
  }
  const at = (u) => {
    const value = clamp(u, 0, 1) * count,
      i = Math.min(count - 1, Math.floor(value)),
      f = value - i,
      a = samples[i],
      b = samples[i + 1];
    const p = a.p.clone().lerp(b.p, f),
      q = a.q.clone().slerp(b.q, f),
      normal = coaster
        ? a.up.clone().lerp(b.up, f).normalize()
        : new THREE.Vector3(0, 1, 0);
    p.addScaledVector(normal, seat);
    const t = water ? new THREE.Vector3(0,0,1).applyQuaternion(q) : curve.getTangentAt(clamp(u, 0, 1));
    return {
      position: p.toArray(),
      yaw: Math.atan2(t.x, t.z),
      pitch: coaster
        ? 0
        : clamp(-Math.atan2(t.y, Math.hypot(t.x, t.z)) * 0.45, -0.5, 0.5),
      ...(coaster ? { quaternion: q.toArray() } : {}),
      paw: 0.16,
      headPitch: 0.02,
      phase: "ride",
    };
  };
  return { curve, samples, at, seat, coaster };
}

export function createMegaRoute(spec,{speed=WATER_SLIDE_SPEED}={}) {
  const coaster = spec.id.startsWith("coaster"),
    seat = coaster ? MEGA_SEAT.coaster : MEGA_SEAT.slide,
    tower = spec.tower,
    h = spec.height,
    pool = spec.pool,
    legs = [],
    geometry = [],
    impacts = [];
  let clock = 0;
  const leg = (duration, phase, fn) => {
      const s = { start: clock, duration, phase, fn };
      legs.push(s);
      clock += duration;
      return s;
    },
    path = (
      points,
      duration,
      phase = "ride",
      visual = "tube",
      options = {},
    ) => {
      const data = sampleMegaCurve(points, {
        seat: options.seat ?? seat,
        coaster,
      });
      if (visual) geometry.push({ ...data, visual, phase });
      leg(duration, phase, (u) => ({
        ...data.at(options.accelerate ? u * u * (1.8 - 0.8 * u) : u),
        phase,
        walking: phase === "return" || phase === "anticipation",
        paw: phase === "lift" ? 0.08 : 0.28,
      }));
      return data;
    },
    flight = (start, end, T, phase = "flight") => {
      const gravity = 9.81,
        vy = (end[1] - start[1] + 0.5 * gravity * T * T) / T,
        dx = end[0] - start[0],
        dz = end[2] - start[2];
      const info = {
        start: clock,
        duration: T,
        from: start,
        to: end,
        gravity,
        vy,
      };
      leg(T, phase, (u) => {
        const t = u * T;
        return {
          position: [
            start[0] + dx * u,
            start[1] + vy * t - 0.5 * gravity * t * t,
            start[2] + dz * u,
          ],
          yaw: Math.atan2(dx, dz),
          pitch:
            spec.kind === "dive"
              ? clamp(
                  -Math.atan2(vy - gravity * t, Math.hypot(dx, dz) / T),
                  -0.6,
                  1.15,
                )
              : clamp(-(vy - gravity * t) * 0.035, -0.45, 0.7),
          phase,
          paw: Math.sin(Math.PI * u) * 0.9,
          surprise: Math.sin(Math.PI * u),
          headPitch: -0.12,
        };
      });
      return info;
    },
    settle = (point) => {
      const t = clock;
      leg(1.15, "splash", (u) => ({
        position: [point[0], point[1] - Math.sin(u * Math.PI) * 0.28, point[2]],
        yaw: 0,
        paw: 0.3,
        surprise: (1 - u) * 0.6,
        phase: "splash",
      }));
      impacts.push({ time: t, point });
    },
    returnTo = (point, entry) => {
      const front = spec.footprint[1] / 2 - 1.2,
        left = -spec.footprint[0] / 2 + 1.2;
      // Stay outside the entire raised pool; use its front stair to dry land.
      const edge = [
        point[0],
        point[1],
        (pool?.[1] || 0) + (pool?.[3] || 0) + 0.25,
      ];
      path(
        [
          point,
          edge,
          [point[0], 0.22, front],
          [left, 0.22, front],
          [left, 0.22, entry[2]],
          [...entry],
        ],
        4,
        "return",
        null,
        { seat: 0 },
      );
      const returning = legs.at(-1),
        original = returning.fn;
      returning.fn = (u) => {
        const f = original(u);
        f.position[0] = clamp(
          f.position[0],
          -spec.footprint[0] / 2 + 0.75,
          spec.footprint[0] / 2 - 0.75,
        );
        f.position[2] = clamp(
          f.position[2],
          -spec.footprint[1] / 2 + 0.75,
          spec.footprint[1] / 2 - 0.75,
        );
        f.position[1] = Math.max(0.22, f.position[1]);
        return f;
      };
    };
  let entry, start;
  if (coaster) {
    const station = [-spec.footprint[0] / 2 + 3, 1, spec.footprint[1] / 2 - 3];
    entry = [station[0] - 2.3, 0.22, station[2]];
    leg(1.3, "board", (u) => ({
      position: entry.map((v, i) => v + (station[i] - v) * u),
      yaw: Math.PI / 2,
      walking: true,
      phase: "board",
    }));
    const first = [0, h, -spec.footprint[1] / 2 + 4];
    const liftPoints = [
      [station[0], station[1] - seat, station[2]],
      [station[0], 0.48, station[2] - 2],
      [station[0], 0.4, -5],
      [-6, h * 0.75, -10],
      first,
    ];
    const points = [first, [6, h - 1, -8], [10, 5, -7], [7, 2, -5]];
    let orientation;
    if (spec.kind === "corkscrew") {
      points.push([-10, 11, 0]);
      const begin = points.length;
      for (let i = 0; i <= 100; i++) {
        const a = (i / 100) * Math.PI * 4;
        points.push([
          -9 + (i / 100) * 18,
          7 + Math.cos(a) * 4,
          Math.sin(a) * 4,
        ]);
      }
      orientation = { kind: "corkscrew", range: [begin, points.length - 1] };
      points.push([11, 5, 7], [2, 2, 10]);
    } else {
      const r = spec.kind === "dragon" ? 7.6 : 6.1;
      const begin = points.length;
      points.push([0, 2.4, -1]);
      for (let i = 1; i <= 100; i++) {
        const a = (i / 100) * TAU;
        points.push([0, 2.4 + r * (1 - Math.cos(a)), -1 + r * Math.sin(a)]);
      }
      orientation = { kind: "loop", range: [begin, points.length - 1] };
      points.push([1, 2.5, 8], [-8, 5, 8], [-11, 3, 0]);
    }
    points.push(
      [station[0], 0.48, station[2] - 1],
      [station[0], 0.48, station[2]],
    );
    orientation.range = orientation.range.map((i) => i + liftPoints.length - 1);
    const run = sampleMegaCurve([...liftPoints, ...points.slice(1)], {
      seat,
      coaster: true,
      orientation,
    });
    geometry.push({ ...run, visual: "rails", phase: "ride" });
    const lengths = run.curve.getLengths(1200),
      knot =
        ((liftPoints.length - 1) / (liftPoints.length + points.length - 2)) *
        1200,
      low = Math.floor(knot),
      split =
        (lengths[low] + (lengths[low + 1] - lengths[low]) * (knot - low)) /
        lengths.at(-1);
    leg(7, "lift", (u) => ({ ...run.at(u * split), phase: "lift", paw: 0.08 }));
    leg(spec.kind === "dragon" ? 13 : 11, "ride", (u) => ({
      ...run.at(split + (1 - split) * (u * u * (3 - 2 * u))),
      phase: "ride",
      paw: 0.28,
    }));
    // Smooth final brake to the exact boarding position, without a teleport.
    const last = legs.at(-1),
      original = last.fn;
    last.fn = (u) => {
      const f = original(u);
      f.surprise = Math.sin(u * Math.PI) ** 2 * 0.7;
      return f;
    };
    leg(1.3, "exit", (u) => ({
      position: station.map((v, i) => v + (entry[i] - v) * u),
      yaw: -Math.PI / 2,
      walking: true,
      phase: "exit",
    }));
    return {
      duration: clock,
      legs,
      geometry,
      impacts,
      entry,
      station,
      coaster,
      seat,
      run,
      frame: frame,
    };
  }
  entry = stairPoint(tower, 0, 0);
  start = stairPoint(tower, h, 1);
  function climb(height) {
    const end = stairPoint(tower, height, 1);
    leg(1, "board", () => ({
      position: [...entry],
      yaw: Math.PI,
      paw: 0.15,
      phase: "board",
    }));
    leg(3 + height * 0.12, "climb", (u) => {
      const p = stairPoint(tower, height, u),
        a = ((height * Math.PI) / 2) * u;
      return { position: p, yaw: -a, walking: true, paw: 0.08, phase: "climb" };
    });
    return end;
  }
  if (spec.kind === "dive") {
    for (const height of [10, 20, 30]) {
      const end = climb(height),
        dx = pool[0] - end[0],
        dz = pool[1] - end[2],
        distance = Math.hypot(dx, dz),
        jump = [
          end[0] + (dx / distance) * 2.2,
          end[1],
          end[2] + (dz / distance) * 2.2,
        ];
      path([end, jump], 0.7, "anticipation", null, { seat: 0 });
      leg(0.5, "anticipation", () => ({
        position: jump,
        yaw: Math.atan2(dx, dz),
        paw: 0.25,
        surprise: 0.6,
        phase: "anticipation",
      }));
      const hit = [pool[0], 1.45, pool[1]],
        T = (3 + Math.sqrt(9 + 2 * 9.81 * (jump[1] - hit[1]))) / 9.81;
      flight(jump, hit, T);
      settle(hit);
      returnTo(hit, entry);
    }
  } else {
    const end = climb(h),
      first = [end[0], end[1] - seat, end[2]],
      points = [first];
    let hit = [pool[0], 1.45, pool[1]],
      run;
    if (spec.kind === "glass") {
      points.push([-1, h - 0.1, -7]);
      for (let i = 0; i <= 100; i++) {
        const u = i / 100,
          a = -Math.PI + u * Math.PI * 4;
        points.push([
          Math.sin(a) * 5.5,
          h - 0.3 - u * (h - 3.1),
          -2 + Math.cos(a) * 5.5,
        ]);
      }
      points.push([pool[0], 2, pool[1]]);
      run = path(points, 7, "ride", "glass", { accelerate: true });
    } else if (spec.kind === "launch") {
      points.push(
        [-8, h - 1, -5],
        [-7, 14, -1],
        [-6, 8, 2],
        [-5, 5, 0],
        [-4, 7.1, -2],
      );
      run = path(points, 4.6, "ride", "glass", { accelerate: true });
      flight(run.at(1).position, hit, 2.6);
    } else if (spec.kind === "funnel") {
      const spiral = [];
      for (let i = 0; i <= 120; i++) {
        const u = i / 120,
          a = Math.PI / 2 + u * Math.PI * 5.4,
          r = 1.9 + (6.8 - 1.9) * (1 - u);
        const x = Math.sin(a) * r,
          z = Math.cos(a) * r,
          p = new THREE.Vector3(x, funnelFloor(r), z).addScaledVector(
            funnelNormal(x, z),
            0.36,
          );
        spiral.push([p.x, p.y - seat, p.z]);
      }
      points.push([-6, 17, -6], [9.4, 14, 4.4], spiral[0]);
      run = path(points, 3.1, "ride", "glass", { accelerate: true });
      geometry.at(-1).narrowEnd = true;
      const lead = legs.at(-1),
        leadFrame = lead.fn;
      path(spiral, 4.2, "vortex", "bowl");
      const spin = legs.at(-1),
        spinFrame = spin.fn;
      spin.fn = (u) => bowlPose(spinFrame(u));
      const startQ = new THREE.Quaternion().fromArray(spin.fn(0).quaternion),
        endQ = new THREE.Quaternion().fromArray(spin.fn(1).quaternion);
      lead.fn = (u) => {
        const f = leadFrame(u),
          q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(f.pitch || 0, f.yaw, 0),
          );
        f.quaternion = q
          .slerp(startQ, THREE.MathUtils.smoothstep(u, 0.78, 1))
          .toArray();
        return f;
      };
      path(
        [spiral.at(-1), [0, 4.2, 0], [0, 2.5, 4], [0, 2, 9]],
        2,
        "drain",
        "glass",
      );
      geometry.at(-1).narrowStart = true;
      const drain = legs.at(-1),
        drainFrame = drain.fn;
      drain.fn = (u) => {
        const f = drainFrame(u),
          q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(f.pitch || 0, f.yaw, 0),
          );
        f.quaternion = endQ
          .clone()
          .slerp(q, THREE.MathUtils.smoothstep(u, 0, 0.22))
          .toArray();
        return f;
      };
    } else if (spec.kind === "jungle") {
      points.push(
        [0, 17, -8],
        [7, 15, -4],
        [7, 10, 0],
        [1, 8, -3],
        [-5, 6, 1],
        [-1, 3.5, 4],
        [3, 2, 8],
      );
      run = path(points, 6.2, "ride", "open", { accelerate: true });
    } else if (spec.kind === "racer") {
      points.push([1.5, h + 0.55, -9]);
      for (let i = 1; i <= 50; i++) {
        const u = i / 50;
        points.push([
          1.5,
          h + 0.55 - (h - 3.2) * u + Math.sin(u * Math.PI * 5) * 0.75,
          -9 + 16 * u,
        ]);
      }
      run = path(points, 4.5, "ride", "racer", { accelerate: true });
      hit = [1.5, 1.45, pool[1]];
      flight(run.at(1).position, hit, 1.3);
    } else if (spec.kind === "drop") {
      points.push(
        [0, h + 0.3, -8],
        [1, h - 3, -8],
        [1, 6, -7],
        [5, 3, -5],
        [7, 3.2, -1],
        [3, 2, 8],
      );
      run = path(points, 4.8, "ride", "glass", { accelerate: true });
    }
    settle(hit);
    returnTo(hit, entry);
  }
  return paceWaterRoute({
    duration: clock,legs,geometry,impacts,entry,coaster,seat,frame,
  },speed);
  function frame(elapsed, reduced = false) {
    if (reduced)
      return {
        position: [...entry],
        yaw: 0,
        paw: 0,
        phase: "board",
        walking: false,
      };
    const t = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, clock);
    if (t === clock)
      return { position: [...entry], yaw: 0, paw: 0, phase: "done" };
    const part = legs.find((l) => t < l.start + l.duration) || legs.at(-1);
    const f = part.fn(clamp((t - part.start) / part.duration, 0, 1));
    f.phase = part.phase;
    return f;
  }
}
