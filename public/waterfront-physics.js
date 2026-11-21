import { WATERFRONT as W } from "./waterfront-data.js";
import { expansionBedY } from "./mosasaur-expansion.js";
import { MOSA_SEA } from "./mosasaur-data.js";
export const GRAVITY = 9.81;
export function ballisticLaunch(
  from,
  to,
  { height = 7, gravity = GRAVITY } = {},
) {
  const apex = Math.max(from.y, to.y) + height,
    vy = Math.sqrt(2 * gravity * (apex - from.y)),
    duration =
      (vy + Math.sqrt(vy * vy + 2 * gravity * (from.y - to.y))) / gravity;
  return {
    from: { ...from },
    to: { ...to },
    vy,
    vx: (to.x - from.x) / duration,
    vz: (to.z - from.z) / duration,
    duration,
    gravity,
  };
}
export function ballisticFrame(launch, age, out = {}) {
  const t = Math.max(0, Math.min(age, launch.duration));
  out.x = launch.from.x + launch.vx * t;
  out.y = launch.from.y + launch.vy * t - (launch.gravity * t * t) / 2;
  out.z = launch.from.z + launch.vz * t;
  out.vy = launch.vy - launch.gravity * t;
  out.done = age >= launch.duration;
  return out;
}
export function safeWaterLanding(p, radius = 0.8) {
  const x = W.x + p.x,
    z = W.z + p.z;
  return (
    Math.hypot(p.x - W.trampoline.x, p.z - W.trampoline.z) >
      W.trampoline.radius + 15 &&
    Math.abs(p.x) < 220 &&
    p.z > 300 &&
    p.z < 550 &&
    expansionBedY(x, z) < MOSA_SEA.surfaceY - 4 - radius
  );
}
export function diveLane(slot) {
  const a = [-0.48, -0.16, 0.16, 0.48][slot % 4],
    r = W.trampoline.radius;
  const launch = {
      x: W.trampoline.x + Math.sin(a) * (r - 12),
      z: W.trampoline.z + Math.cos(a) * (r - 12),
      y: W.trampoline.y + 0.012,
    },
    water = {
      x: W.trampoline.x + Math.sin(a) * (r + 35),
      z: W.trampoline.z + Math.cos(a) * (r + 35),
      y: MOSA_SEA.surfaceY - 0.16,
    };
  if (!safeWaterLanding(water)) throw Error("Unsafe waterfront landing");
  return {
    launch,
    water,
    climb: {
      x: W.trampoline.x,
      z: W.trampoline.z + r + 7,
      y: MOSA_SEA.surfaceY - 0.16,
    },
    exit: {
      x: W.trampoline.x,
      z: W.trampoline.z + r - 10,
      y: W.trampoline.y + 0.012,
    },
  };
}
