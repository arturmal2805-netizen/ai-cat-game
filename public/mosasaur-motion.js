import * as THREE from "three";
import { MOSA_SEA, MOSA_DOCK } from "./mosasaur-data.js";
export const MOSA_DURATION = 30;
export const MOSA_SCALE = 1.25;
export const MOSA_SEAT = [0, 1.44, 0.6];
export const MOSA_TIMES = Object.freeze({
  board: 2,
  deep: 5.2,
  ascent: 17.6,
  launch: 19,
  land: 21.8,
  plunge: 23.2,
  return: 24.6,
  end: MOSA_DURATION,
});
export const MOSA_GRAVITY = 16;
export const MOSA_LAUNCH_SPEED = 22.4;
const DEPTH = MOSA_LAUNCH_SPEED ** 2 / (2 * MOSA_GRAVITY);
const clamp = THREE.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);
// Positions and velocities in metres / seconds. C1 joins avoid sudden changes
// of direction. In the air the horizontal trajectory is exactly a straight line.
const omega = (Math.PI * 2 + 2) / (MOSA_TIMES.ascent - 2 - 0.4);
const route = [
  [
    17.6,
    Math.sin(-2) * 8,
    Math.cos(-2) * 8,
    -Math.cos(-2) * 8 * omega,
    Math.sin(-2) * 8 * omega,
  ],
  [19, -6, -5.5, 4.6, 0],
  [21.8, 6.88, -5.5, 4.6, 0],
  [23.8, 8.5, 3, -1, 4],
  [26, 1, 8, -3, 0],
  [28, -6, 4, -1, -3],
  [30, 0, 8, 0, 0],
];
function horizontal(t) {
  if (t <= 2) return [0, 8, 0, 0];
  if (t < MOSA_TIMES.ascent) {
    const u = t - 2,
      r = Math.min(1, u / 0.8),
      travel = u < 0.8 ? 0.8 * (r ** 3 - 0.5 * r ** 4) : u - 0.4,
      angle = -omega * travel,
      angular = -omega * (u < 0.8 ? smooth(r) : 1);
    return [
      Math.sin(angle) * 8,
      Math.cos(angle) * 8,
      Math.cos(angle) * 8 * angular,
      -Math.sin(angle) * 8 * angular,
    ];
  }
  if (t >= MOSA_TIMES.launch && t <= MOSA_TIMES.land)
    return [-6 + (t - MOSA_TIMES.launch) * 4.6, -5.5, 4.6, 0];
  for (let i = 1; i < route.length; i++) {
    if (t > route[i][0]) continue;
    const a = route[i - 1],
      b = route[i],
      d = b[0] - a[0],
      u = (t - a[0]) / d;
    const h00 = 2 * u ** 3 - 3 * u * u + 1,
      h10 = u ** 3 - 2 * u * u + u,
      h01 = -2 * u ** 3 + 3 * u * u,
      h11 = u ** 3 - u * u;
    const v00 = (6 * u * u - 6 * u) / d,
      v10 = 3 * u * u - 4 * u + 1,
      v01 = (-6 * u * u + 6 * u) / d,
      v11 = 3 * u * u - 2 * u;
    return [
      h00 * a[1] + h10 * d * a[3] + h01 * b[1] + h11 * d * b[3],
      h00 * a[2] + h10 * d * a[4] + h01 * b[2] + h11 * d * b[4],
      v00 * a[1] + v10 * a[3] + v01 * b[1] + v11 * b[3],
      v00 * a[2] + v10 * a[4] + v01 * b[2] + v11 * b[4],
    ];
  }
  return [0, 8, 0, 0];
}
function vertical(t) {
  const water = MOSA_SEA.surfaceY;
  if (t <= 2) return [0.12, 0];
  if (t < MOSA_TIMES.deep) {
    const u = (t - 2) / (MOSA_TIMES.deep - 2),
      height = water - DEPTH - 0.12;
    return [
      0.12 + height * smooth(u),
      (height * 6 * u * (1 - u)) / (MOSA_TIMES.deep - 2),
    ];
  }
  if (t < MOSA_TIMES.ascent) return [water - DEPTH, 0];
  if (t < MOSA_TIMES.launch) {
    const s = t - MOSA_TIMES.ascent;
    return [water - DEPTH + 0.5 * MOSA_GRAVITY * s * s, MOSA_GRAVITY * s];
  }
  if (t <= MOSA_TIMES.land) {
    const s = t - MOSA_TIMES.launch;
    return [
      water + MOSA_LAUNCH_SPEED * s - 0.5 * MOSA_GRAVITY * s * s,
      MOSA_LAUNCH_SPEED - MOSA_GRAVITY * s,
    ];
  }
  if (t < MOSA_TIMES.plunge) {
    const s = t - MOSA_TIMES.land;
    return [
      water - MOSA_LAUNCH_SPEED * s + 0.5 * MOSA_GRAVITY * s * s,
      -MOSA_LAUNCH_SPEED + MOSA_GRAVITY * s,
    ];
  }
  if (t < MOSA_TIMES.return) return [water - DEPTH, 0];
  const d = MOSA_DURATION - MOSA_TIMES.return,
    u = (t - MOSA_TIMES.return) / d,
    height = 0.12 - (water - DEPTH);
  return [water - DEPTH + height * smooth(u), (height * 6 * u * (1 - u)) / d];
}
export function mosasaurFrame(elapsed, reduced = false) {
  const t = clamp(elapsed, 0, MOSA_DURATION),
    [x, z, vx, vz] = horizontal(t),
    [y, vy] = vertical(t),
    speed = Math.hypot(vx, vz),
    undock = smooth(clamp((t - 2) / 0.5, 0, 1)),
    dock = smooth(clamp((t - 29) / 1, 0, 1));
  let yaw = speed > 0.0001 ? Math.atan2(vx, vz) : -Math.PI / 2,
    pitch = clamp(-Math.atan2(vy, speed || 1), -1.4, 1.4) * undock * (1 - dock);
  yaw =
    -Math.PI / 2 +
    Math.atan2(Math.sin(yaw - -Math.PI / 2), Math.cos(yaw - -Math.PI / 2)) *
      undock *
      (1 - dock);
  const phase =
      t < MOSA_TIMES.board
        ? "boarding"
        : t < MOSA_TIMES.deep
          ? "dive"
          : t < MOSA_TIMES.ascent
            ? "deep"
            : t < MOSA_TIMES.launch
              ? "ascent"
              : t < MOSA_TIMES.land
                ? "flight"
                : t < MOSA_TIMES.return
                  ? "splash"
                  : "return",
    roll =
      reduced || phase === "flight"
        ? 0
        : Math.sin(t * 1.1) * 0.055 * undock * (1 - dock),
    q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitch, yaw, roll, "YXZ"),
    ),
    p = new THREE.Vector3(x, y, z),
    seat = new THREE.Vector3(...MOSA_SEAT)
      .multiplyScalar(MOSA_SCALE)
      .applyQuaternion(q)
      .add(p),
    air =
      phase === "flight"
        ? (t - MOSA_TIMES.launch) / (MOSA_TIMES.land - MOSA_TIMES.launch)
        : 0;
  return {
    position: seat.toArray(),
    bodyPosition: p.toArray(),
    quaternion: q.toArray(),
    velocity: [vx, vy, vz],
    yaw,
    pitch,
    roll,
    phase,
    surprise: phase === "flight" ? 0.25 + Math.sin(Math.PI * air) * 0.75 : 0,
    headPitch: phase === "deep" ? -0.06 : 0,
    paw: phase === "flight" ? 0.18 + Math.sin(Math.PI * air) * 0.12 : 0,
  };
}
// Follow the dry shore to the jetty; only the final small hop boards the saddle.
// Local coordinates allow the identical path for the hero and every resident.
export function mosasaurApproach(from, to, t) {
  const start = new THREE.Vector3(...from),
    end = new THREE.Vector3(...to);
  const a0 = Math.atan2(start.x, start.z),
    da = Math.atan2(Math.sin(-a0), Math.cos(-a0));
  const q = smooth(clamp(t / 0.72, 0, 1)),
    a = a0 + da * q;
  const onIsland = Math.hypot(start.x, start.z) < 32;
  if (t < 0.72) {
    if (!onIsland)
      return start.lerp(new THREE.Vector3(0, 0, MOSA_DOCK.z), q).toArray();
    const r0 = Math.hypot(start.x, start.z),
      r = THREE.MathUtils.lerp(Math.max(22.7, r0), 23, q);
    return [Math.sin(a) * r, 0, Math.cos(a) * r];
  }
  return new THREE.Vector3(0, 0, MOSA_DOCK.z)
    .lerp(end, smooth((t - 0.72) / 0.28))
    .toArray();
}
