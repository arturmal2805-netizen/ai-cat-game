import * as THREE from "three";
import { pauseHiddenMatrixUpdates } from "./scene-visibility.js";

// Whole off-camera attractions used to animate every worker/guest/steam plume
// and walk their entire rigs each frame. Keep the simulation and clocks, but
// defer visual work until either the camera OR its shadow view can see it.
export function attractionVisibility(root, { padding = 8 } = {}) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    box = new THREE.Box3(),
    partBox = new THREE.Box3(),
    matrix = new THREE.Matrix4(),
    worldSphere = new THREE.Sphere();
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    matrix.multiplyMatrices(inverse, o.matrixWorld);
    partBox.copy(o.geometry.boundingBox).applyMatrix4(matrix);
    box.union(partBox);
  });
  // Cover the complete rider itinerary, including ballistic leaps and dives.
  if (root.userData.rideFrame) {
    const duration = root.userData.duration || 30;
    for (let i = 0; i <= 256; i++) {
      const f = root.userData.rideFrame((duration * i) / 256, false);
      if (f?.position) box.expandByPoint(new THREE.Vector3(...f.position));
    }
  }
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  sphere.radius += padding; // full motion/effects without clipping a silhouette
  pauseHiddenMatrixUpdates(root);
  return (view, shadow) => {
    root.updateWorldMatrix(true, false);
    worldSphere.copy(sphere).applyMatrix4(root.matrixWorld);
    return (
      view.intersectsSphere(worldSphere) ||
      !!shadow?.intersectsSphere(worldSphere)
    );
  };
}
