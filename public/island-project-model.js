import { makeAttraction } from "./world-assets.js";
import { constructionModel } from "./advanced-assets.js";

// Show the same colorful geometry as the finished preview, with a translucent
// silhouette and fences. A bare foundation must not look like a missing ride.
export function islandProjectModel(type) {
  const root = constructionModel(type),
    future = makeAttraction(type);
  future.name = "Future island attraction";
  future.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.material = mesh.material.clone();
    mesh.material.userData.sharedScenery = false;
    mesh.material.transparent = true;
    mesh.material.opacity = 0.32;
    mesh.material.depthWrite = false;
    mesh.castShadow = false;
  });
  root.add(future);
  root.name = "Island attraction under construction";
  root.userData.handpainted = true;
  root.userData.update = (time) => {
    root.userData.moving.rotation.z = -time * 0.4;
  };
  return root;
}
