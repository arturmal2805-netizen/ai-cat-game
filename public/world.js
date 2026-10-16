import { createResidentPlay } from "./resident-play.js";
import { decorateBusiness } from "./business-decor.js";
import {
  attachBuilderHammer,
  constructionSites,
  createConstructionCrew,
} from "./construction-crew.js";
import {
  CHILL_OBJECTS,
  CHILL_GATE,
  CHILL_WATER_Y,
  chillObject,
  chillEntrance,
} from "./chill-data.js";
import { chillWalkable, nearestChillGround } from "./chill-navigation.js";
import { createChillRuntime } from "./chill-runtime.js";
import { CHICHI_PORTRAITS } from "./cat-portrait-manifest.js";
import { RENEWED_ISLANDS } from "./renewal-data.js";
import { islandHeight } from "./renewed-biomes.js";
import { capybaraDryPoint } from "./capybara-data.js";
import { createChichiCamera } from "./chichi-camera.js";
import { placeWorldBadge } from "./world-hud.js";
import { islandProjectModel } from "./island-project-model.js";
import { islandObjects } from "./world-objects.js";
import { swimFrame } from "./swimming.js";
import { activeCats } from "./cat-roster.js";
import { catAppearance } from "./cat-breeds.js";
import { watchWorldViewport } from "./world-viewport.js";
import { incomeFor, businessVenues, businessLevel } from "./business.js";
import {
  spaObject,
  SPA_GATE,
  SPA_ENTRANCES,
  SPA_DRINKS,
  SPA_JACUZZI,
} from "./spa-data.js";
import { spaWalkable, nearestSpaGround } from "./spa-navigation.js";
import { createSpaRuntime } from "./spa-runtime.js";
import { spaLounge, spaBar, spaCup } from "./spa-assets.js";
import { sceneryFootprint } from "./scenery-data.js";
import {
  HOME_OBJECTS,
  dropTarget,
  manualInteraction,
  objectPosition,
} from "./interactions.js";
import { yarnPlayFrame, applyYarnFrame, resetYarn } from "./yarn-play.js";
import * as THREE from "three";
import {
  createCat,
  animateCat,
  reactCat,
  setCatMood,
  emoteCat,
  disposeCat,
  moodNames,
} from "./cat-model.js";
import {
  BIOMES,
  NEIGHBORS,
  byBiome,
  byItem,
  biomeReservations,
} from "./game-data.js";
import { canPlace, isBuilt } from "./economy.js";
import { byScenery } from "./scenery-data.js";
import {
  createSceneryModel,
  disposeScenery,
  fadeScenery,
} from "./scenery-models.js";
import {
  prepareSceneSteps,
  createSceneScheduler,
  queueSceneRefresh,
  yieldSceneTask,
} from "./scene-tasks.js";
import { createBiomeScene, prepareBiomeScene } from "./biome-scenes.js";
import { createBowlModel } from "./care-model.js";
import { bowlPortions } from "./care-system.js";
import { encounterKind } from "./social-system.js";
import { socialFrame, socialDuration } from "./social-animation.js";
import { constructionModel } from "./advanced-assets.js";
import {
  primitive,
  material,
  ball,
  box,
  rod,
  glowOrb,
  makeAttraction,
  animateAttraction,
} from "./world-assets.js";
export function createWorld(container, initialGame, callbacks = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileRender =
    container.clientWidth < 700 || matchMedia("(pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0xb5bfdc);
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Сказочный мир Чичи: 24 биома, коты и аттракционы",
  );
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc0bfd7, 0.0035);
  // The closest allowed orbit is 21 units. A less extreme near/far ratio gives
  // small ground decorations more depth precision without clipping that orbit.
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 1200);
  const look = new THREE.Vector3(0, 0, 0),
    desiredLook = look.clone();
  let azimuth = 0.72,
    distance = 37,
    desiredDistance = 37,
    elevation = 0.67;
  scene.add(new THREE.HemisphereLight(0xffe9db, 0x8b9e85, 1.2));
  const sun = new THREE.DirectionalLight(0xffd8b7, 2.2);
  sun.position.set(-14, 35, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -17,
    right: 17,
    top: 17,
    bottom: -17,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);
  const rimLight = new THREE.DirectionalLight(0xb8b7ec, 0.9);
  rimLight.position.set(20, 16, -30);
  scene.add(rimLight);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(520, 24, 14),
    new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(0x788ab9) },
        bottom: { value: new THREE.Color(0xb2b8d5) },
      },
      vertexShader:
        "varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader:
        "uniform vec3 top;uniform vec3 bottom;varying vec3 direction;void main(){float h=normalize(direction).y;vec3 c=mix(bottom,top,smoothstep(-.12,.75,h));gl_FragColor=vec4(c,1.0);#include <colorspace_fragment>}",
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sky.material.fragmentShader = sky.material.fragmentShader.replace(
    "#include",
    "\n#include",
  );
  scene.add(sky);
  const cloudGeometry = new THREE.SphereGeometry(1, 12, 8),
    cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4edf5,
      roughness: 1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
  const clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 72),
    cloudDummy = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const a = i * 2.399,
      r = 16 + (i % 9) * 14;
    cloudDummy.position.set(
      Math.cos(a) * r,
      -12 - (i % 6) * 2,
      Math.sin(a) * r,
    );
    cloudDummy.scale.set(5 + (i % 3) * 2, 1.7, 3.5 + (i % 4));
    cloudDummy.updateMatrix();
    clouds.setMatrixAt(i, cloudDummy.matrix);
  }
  scene.add(clouds);

  const moon = glowOrb(scene, 0xffe7ce, -25, 28, -55, 4);
  const moonRing = primitive(
    scene,
    new THREE.TorusGeometry(5, 0.045, 6, 60),
    0xe5cbd4,
    -25,
    28,
    -55,
    0.7,
  );
  moonRing.rotation.x = 0.25;
  const starPositions = [];
  for (let i = 0; i < 320; i++) {
    const a = i * 2.399,
      r = 60 + (i % 7) * 5;
    starPositions.push(Math.cos(a) * r, 10 + ((i * 17) % 47), Math.sin(a) * r);
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3),
  );
  scene.add(
    new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({
        color: 0xf4dbbf,
        size: 0.14,
        transparent: true,
        opacity: 0.8,
      }),
    ),
  );
  const royalStarGeo = new THREE.BufferGeometry(),
    royalCenter = byBiome("aquapark").center,
    royalStarsPositions = [];
  for (let i = 0; i < 420; i++) {
    const a = i * 2.399,
      r = 38 + (i % 11) * 9;
    royalStarsPositions.push(
      royalCenter[0] + Math.cos(a) * r,
      -8 + (i % 17) * 5,
      royalCenter[1] + Math.sin(a) * r,
    );
  }
  royalStarGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(royalStarsPositions, 3),
  );
  const royalStars = new THREE.Points(
    royalStarGeo,
    new THREE.PointsMaterial({
      color: 0xffecd0,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    }),
  );
  royalStars.visible = false;
  scene.add(royalStars);
  const islands = new Map(),
    itemGroups = new Map(),
    npcs = new Map();
  const mealVisits = new Map(),
    swimVisits = new Map();
  const islandContentKeys = new Map();
  const hudPoint = new THREE.Vector3();
  const socialGlow = new THREE.Group();
  scene.add(socialGlow);
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.12);
  heartShape.bezierCurveTo(-0.35, 0.5, -0.55, 0.12, 0, -0.32);
  heartShape.bezierCurveTo(0.55, 0.12, 0.35, 0.5, 0, 0.12);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.08,
      bevelEnabled: false,
      curveSegments: 5,
    }),
    heartMaterial = new THREE.MeshBasicMaterial({ color: 0xe5b5cc });
  for (let i = 0; i < 4; i++) {
    const heart = new THREE.Mesh(heartGeo, heartMaterial);
    heart.scale.setScalar(0.25);
    socialGlow.add(heart);
  }
  socialGlow.visible = false;
  const npcMarkers = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.23, 8, 5),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      NEIGHBORS.length,
    ),
    npcDummy = new THREE.Object3D();
  npcMarkers.frustumCulled = false;
  for (let i = 0; i < NEIGHBORS.length; i++) {
    npcMarkers.setColorAt(i, new THREE.Color(NEIGHBORS[i].color));
    npcDummy.scale.setScalar(0);
    npcDummy.updateMatrix();
    npcMarkers.setMatrixAt(i, npcDummy.matrix);
  }
  scene.add(npcMarkers);
  let game = initialGame,
    sceneKey = "",
    focused = "moon",
    viewingOverview = false,
    buildMode = null,
    preview = null,
    operation = null,
    disposed = false;
  const chichiCarrier = new THREE.Group();
  chichiCarrier.position.set(-6, 0.14, -3);
  if (initialGame.catPosition) {
    const saved = initialGame.catPosition,
      p =
        saved.biome === "summer"
          ? { ...saved, ...capybaraDryPoint(saved.x, saved.z) }
          : saved,
      b = byBiome(p.biome);
    if (b)
      chichiCarrier.position.set(
        b.center[0] + p.x,
        0.16 + islandHeight(b.id, p.x, p.z),
        b.center[1] + p.z,
      );
  }
  let heroGather = null,
    gatherUntil = 0;
  const incomeButtons = new Map(),
    projectBadges = new Map();
  let incomeSecond = -1;
  const incomeCache = new Map();
  let cat = createCat(initialGame.cat.mood);
  chichiCarrier.add(cat);
  scene.add(chichiCarrier);
  const faceCamera = createChichiCamera(camera, cat.userData.head, {
    reduced,
    onChange: (enabled) => callbacks.onCameraMode?.(enabled),
  });
  const chillBiome = byBiome("sakura");
  let chillObstacles = [];
  const chillLocal = (p) => ({
    x: p.x - chillBiome.center[0],
    z: p.z - chillBiome.center[1],
    y: p.y,
  });
  const spaBiome = byBiome("water"),
    spaCups = new Map();
  let spaObstacles = [];
  const spaLocal = (p) => ({
    x: p.x - spaBiome.center[0],
    z: p.z - spaBiome.center[1],
    y: p.y,
  });
  const spaRadius = (model) =>
    Math.max(
      0.48,
      model.userData.body.scale.x *
        model.scale.x *
        (model.userData.appearance?.width || 1) +
        0.16,
    );
  const spa = createSpaRuntime({
    reduced,
    getObstacles: () => spaObstacles,
    onComplete: (receipt) => {
      const carrier =
        receipt.catId === "chichi"
          ? chichiCarrier
          : npcs.get(receipt.catId)?.carrier;
      if (carrier)
        carrier.position.set(
          spaBiome.center[0] + receipt.position.x,
          0.16,
          spaBiome.center[1] + receipt.position.z,
        );
      if (receipt.catId === "chichi" && operation?.spa)
        operation.spaCompleted = receipt;
      else {
        const resident = npcs.get(receipt.catId),
          manual = resident?.manualWellnessId === receipt.id;
        if (resident) resident.manualWellnessId = null;
        callbacks.onSpaVisit?.({
          ...receipt,
          ...(manual ? { manual: true } : {}),
        });
      }
    },
  });
  const chill = createChillRuntime({
    reduced,
    getObstacles: () => chillObstacles,
    onComplete: (receipt) => {
      const carrier =
        receipt.catId === "chichi"
          ? chichiCarrier
          : npcs.get(receipt.catId)?.carrier;
      if (carrier)
        carrier.position.set(
          chillBiome.center[0] + receipt.position.x,
          0.16,
          chillBiome.center[1] + receipt.position.z,
        );
      if (receipt.catId === "chichi" && operation?.chill)
        operation.spaCompleted = receipt;
      else {
        const resident = npcs.get(receipt.catId),
          manual = resident?.manualWellnessId === receipt.id;
        if (resident) resident.manualWellnessId = null;
        callbacks.onSpaVisit?.({
          ...receipt,
          ...(manual ? { manual: true } : {}),
        });
      }
    },
  });
  function startHeroChill(op) {
    op.stage = "chill";
    const object = chillObject(op.decision.activityId),
      local = chillLocal(chichiCarrier.position),
      dry = nearestChillGround(
        chillWalkable(local, spaRadius(cat), chillObstacles)
          ? local
          : chillEntrance(object),
        spaRadius(cat),
        chillObstacles,
      );
    if (!dry) {
      op.spaFailed = true;
      return;
    }
    const v = chill.start({
      catId: "chichi",
      objectId: object.id,
      position: dry,
      radius: spaRadius(cat),
    });
    if (!v) {
      op.spaFailed = true;
      callbacks.onReaction?.(
        "Зараз тут зайнято. Оберімо іншу лежанку або ванну.",
      );
    }
  }
  function startHeroSpa(op) {
    op.stage = "spa";
    const local = spaLocal(chichiCarrier.position),
      groundPoint = nearestSpaGround(
        spaWalkable(local, spaRadius(cat), spaObstacles)
          ? local
          : SPA_ENTRANCES[op.decision.activityId],
        spaRadius(cat),
        spaObstacles,
      );
    if (!groundPoint) {
      op.spaFailed = true;
      return;
    }
    // A manual drop may put Chichi inside the basin: approach via its steps.
    if (!spaWalkable(local, spaRadius(cat), spaObstacles)) {
      chichiCarrier.position.set(
        spaBiome.center[0] + groundPoint.x,
        0.16,
        spaBiome.center[1] + groundPoint.z,
      );
    }
    const v = spa.start({
      catId: "chichi",
      objectId: op.decision.activityId,
      position: groundPoint,
      radius: spaRadius(cat),
      drinkId: game.spa?.selectedDrink,
    });
    if (!v) {
      op.spaFailed = true;
      callbacks.onReaction?.(
        "Усі місця зараз зайняті. Спробуймо трохи пізніше.",
      );
    }
    op.stage = "spa";
  }
  const ambient = new THREE.Group();
  scene.add(ambient);
  const motes = [];
  for (let i = 0; i < 55; i++) {
    const mote = glowOrb(
      ambient,
      [0xebcda1, 0xc8b5ed, 0x99d6c4][i % 3],
      Math.sin(i * 2.4) * 10,
      0.5 + (i % 6) * 0.25,
      Math.cos(i * 2.4) * 10,
      0.025,
    );
    motes.push(mote);
  }
  const detailQueue = new Set();
  let detailTimer = null;
  function showWhalePreview(island, id) {
    if (island.userData.renewal?.hero === "whale")
      for (const whale of island.userData.renewal.flyers)
        whale.visible = !game.unlocked.includes(id);
  }
  function makeIsland(biome) {
    const placements = game.placements.filter((p) => p.biome === biome.id),
      scenery = game.scenery?.filter((r) => r.biome === biome.id);
    const g = createBiomeScene(biome, {
      lowOnly: biome.id !== "moon",
      placements,
      scenery,
    });
    showWhalePreview(g, biome.id);
    islandContentKeys.set(biome.id, JSON.stringify([placements, scenery]));
    g.position.set(biome.center[0], 0, biome.center[1]);
    scene.add(g);
    islands.set(biome.id, g);
    return g;
  }
  const islandRefreshes = new Map();
  const detailJobs = new Map(),
    scenePreparation = createSceneScheduler({
      getPriority: () => focused,
      canRun: () =>
        disposed ||
        (!document.hidden && !document.querySelector("dialog[open]")),
    });
  async function sceneTurn() {
    await yieldSceneTask();
    while (!disposed && document.querySelector("dialog[open]"))
      await new Promise((resolve) => setTimeout(resolve, 100));
  }
  async function refreshIsland(island, placements, scenery) {
    if (island.userData.placementSteps)
      await prepareSceneSteps(
        island.userData.placementSteps(placements, scenery),
        { yieldTask: sceneTurn, budget: 3 },
      );
    else island.userData.updatePlacements?.(placements, scenery);
  }
  function ensureDetail(id) {
    if (!islands.get(id)?.userData.lowOnly || disposed || detailJobs.has(id))
      return;
    detailQueue.add(id);
    if (detailTimer) return;
    const pumpDetails = () => {
      detailTimer = null;
      if (disposed || !detailQueue.size) return;
      if (document.querySelector("dialog[open]")) {
        detailTimer = setTimeout(pumpDetails, 150);
        return;
      }
      const next = [...detailQueue].sort(
        (a, b) => Number(b === focused) - Number(a === focused),
      );
      for (const id of next) {
        if (detailJobs.has(id)) {
          detailQueue.delete(id);
          continue;
        }
        if (detailJobs.size >= 2 && id !== focused) continue;
        detailQueue.delete(id);
        const job = upgrade(id);
        detailJobs.set(id, job);
        job.finally(() => {
          detailJobs.delete(id);
          if (!disposed && detailQueue.size && !detailTimer)
            detailTimer = setTimeout(pumpDetails, 0);
        });
      }
    };
    const upgrade = async (id) => {
      const old = islands.get(id),
        b = byBiome(id);
      try {
        if (
          old?.userData.lowOnly &&
          desiredDistance < Math.max(110, (b.radius || 12) * 7) &&
          Math.hypot(b.center[0] - desiredLook.x, b.center[1] - desiredLook.z) <
            40
        ) {
          const snapshot = () => [
            game.placements.filter((p) => p.biome === id),
            game.scenery?.filter((r) => r.biome === id),
          ];
          let content = snapshot();
          const g = await prepareBiomeScene(
            b,
            {
              placements: content[0],
              scenery: content[1],
            },
            { scheduler: scenePreparation, priority: id },
          );
          if (disposed) {
            g.userData.dispose?.();
            return;
          }
          // Edits/sync can arrive while geometry is being prepared; never install
          // an older placement snapshot over the user's latest changes.
          let latest = snapshot();
          showWhalePreview(g, id);
          g.position.copy(old.position);
          g.updateMatrixWorld(true);
          // Compile against the real scene lighting while the old island remains
          // usable. Parallel shader compilation avoids the first-visit hitch.
          await sceneTurn();
          if (!disposed) await renderer.compileAsync(g, camera, scene);
          if (disposed) {
            g.userData.dispose?.();
            return;
          }
          latest = snapshot();
          while (JSON.stringify(content) !== JSON.stringify(latest)) {
            await refreshIsland(g, ...latest);
            content = latest;
            latest = snapshot();
          }
          if (disposed) {
            g.userData.dispose?.();
            return;
          }
          scene.remove(old);
          scene.add(g);
          islands.set(id, g);
          islandContentKeys.set(id, JSON.stringify(latest));
          const pendingRefresh = islandRefreshes.get(id);
          if (pendingRefresh)
            pendingRefresh
              .finally(() => old.userData.dispose?.())
              .catch(() => {});
          else old.userData.dispose?.();
        }
      } catch (error) {
        console.warn("Island detail could not be prepared", id, error);
      }
    };
    detailTimer = setTimeout(pumpDetails, 0);
  }
  for (const biome of BIOMES) makeIsland(biome);
  function sceneryGroups() {
    return [...islands.values()]
      .filter((island) => island.userData.detail.visible)
      .flatMap((island) => [...island.userData.sceneryObjects.values()]);
  }
  // Connect nearby shores instead of drawing long roads across other islands.
  const constructionBridges = [];
  const connected = new Set(["moon"]);
  while (connected.size < BIOMES.length) {
    let link;
    for (const from of BIOMES.filter((b) => connected.has(b.id)))
      for (const to of BIOMES.filter((b) => !connected.has(b.id))) {
        const length = Math.hypot(
          from.center[0] - to.center[0],
          from.center[1] - to.center[1],
        );
        if (!link || length < link.length) link = { from, to, length };
      }
    connected.add(link.to.id);
    const from = new THREE.Vector3(
        link.from.center[0],
        0.18,
        link.from.center[1],
      ),
      to = new THREE.Vector3(link.to.center[0], 0.18, link.to.center[1]),
      direction = to.clone().sub(from).normalize(),
      side = new THREE.Vector3(direction.z, 0, -direction.x);
    // Enter the uneven shore slightly so the longer bridge still lands on soil.
    from.addScaledVector(direction, (link.from.radius || 11.65) - 0.7);
    to.addScaledVector(direction, -((link.to.radius || 11.65) - 0.7));
    constructionBridges.push({
      from: link.from.id,
      to: link.to.id,
      start: { x: from.x, y: 0.18, z: from.z },
      end: { x: to.x, y: 0.18, z: to.z },
    });
    const middle = from.clone().add(to).multiplyScalar(0.5);
    const bridge = box(
      scene,
      0xc6aa85,
      middle.x,
      0.14,
      middle.z,
      1.1,
      0.12,
      from.distanceTo(to),
    );
    bridge.rotation.y = Math.atan2(direction.x, direction.z);
    for (const sign of [-1, 1]) {
      const a = from.clone().addScaledVector(side, sign * 0.52),
        c = to.clone().addScaledVector(side, sign * 0.52),
        b = a.clone().add(c).multiplyScalar(0.5);
      a.y = c.y = 0.7;
      b.y = 0.48;
      const rope = new THREE.CatmullRomCurve3([a, b, c]);
      primitive(
        scene,
        new THREE.TubeGeometry(rope, 12, 0.045, 5, false),
        0xe0c6a4,
      );
    }
  }
  let buildingSites = [],
    builderObstacles = new Map();
  const crew = createConstructionCrew({
    bridges: constructionBridges,
    getSites: () => buildingSites,
    getObstacles: (id) => builderObstacles.get(id) || [],
  });
  const residentPlay = createResidentPlay({
    getCat: (id) => npcs.get(id),
    getObject: (id) => itemGroups.get(id),
    groundY: (point, biome) => {
      const b = byBiome(biome);
      return b
        ? 0.16 +
            islandHeight(biome, point.x - b.center[0], point.z - b.center[1])
        : 0.16;
    },
    disturb: (g, f, time) => {
      const lagoon =
        g.userData.lagoon ||
        islands
          .get(g.userData.placement?.biome)
          ?.userData.lagoons?.get(g.userData.placementId);
      lagoon?.userData.disturb?.(f.x, f.z, time, 0.4);
    },
    onComplete: (id, decision) => callbacks.onResidentAction?.(id, decision),
  });
  function cancelResident(id) {
    const actor = npcs.get(id);
    if (actor) actor.manualWellnessId = null;
    const greeting = residentPlay.friendVisit(id);
    if (greeting) residentPlay.cancel(greeting.id);
    residentPlay.cancel(id);
    spa.cancel(id);
    chill.cancel(id);
    crew.cancel(id);
    mealVisits.delete(id);
    swimVisits.delete(id);
  }
  function performResident(id, decision) {
    const n = npcs.get(id),
      object = itemGroups.get(decision.activityId);
    if (
      !n ||
      (decision.activityId &&
        (!object?.userData.built ||
          (operation?.decision.activityId === decision.activityId &&
            !chillObject(decision.activityId) &&
            !spaObject(decision.activityId))))
    )
      return false;
    cancelResident(id);
    n.manualAnchor = null;
    n.manualUntil = performance.now() + 90000;
    const cozy = chillObject(decision.activityId),
      wellness = spaObject(decision.activityId);
    if (cozy || wellness) {
      const local = cozy
          ? chillLocal(n.carrier.position)
          : spaLocal(n.carrier.position),
        radius = spaRadius(n.model),
        origin = cozy
          ? nearestChillGround(
              chillWalkable(local, radius, chillObstacles)
                ? local
                : chillEntrance(cozy),
              radius,
              chillObstacles,
            )
          : nearestSpaGround(
              spaWalkable(local, radius, spaObstacles)
                ? local
                : SPA_ENTRANCES[wellness.id],
              radius,
              spaObstacles,
            ),
        runtime = cozy ? chill : spa;
      const visit =
        origin &&
        runtime.start({
          catId: id,
          objectId: decision.activityId,
          position: origin,
          radius,
          drinkId: game.spa?.selectedDrink,
        });
      if (visit) n.manualWellnessId = visit.id;
      return !!visit;
    }
    if (decision.friendId) cancelResident(decision.friendId);
    return residentPlay.start(id, decision);
  }
  const builderHammers = new Map();
  function builderHammer(id, model, frame) {
    let hammer = builderHammers.get(id);
    if (!hammer && frame) {
      hammer = attachBuilderHammer(model);
      if (hammer) builderHammers.set(id, hammer);
    }
    if (hammer) {
      hammer.visible = !!frame;
      if (frame) hammer.rotation.x = reduced ? 0 : frame.hammerAngle;
    }
  }
  function sync(next) {
    game = next;
    incomeSecond = -1;
    for (const [id, button] of incomeButtons)
      if (!businessVenues(game).some((p) => p.id === id)) {
        button.remove();
        incomeButtons.delete(id);
      }
    itemGroups.get("chichi-food")?.userData.updateFood?.(game);
    if (!operation && game.care?.resting) {
      const bed = itemGroups.get(game.care.resting.activityId);
      if (bed) {
        chichiCarrier.position
          .copy(bed.position)
          .add(new THREE.Vector3(0, 0.25, 0));
        if (cat.userData.mood !== "sleep")
          setCatMood(cat, "sleep", { immediate: reduced });
      }
    } else if (!operation && cat.userData.mood !== game.cat.mood)
      setCatMood(cat, game.cat.mood, { immediate: reduced });
    if (
      operation &&
      ![...HOME_OBJECTS, ...islandObjects(game)].some(
        (o) => o.id === operation.decision.activityId,
      )
    ) {
      const id = operation.decision.activityId;
      if (id && !game.placements.some((p) => p.id === id && isBuilt(p))) {
        const old = operation;
        chichiCarrier.position.copy(old.destination);
        chichiCarrier.position.y = 0.16;
        resetYarn(old.attraction);
        operation = null;
        callbacks.onReaction?.(
          "Предмет убрали. Выберите новое занятие для Чичи.",
        );
        old.resolve({ cancelled: true });
      }
    }
    const key = JSON.stringify([
      game.unlocked,
      game.adoption,
      game.catDestinations,
      game.business?.levels,
      game.placements,
      game.scenery,
      game.placements.map((p) => isBuilt(p)),
      islandObjects(game, { includeBuilding: true }).map((o) => [
        o.id,
        o.readyAt || 0,
        isBuilt(o),
      ]),
      Object.entries(game.farm?.fields || {}).map(([id, cells]) => [
        id,
        cells.map((c) => [c.crop, c.readyAt, Date.now() >= c.readyAt]),
      ]),
    ]);
    if (key === sceneKey) return;
    sceneKey = key;
    spaObstacles = [
      ...game.placements
        .filter((p) => p.biome === "water")
        .map((p) => {
          const f = byItem(p.item).footprint;
          return {
            x: p.x,
            z: p.z,
            w: f[p.rotation % 2 ? 1 : 0],
            d: f[p.rotation % 2 ? 0 : 1],
          };
        }),
      ...game.scenery
        .filter((r) => r.biome === "water" && !r.stored)
        .map((r) => {
          const f = sceneryFootprint(r);
          return {
            x: r.x,
            z: r.z,
            ...(byScenery(r.type).category === "tree"
              ? { radius: 0.45 * (r.scale || 1) }
              : { w: f[0], d: f[1] }),
          };
        }),
    ];
    builderObstacles = new Map(
      BIOMES.map((b) => [
        b.id,
        [
          ...biomeReservations(b.id),
          ...game.placements
            .filter((p) => p.biome === b.id)
            .map((p) => {
              const f = byItem(p.item).footprint;
              return {
                x: p.x,
                z: p.z,
                w: f[p.rotation % 2 ? 1 : 0],
                d: f[p.rotation % 2 ? 0 : 1],
              };
            }),
          ...game.scenery
            .filter((r) => r.biome === b.id && !r.stored)
            .map((r) => {
              const f = sceneryFootprint(r);
              return {
                x: r.x,
                z: r.z,
                ...(byScenery(r.type).category === "tree"
                  ? { radius: 0.45 * (r.scale || 1) }
                  : { w: f[0], d: f[1] }),
              };
            }),
        ],
      ]),
    );
    chillObstacles = [
      ...game.placements
        .filter((p) => p.biome === "sakura")
        .map((p) => {
          const f = byItem(p.item).footprint;
          return {
            x: p.x,
            z: p.z,
            w: f[p.rotation % 2 ? 1 : 0],
            d: f[p.rotation % 2 ? 0 : 1],
          };
        }),
      ...game.scenery
        .filter((r) => r.biome === "sakura" && !r.stored)
        .map((r) => {
          const f = sceneryFootprint(r);
          return {
            x: r.x,
            z: r.z,
            ...(byScenery(r.type).category === "tree"
              ? { radius: 0.45 * (r.scale || 1) }
              : { w: f[0], d: f[1] }),
          };
        }),
    ];
    for (const [id, island] of islands) showWhalePreview(island, id);
    // Keep unchanged vegetation and scenery buffers when income, adoption or
    // herd destinations change. Only an edited island needs new geometry.
    for (const [id, island] of islands) {
      const placements = game.placements.filter((p) => p.biome === id),
        scenery = game.scenery?.filter((r) => r.biome === id),
        contentKey = JSON.stringify([placements, scenery]);
      if (islandContentKeys.get(id) === contentKey) continue;
      const refresh = queueSceneRefresh(islandRefreshes, id, () =>
        disposed ? undefined : refreshIsland(island, placements, scenery),
      );
      refresh.catch((error) => {
        if (islandRefreshes.get(id) === refresh) {
          islandContentKeys.delete(id);
          sceneKey = "";
        }
        console.warn("Island scenery refresh failed", id, error);
      });
      islandContentKeys.set(id, contentKey);
    }
    for (const o of islandObjects(game, { includeBuilding: true })) {
      const built = isBuilt(o),
        existing = itemGroups.get(o.id);
      if (
        existing &&
        existing.userData.built === built &&
        existing.userData.placement.readyAt === o.readyAt
      )
        continue;
      if (existing) {
        scene.remove(existing);
        disposeScenery(existing);
        itemGroups.delete(o.id);
      }
      let g;
      if (chillObject(o.id)?.kind === "bed") {
        g = new THREE.Group();
        const proxy = new THREE.Mesh(
          new THREE.BoxGeometry(...[o.footprint[0], 0.8, o.footprint[1]]),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            colorWrite: false,
          }),
        );
        proxy.position.y = 0.65;
        g.add(proxy);
        g.userData = { id: "bed", duration: 24 };
      } else if (o.type === "swim-lagoon") {
        g = new THREE.Group();
        const proxy = new THREE.Mesh(
          new THREE.CircleGeometry(1, 48),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            colorWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        proxy.rotation.x = -Math.PI / 2;
        proxy.scale.set(o.rx, o.rz, 1);
        g.add(proxy);
        g.userData = {
          id: o.type,
          swimBounds: { rx: o.rx, rz: o.rz },
          shoreHeight: o.shoreY ?? 0.16,
          duration: 12,
        };
      } else if (o.id === "spa-lounge") g = spaLounge();
      else if (o.id === "spa-bar") g = spaBar();
      else if (o.id === "spa-jacuzzi") {
        g = new THREE.Group();
        const proxy = new THREE.Mesh(
          new THREE.CylinderGeometry(3.35, 3.35, 0.65, 40),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            colorWrite: false,
          }),
        );
        g.add(proxy);
        g.userData = { id: "bed", spa: true, duration: 24 };
      } else g = built ? makeAttraction(o.type) : islandProjectModel(o.type);
      if (o.scale) g.scale.setScalar(o.scale);
      if (o.dismount) g.userData.dismount = o.dismount;
      const b = byBiome(o.biome);
      g.position.set(
        b.center[0] + o.x,
        o.type === "swim-lagoon"
          ? o.surfaceY
          : 0.16 + islandHeight(o.biome, o.x, o.z),
        b.center[1] + o.z,
      );
      g.userData.placement = {
        id: o.id,
        item: o.type,
        biome: o.biome,
        x: o.x,
        z: o.z,
        rotation: 0,
        ...(o.footprint ? { footprint: o.footprint } : {}),
        ...(o.readyAt ? { readyAt: o.readyAt, startedAt: o.startedAt } : {}),
      };
      g.userData.placementId = o.id;
      g.userData.homeObject = true;
      g.userData.built = built;
      g.userData.permanent = true;
      scene.add(g);
      itemGroups.set(o.id, g);
    }
    for (const [id, g] of itemGroups) {
      if (g.userData.homeObject) continue;
      const retained = game.placements.find((p) => p.id === id);
      if (
        retained &&
        JSON.stringify(retained) === JSON.stringify(g.userData.placement) &&
        isBuilt(retained) === g.userData.built &&
        JSON.stringify(
          (game.farm?.fields?.[id] || []).map((c) => [
            c.crop,
            c.readyAt,
            Date.now() >= c.readyAt,
          ]),
        ) === g.userData.fieldKey
      )
        continue;
      scene.remove(g);
      disposeScenery(g);
      itemGroups.delete(id);
    }
    for (const placement of game.placements) {
      if (itemGroups.has(placement.id)) continue;
      const built = isBuilt(placement);
      const g = built
          ? makeAttraction(placement.item, game.farm?.fields?.[placement.id])
          : constructionModel(placement.item),
        b = byBiome(placement.biome);
      g.position.set(
        b.center[0] + placement.x,
        0.16 + islandHeight(placement.biome, placement.x, placement.z),
        b.center[1] + placement.z,
      );
      g.rotation.y = (placement.rotation * Math.PI) / 2;
      g.userData.placement = placement;
      g.userData.built = built;
      g.userData.fieldKey = JSON.stringify(
        (game.farm?.fields?.[placement.id] || []).map((c) => [
          c.crop,
          c.readyAt,
          Date.now() >= c.readyAt,
        ]),
      );
      g.userData.placementId = placement.id;
      scene.add(g);
      itemGroups.set(placement.id, g);
    }
    for (const p of businessVenues(game)) {
      const g = itemGroups.get(p.id);
      if (g?.userData.built)
        decorateBusiness(g, p.item, businessLevel(game, p.id));
    }
    if (operation?.decision.activityId && !operation.spa) {
      operation.attraction = itemGroups.get(operation.decision.activityId);
      operation.destination
        .copy(operation.attraction.position)
        .add(new THREE.Vector3(0, 0, 0.8));
    }
    for (const profile of activeCats(game)) {
      const venue = profile.homeVenueId && itemGroups.get(profile.homeVenueId),
        littleGuest = venue?.userData.guests?.[0];
      if (npcs.has(profile.id)) {
        npcs.get(profile.id).profile = profile;
        if (littleGuest && littleGuest.parent === venue)
          littleGuest.visible = false;
        continue;
      }
      const carrier = new THREE.Group(),
        model =
          littleGuest ||
          createCat("happy", {
            detail: "npc",
            ...catAppearance(profile),
          });
      model.scale.setScalar(0.63 * (profile.size || 1));
      // Move the exact existing tiny model into the normal actor rig. The
      // cook and second visitor stay at the counter; no duplicate mesh is drawn.
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.visible = true;
      carrier.add(model);
      let hatRig;
      if (profile.hat) {
        hatRig = new THREE.Group();
        carrier.add(hatRig);
        const hat = primitive(
          hatRig,
          new THREE.ConeGeometry(0.33, 0.65, 8),
          0x6f638b,
          0,
          1.57,
          0.2,
        );
        primitive(
          hatRig,
          new THREE.CylinderGeometry(0.48, 0.48, 0.04, 18),
          0x6f638b,
          0,
          1.3,
          0.2,
        );
        hat.rotation.z = 0.15;
      }
      const index = NEIGHBORS.findIndex((n) => n.id === profile.id),
        b = byBiome(profile.biome),
        wanderRadius = b.arrival ? 11.8 : 6;
      carrier.position.set(
        b.center[0] + Math.sin(index * 2.4) * wanderRadius,
        0.16,
        b.center[1] + Math.cos(index * 2.4) * wanderRadius,
      );
      if (profile.venueHome && venue) {
        carrier.position.copy(
          venue.localToWorld(new THREE.Vector3(1.65, 0, 1.9)),
        );
        carrier.position.y = venue.position.y;
      }
      if (b.id === "water") {
        const dry = nearestSpaGround(
          spaLocal(carrier.position),
          spaRadius(model),
          spaObstacles,
        );
        if (dry)
          carrier.position.set(b.center[0] + dry.x, 0.16, b.center[1] + dry.z);
      }
      if (b.id === "sakura") {
        const dry = nearestChillGround(
          chillLocal(carrier.position),
          spaRadius(model),
          chillObstacles,
        );
        if (dry)
          carrier.position.set(b.center[0] + dry.x, 0.16, b.center[1] + dry.z);
      }
      scene.add(carrier);
      npcs.set(profile.id, { carrier, model, profile, index, hatRig });
    }
    const activeIds = new Set(activeCats(game).map((c) => c.id));
    for (const [id, n] of npcs)
      if (!activeIds.has(id)) {
        spa.cancel(id);
        crew.cancel(id);
        builderHammers.get(id)?.removeFromParent();
        builderHammers.delete(id);
        chill.cancel(id);
        residentPlay.cancel(id);
        scene.remove(n.carrier);
        disposeCat(n.model);
        npcs.delete(id);
        npcDummy.scale.setScalar(0);
        npcDummy.updateMatrix();
        npcMarkers.setMatrixAt(n.index, npcDummy.matrix);
      }
  }
  for (const object of HOME_OBJECTS) {
    const g =
        object.id === "chichi-food"
          ? createBowlModel()
          : makeAttraction(object.type),
      p = objectPosition(object);
    g.position.set(p.x, 0.16, p.z);
    g.userData.placement = { ...object, item: object.type, rotation: 0 };
    g.userData.placementId = object.id;
    g.userData.built = true;
    g.userData.homeObject = true;
    scene.add(g);
    itemGroups.set(object.id, g);
  }
  sync(initialGame);
  function focus(id, overview = false, keepFollow = false) {
    if (!keepFollow) faceCamera.setEnabled(false, look);
    const b = byBiome(id) || byBiome("moon");
    focused = b.id;
    viewingOverview = overview;
    const enchanted =
      !!RENEWED_ISLANDS[b.id] || b.legendary || b.id === "sakura";
    sky.material.uniforms.top.value.set(
      b.id === "sakura"
        ? 0xbba4d4
        : b.legendary || b.id === "aquapark"
          ? 0x010914
          : enchanted
            ? 0x172749
            : 0x788ab9,
    );
    sky.material.uniforms.bottom.value.set(
      b.id === "sakura"
        ? 0xf5cdba
        : b.legendary || b.id === "aquapark"
          ? 0x153054
          : enchanted
            ? 0x697da9
            : 0xb2b8d5,
    );
    royalStars.visible = b.id === "aquapark" || enchanted;
    royalStars.position.set(
      enchanted ? b.center[0] - royalCenter[0] : 0,
      0,
      enchanted ? b.center[1] - royalCenter[1] : 0,
    );
    scene.fog.color.set(
      b.legendary || b.id === "aquapark" ? 0x162f52 : 0xc0bfd7,
    );
    desiredLook.set(b.center[0], 0, overview ? 0 : b.center[1]);
    desiredDistance = b.radius
      ? mobileRender
        ? b.radius > 18
          ? 85
          : 65
        : 57
      : 37;
    if (mobileRender && (b.legendary || b.id === "water"))
      desiredDistance = Math.max(
        desiredDistance,
        (b.radius * 1.08) /
          (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
            Math.min(1, camera.aspect)),
      );
    if (overview) {
      const view = camera.clone();
      for (let fit = 150; fit <= 600; fit += 5) {
        view.position.set(
          Math.sin(azimuth) * Math.cos(elevation) * fit,
          Math.sin(elevation) * fit,
          Math.cos(azimuth) * Math.cos(elevation) * fit,
        );
        view.lookAt(desiredLook);
        view.updateMatrixWorld();
        desiredDistance = fit;
        if (
          BIOMES.every((island) =>
            [-(island.radius || 12), island.radius || 12].every((dx) =>
              [-(island.radius || 12), island.radius || 12].every((dz) => {
                const p = new THREE.Vector3(
                  island.center[0] + dx,
                  0,
                  island.center[1] + dz,
                ).project(view);
                return Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.8;
              }),
            ),
          )
        )
          break;
      }
    }
    ensureDetail(b.id);
    callbacks.onFocus?.(b.id, overview);
  }
  function switchMood(mood) {
    if (cat.userData.mood === mood) return;
    setCatMood(cat, mood, { immediate: reduced });
  }
  function choiceExpression(decision) {
    if (!reduced && decision.mood === "happy")
      emoteCat(
        cat,
        decision.action === "meet"
          ? "affectionate"
          : decision.action === "ride" || decision.action === "eat"
            ? "delighted"
            : "curious",
      );
  }
  function perform(decision) {
    heroGather = null;
    socialGlow.visible = false;
    sync(game);
    if (operation) {
      spa.cancel("chichi");
      crew.cancel("chichi");
      chill.cancel("chichi");
      resetYarn(operation.attraction);
      if (operation.attraction) {
        operation.attraction.userData.playing = false;
        delete operation.attraction.userData.heroPlayPos;
      }
      operation.resolve({ cancelled: true });
      operation = null;
    }
    switchMood(decision.mood);
    choiceExpression(decision);
    if (decision.activityId)
      for (const [id, v] of residentPlay.visits)
        if (v.decision.activityId === decision.activityId)
          residentPlay.cancel(id);
    const attraction = decision.activityId
      ? itemGroups.get(decision.activityId)
      : null;
    const neighbor = decision.friendId ? npcs.get(decision.friendId) : null;
    if (neighbor) {
      const cv = chill.get(decision.friendId);
      if (cv) {
        neighbor.carrier.position.set(
          chillBiome.center[0] + cv.entrance.x,
          0.16,
          chillBiome.center[1] + cv.entrance.z,
        );
        chill.cancel(decision.friendId);
      }
      const visit = spa.get(decision.friendId);
      if (visit) {
        const dry = nearestSpaGround(
          SPA_ENTRANCES[visit.objectId],
          visit.radius,
          spaObstacles,
        );
        if (dry)
          neighbor.carrier.position.set(
            spaBiome.center[0] + dry.x,
            0.16,
            spaBiome.center[1] + dry.z,
          );
      }
      spa.cancel(decision.friendId);
    }
    const interruptedSwim = swimVisits.get(decision.friendId);
    if (neighbor && interruptedSwim) {
      const lake = interruptedSwim.lake,
        bounds = lake.userData.swimBounds || { rx: 1.7 };
      neighbor.carrier.position.copy(
        lake.localToWorld(new THREE.Vector3(bounds.rx + 0.5, 0, 0)),
      );
      neighbor.carrier.position.y = lake.userData.shoreHeight ?? 0.16;
      swimVisits.delete(decision.friendId);
    }

    let destination;
    if (attraction) {
      destination =
        attraction.userData.rideFrame && decision.action === "ride"
          ? attraction.localToWorld(
              new THREE.Vector3(
                ...attraction.userData.rideFrame(0, true).position,
              ),
            )
          : attraction.position.clone();
      focus(attraction.userData.placement.biome, false, true);
    } else if (neighbor) {
      destination = neighbor.carrier.position.clone();
      focus(neighbor.profile.biome, false, true);
    } else {
      return Promise.reject(
        new Error("Выбранный предмет или котик больше недоступен."),
      );
    }
    if (
      !attraction?.userData.rideFrame &&
      attraction?.userData.id !== "swim-lagoon" &&
      !neighbor
    )
      destination.y = 0.16;
    destination.z +=
      attraction?.userData.rideFrame ||
      ["tunnel", "swim-lagoon"].includes(attraction?.userData.id)
        ? 0
        : 0.8;
    let dismount = null;
    if (attraction?.userData.rideFrame && decision.action === "ride") {
      dismount = attraction.localToWorld(
        new THREE.Vector3(...(attraction.userData.dismount || [0, 0, 0.8])),
      );
      const biome = byBiome(attraction.userData.placement.biome);
      dismount.y =
        islandHeight(
          biome.id,
          dismount.x - biome.center[0],
          dismount.z - biome.center[1],
        ) + 0.16;
    }
    const chillTarget = !!chillObject(decision.activityId);
    const spaTarget = !!spaObject(decision.activityId);
    if (spaTarget)
      destination.set(
        spaBiome.center[0] + SPA_GATE.x,
        0.16,
        spaBiome.center[1] + SPA_GATE.z,
      );
    if (chillTarget)
      destination.set(
        chillBiome.center[0] + CHILL_GATE.x,
        0.16,
        chillBiome.center[1] + CHILL_GATE.z,
      );
    return new Promise((resolve) => {
      operation = {
        chill: chillTarget,
        spa: spaTarget,
        decision,
        attraction,
        neighbor,
        partyIds:
          decision.action === "party"
            ? new Set(
                [...npcs.values()]
                  .filter(
                    (n) =>
                      n.profile.biome === attraction.userData.placement.biome &&
                      game.social?.relationships[n.profile.id]?.meetings > 0,
                  )
                  .slice(0, 4)
                  .map((n) => n.profile.id),
              )
            : null,
        partyPresent: new Set(),
        socialKind: neighbor
          ? encounterKind(game, decision.friendId, decision.socialIntent)
          : null,
        socialOrigin: neighbor?.carrier.position.clone(),
        from: chichiCarrier.position.clone(),
        destination,
        dismount,
        start: performance.now(),
        duration: reduced
          ? 50
          : Math.min(
              4800,
              1800 + chichiCarrier.position.distanceTo(destination) * 90,
            ),
        stage: "travel",
        resolve,
      };
      if (
        spaTarget &&
        Math.hypot(
          chichiCarrier.position.x - spaBiome.center[0],
          chichiCarrier.position.z - spaBiome.center[1],
        ) < spaBiome.radius
      )
        startHeroSpa(operation);
      if (
        chillTarget &&
        Math.hypot(
          chichiCarrier.position.x - chillBiome.center[0],
          chichiCarrier.position.z - chillBiome.center[1],
        ) < chillBiome.radius
      )
        startHeroChill(operation);
    });
  }
  function beginBuild(mode) {
    if (buildMode?.scenery)
      for (const g of sceneryGroups())
        if (g.userData.sceneryId === buildMode.ignoreId) g.visible = true;
    buildMode = mode;
    if (preview) {
      scene.remove(preview);
      disposeScenery(preview);
    }
    if (!mode) {
      preview = null;
      return;
    }
    preview = mode.scenery
      ? createSceneryModel(game.scenery.find((r) => r.id === mode.ignoreId))
      : makeAttraction(mode.item);
    if (mode.scenery)
      for (const g of sceneryGroups())
        if (g.userData.sceneryId === mode.ignoreId) g.visible = false;
    preview.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.userData.sharedScenery = false;
        o.material.transparent = true;
        o.material.opacity = 0.62;
        o.castShadow = false;
      }
    });
    scene.add(preview);
    updatePreview();
    focus(mode.biome);
  }
  function updatePreview() {
    if (!preview || !buildMode) return;
    const b = byBiome(buildMode.biome);
    preview.position.set(
      b.center[0] + buildMode.x,
      0.2 + islandHeight(buildMode.biome, buildMode.x, buildMode.z),
      b.center[1] + buildMode.z,
    );
    preview.rotation.y = (buildMode.rotation * Math.PI) / 2;
    const check = canPlace(
      game,
      buildMode.item,
      buildMode.biome,
      buildMode.x,
      buildMode.z,
      buildMode.rotation,
      buildMode.ignoreId,
    );
    preview.traverse((o) => {
      if (o.isMesh) {
        if (o.material.emissive) {
          o.material.emissive.set(check.ok ? 0x376b64 : 0x9d394e);
          o.material.emissiveIntensity = 0.35;
        }
      }
    });
    callbacks.onPreview?.({ ...buildMode, ...check });
  }
  const raycaster = new THREE.Raycaster(),
    mouse = new THREE.Vector2(),
    ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.16);
  const occlusionRay = new THREE.Raycaster();
  const occlusionBounds = new THREE.Box3(),
    occlusionPoint = new THREE.Vector3();
  let lastOcclusionCheck = -1;
  const occludedScenery = new Set();
  const sceneryBoundCache = new WeakMap();
  function sceneryBounds(object) {
    const key =
      object.position.toArray().join(":") +
      ":" +
      object.rotation.y +
      ":" +
      object.scale.x;
    const cached = sceneryBoundCache.get(object);
    if (cached?.key === key) return cached.bounds;
    const bounds = new THREE.Box3().setFromObject(object);
    sceneryBoundCache.set(object, { key, bounds });
    return bounds;
  }
  function updateOcclusion(now, dt) {
    const objects = sceneryGroups();
    for (const object of objects)
      object.visible = !(
        buildMode?.scenery && object.userData.sceneryId === buildMode.ignoreId
      );
    if (now - lastOcclusionCheck > 180) {
      lastOcclusionCheck = now;
      occludedScenery.clear();
      const targets = [
        faceCamera.enabled
          ? faceCamera.facePoint(new THREE.Vector3())
          : chichiCarrier.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      ];
      if (preview)
        targets.push(
          preview.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
        );
      if (!faceCamera.enabled && operation?.attraction)
        targets.push(
          operation.attraction.position
            .clone()
            .add(new THREE.Vector3(0, 0.6, 0)),
        );

      for (const target of targets) {
        const direction = target.clone().sub(camera.position),
          length = direction.length();
        occlusionRay.set(camera.position, direction.normalize());
        occlusionRay.far = Math.max(0, length - 0.35);
        // Test coarse volumes first; detailed leaf/flower triangles are only
        // inspected for the few objects crossing this short line of sight.
        const candidates = objects.filter(
          (g) =>
            g.visible &&
            occlusionRay.ray.intersectBox(sceneryBounds(g), occlusionPoint) &&
            camera.position.distanceTo(occlusionPoint) <= occlusionRay.far,
        );
        for (const object of candidates)
          occludedScenery.add(object.userData.sceneryId);
      }
    }
    for (const object of objects) {
      const target = occludedScenery.has(object.userData.sceneryId)
        ? faceCamera.enabled
          ? 0
          : 0.27
        : 1;
      const opacity = reduced
        ? target
        : THREE.MathUtils.lerp(
            object.userData.opacity,
            target,
            1 - Math.exp(-dt * 12),
          );
      if (Math.abs(opacity - object.userData.opacity) > 0.001)
        fadeScenery(object, opacity);
      if (faceCamera.enabled && opacity < 0.005) object.visible = false;
    }
  }
  const dropHint = document.createElement("span");
  let dropHover = null;
  dropHint.className = "cat-drop-hint";
  dropHint.hidden = true;
  dropHint.setAttribute("aria-live", "polite");
  container.append(dropHint);
  const dropRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.04, 6, 40),
    new THREE.MeshBasicMaterial({
      color: 0xc6f0bd,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    }),
  );
  dropRing.rotation.x = -Math.PI / 2;
  dropRing.visible = false;
  dropRing.renderOrder = 8;
  scene.add(dropRing);
  const hideDrop = () => {
    dropHint.hidden = true;
    dropRing.visible = false;
    dropHover = null;
  };
  function pickDrop(e, point) {
    const objects = [...itemGroups.values()].map((g) => ({
      id: g.userData.placementId,
      type: g.userData.placement.item,
      rotation: g.userData.placement.rotation,
      x: g.position.x,
      z: g.position.z,
      built: g.userData.built,
      footprint: g.userData.swimBounds
        ? [g.userData.swimBounds.rx * 2, g.userData.swimBounds.rz * 2]
        : g.userData.placement.footprint,
    }));
    const friends = [...npcs.values()]
      .filter((n) => n.carrier.visible && n.profile.id !== draggingCat?.catId)
      .map((n) => ({
        id: n.profile.id,
        x: n.carrier.position.x,
        z: n.carrier.position.z,
      }));
    const targets = new Map([
      ...[...npcs.values()]
        .filter((n) => n.carrier.visible && n.profile.id !== draggingCat?.catId)
        .map((n) => [n.carrier, { friendId: n.profile.id }]),
      ...[...itemGroups.values()].map((g) => [
        g,
        g.userData.built
          ? { activityId: g.userData.placementId }
          : { unavailable: true },
      ]),
    ]);
    const hit = raycaster.intersectObjects([...targets.keys()], true)[0];
    let meshSelection = null;
    if (hit) {
      let node = hit.object;
      while (node && !targets.has(node)) node = node.parent;
      if (node) meshSelection = targets.get(node);
    }
    if (meshSelection?.friendId) return meshSelection;
    // A high lake or roof can overlap a ride's entrance on screen. A drop
    // directly at the projected entrance selects that ride before the occluder.
    const dropBounds = renderer.domElement.getBoundingClientRect();
    const entrances = [...itemGroups.values()]
      .map((g) => {
        const p = g.position.clone().project(camera);
        return {
          g,
          d: Math.hypot(
            e.clientX - (dropBounds.left + ((p.x + 1) * dropBounds.width) / 2),
            e.clientY - (dropBounds.top + ((1 - p.y) * dropBounds.height) / 2),
          ),
          visible: p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
        };
      })
      .filter((v) => v.visible && v.d < (e.pointerType === "touch" ? 16 : 8))
      .sort((a, b) => a.d - b.d);
    if (entrances.length)
      return entrances[0].g.userData.built
        ? { activityId: entrances[0].g.userData.placementId }
        : { unavailable: true };
    if (meshSelection) return meshSelection;
    // On a phone the neighbour's mesh is only a few pixels wide. Hit the
    // visible cat on screen as well: its head projects above the ground plane.
    const bounds = renderer.domElement.getBoundingClientRect();
    const screenFriends = [...npcs.values()]
      .filter((n) => n.carrier.visible && n.profile.id !== draggingCat?.catId)
      .map((n) => {
        const p = n.carrier.position
          .clone()
          .add(new THREE.Vector3(0, 0.8, 0))
          .project(camera);
        return {
          id: n.profile.id,
          d: Math.hypot(
            e.clientX - (bounds.left + ((p.x + 1) * bounds.width) / 2),
            e.clientY - (bounds.top + ((1 - p.y) * bounds.height) / 2),
          ),
          visible: p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05,
        };
      })
      .filter((n) => n.visible && n.d < (e.pointerType === "touch" ? 9 : 6))
      .sort((a, b) => a.d - b.d);
    if (screenFriends.length) return { friendId: screenFriends[0].id };
    return dropTarget(point, objects, friends, {
      touch: e.pointerType === "touch",
    });
  }
  function showDrop(selection, point) {
    dropHint.hidden = false;
    dropRing.visible = !!selection;
    dropRing.position.set(point.x, 0.22, point.z);
    dropRing.material.color.set(selection?.unavailable ? 0xe3a2ac : 0xc6f0bd);
    if (selection?.unavailable) {
      dropHint.textContent = "⏳ Здесь ещё идёт строительство";
      return;
    }
    if (!selection) {
      dropHint.textContent = "Отпусти на игрушку, аттракцион, ферму или котика";
      return;
    }
    const selected = itemGroups.get(selection.activityId);
    if (
      selected &&
      byItem(selected.userData.placement.item)?.actions.includes("eat") &&
      !bowlPortions(game) &&
      selected.userData.placementId !== "spa-bar"
    ) {
      dropRing.material.color.set(0xe3a2ac);
      dropHint.textContent = "Миска пустая. Нажмите на неё и добавьте урожай.";
      return;
    }
    const snapshot = {
      activities: [...itemGroups.values()]
        .filter((g) => g.userData.built)
        .map((g) => ({
          id: g.userData.placementId,
          type: g.userData.placement.item,
        })),
      friends: [...npcs.keys()].map((id) => ({ id })),
    };
    const decision = manualInteraction(
      snapshot,
      selection,
      (draggingCat?.model || cat).userData.mood,
    );
    const verbs = {
      play: "поиграть",
      ride: "покататься",
      farm: "проверить грядки",
      meet: "познакомиться",
      party: "на вечеринку",
      rest: "отдохнуть",
      eat: "поесть",
      swim: "поплавать",
      explore: "исследовать",
    };
    const name = selection.friendId
      ? npcs.get(selection.friendId).profile.name
      : HOME_OBJECTS.find((o) => o.id === selection.activityId)?.name ||
        byItem(itemGroups.get(selection.activityId).userData.id).name;
    dropHint.textContent = "Отпусти: " + verbs[decision.action] + " · " + name;
  }
  const activePointers = new Set();
  let pointerDown = null,
    pinchDistance = null,
    draggingCat = null,
    pendingTap = false;
  function pointer(e) {
    const bounds = renderer.domElement.getBoundingClientRect();
    mouse.set(
      ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(e.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, camera);
  }
  function chooseGround(e) {
    pointer(e);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(ground, point)) {
      const b = byBiome(buildMode.biome);
      buildMode.x = Math.round(point.x - b.center[0]);
      buildMode.z = Math.round(point.z - b.center[1]);
      updatePreview();
    }
  }
  renderer.domElement.addEventListener("pointerdown", (e) => {
    pendingTap = false;
    dropHover = null;
    activePointers.add(e.pointerId);
    pointerDown = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    pointerDown.multi = activePointers.size > 1;
    renderer.domElement.setPointerCapture(e.pointerId);
    if (!faceCamera.enabled && !buildMode && !pointerDown.multi) {
      pointer(e);
      const bounds = renderer.domElement.getBoundingClientRect(),
        actors = [
          ...(!operation
            ? [{ id: "chichi", carrier: chichiCarrier, model: cat }]
            : []),
          ...[...npcs]
            .filter(([, n]) => n.carrier.visible)
            .map(([id, n]) => ({ id, ...n })),
        ].filter((a) => callbacks.canDragCat?.(a.id) !== false),
        candidates = [];
      for (const actor of actors) {
        const head = actor.carrier.position
            .clone()
            .add(new THREE.Vector3(0, actor.model.scale.x * 0.9, 0))
            .project(camera),
          d = Math.hypot(
            e.clientX - (bounds.left + ((head.x + 1) * bounds.width) / 2),
            e.clientY - (bounds.top + ((1 - head.y) * bounds.height) / 2),
          ),
          parts = [
            actor.model.userData.body,
            actor.model.getObjectByName("Face"),
            actor.model.getObjectByName("TailCoat"),
            ...actor.model.userData.legs.map((leg) =>
              leg.getObjectByName("Shin"),
            ),
          ].filter(Boolean),
          hit = raycaster.intersectObjects(parts, false)[0];
        if (head.z < 1 && (hit || d < (e.pointerType === "touch" ? 22 : 11)))
          candidates.push({ actor, score: hit ? hit.distance * 0.001 : d + 1 });
      }
      candidates.sort((a, b) => a.score - b.score);
      const actor = candidates[0]?.actor;
      if (actor) {
        draggingCat = actor.carrier.position.clone();
        draggingCat.catId = actor.id;
        draggingCat.carrier = actor.carrier;
        draggingCat.model = actor.model;
        if (actor.id !== "chichi") cancelResident(actor.id);
      }
    }
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (pointerDown?.multi) return;
    if (draggingCat) {
      pointer(e);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(ground, point)) {
        const selection = pickDrop(e, point);
        dropHover = { selection, x: e.clientX, y: e.clientY };
        showDrop(selection, point);
        point.y = 0.7;
        draggingCat.carrier.position.copy(point);
      }
      return;
    }
    if (buildMode) {
      if (pointerDown) chooseGround(e);
      return;
    }
    if (!pointerDown || faceCamera.enabled) return;
    azimuth -= (e.clientX - pointerDown.lastX) * 0.004;
    elevation = THREE.MathUtils.clamp(
      elevation + (e.clientY - pointerDown.lastY) * 0.002,
      0.35,
      1.2,
    );
    pointerDown.lastX = e.clientX;
    pointerDown.lastY = e.clientY;
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    activePointers.delete(e.pointerId);
    if (pointerDown?.multi) {
      if (draggingCat) {
        draggingCat.carrier.position.copy(draggingCat);
        draggingCat = null;
        hideDrop();
      }
      if (!activePointers.size) pointerDown = null;
      return;
    }
    if (draggingCat) {
      pointer(e);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(ground, point);
      const original = draggingCat;
      const moved =
        pointerDown &&
        Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) >= 7;
      // Execute the target shown under the finger. A wandering neighbour must
      // not replace the highlighted ride in the time between move and release.
      const selection = !moved
        ? null
        : dropHover &&
            Math.hypot(e.clientX - dropHover.x, e.clientY - dropHover.y) < 3
          ? dropHover.selection
          : pickDrop(e, point);
      original.carrier.position.copy(original);
      draggingCat = null;
      pointerDown = null;
      hideDrop();
      if (moved && original.catId !== "chichi") {
        const biome = selection?.activityId
          ? itemGroups.get(selection.activityId)?.userData.placement.biome
          : selection?.friendId
            ? npcs.get(selection.friendId)?.profile.biome
            : BIOMES.find(
                (b) =>
                  game.unlocked.includes(b.id) &&
                  Math.hypot(point.x - b.center[0], point.z - b.center[1]) <
                    (b.radius || 11.65) - 0.65,
              )?.id;
        if (biome && !selection?.unavailable)
          callbacks.onResidentDrop?.(original.catId, selection, biome, {
            x: point.x,
            z: point.z,
          });
        return;
      }
      if (moved) {
        if (selection && !selection.unavailable) {
          point.y = 0.16;
          chichiCarrier.position.copy(point);
        }
        if (callbacks.onCatDrop?.(selection) === false)
          chichiCarrier.position.copy(original);
      }
      return;
    }

    if (
      pointerDown &&
      Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) < 7
    ) {
      if (buildMode) chooseGround(e);
      else pendingTap = true;
    }
    pointerDown = null;
  });
  // Open dialogs on click, after touch release, so the same gesture cannot
  // immediately land on the newly opened dialog's backdrop and close it.
  renderer.domElement.addEventListener("click", (e) => {
    if (faceCamera.enabled) return;
    if (!pendingTap) return;
    pendingTap = false;
    pointer(e);
    const hit = raycaster.intersectObjects(
      [
        ...itemGroups.values(),
        ...sceneryGroups().filter(
          (g) => g.visible && raycaster.ray.intersectsBox(sceneryBounds(g)),
        ),
      ],
      true,
    )[0];
    if (hit) {
      let root = hit.object;
      while (root && !root.userData.placementId && !root.userData.sceneryId)
        root = root.parent;
      const biome =
        root?.userData.sceneryRecord?.biome || root?.userData.placement?.biome;
      if (biome && (viewingOverview || biome !== focused)) {
        focus(biome);
        return;
      }
      if (root?.userData.sceneryId) {
        const record = root.userData.sceneryRecord;
        if (game.unlocked.includes(record.biome))
          callbacks.onSelectScenery?.(record.id);
        else callbacks.onLockedBiome?.(record.biome);
        return;
      }
      if (root?.userData.placementId === "chichi-food")
        callbacks.onSelectBowl?.();
      else if (root?.userData.permanent && !root.userData.built)
        callbacks.onSelectIsland?.(root.userData.placement.biome);
      else if (root?.userData.placementId === "spa-bar")
        callbacks.onSelectSpaBar?.();
      else if (root?.userData.homeObject)
        callbacks.onCatDrop?.({ activityId: root.userData.placementId });
      else if (root) callbacks.onSelectItem?.(root.userData.placementId);
      return;
    }
    // Use the visible island's solid surface rather than a projected flat
    // ground point, which can select a neighbour when tapping a tall cliff.
    const islandHit = raycaster.intersectObjects(
      [...islands.values()].flatMap((island) => [
        ...(island.userData.navigationSurface
          ? [island.userData.navigationSurface]
          : []),
        ...(island.userData.detail.visible
          ? island.userData.renewal?.flyers?.filter((f) => f.visible) || []
          : []),
      ]),
      true,
    )[0];
    let clickedIsland = islandHit?.object;
    while (clickedIsland && !clickedIsland.userData.biomeId)
      clickedIsland = clickedIsland.parent;
    const clickedBiome = clickedIsland
      ? byBiome(clickedIsland.userData.biomeId)
      : null;
    if (clickedBiome && (viewingOverview || clickedBiome.id !== focused)) {
      focus(clickedBiome.id);
      return;
    }
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(ground, point)) return;
    const placement = [...itemGroups.values()].find((g) => {
      const local = g.worldToLocal(point.clone()),
        [w, d] =
          g.userData.placement.footprint ||
          byItem(g.userData.placement.item).footprint;
      return (
        Math.abs(local.x) <= w / 2 + 0.2 && Math.abs(local.z) <= d / 2 + 0.2
      );
    });
    if (placement) {
      const biome = placement.userData.placement.biome;
      if (viewingOverview || biome !== focused) {
        focus(biome);
        return;
      }
      if (placement.userData.placementId === "chichi-food")
        callbacks.onSelectBowl?.();
      else if (placement.userData.permanent && !placement.userData.built)
        callbacks.onSelectIsland?.(placement.userData.placement.biome);
      else if (placement.userData.placementId === "spa-bar")
        callbacks.onSelectSpaBar?.();
      else if (placement.userData.homeObject)
        callbacks.onCatDrop?.({ activityId: placement.userData.placementId });
      else callbacks.onSelectItem?.(placement.userData.placementId);
      return;
    }
    const decoration = sceneryGroups()
      .filter((g) => g.visible)
      .find((g) => {
        const local = g.worldToLocal(point.clone());
        const [w, d] = byScenery(g.userData.sceneryRecord.type).footprint;
        return (
          Math.abs(local.x) <= w / 2 + 0.15 && Math.abs(local.z) <= d / 2 + 0.15
        );
      });
    if (decoration) {
      const r = decoration.userData.sceneryRecord;
      if (viewingOverview || r.biome !== focused) {
        focus(r.biome);
        return;
      }
      if (game.unlocked.includes(r.biome)) callbacks.onSelectScenery?.(r.id);
      else callbacks.onLockedBiome?.(r.biome);
      return;
    }
    const b =
      clickedBiome ||
      BIOMES.find(
        (b) =>
          Math.hypot(point.x - b.center[0], point.z - b.center[1]) <
          (b.radius || 11.5),
      );
    if (b) focus(b.id);
  });
  renderer.domElement.addEventListener("pointercancel", (e) => {
    activePointers.delete(e.pointerId);
    pointerDown = null;
    pendingTap = false;
    hideDrop();
    if (draggingCat) {
      draggingCat.carrier.position.copy(draggingCat);
      draggingCat = null;
    }
  });
  renderer.domElement.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (faceCamera.enabled) {
        faceCamera.zoom(e.deltaY * 0.001);
        return;
      }
      desiredDistance = THREE.MathUtils.clamp(
        desiredDistance + e.deltaY * 0.025,
        21,
        600,
      );
    },
    { passive: false },
  );
  renderer.domElement.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        if (pinchDistance && faceCamera.enabled)
          faceCamera.zoom((pinchDistance - d) * 0.003);
        else if (pinchDistance)
          desiredDistance = THREE.MathUtils.clamp(
            desiredDistance + (pinchDistance - d) * 0.1,
            21,
            600,
          );
        pinchDistance = d;
      }
    },
    { passive: true },
  );
  renderer.domElement.addEventListener(
    "touchend",
    () => (pinchDistance = null),
  );
  const viewport = watchWorldViewport(container);
  let worldVisible = true;
  const visibility = globalThis.IntersectionObserver
    ? new IntersectionObserver(
        ([entry]) => {
          worldVisible = entry.isIntersecting;
          if (worldVisible) viewport.invalidate();
        },
        { rootMargin: "160px 0px" },
      )
    : null;
  visibility?.observe(container);
  let contextLost = false;
  const recovery = document.createElement("div");
  recovery.className = "world-recovery";
  recovery.textContent = "Мир возвращается… ✦";
  recovery.setAttribute("role", "status");
  recovery.hidden = true;
  container.append(recovery);
  const loseContext = (event) => {
    event.preventDefault();
    contextLost = true;
    recovery.hidden = false;
  };
  const restoreContext = () => {
    contextLost = false;
    viewport.invalidate();
  };
  const resume = () => {
    if (!document.hidden) viewport.invalidate();
  };
  renderer.domElement.addEventListener("webglcontextlost", loseContext);
  renderer.domElement.addEventListener("webglcontextrestored", restoreContext);
  document.addEventListener("visibilitychange", resume);
  // Frame-local results are copied to carriers immediately. Reuse storage
  // instead of creating short-lived vectors for every cat on every draw.
  const framePoint = new THREE.Vector3(),
    npcDirection = new THREE.Vector3(),
    localSwim = new THREE.Vector3(),
    shorePoint = new THREE.Vector3(),
    travelDirection = new THREE.Vector3();
  let previousTime = performance.now(),
    lastRender = 0;
  function loop(now) {
    if (disposed) return;
    if (contextLost || document.hidden) {
      requestAnimationFrame(loop);
      return;
    }
    const cameraMoving =
      look.distanceToSquared(desiredLook) > 0.0001 ||
      Math.abs(distance - desiredDistance) > 0.01;
    const dialogOpen = !!document.querySelector("dialog[open]");
    if (
      !(viewport.pending && !dialogOpen && worldVisible) &&
      now - lastRender <
        (dialogOpen
          ? 100
          : operation ||
              pointerDown ||
              heroGather ||
              cameraMoving ||
              faceCamera.enabled
            ? 16
            : 33)
    ) {
      requestAnimationFrame(loop);
      return;
    }
    if (!dialogOpen && worldVisible) viewport.apply(renderer, camera);
    lastRender = now;
    const dt = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    const time = now / 1000;
    const cameraBlend = reduced ? 1 : 1 - Math.exp(-dt * 8);
    if (faceCamera.enabled) faceCamera.facePoint(desiredLook);
    look.lerp(desiredLook, cameraBlend);
    distance += (desiredDistance - distance) * cameraBlend;
    camera.position.set(
      look.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      look.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    camera.lookAt(look);
    for (const b of BIOMES) {
      const island = islands.get(b.id),
        close =
          distance < Math.max(110, (b.radius || 12) * 7) &&
          Math.hypot(b.center[0] - look.x, b.center[1] - look.z) < 39;
      island.userData.detail.visible = close && !island.userData.lowOnly;
      island.userData.lowDetail.visible = !close || !!island.userData.lowOnly;
      if (close) ensureDetail(b.id);
      if (!dialogOpen) island.userData.update?.(time, reduced);
    }
    const spaBarGroup = itemGroups.get("spa-bar");
    if (spaBarGroup) {
      let servingVisit = null;
      for (const visit of spa.visits.values())
        if (
          visit.objectId === "spa-bar" &&
          visit.phase === "relax" &&
          visit.elapsed < 4.1
        ) {
          servingVisit = visit;
          break;
        }
      spaBarGroup.userData.servingVisit = servingVisit;
    }
    for (const g of itemGroups.values())
      if (!reduced && !dialogOpen) animateAttraction(g, time);
    if (preview && !reduced) animateAttraction(preview, time);
    buildingSites = constructionSites(itemGroups);
    if (!dialogOpen) {
      spa.step(dt, time);
      chill.step(dt, time);
    }
    for (const [id, cup] of spaCups)
      if (!spa.get(id)?.drinking) {
        scene.remove(cup);
        disposeScenery(cup);
        spaCups.delete(id);
      }
    function applySpaFrame(v, carrier, model) {
      carrier.position.set(
        spaBiome.center[0] + v.position.x,
        v.position.y,
        spaBiome.center[1] + v.position.z,
      );
      carrier.rotation.y = v.yaw;
      const resting =
          v.phase === "relax" &&
          ["spa-lounge", "spa-jacuzzi"].includes(v.objectId),
        mood = resting ? "sleep" : "happy";
      // Every size rests with its face above the warm surface. In particular,
      // small neighbours must not disappear when the sleeping rig curls down.
      const d = model.userData,
        restingHead =
          ((d.anatomy?.headY ?? 1.25) + (d.build.height - 1) * 0.22 - 0.375) *
          model.scale.x *
          0.7,
        lift =
          resting && v.objectId === "spa-jacuzzi"
            ? Math.max(
                0,
                SPA_JACUZZI.y + 0.155 + 0.19 - (v.seat.y + restingHead),
              )
            : 0;
      v.visualLift =
        (v.visualLift || 0) +
        (lift - (v.visualLift || 0)) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
      carrier.position.y += v.visualLift;
      if (model.userData.mood !== mood)
        setCatMood(model, mood, { immediate: reduced });
      if (v.drinking) {
        let cup = spaCups.get(v.catId);
        if (!cup) {
          cup = spaCup(SPA_DRINKS.find((d) => d.id === v.drinkId)?.color);
          scene.add(cup);
          spaCups.set(v.catId, cup);
        }
        cup.position.copy(carrier.position);
        cup.position.y += model.scale.x * 1.03;
        cup.position.x += Math.sin(v.yaw) * 0.45;
        cup.position.z += Math.cos(v.yaw) * 0.45;
      }
      if (!reduced && v.objectId === "lake-water" && v.phase === "relax")
        islands
          .get("water")
          ?.userData.lagoons?.get("lake-water")
          ?.userData.disturb?.(v.position.x, v.position.z - 1, time, 0.35);
    }
    function applyChillFrame(v, carrier, model) {
      carrier.position.set(
        chillBiome.center[0] + v.position.x,
        v.position.y,
        chillBiome.center[1] + v.position.z,
      );
      carrier.rotation.y = v.yaw;
      const resting = v.phase === "relax",
        mood = resting ? "sleep" : "happy",
        d = model.userData,
        head =
          ((d.anatomy?.headY ?? 1.25) + (d.build.height - 1) * 0.22 - 0.375) *
          model.scale.x *
          0.7,
        lift =
          resting && v.kind === "bath"
            ? Math.max(0, CHILL_WATER_Y + 0.19 - (v.seat.y + head))
            : 0;
      v.visualLift =
        (v.visualLift || 0) +
        (lift - (v.visualLift || 0)) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
      carrier.position.y += v.visualLift;
      if (model.userData.mood !== mood)
        setCatMood(model, mood, { immediate: reduced });
      if (!reduced && resting && v.kind === "bath")
        islands
          .get("sakura")
          ?.userData.lagoons?.get(v.objectId)
          ?.userData.disturb?.(time);
    }
    for (const [id, n] of npcs) {
      const b = byBiome(n.profile.biome),
        needs = game.care?.residents[id];
      let x = n.carrier.position.x,
        z = n.carrier.position.z,
        npcWalking = false,
        npcReaction = null,
        direct = false;
      n.carrier.rotation.z = 0;
      const draggingThis = draggingCat?.catId === id,
        manualVisit = residentPlay.get(id),
        friendVisit = residentPlay.friendVisit(id);
      const busyWithChichi =
        operation?.decision.friendId === id ||
        operation?.partyIds?.has(id) ||
        !!manualVisit ||
        !!friendVisit;
      if (busyWithChichi || draggingThis || b.id !== "water") spa.cancel(id);
      if (
        b.id === "water" &&
        !busyWithChichi &&
        !draggingThis &&
        !dialogOpen &&
        now >= gatherUntil &&
        !spa.get(id) &&
        now > (n.manualUntil || 0) &&
        !crew.workers.has(id) &&
        Date.now() - Math.max(game.spa?.visits?.[id] || 0, n.lastSpaAt || 0) >
          90000 &&
        now > (n.nextSpaAttempt || 0) &&
        spa.visits.size < 9 &&
        (Math.floor(time) + n.index * 7) % 7 === 0
      ) {
        n.nextSpaAttempt = now + 5000;
        const options =
          needs?.hunger > 45
            ? ["spa-bar", "spa-lounge"]
            : ["spa-lounge", "lake-water", "spa-jacuzzi", "spa-bar"];
        const objectId =
          options[Math.abs(n.index + Math.floor(time / 20)) % options.length];
        const dry = nearestSpaGround(
          spaLocal(n.carrier.position),
          spaRadius(n.model),
          spaObstacles,
        );
        if (
          dry &&
          !spaWalkable(
            spaLocal(n.carrier.position),
            spaRadius(n.model),
            spaObstacles,
          )
        )
          n.carrier.position.set(
            b.center[0] + dry.x,
            0.16,
            b.center[1] + dry.z,
          );
        if (
          dry &&
          spa.start({
            catId: id,
            objectId,
            position: dry,
            radius: spaRadius(n.model),
            drinkId: SPA_DRINKS[Math.abs(n.index) % 3].id,
          })
        )
          n.lastSpaAt = Date.now();
      }
      if (busyWithChichi || draggingThis || b.id !== "sakura") chill.cancel(id);
      if (
        b.id === "sakura" &&
        !busyWithChichi &&
        !draggingThis &&
        !dialogOpen &&
        now >= gatherUntil &&
        !chill.get(id) &&
        !crew.workers.has(id) &&
        now > (n.manualUntil || 0) &&
        now > (n.nextChillAttempt || 0) &&
        Date.now() - Math.max(game.spa?.visits?.[id] || 0, n.lastChillAt || 0) >
          35000
      ) {
        n.nextChillAttempt = now + 6000;
        const origin = chillLocal(n.carrier.position),
          radius = spaRadius(n.model),
          dry = nearestChillGround(origin, radius, chillObstacles),
          preferred = (n.index + Math.floor(time / 35)) % 2 ? "bed" : "bath",
          options = [...CHILL_OBJECTS].sort(
            (a, b) =>
              (a.kind === preferred ? 0 : 50) +
              Math.hypot(a.x - origin.x, a.z - origin.z) -
              (b.kind === preferred ? 0 : 50) -
              Math.hypot(b.x - origin.x, b.z - origin.z),
          );
        if (dry)
          for (const object of options) {
            if (
              chill.start({
                catId: id,
                objectId: object.id,
                position: dry,
                radius,
              })
            ) {
              n.lastChillAt = Date.now();
              break;
            }
          }
      }
      const chillVisit = chill.get(id);
      const spaVisit = spa.get(id);
      const canBuild =
        !busyWithChichi &&
        !draggingThis &&
        !dialogOpen &&
        now >= gatherUntil &&
        !spaVisit &&
        !chillVisit &&
        now > (n.manualUntil || 0) &&
        !mealVisits.has(id) &&
        !swimVisits.has(id) &&
        (needs?.hunger || 0) < 85;
      if (!canBuild) crew.cancel(id);
      const builderFrame = canBuild
        ? crew.frame(
            id,
            n.carrier.position,
            b.id,
            n.index,
            spaRadius(n.model),
            dt,
            time,
          )
        : null;
      builderHammer(id, n.model, builderFrame);
      if (
        b.id !== "water" &&
        b.id !== "sakura" &&
        !builderFrame &&
        !busyWithChichi &&
        now >= gatherUntil &&
        !draggingThis &&
        !mealVisits.has(id) &&
        !swimVisits.has(id) &&
        mealVisits.size < 2 &&
        needs?.hunger >= 45 &&
        bowlPortions(game) > 0
      ) {
        const cafes = [...itemGroups.values()].filter(
            (g) => g.userData.barista && g.userData.built,
          ),
          bowl =
            cafes.sort(
              (a, b) =>
                a.position.distanceTo(n.carrier.position) -
                b.position.distanceTo(n.carrier.position),
            )[0] || itemGroups.get("chichi-food"),
          goal = bowl.position
            .clone()
            .add(
              new THREE.Vector3(
                Math.sin(n.index * 2.4) * 1.2,
                0,
                Math.cos(n.index * 2.4) * 1.2,
              ),
            );
        const seat = bowl.userData.barista
          ? [-1.2, 1.2].find(
              (x) =>
                ![...mealVisits.values()].some(
                  (v) => v.venue === bowl.userData.placementId && v.seat === x,
                ),
            )
          : null;
        if (bowl.userData.barista)
          goal.copy(
            bowl.localToWorld(new THREE.Vector3(seat ?? -1.2, 0, 2.12)),
          );
        goal.y = 0.16;
        mealVisits.set(id, {
          seat,
          from: n.carrier.position.clone(),
          venue: bowl.userData.placementId,
          goal,
          start: now,
          duration: Math.max(
            2500,
            Math.min(18000, n.carrier.position.distanceTo(goal) * 250),
          ),
          stage: "travel",
          tried: false,
        });
      }
      if (busyWithChichi || draggingThis) {
        mealVisits.delete(id);
        swimVisits.delete(id);
      }
      if (
        b.id !== "water" &&
        b.id !== "sakura" &&
        now > (n.manualUntil || 0) &&
        !builderFrame &&
        !busyWithChichi &&
        now >= gatherUntil &&
        !draggingThis &&
        !mealVisits.has(id) &&
        !swimVisits.has(id) &&
        swimVisits.size < 2 &&
        needs?.hunger < 45 &&
        needs?.happiness < 85 &&
        Date.now() - (needs.lastSwimAt || 0) > 180000 &&
        (Math.floor(time) + n.index * 19) % 80 < 3
      ) {
        const lakes = [...itemGroups.values()].filter(
          (g) =>
            !spaObject(g.userData.placementId) &&
            g.userData.id === "swim-lagoon" &&
            g.position.distanceTo(n.carrier.position) < 32,
        );
        const lake = lakes.sort(
          (a, b) =>
            a.position.distanceTo(n.carrier.position) -
            b.position.distanceTo(n.carrier.position),
        )[0];
        if (lake)
          swimVisits.set(id, {
            lake,
            from: n.carrier.position.clone(),
            start: now,
            duration: Math.min(
              12000,
              2500 + n.carrier.position.distanceTo(lake.position) * 220,
            ),
            stage: "travel",
          });
      }
      const swim = swimVisits.get(id);
      const visit = mealVisits.get(id);
      const manualFrame =
        manualVisit && !draggingThis
          ? residentPlay.frame(id, now, time, reduced)
          : null;
      if (manualFrame) {
        n.carrier.position.copy(manualFrame.position);
        n.carrier.rotation.y = manualFrame.yaw;
        n.carrier.rotation.z = manualFrame.roll;
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = manualFrame.walking;
        npcReaction = manualFrame.reaction;
      } else if (friendVisit) {
        direct = true;
        npcWalking = !!friendVisit.friendFrame?.running;
        npcReaction = friendVisit.friendFrame;
      } else if (draggingThis) {
        direct = true;
      } else if (builderFrame) {
        n.carrier.position.set(
          builderFrame.position.x,
          builderFrame.position.y,
          builderFrame.position.z,
        );
        n.carrier.rotation.y = builderFrame.yaw;
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = builderFrame.walking;
        npcReaction = reduced ? null : builderFrame.reaction;
      } else if (chillVisit) {
        applyChillFrame(chillVisit, n.carrier, n.model);
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = chillVisit.walking;
        npcReaction = chillVisit.reaction;
      } else if (spaVisit) {
        applySpaFrame(spaVisit, n.carrier, n.model);
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = spaVisit.walking;
        npcReaction = spaVisit.reaction;
      } else if (visit && !busyWithChichi && !draggingThis) {
        if (!bowlPortions(game) && !visit.tried) mealVisits.delete(id);
        else if (visit.stage === "travel") {
          const t = Math.min(1, (now - visit.start) / visit.duration),
            q = t * t * (3 - 2 * t);
          n.carrier.position.lerpVectors(visit.from, visit.goal, q);
          x = n.carrier.position.x;
          z = n.carrier.position.z;
          direct = true;
          npcWalking = t < 1;
          n.carrier.rotation.y = Math.atan2(
            visit.goal.x - visit.from.x,
            visit.goal.z - visit.from.z,
          );
          if (t === 1) {
            visit.stage = "eat";
            visit.eatStart = now;
          }
        } else {
          const elapsed = (now - visit.eatStart) / 1000,
            bowl = itemGroups.get(visit.venue) || itemGroups.get("chichi-food");
          x = visit.goal.x;
          z = visit.goal.z;
          if (bowl.userData.barista) bowl.userData.lastServiceTime = time;
          npcReaction = {
            headPitch: 0.24 + (reduced ? 0 : Math.sin(elapsed * 4) * 0.05),
          };
          n.carrier.rotation.y = Math.atan2(
            bowl.position.x - x,
            bowl.position.z - z,
          );
          if (elapsed >= 2 && !visit.tried) {
            visit.tried = true;
            callbacks.onResidentAte?.(id);
          }
          if (elapsed >= 3.5) mealVisits.delete(id);
        }
      } else if (swim && !busyWithChichi && !draggingThis) {
        if (swim.stage === "travel") {
          const t = Math.min(1, (now - swim.start) / swim.duration);
          n.carrier.position.lerpVectors(
            swim.from,
            swim.lake.position,
            t * t * (3 - 2 * t),
          );
          x = n.carrier.position.x;
          z = n.carrier.position.z;
          direct = true;
          npcWalking = t < 1;
          if (t === 1) {
            swim.stage = "swim";
            swim.activityStart = now;
          }
        } else {
          const elapsed = (now - swim.activityStart) / 1000,
            bounds = swim.lake.userData.swimBounds || { rx: 1.7, rz: 1.7 },
            f = swimFrame(elapsed, bounds, n.index, reduced);
          const enter = Math.min(1, elapsed);
          n.carrier.position.copy(
            swim.lake.localToWorld(
              framePoint
                .set(f.x, f.y, f.z)
                .multiplyScalar(enter * enter * (3 - 2 * enter)),
            ),
          );
          n.carrier.rotation.y = f.yaw;
          x = n.carrier.position.x;
          z = n.carrier.position.z;
          direct = true;
          npcReaction = f;
          const lagoon =
            swim.lake.userData.lagoon ||
            islands
              .get(swim.lake.userData.placement.biome)
              ?.userData.lagoons?.get(swim.lake.userData.placementId);
          if (!reduced) lagoon?.userData.disturb?.(f.x, f.z, time, 0.35);
          if (elapsed > 14) {
            n.carrier.position.copy(
              swim.lake.localToWorld(framePoint.set(bounds.rx + 0.5, 0.01, 0)),
            );
            n.carrier.position.y = swim.lake.userData.shoreHeight ?? 0.16;
            swimVisits.delete(id);
            callbacks.onResidentSwam?.(id);
          }
        }
      } else if (n.manualAnchor && now < (n.manualUntil || 0)) {
        direct = true;
      } else if (n.profile.venueHome && !busyWithChichi) {
        const home = itemGroups.get(n.profile.homeVenueId);
        if (home) {
          const p = home.localToWorld(
            framePoint.set(
              1.7 + Math.sin(time * 0.3) * 0.35,
              0,
              2.1 + Math.cos(time * 0.3) * 0.3,
            ),
          );
          x = p.x;
          z = p.z;
          n.carrier.position.y = home.position.y;
        }
      } else if (
        ["water", "sakura"].includes(b.id) &&
        !busyWithChichi &&
        now >= gatherUntil
      ) {
        // Between visits the cat stays on dry ground, breathing and looking around.
        direct = true;
      } else if (draggingThis) {
        n.carrier.rotation.y = Math.atan2(
          chichiCarrier.position.x - x,
          chichiCarrier.position.z - z,
        );
      } else if (
        operation?.decision.action === "party" &&
        operation.partyIds?.has(id)
      ) {
        x = operation.attraction.position.x + Math.sin(n.index * 1.4) * 1.35;
        z = operation.attraction.position.z + Math.cos(n.index * 1.4) * 1.1;
        if (n.carrier.position.distanceTo(framePoint.set(x, 0.16, z)) < 1.6)
          operation.partyPresent.add(id);
        n.carrier.position.y =
          0.16 + (reduced ? 0 : Math.abs(Math.sin(time * 4 + n.index)) * 0.09);
      } else if (operation?.decision.friendId === id) {
        if (operation.stage === "activity") {
          const frame = socialFrame(
            (now - operation.activityStart) / 1000,
            operation.socialKind,
            reduced,
          ).friend;
          n.carrier.position.set(
            operation.socialOrigin.x + frame.x,
            operation.socialOrigin.y + frame.jump,
            operation.socialOrigin.z + frame.z,
          );
          x = n.carrier.position.x;
          z = n.carrier.position.z;
          n.carrier.rotation.y = frame.yaw;
          direct = true;
          npcWalking = frame.running;
          npcReaction = frame;
        } else
          n.carrier.rotation.y = Math.atan2(
            chichiCarrier.position.x - x,
            chichiCarrier.position.z - z,
          );
      } else if (game.social?.bestFriendId === id) {
        const anchor =
          chichiCarrier.position.y > 1.3 && operation?.destination
            ? operation.destination
            : chichiCarrier.position;
        x = anchor.x - Math.sin(chichiCarrier.rotation.y) * 1.15 + 0.5;
        z = anchor.z - Math.cos(chichiCarrier.rotation.y) * 1.15;
        n.carrier.position.y =
          operation?.decision.action === "ride"
            ? 0.16
            : operation?.decision.action === "swim"
              ? (operation.attraction.userData.shoreHeight ?? 0.16)
              : Math.max(0.16, chichiCarrier.position.y);
      } else {
        const wanderRadius = b.arrival ? 11.8 : 6;
        x = b.center[0] + Math.sin(time * 0.07 + n.index * 2.4) * wanderRadius;
        z = b.center[1] + Math.cos(time * 0.07 + n.index * 2.4) * wanderRadius;
        if (b.id === "summer") {
          const dry = capybaraDryPoint(x - b.center[0], z - b.center[1]);
          x = b.center[0] + dry.x;
          z = b.center[1] + dry.z;
        }
        n.carrier.position.y =
          0.16 +
          islandHeight(
            b.id,
            n.carrier.position.x - b.center[0],
            n.carrier.position.z - b.center[1],
          );
      }
      const direction = npcDirection
        .set(x, n.carrier.position.y, z)
        .sub(n.carrier.position);
      if (!direct) {
        if (direction.length() > 0.03)
          n.carrier.rotation.y = Math.atan2(direction.x, direction.z);
        n.carrier.position.x += direction.x * dt * 0.8;
        n.carrier.position.z += direction.z * dt * 0.8;
        npcWalking = direction.length() > 0.1;
      }
      const near =
        distance < Math.max(110, (b.radius || 12) * 7) &&
        Math.hypot(
          n.carrier.position.x - look.x,
          n.carrier.position.z - look.z,
        ) < 45;
      n.carrier.visible = near;
      npcDummy.position.copy(n.carrier.position);
      npcDummy.position.y += 0.3;
      npcDummy.scale.setScalar(near ? 0 : 1);
      npcDummy.updateMatrix();
      npcMarkers.setMatrixAt(n.index, npcDummy.matrix);
      const desiredMood =
        manualFrame?.mood ||
        ((spaVisit?.phase === "relax" &&
          ["spa-lounge", "spa-jacuzzi"].includes(spaVisit.objectId)) ||
        chillVisit?.phase === "relax"
          ? "sleep"
          : game.social?.bestFriendId === id && game.care?.resting
            ? "sleep"
            : needs?.hunger >= 75
              ? "crazy hungry"
              : "happy");
      if (n.model.userData.mood !== desiredMood)
        setCatMood(n.model, desiredMood, { immediate: reduced });
      if (near && !dialogOpen) {
        animateCat(n.model, time + n.index, npcWalking, reduced);
        if (npcReaction) reactCat(n.model, npcReaction, reduced);
        if (n.hatRig) {
          const resting =
              (spaVisit?.phase === "relax" &&
                ["spa-lounge", "spa-jacuzzi"].includes(spaVisit.objectId)) ||
              chillVisit?.phase === "relax",
            targetY = resting
              ? (n.model.userData.head.position.y +
                  n.model.userData.head.scale.y * 0.4) *
                  n.model.scale.y -
                1.3
              : 0;
          n.hatRig.position.y +=
            (targetY - n.hatRig.position.y) *
            (reduced ? 1 : 1 - Math.exp(-dt * 6));
        }
      }
    }
    npcMarkers.instanceMatrix.needsUpdate = true;
    chichiCarrier.rotation.z = 0;
    let walking = false,
      reaction = null;
    if (heroGather && !operation && !draggingCat) {
      const t = Math.min(1, (now - heroGather.start) / heroGather.duration);
      chichiCarrier.position.lerpVectors(
        heroGather.from,
        heroGather.to,
        t * t * (3 - 2 * t),
      );
      chichiCarrier.rotation.y = Math.atan2(
        heroGather.to.x - heroGather.from.x,
        heroGather.to.z - heroGather.from.z,
      );
      walking = t < 1;
      if (t === 1) heroGather = null;
    }
    const heroCanBuild =
      !operation &&
      !heroGather &&
      !draggingCat &&
      !dialogOpen &&
      !game.care?.resting &&
      game.cat.mood === "happy" &&
      game.cat.energy > 25 &&
      game.cat.hunger < 85;
    if (!heroCanBuild) crew.cancel("chichi");
    const heroBiome = BIOMES.reduce(
        (best, b) =>
          Math.hypot(
            chichiCarrier.position.x - b.center[0],
            chichiCarrier.position.z - b.center[1],
          ) <
          Math.hypot(
            chichiCarrier.position.x - best.center[0],
            chichiCarrier.position.z - best.center[1],
          )
            ? b
            : best,
        BIOMES[0],
      ),
      heroBuild = heroCanBuild
        ? crew.frame(
            "chichi",
            chichiCarrier.position,
            heroBiome.id,
            -1,
            spaRadius(cat),
            dt,
            time,
          )
        : null;
    builderHammer("chichi", cat, heroBuild);
    if (heroBuild) {
      chichiCarrier.position.set(
        heroBuild.position.x,
        heroBuild.position.y,
        heroBuild.position.z,
      );
      chichiCarrier.rotation.y = heroBuild.yaw;
      walking = heroBuild.walking;
      reaction = reduced ? null : heroBuild.reaction;
    }
    if (operation) {
      const op = operation;
      if (op.stage === "chill") {
        const v = chill.get("chichi");
        if (v) {
          applyChillFrame(v, chichiCarrier, cat);
          walking = v.walking;
          reaction = v.reaction;
        }
        if (op.spaCompleted || op.spaFailed) {
          operation = null;
          setCatMood(cat, game.cat.mood, { immediate: reduced });
          op.resolve(
            op.spaFailed
              ? { cancelled: true }
              : { completed: true, spaVisit: op.spaCompleted },
          );
        }
      } else if (op.stage === "spa") {
        const v = spa.get("chichi");
        if (v) {
          applySpaFrame(v, chichiCarrier, cat);
          walking = v.walking;
          reaction = v.reaction;
        }
        if (op.spaCompleted || op.spaFailed) {
          operation = null;
          setCatMood(cat, game.cat.mood, { immediate: reduced });
          op.resolve(
            op.spaFailed
              ? { cancelled: true }
              : { completed: true, spaVisit: op.spaCompleted },
          );
        }
      } else if (op.stage === "travel") {
        const p = Math.min((now - op.start) / op.duration, 1);
        chichiCarrier.position.lerpVectors(
          op.from,
          op.destination,
          p * p * (3 - 2 * p),
        );
        const d = travelDirection.copy(op.destination).sub(op.from);
        chichiCarrier.rotation.y = Math.atan2(d.x, d.z);
        walking = p < 1;
        if (p === 1) {
          choiceExpression(op.decision);
          if (op.chill) {
            startHeroChill(op);
          } else if (op.spa) {
            startHeroSpa(op);
          } else op.stage = "activity";
          op.activityStart = now;
          if (
            op.attraction?.userData.id === "yarn" &&
            op.decision.action === "play"
          )
            op.attraction.userData.playing = true;
          if (
            op.attraction?.userData.playFrame &&
            op.decision.action === "play"
          )
            op.attraction.userData.playing = true;
        }
      } else {
        const elapsed = (now - op.activityStart) / 1000,
          g = op.attraction,
          id = g?.userData.id,
          action = op.decision.action;
        if (action === "ride" && g) {
          let local = framePoint.set(0, g.userData.seatHeight, 0);
          const moving = g.userData.moving;
          if (g.userData.rideFrame) {
            g.userData.rideElapsed = elapsed;
            const f = g.userData.rideFrame(elapsed, reduced);
            local.set(...f.position);
            chichiCarrier.rotation.y = (f.yaw || 0) + g.rotation.y;
            chichiCarrier.rotation.z = f.roll || 0;
            reaction = { paw: f.paw || 0, headPitch: f.headPitch || 0 };
            g.userData.update?.(time, reduced);
            if (f.phase === "flight" && !op.flew) {
              op.flew = true;
              callbacks.onReaction?.(
                "Уиии! Лапки в воздухе — я маленькая комета! 🐾",
              );
            }
          } else if (
            g.userData.curve &&
            (id.includes("coaster") ||
              id === "train" ||
              id.startsWith("water-") ||
              id === "zipline")
          ) {
            local = g.userData.curve.getPoint((time * 0.1) % 1);
            local.y += 0.5;
          } else if (id === "carousel")
            local.set(
              Math.cos(time * 0.65) * 1.05,
              0.95,
              -Math.sin(time * 0.65) * 1.05,
            );
          else if (id === "ferris")
            local.set(
              -Math.sin(time * 0.4) * 1.5,
              2 + Math.cos(time * 0.4) * 1.5,
              0.18,
            );
          else if (id === "waterslide") {
            local = g.userData.curve.getPoint((elapsed / 4) % 1);
            local.y += 0.3;
          } else if (
            [
              "swing",
              "balloon",
              "boat",
              "broom",
              "scooter",
              "teacup",
              "rocket",
              "ufo",
              "airship",
              "skate",
              "catbus",
              "bumpercars",
              "drop-tower",
            ].includes(id)
          ) {
            local = moving.localToWorld(
              framePoint.set(0, g.userData.seatHeight, 0),
            );
            chichiCarrier.position.copy(local);
            local = null;
          } else if (id === "trampoline")
            local.y += reduced ? 0 : Math.abs(Math.sin(elapsed * 3)) * 1.5;
          if (local) chichiCarrier.position.copy(g.localToWorld(local));
          if (!g.userData.rideFrame) chichiCarrier.rotation.y = time * 0.8;
        } else if (action === "swim" && g) {
          const bounds = g.userData.swimBounds || {
              rx: g.userData.lagoon?.userData.rx || 1.7,
              rz: g.userData.lagoon?.userData.rz || 1.7,
            },
            f = swimFrame(elapsed, bounds, 0, reduced);
          if (elapsed > 10) {
            const shore = shorePoint.set(
                bounds.rx + 0.5,
                (g.userData.shoreHeight ?? 0.16) - g.position.y,
                0,
              ),
              u = Math.min(1, (elapsed - 10) / 2);
            localSwim.set(f.x, f.y, f.z).lerp(shore, u);
          } else {
            localSwim.set(f.x, f.y, f.z);
            if (elapsed < 1)
              localSwim.multiplyScalar(elapsed * elapsed * (3 - 2 * elapsed));
          }
          chichiCarrier.position.copy(g.localToWorld(localSwim));
          chichiCarrier.rotation.y = f.yaw;
          reaction = f;
          const lagoon =
            g.userData.lagoon ||
            islands
              .get(g.userData.placement.biome)
              ?.userData.lagoons?.get(g.userData.placementId);
          if (!reduced) lagoon?.userData.disturb?.(f.x, f.z, time, 0.65);
          if (elapsed > 1 && !op.splashed) {
            op.splashed = true;
            callbacks.onReaction?.(
              "Плюх! Лапки гребут, рыбки щекочут носик 🫧",
            );
          }
        } else if (action === "farm" && g) {
          chichiCarrier.position.copy(
            g.localToWorld(
              framePoint.set(
                Math.sin(elapsed * 1.5) * 1,
                0.18,
                Math.cos(elapsed * 1.5) * 0.7,
              ),
            ),
          );
          chichiCarrier.rotation.y = elapsed;
          walking = true;
        } else if (action === "play" && id === "yarn") {
          const frame = yarnPlayFrame(elapsed, reduced);
          applyYarnFrame(g, frame);
          chichiCarrier.position.copy(
            g.localToWorld(
              framePoint.set(frame.cat.x, 0.16 + frame.jump, frame.cat.z),
            ),
          );
          const yaw = g.rotation.y + frame.yaw;
          chichiCarrier.rotation.y +=
            Math.atan2(
              Math.sin(yaw - chichiCarrier.rotation.y),
              Math.cos(yaw - chichiCarrier.rotation.y),
            ) * Math.min(1, dt * 12);
          walking = frame.running;
          reaction = frame;
          if (elapsed >= 2.25 && !op.reacted) {
            op.reacted = true;
            callbacks.onReaction?.(
              "Прыг! Поймала… ой, клубочек опять убежал! 🧶",
            );
          }
        } else if (action === "play" && g?.userData.playFrame) {
          const f = g.userData.playFrame(elapsed, reduced);
          g.userData.heroPlayPos = { x: f.position[0], z: f.position[2] };
          chichiCarrier.position.copy(
            g.localToWorld(framePoint.set(...f.position)),
          );
          chichiCarrier.rotation.y = f.yaw;
          walking = !reduced;
          reaction = { paw: f.paw };
        } else if (action === "play" && g) {
          const local = framePoint.set(
            Math.sin(elapsed * 2) * 0.7,
            0.16 +
              (!reduced && ["feather", "scratch"].includes(id)
                ? Math.abs(Math.sin(elapsed * 3)) * 0.65
                : 0),
            Math.cos(elapsed * 2) * 0.7,
          );
          if (id === "tunnel") {
            local.set(Math.sin(elapsed) * 1.35, 0.16, 0);
          }
          chichiCarrier.position.copy(g.localToWorld(local));
          chichiCarrier.rotation.y = -elapsed * 2;
          walking = true;
        } else if (action === "rest" && g) {
          chichiCarrier.position.copy(
            g.localToWorld(
              framePoint.set(0, g.userData.id === "bed" ? 0.3 : 0.16, 0),
            ),
          );
          reaction = { headPitch: 0.12 };
        } else if (action === "eat" && g) {
          chichiCarrier.position.copy(
            g.localToWorld(framePoint.set(-0.3, 0.16, 0.8)),
          );
          chichiCarrier.rotation.y = Math.atan2(
            g.position.x - chichiCarrier.position.x,
            g.position.z - chichiCarrier.position.z,
          );
          reaction = {
            headPitch: reduced ? 0.25 : 0.25 + Math.sin(elapsed * 4) * 0.06,
          };
        } else if (action === "explore" && g) {
          chichiCarrier.rotation.y =
            g.rotation.y + Math.sin(elapsed * 0.9) * 0.3;
        } else if (action === "party") {
          chichiCarrier.position.y =
            0.35 + (reduced ? 0 : Math.abs(Math.sin(elapsed * 4)) * 0.15);
          chichiCarrier.rotation.y = Math.sin(elapsed * 2) * 0.35;
        } else if (action === "meet" && op.neighbor) {
          const frame = socialFrame(elapsed, op.socialKind, reduced);
          chichiCarrier.position.set(
            op.socialOrigin.x + frame.hero.x,
            op.socialOrigin.y + frame.hero.jump,
            op.socialOrigin.z + frame.hero.z,
          );
          chichiCarrier.rotation.y = frame.hero.yaw;
          walking = frame.hero.running;
          reaction = frame.hero;
          if (elapsed > 2 && !op.reacted) {
            op.reacted = true;
            callbacks.onReaction?.(
              op.socialKind === "greet"
                ? "Привет… давай познакомимся! Носик к носику 🐾"
                : op.socialKind === "play"
                  ? "Догоняй меня! Ой, теперь я догоняю тебя! 🐾"
                  : "Мур… с тобой так уютно 💛",
            );
          }
          socialGlow.visible = frame.hearts;
          socialGlow.position.copy(op.socialOrigin);
          socialGlow.children.forEach((heart, i) => {
            heart.position.set(
              Math.sin(i * 2.4) * 0.55,
              1.6 + (reduced ? i * 0.12 : (elapsed * 0.45 + i * 0.25) % 1.2),
              Math.cos(i * 2.4) * 0.35,
            );
            heart.rotation.y = reduced ? i : time * 0.5 + i;
          });
        }
        if (elapsed > 1 && !op.reacted && action === "ride") {
          op.reacted = true;
          if (!reduced) emoteCat(cat, "delighted");
          callbacks.onReaction?.(
            id.includes("coaster")
              ? "Уиии! До самых звёзд! ✦"
              : "Мур! Вот это приключение! ✦",
          );
        }
        if (
          elapsed >
          (reduced
            ? 0.2
            : action === "meet"
              ? socialDuration(op.socialKind)
              : g?.userData.duration || 6)
        ) {
          resetYarn(g);
          if (g) {
            g.userData.playing = false;
            delete g.userData.heroPlayPos;
          }
          if (action !== "meet" && action !== "swim")
            chichiCarrier.position.copy(op.dismount || op.destination);
          if (g) delete g.userData.rideElapsed;
          socialGlow.visible = false;
          operation = null;
          op.resolve({
            completed: true,
            ...(action === "meet" ? { socialKind: op.socialKind } : {}),
            ...(action === "party"
              ? { participantIds: [...op.partyPresent] }
              : {}),
          });
        }
      }
    }
    if (!dialogOpen) {
      animateCat(cat, time, walking, reduced);
      if (reaction) reactCat(cat, reaction, reduced);
    }
    faceCamera.update(dt, look);
    if (dialogOpen || !worldVisible) {
      requestAnimationFrame(loop);
      return;
    }
    for (let i = 0; i < motes.length; i++)
      if (!reduced) {
        motes[i].position.y =
          0.8 + (i % 6) * 0.24 + Math.sin(time * 0.6 + i) * 0.25;
        motes[i].position.x = look.x + Math.sin(i * 2.4 + time * 0.03) * 10;
        motes[i].position.z = look.z + Math.cos(i * 2.4 + time * 0.03) * 10;
      }
    const width = container.clientWidth,
      height = container.clientHeight;
    if (Math.floor(now / 1000) !== incomeSecond) {
      incomeSecond = Math.floor(now / 1000);
      incomeCache.clear();
      for (const p of businessVenues(game))
        incomeCache.set(p.id, incomeFor(game, p.id));
    }
    for (const [id, button] of incomeButtons) {
      const object = itemGroups.get(id),
        amount = incomeCache.get(id) || 0;
      if (!object || !amount || distance > 110) {
        placeWorldBadge(button, true);
        continue;
      }
      const point = hudPoint.copy(object.position);
      point.y += 3.6;
      point.project(camera);
      const hidden =
        point.z > 1 || Math.abs(point.x) > 1.1 || Math.abs(point.y) > 1.1;
      placeWorldBadge(
        button,
        hidden,
        ((point.x + 1) * width) / 2,
        ((1 - point.y) * height) / 2,
      );
      if (hidden) continue;
      const text = "✦ " + amount;
      if (button.textContent !== text) {
        button.textContent = text;
        button.setAttribute(
          "aria-label",
          "Собрать " +
            amount +
            " монет · " +
            byItem(object.userData.placement.item).name,
        );
      }
    }
    for (const [id, g] of itemGroups)
      if (
        g.userData.placement &&
        (incomeCache.get(id) || 0) > 0 &&
        !incomeButtons.has(id)
      ) {
        const button = document.createElement("button");
        button.className = "world-income";
        button.dataset.income = id;
        button.onclick = (event) => {
          event.stopPropagation();
          callbacks.onCollectIncome?.(id);
        };
        container.append(button);
        incomeButtons.set(id, button);
      }
    for (const [id, button] of projectBadges)
      if (!itemGroups.has(id) || itemGroups.get(id).userData.built) {
        button.remove();
        projectBadges.delete(id);
      }
    for (const [id, g] of itemGroups)
      if (g.userData.permanent && !g.userData.built) {
        let button = projectBadges.get(id);
        if (!button) {
          button = document.createElement("button");
          button.className = "island-build-badge";
          button.onclick = () =>
            callbacks.onSelectIsland?.(g.userData.placement.biome);
          container.append(button);
          projectBadges.set(id, button);
        }
        const place = g.userData.placement,
          remaining = Math.max(
            0,
            Math.ceil((place.readyAt - Date.now()) / 60000),
          ),
          progress = Math.min(
            100,
            Math.max(
              0,
              ((Date.now() - place.startedAt) /
                (place.readyAt - place.startedAt)) *
                100,
            ),
          ),
          p = hudPoint.copy(g.position);
        p.y += 2;
        p.project(camera);
        const text =
          "⏳ " +
          Math.floor(progress) +
          "% · " +
          (remaining >= 60
            ? Math.floor(remaining / 60) + " ч " + (remaining % 60) + " м"
            : remaining + " м");
        if (button.textContent !== text) {
          button.textContent = text;
          button.setAttribute(
            "aria-label",
            byItem(place.item).name + ": " + text,
          );
          button.style.setProperty(
            "--build-progress",
            Math.floor(progress) + "%",
          );
        }
        const hidden =
          p.z > 1 ||
          Math.abs(p.x) > 0.98 ||
          Math.abs(p.y) > 0.94 ||
          distance > 170;
        placeWorldBadge(
          button,
          hidden,
          ((p.x + 1) * width) / 2,
          ((1 - p.y) * height) / 2,
        );
      }
    sun.position.set(look.x - 14, 35, look.z + 20);
    sun.target.position.copy(look);
    scene.fog.density = distance > 90 ? 0.0007 : 0.0035;
    updateOcclusion(now, dt);
    // The opaque shop covers the map. Keep the simulation running, but avoid
    // competing GPU draws while its miniature scenes are being rendered.
    if (!dialogOpen) {
      renderer.render(scene, camera);
      recovery.hidden = true;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  for (const mood of moodNames) {
    const image = document.querySelector(`[data-mood-image="${mood}"]`);
    if (image) image.src = CHICHI_PORTRAITS[mood];
  }
  const avatar = document.getElementById("care-avatar");
  if (avatar) {
    avatar.onload = () => {
      avatar.hidden = false;
      document.getElementById("care-avatar-fallback").hidden = true;
    };
    avatar.src = CHICHI_PORTRAITS.happy;
  }
  return {
    perform,
    performResident,
    moveResident(id, biome, position) {
      const n = npcs.get(id),
        b = byBiome(biome);
      if (!n || !b || !game.unlocked.includes(biome)) return false;
      cancelResident(id);
      let p = {
        x: position.x - b.center[0],
        z: position.z - b.center[1],
        y: 0.16,
      };
      if (biome === "sakura")
        p = nearestChillGround(p, spaRadius(n.model), chillObstacles);
      else if (biome === "water")
        p = nearestSpaGround(p, spaRadius(n.model), spaObstacles);
      if (!p) return false;
      n.carrier.position.set(
        b.center[0] + p.x,
        0.16 + islandHeight(biome, p.x, p.z),
        b.center[1] + p.z,
      );
      n.manualAnchor = { x: n.carrier.position.x, z: n.carrier.position.z };
      n.manualUntil = performance.now() + 30000;
      return true;
    },
    sync,
    focus,
    followChichi(value = !faceCamera.enabled) {
      faceCamera.setEnabled(value, look);
      if (value && !reduced && cat.userData.mood === "happy")
        emoteCat(cat, "curious");
      if (!value) focus(focused, false, true);
      return faceCamera.enabled;
    },
    isFollowingChichi: () => faceCamera.enabled,
    overview: () => focus("moon", true),
    zoom: (delta) =>
      faceCamera.enabled
        ? faceCamera.zoom(delta * 0.015)
        : (desiredDistance = THREE.MathUtils.clamp(
            desiredDistance + delta,
            21,
            600,
          )),
    beginBuild,
    updateBuild: (mode) => {
      buildMode = { ...buildMode, ...mode };
      updatePreview();
    },
    getFocused: () => focused,
    gather(biome) {
      const b = byBiome(biome);
      if (!b || operation) return false;
      const arrival = b.arrival || [0, 0],
        to = new THREE.Vector3(
          b.center[0] + arrival[0],
          0.16 + islandHeight(b.id, arrival[0], arrival[1]),
          b.center[1] + arrival[1],
        );
      spa.clear();
      crew.clear();
      chill.clear();
      residentPlay.clear();
      gatherUntil = performance.now() + 20000;
      heroGather = {
        from: chichiCarrier.position.clone(),
        to,
        start: performance.now(),
        duration: Math.max(
          1800,
          Math.min(18000, chichiCarrier.position.distanceTo(to) * 180),
        ),
      };
      for (const id of npcs.keys()) {
        mealVisits.delete(id);
        swimVisits.delete(id);
      }
      focus(biome, false, true);
      return true;
    },
    dispose() {
      disposed = true;
      spa.clear();
      crew.clear();
      chill.clear();
      residentPlay.clear();
      for (const cup of spaCups.values()) {
        scene.remove(cup);
        disposeScenery(cup);
      }
      for (const button of incomeButtons.values()) button.remove();
      for (const button of projectBadges.values()) button.remove();
      clearTimeout(detailTimer);
      for (const [id, island] of islands) {
        const pending = islandRefreshes.get(id);
        if (pending)
          pending.finally(() => island.userData.dispose?.()).catch(() => {});
        else island.userData.dispose?.();
      }
      for (const hammer of builderHammers.values()) hammer.removeFromParent();
      builderHammers.clear();
      disposeCat(cat);
      for (const npc of npcs.values()) disposeCat(npc.model);
      socialGlow.visible = false;
      royalStarGeo.dispose();
      royalStars.material.dispose();
      heartGeo.dispose();
      heartMaterial.dispose();
      resetYarn(operation?.attraction);
      operation?.resolve({ cancelled: true });
      dropHint.remove();
      dropRing.geometry.dispose();
      dropRing.material.dispose();
      viewport.dispose();
      visibility?.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", loseContext);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        restoreContext,
      );
      document.removeEventListener("visibilitychange", resume);
      recovery.remove();
      renderer.dispose();
    },
  };
}
