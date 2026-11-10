import {prepareMosaWaterField} from './mosasaur-water-field.js';
import {prepareMosaWaterReflection} from './mosasaur-water-probe.js';
import {prepareMosaReefs} from './mosasaur-reef-cache.js';
import {prepareMosasaurModels} from './mosasaur-model-cache.js';
import {prepareMosaRockSurfaces} from './mosasaur-rock-surfaces.js';
import {prepareZooCoat} from './zoo-coat-atlas.js';
import {prepareGorillaFace} from './zoo-gorilla-face.js';
import {prepareShowcaseSurfaces} from './showcase-surface-details.js';
import {prepareShowcaseWaterProbe} from './showcase-water-probes.js';
import {zooAnimalPreview} from './zoo-animals.js';
import * as THREE from "three";
import { CATALOG, BIOMES } from "./game-data.js";
import { createBiomeScene, disposeBiome } from "./biome-scenes.js";
import { makeAttraction } from "./world-assets.js";
import {reserveSlide,launchSlide} from './slide-riders.js';
import {disposeScenery} from './scenery-models.js';
import {MAGIC_BED_ID} from './magic-bed-data.js';
import {magicBedPreview} from './magic-bed-models.js';
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
    if(pending.some(item=>item.zoo||(item.isBiome&&item.id==='magic-zoo')))await prepareZooCoat();
    if(pending.some(item=>item.id==='zoo-gorilla'||(item.isBiome&&item.id==='magic-zoo')))await prepareGorillaFace();
    if(pending.some(item=>item.showcaseWater))await prepareShowcaseSurfaces();
    if(pending.some(item=>item.id==='ride-mosasaur'||item.isBiome&&item.id==='autumn'))await Promise.all([prepareMosaReefs(),prepareMosasaurModels(),prepareMosaRockSurfaces(),prepareMosaWaterReflection(),prepareMosaWaterField(),prepareShowcaseSurfaces()]);
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
      if(item.showcaseWater)await prepareShowcaseWaterProbe(item.id);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff1eb, 0xc1b3d7, 1.6));
      const light = new THREE.DirectionalLight(0xffe9df, 2.5);
      light.position.set(-3, 7, 5);
      scene.add(light);
      // Only these new previews use the actual game's key/rim/shadow layout.
      // Other shipped product images remain untouched.
      if(item.showcaseWater){
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
        scene.children[0].color.set(0xffe9db);scene.children[0].groundColor.set(0x8b9e85);scene.children[0].intensity=1.2;
        light.color.set(0xffd8b7);light.intensity=2.2;light.position.set(-70,175,100);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-85,right:85,top:100,bottom:-85,near:1,far:400});light.shadow.bias=-.0005;
        const rim=new THREE.DirectionalLight(0xb8b7ec,.9);rim.position.set(20,16,-30);scene.add(rim);
      }else renderer.shadowMap.enabled=false;
      const object = item.isBiome
        ? createBiomeScene(item, { preview: true })
        : item.zoo?zooAnimalPreview(item):makeAttraction(item.id,item.id===MAGIC_BED_ID?magicBedPreview():[]);
      if(item.showcaseWater){
        // Capture the real occupied equipment at its own authored ride phase,
        // including the swinging ship and all four carousel boats. The PNG is
        // shipped: opening the normal shop never starts these preview rides.
        const d=object.userData,leg=d.route.legs.find(l=>['ride','vortex','rafting','drop','flight','surf','float','carousel','swing'].includes(l.phase)),time=leg.start+leg.duration*.35;
        for(let i=0;i<(d.groupSeats||1);i++){const ticket=reserveSlide(object,'preview-'+i);launchSlide(object,ticket,0);ticket.elapsed=time;}
        d.update(time,false);
      }
      scene.add(object);
      const bounds = new THREE.Box3().setFromObject(object),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z, 1.4);
      renderer.setSize(item.showcaseWater?960:item.magicFarm||item.magicBed?480:300,item.showcaseWater?640:item.magicFarm||item.magicBed?320:200);
      const camera = new THREE.PerspectiveCamera(34, 1.5, item.premiumWater || item.waterpark || item.magicFarm ? .5 : 0.1, item.premiumWater || item.waterpark || item.magicFarm ? 2200 : 180);
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(0.95, item.showcaseWater ? 0.95 : 0.65, 1.25)
            .normalize()
            .multiplyScalar(radius * (item.isBiome ? 1.45 : 1.75)),
        );
      if (item.isBiome && item.id === "autumn") {
        bounds.min.y=Math.max(bounds.min.y,-35);bounds.getCenter(center);
        camera.far = 1800;
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
      if(item.magicBed)camera.position.copy(center).add(new THREE.Vector3(.25,1,1.1).normalize().multiplyScalar(radius*1.45));
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
        if(item.showcaseWater)disposeScenery(object);
        else if(item.zoo&&!item.isBiome)object.userData.disposeStaff?.();
        else if (item.isBiome) disposeBiome(object);
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
