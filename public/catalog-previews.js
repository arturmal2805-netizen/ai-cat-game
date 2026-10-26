import * as THREE from "three";
import { CATALOG, BIOMES } from "./game-data.js";
import { createBiomeScene, disposeBiome } from "./biome-scenes.js";
import { makeAttraction } from "./world-assets.js";
import shippedPreviews from "./art/previews/catalog.json" with { type: "json" };
const capturedPreviews = new Map();
export async function catalogPreviews(
  onPreview,
  { forceRender = false, keys = null, canRender = () => true } = {},
) {
  const result = new Map();
  const selected = keys ? new Set(keys) : null,
    targets = [
      ...CATALOG,
      ...BIOMES.map((b) => ({ ...b, isBiome: true })),
    ].filter(
      (item) =>
        !selected || selected.has(item.isBiome ? "biome-" + item.id : item.id),
    ),
    available = new Set(shippedPreviews.items);
  let pending = targets;
  if (!forceRender) {
    // Ship the exact manifest with its matching application/PNG assets. A
    // failed metadata request must never rebuild the entire shop and every
    // island through a second WebGL renderer while the player is playing.
    pending = [];
    for (const item of targets) {
      const key = item.isBiome ? "biome-" + item.id : item.id;
      if (capturedPreviews.has(key)) {
        const src = capturedPreviews.get(key);
        result.set(key, src); onPreview?.(key, src); continue;
      }
      if (!available.has(key)) { pending.push(item); continue; }
      const src = new URL(
        `./art/previews/${key}.png?v=${encodeURIComponent(shippedPreviews.version)}`,
        document.baseURI,
      ).href;
      result.set(key, src);
      onPreview?.(key, src);
    }
    if (!pending.length) return result;
  }
  let renderer;
  try {
    if (!canRender()) return result;
    // Let the modal paint before compiling WebGL programs or reading pixels.
    await new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );
    if (!canRender()) return result;
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(300, 200);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    for (const item of pending) {
      if (!canRender()) break;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff1eb, 0xc1b3d7, 1.6));
      const light = new THREE.DirectionalLight(0xffe9df, 2.5);
      light.position.set(-3, 7, 5);
      scene.add(light);
      const object = item.isBiome
        ? createBiomeScene(item, { preview: true })
        : makeAttraction(item.id);
      scene.add(object);
      const bounds = new THREE.Box3().setFromObject(object),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z, 1.4);
      const camera = new THREE.PerspectiveCamera(34, 1.5, 0.1, 180);
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(0.95, 0.65, 1.25)
            .normalize()
            .multiplyScalar(radius * (item.isBiome ? 1.45 : 1.75)),
        );
      if (item.isBiome && item.id === "autumn") {
        center.set(0, -17, 0);
        camera.far = 800;
        camera.updateProjectionMatrix();
        const direction = new THREE.Vector3(0.85, 1.1, 1.1).normalize();
        let fit = radius * 1.55;
        for (let i = 0; i < 16; i++) {
          camera.position.copy(center).addScaledVector(direction, fit);
          camera.lookAt(center);
          camera.updateMatrixWorld(true);
          let visible = true;
          for (let k = 0; k < 8; k++) {
            const p = new THREE.Vector3(
              k & 1 ? bounds.max.x : bounds.min.x,
              k & 2 ? bounds.max.y : bounds.min.y,
              k & 4 ? bounds.max.z : bounds.min.z,
            ).project(camera);
            if (Math.abs(p.x) > 0.92 || Math.abs(p.y) > 0.88 || p.z >= 1)
              visible = false;
          }
          if (visible) break;
          fit *= 1.08;
        }
      }
      if (item.isBiome && item.id === "jobcity") {
        camera.far = 800;
        camera.updateProjectionMatrix();
        center.set(0, -3, 0);
        camera.position
          .copy(center)
          .add(
            new THREE.Vector3(0.12, 0.72, 1.25)
              .normalize()
              .multiplyScalar(radius * 1.8),
          );
      }
      camera.lookAt(center);
      try {
        await renderer.compileAsync(scene, camera);
        if (canRender()) {
          renderer.render(scene, camera);
          const key = item.isBiome ? "biome-" + item.id : item.id,
            src = renderer.domElement.toDataURL("image/png");
          result.set(key, src);
          capturedPreviews.set(key, src);
          onPreview?.(key, src);
        }
      } finally {
        if (item.isBiome) disposeBiome(object);
        else object.traverse((o) => {
          if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
        });
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  } catch (error) {
    console.warn("Catalog preview unavailable:", error.message);
  } finally {
    renderer?.dispose();
  }
  return result;
}
