import * as THREE from "three";
export const islandCameraFar=(distance,radius)=>Math.max(1200,distance+(radius||12)+60);

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

// Fit the actual building rather than its purchase footprint. Tall slides and
// wide pools remain completely visible in a portrait phone's narrow field.
export function attractionCameraView(
  bounds,
  fov,
  aspect,
  yaw = 0,
  elevation = 0.53,
) {
  const target = bounds.getCenter(new THREE.Vector3()),
    azimuth = yaw + 0.16,
    back = new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation),
    ),
    right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)),
    up = new THREE.Vector3().crossVectors(back, right),
    half = Math.tan(THREE.MathUtils.degToRad(fov / 2)),
    point = new THREE.Vector3();
  let distance = 10;
  for (let i = 0; i < 8; i++) {
    point
      .set(
        i & 1 ? bounds.max.x : bounds.min.x,
        i & 2 ? bounds.max.y : bounds.min.y,
        i & 4 ? bounds.max.z : bounds.min.z,
      )
      .sub(target);
    distance = Math.max(
      distance,
      point.dot(back) + Math.abs(point.dot(right)) / (half * aspect * 0.84),
      point.dot(back) + Math.abs(point.dot(up)) / (half * 0.8),
    );
  }
  return { target, distance: distance + 0.75, azimuth, elevation };
}
