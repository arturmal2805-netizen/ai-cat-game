import { runSceneSteps } from "./scene-tasks.js";
import * as THREE from "three";
import { mergeSceneSteps } from "./geometry-tasks.js";
import { optimizeGeometryCache } from "./geometry-cache.js";

// Reduce static draws without replacing the authored material: illuminated
// windows, polished rails and custom water shaders retain their appearance.
export function* batchModelSteps(root, { combineColors = false } = {}) {
  yield;
  root.updateWorldMatrix(true, true);
  yield;
  const inverse = root.matrixWorld.clone().invert(),
    buckets = new Map(),
    colorFamilies = new Map();
  yield;
  const meshes = [];
  yield;
  root.traverse((mesh) => {
    if (mesh.isMesh) meshes.push(mesh);
  });
  yield;
  for (const mesh of meshes) {
    yield;
    if (!mesh.visible) continue;
    yield;
    let hidden = false;
    yield;
    mesh.traverseAncestors((node) => {
      if (!node.visible) hidden = true;
    });
    yield;
    if (hidden) continue;
    yield;
    const geometry = mesh.geometry.clone();
    if (!geometry.index)
      geometry.setIndex(
        Array.from({ length: geometry.attributes.position.count }, (_, i) => i),
      );
    yield;
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    yield;
    let material = mesh.material;
    yield;
    if (!material.vertexColors) geometry.deleteAttribute("color");
    // Optional tint batching for the many pastel flowers and sugar trees.
    // Keep maps, illumination and surface response; bake only the tint.
    yield;
    if (
      combineColors &&
      (material.isMeshStandardMaterial || material.isMeshBasicMaterial) &&
      !material.isMeshPhysicalMaterial &&
      !material.emissive?.getHex()
    ) {
      yield;
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
      yield;
      if (!colorFamilies.has(key)) {
        yield;
        const family = material.clone();
        yield;
        family.color.set(0xffffff);
        yield;
        family.vertexColors = true;
        yield;
        family.userData.sharedScenery = false;
        yield;
        colorFamilies.set(key, family);
      }
      yield;
      const old = geometry.getAttribute("color"),
        colors = new Float32Array(geometry.attributes.position.count * 3);
      yield;
      for (let i = 0; i < colors.length / 3; i++) {
        if ((i & 2047) === 0) yield;

        colors[i * 3] = material.color.r * (old ? old.getX(i) : 1);

        colors[i * 3 + 1] = material.color.g * (old ? old.getY(i) : 1);

        colors[i * 3 + 2] = material.color.b * (old ? old.getZ(i) : 1);
      }
      yield;
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      yield;
      material = colorFamilies.get(key);
    }
    yield;
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    yield;
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 2),
          2,
        ),
      );
    yield;
    const bucket = buckets.get(material) || [];
    yield;
    bucket.push({ geometry, castShadow: mesh.castShadow });
    yield;
    buckets.set(material, bucket);
  }
  yield;
  const result = new THREE.Group();
  yield;
  for (const [material, parts] of buckets) {
    yield;
    const geometry = yield* mergeSceneSteps(parts.map((p) => p.geometry));
    yield;
    parts.forEach((p) => p.geometry.dispose());
    yield;
    if (!geometry) throw Error("Incompatible static model geometry");
    yield;
    if (!material.transparent) optimizeGeometryCache(geometry);
    yield;
    const mesh = new THREE.Mesh(geometry, material);
    // Positions were baked into geometry. Parent placement/animation still
    // updates normally; this identity transform never needs recomposition.
    mesh.matrixAutoUpdate = false;
    yield;
    mesh.castShadow = parts.some((p) => p.castShadow);
    yield;
    mesh.receiveShadow = true;
    yield;
    result.add(mesh);
  }
  yield;
  result.userData.sourceMeshes = [...buckets.values()].reduce(
    (n, p) => n + p.length,
    0,
  );
  yield;
  return result;
}

export function batchModelGeometry(...args) {
  return runSceneSteps(batchModelSteps(...args));
}
