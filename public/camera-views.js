// The enclosing sphere fits the entire lawn at every orbit angle, including
// portrait phones. Padding leaves room for cats and the floating controls.
export function islandOverviewDistance(radius, fov, aspect) {
  const halfAngle = Math.atan(
    Math.tan((fov * Math.PI) / 360) * Math.min(1, aspect),
  );
  return Math.max(25, (((radius || 12) + 2) * 1.12) / Math.sin(halfAngle));
}

export function randomCameraCat(cats, previousId, random = Math.random) {
  const others = cats.filter((cat) => cat.id !== previousId),
    candidates = others.length ? others : cats;
  if (!candidates.length) return null;
  return candidates[
    Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  ];
}
