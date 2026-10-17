import { courtPath, courtWalkable } from "./foodcourt-navigation.js";

export const CARRY_DURATION = 40;
const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
export function carryTiming(time, reduced = false) {
  return {
    weight:
      smooth((time - 2.4) / 2) * smooth((CARRY_DURATION - 2.5 - time) / 2),
    progress: reduced ? 0 : smooth((time - 6) / (CARRY_DURATION - 12)),
    turn: reduced
      ? 0
      : smooth((time - 5) / 1.5) * smooth((CARRY_DURATION - 5 - time) / 1.5),
    phase:
      time < 2.4
        ? "greet"
        : time < 4.4
          ? "pickup"
          : time < CARRY_DURATION - 4.5
            ? "carry"
            : time < CARRY_DURATION - 2.5
              ? "putdown"
              : "goodbye",
  };
}

// Resolve a clear out-and-back route once on reservation. No A* or geometry
// allocation in the animation loop; returning to the pickup spot is exact.
export function createCarryWalk(origin, obstacles, radius = 1.45) {
  if (!courtWalkable(origin, radius, obstacles, "bikini")) return null;
  const destinations = [
    { x: origin.x + 7, z: origin.z + 7 },
    { x: origin.x - 7, z: origin.z + 7 },
    { x: -12, z: 16 },
    { x: 5, z: 12 },
    { x: 13, z: 2 },
    { x: -17, z: -5 },
  ];
  for (const goal of destinations) {
    if (Math.hypot(goal.x - origin.x, goal.z - origin.z) < 5) continue;
    const outward = courtPath(origin, goal, radius, obstacles, "bikini");
    if (!outward?.length) continue;
    const points = [{ ...origin }, ...outward];
    points.push(
      ...points
        .slice(0, -1)
        .reverse()
        .map((p) => ({ ...p })),
    );
    const lengths = points
        .slice(1)
        .map((p, i) => Math.hypot(p.x - points[i].x, p.z - points[i].z)),
      total = lengths.reduce((a, b) => a + b, 0);
    if (total < 10) continue;
    return {
      points,
      lengths,
      total,
      radius,
      sample(progress) {
        let travel = Math.max(0, Math.min(1, progress)) * total;
        for (let i = 0; i < lengths.length; i++) {
          if (travel <= lengths[i] || i === lengths.length - 1) {
            const a = points[i],
              b = points[i + 1],
              f = lengths[i] ? Math.min(1, travel / lengths[i]) : 1;
            let yaw = Math.atan2(b.x - a.x, b.z - a.z);
            if (i + 2 < points.length) {
              const next = points[i + 2],
                angle = Math.atan2(next.x - b.x, next.z - b.z);
              yaw +=
                Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw)) *
                smooth(1 - (lengths[i] - travel) / 0.7);
            }
            return {
              x: a.x + (b.x - a.x) * f - origin.x,
              z: a.z + (b.z - a.z) * f - origin.z,
              yaw,
            };
          }
          travel -= lengths[i];
        }
        return { x: 0, z: 0, yaw: 0 };
      },
    };
  }
  return null;
}
export function carriedCatSize(model) {
  const scale = model.scale.x,
    body = model.userData.body;
  return {
    bellyY: (body.position.y - body.scale.y * 0.75) * scale,
    depth: (Math.abs(body.position.z) + body.scale.z) * scale,
    width: body.scale.x * scale,
  };
}

// Adjust joints only after the ordinary cat animator. Approved meshes, coat,
// eyes and proportions are unchanged and the next ordinary frame resets pose.
export function relaxCarriedCat(model, weight, time, reduced = false) {
  if (!weight) return;
  const d = model.userData;
  for (const [i, joints] of (d.legJoints || []).entries()) {
    const front = d.legs[i].position.z > 0;
    joints.shoulder.rotation.x += (front ? -0.22 : 0.3) * weight;
    joints.knee.rotation.x += (front ? 0.38 : 0.55) * weight;
    joints.ankle.rotation.x -= 0.24 * weight;
  }
  d.head.rotation.z += (reduced ? 0 : Math.sin(time * 1.6) * 0.055) * weight;
  d.tail.rotation.z += (reduced ? 0 : Math.sin(time * 1.8) * 0.1) * weight;
}
