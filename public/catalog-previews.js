import * as THREE from "three";
import { CATALOG } from "./game-data.js";
import { makeAttraction } from "./world-assets.js";
export async function catalogPreviews() {
  const result = new Map();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(300, 200);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    for (const item of CATALOG) {
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff1eb, 0xc1b3d7, 3));
      const light = new THREE.DirectionalLight(0xffe9df, 3);
      light.position.set(-3, 7, 5);
      scene.add(light);
      const object = makeAttraction(item.id);
      scene.add(object);
      const bounds = new THREE.Box3().setFromObject(object),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z, 1.4);
      const camera = new THREE.PerspectiveCamera(34, 1.5, 0.1, 60);
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(0.95, 0.65, 1.25)
            .normalize()
            .multiplyScalar(radius * 2.4),
        );
      camera.lookAt(center);
      renderer.render(scene, camera);
      result.set(item.id, renderer.domElement.toDataURL("image/png"));
      object.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  } catch (error) {
    console.warn("Catalog preview unavailable:", error.message);
  } finally {
    renderer?.dispose();
  }
  return result;
}
