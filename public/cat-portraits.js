import * as THREE from "three";
import { createCat, disposeCat } from "./cat-model.js";
import { CAT_PORTRAITS } from "./cat-portrait-manifest.js";
export const catPortraits = new Map(Object.entries(CAT_PORTRAITS));
let pending = null;
export function prepareCatPortraits(profiles, onReady = () => {}) {
  for (const p of profiles)
    if (catPortraits.has(p.id)) onReady(p.id, catPortraits.get(p.id));
  profiles = profiles.filter((p) => !catPortraits.has(p.id));
  if (!profiles.length) return Promise.resolve();
  if (pending) return pending;
  pending = (async () => {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(180, 180);
    renderer.setPixelRatio(2);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xf7f4ef, 0xa1b3b8, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.3);
    sun.position.set(3, 4, 5);
    scene.add(sun);
    const view = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    view.position.set(2.3, 2.5, 4.4);
    view.lookAt(0, 1, 0);
    try {
      for (const profile of profiles) {
        if (!catPortraits.has(profile.id)) {
          const model = createCat("happy", { ...profile, detail: "npc" });
          scene.add(model);
          renderer.render(scene, view);
          catPortraits.set(
            profile.id,
            renderer.domElement.toDataURL("image/png"),
          );
          scene.remove(model);
          disposeCat(model);
        }
        onReady(profile.id, catPortraits.get(profile.id));
        await new Promise(requestAnimationFrame);
      }
    } finally {
      renderer.dispose();
      pending = null;
    }
  })();
  return pending;
}
