import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Reduce static draws without replacing the authored material: illuminated
// windows, polished rails and custom water shaders retain their appearance.
export function batchModelGeometry(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    buckets = new Map();
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (let node = mesh; node; node = node.parent) if (!node.visible) return;
    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    if (!mesh.material.vertexColors) geometry.deleteAttribute("color");
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 2),
          2,
        ),
      );
    const bucket = buckets.get(mesh.material) || [];
    bucket.push({ geometry, castShadow: mesh.castShadow });
    buckets.set(mesh.material, bucket);
  });
  const result = new THREE.Group();
  for (const [material, parts] of buckets) {
    const geometry = mergeGeometries(parts.map((p) => p.geometry));
    parts.forEach((p) => p.geometry.dispose());
    if (!geometry) throw Error("Incompatible static model geometry");
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = parts.some((p) => p.castShadow);
    mesh.receiveShadow = true;
    result.add(mesh);
  }
  result.userData.sourceMeshes = [...buckets.values()].reduce(
    (n, p) => n + p.length,
    0,
  );
  return result;
}
