import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Reduce static draws without replacing the authored material: illuminated
// windows, polished rails and custom water shaders retain their appearance.
export function batchModelGeometry(root, { combineColors = false } = {}) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    buckets = new Map(),
    colorFamilies = new Map();
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (let node = mesh; node; node = node.parent) if (!node.visible) return;
    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    let material = mesh.material;
    if (!material.vertexColors) geometry.deleteAttribute("color");
    // Optional tint batching for the many pastel flowers and sugar trees.
    // Keep maps, illumination and surface response; bake only the tint.
    if (
      combineColors &&
      (material.isMeshStandardMaterial || material.isMeshBasicMaterial) &&
      !material.isMeshPhysicalMaterial &&
      !material.emissive?.getHex()
    ) {
      const key = [
        material.type,
        material.map?.uuid,
        material.bumpMap?.uuid,
        material.bumpScale,
        material.roughness,
        material.metalness,
        material.side,
        material.transparent,
        material.opacity,
        material.depthWrite,
        material.toneMapped,
      ].join(":");
      if (!colorFamilies.has(key)) {
        const family = material.clone();
        family.color.set(0xffffff);
        family.vertexColors = true;
        family.userData.sharedScenery = false;
        colorFamilies.set(key, family);
      }
      const old = geometry.getAttribute("color"),
        colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length / 3; i++) {
        colors[i * 3] = material.color.r * (old ? old.getX(i) : 1);
        colors[i * 3 + 1] = material.color.g * (old ? old.getY(i) : 1);
        colors[i * 3 + 2] = material.color.b * (old ? old.getZ(i) : 1);
      }
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      material = colorFamilies.get(key);
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 2),
          2,
        ),
      );
    const bucket = buckets.get(material) || [];
    bucket.push({ geometry, castShadow: mesh.castShadow });
    buckets.set(material, bucket);
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
