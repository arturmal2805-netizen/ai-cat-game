import * as THREE from "three";
import { MOSA_SEA, MOSA_DOCK } from "./mosasaur-data.js";
export const MOSA_DURATION = 48;
export const MOSA_SCALE = 1.25;
export const MOSA_SEAT = [0, 1.44, 0.6];
const clamp = THREE.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);
const heights = [
  [0, 0.12],
  [4, 0.12],
  [10, -14.8],
  [22, -14.8],
  [28, -1.0],
  [32, 16],
  [36, -1.0],
  [40, -2.2],
  [48, 0.12],
];
function bodyPoint(elapsed) {
  const t = clamp(elapsed, 0, MOSA_DURATION),
    angle = (Math.PI * 2 * t) / MOSA_DURATION;
  let y = -0.85;
  for (let i = 1; i < heights.length; i++)
    if (t <= heights[i][0]) {
      const [a, u] = heights[i - 1],
        [b, v] = heights[i];
      y = THREE.MathUtils.lerp(u, v, smooth((t - a) / (b - a)));
      break;
    }
  return new THREE.Vector3(Math.sin(angle) * 8, y, Math.cos(angle) * 8);
}
export function mosasaurFrame(elapsed, reduced = false) {
  const t = clamp(elapsed, 0, MOSA_DURATION),
    p = bodyPoint(t),
    velocity = bodyPoint(Math.min(MOSA_DURATION, t + 0.025)).sub(
      bodyPoint(Math.max(0, t - 0.025)),
    ),
    angle = (Math.PI * 2 * t) / MOSA_DURATION,
    yaw = Math.atan2(Math.cos(angle) * 8, -Math.sin(angle) * 8),
    pitch =
      t === 0 || t === MOSA_DURATION
        ? 0
        : clamp(
            -Math.atan2(velocity.y, Math.hypot(velocity.x, velocity.z) || 1),
            -0.95,
            0.95,
          ),
    roll = reduced ? 0 : Math.sin(angle) * 0.065,
    q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitch, yaw, roll, "YXZ"),
    ),
    seat = new THREE.Vector3(...MOSA_SEAT)
      .multiplyScalar(MOSA_SCALE)
      .applyQuaternion(q)
      .add(p),
    phase =
      t < 4
        ? "boarding"
        : t < 10
          ? "dive"
          : t < 22
            ? "deep"
            : t < 28
              ? "ascent"
              : t < 36
                ? "flight"
                : t < 40
                  ? "splash"
                  : "return";
  return {
    position: seat.toArray(),
    bodyPosition: p.toArray(),
    quaternion: q.toArray(),
    yaw,
    pitch,
    roll,
    phase,
    surprise: phase === "flight" ? Math.sin((Math.PI * (t - 28)) / 8) : 0,
    headPitch: phase === "deep" ? -0.06 : 0,
    paw: phase === "flight" ? 0.2 : 0,
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
