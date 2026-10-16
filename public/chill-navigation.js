import { CHILL_RADIUS, CHILL_HOUSES } from "./chill-data.js";
import { spaPath, spaClear } from "./spa-navigation.js";
export function chillWalkable(p, radius = 0.55, obstacles = []) {
  return (
    Math.hypot(p.x, p.z) < CHILL_RADIUS - radius - 0.55 &&
    !CHILL_HOUSES.some(
      (h) =>
        Math.abs(p.x - h.x) < 5.55 + radius &&
        p.z > h.z - 3.65 - radius &&
        p.z < h.z + 4.35 + radius,
    ) &&
    spaClear(p, radius, obstacles)
  );
}
export function nearestChillGround(p, radius = 0.55, obstacles = []) {
  if (chillWalkable(p, radius, obstacles)) return { ...p, y: 0.16 };
  for (let r = 0.4; r < CHILL_RADIUS * 2; r += 0.4)
    for (let i = 0, n = Math.ceil(r * 12); i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        next = { x: p.x + Math.sin(a) * r, z: p.z + Math.cos(a) * r, y: 0.16 };
      if (chillWalkable(next, radius, obstacles)) return next;
    }
  return null;
}
export function chillPath(from, to, radius = 0.55, obstacles = []) {
  const a = nearestChillGround(from, radius, obstacles);
  if (!a || !chillWalkable(to, radius, obstacles)) return null;
  return spaPath(a, to, radius, obstacles, chillWalkable, { extent: 46 });
}
