export function swimFrame(
  time,
  { rx = 2, rz = 2 } = {},
  seed = 0,
  reduced = false,
) {
  const a = seed + (reduced ? 0 : time * 0.48),
    x = Math.sin(a) * rx * 0.62,
    z = Math.cos(a) * rz * 0.62;
  return {
    x,
    z,
    y: reduced ? -0.4 : -0.4 + Math.sin(time * 3.1) * 0.035,
    yaw: Math.atan2(Math.cos(a) * rx, -Math.sin(a) * rz),
    crouch: 0.12,
    paw: reduced ? 0 : 0.35 + Math.sin(time * 4.2) * 0.18,
    headPitch: reduced ? 0 : Math.sin(time * 1.6) * 0.03,
  };
}
export function nearestSwim(objects, point, maxDistance = 40) {
  return (
    objects
      .filter((o) => o.type === "swim-lagoon")
      .map((o) => ({
        object: o,
        distance: Math.hypot(o.worldX - point.x, o.worldZ - point.z),
      }))
      .filter((o) => o.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.object || null
  );
}
