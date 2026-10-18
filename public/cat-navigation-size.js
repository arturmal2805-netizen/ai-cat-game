// Navigation follows the approved rig's rest anatomy, including the maximum
// breathing width. A visual inhale must not allocate a new pathfinding grid.
export function catNavigationRadius(model) {
  const d = model.userData,
    width =
      d.anatomy && d.build
        ? d.anatomy.bodyX * d.build.width + 0.006
        : d.body.scale.x;
  return Math.max(
    0.48,
    width * model.scale.x * (d.appearance?.width || 1) + 0.16,
  );
}
