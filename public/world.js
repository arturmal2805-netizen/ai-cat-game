import {gatherCandidates as selectGatherCats,releaseGatherOverrides,gatherTrip,gatherFrame,gatherLanding} from './gather-system.js';
import {ZOO_ID,ZOO_EXHIBITS,zooObstacles} from './zoo-data.js';
import {zooPhotoCamera} from './zoo-gate.js';
import {applyMagicBedReach} from './magic-bed-pose.js';
import {magicBedModelSteps} from './magic-bed-models.js';
import {MAGIC_BED_ID} from './magic-bed-data.js';
import {attachMagicBedInteraction} from './magic-bed-interaction.js';
import { createShadowDepthCache } from "./shadow-depth-cache.js";
import { profileFunction } from "./work-profile.js";
import { catDrawMode } from "./cat-draw-policy.js";
import {worldRoads,WORLD_ROAD_WIDTH} from './world-roads.js';
import {captureCatLocations} from './cat-locations.js';
import {islandCameraFar, jobBuildingCameraView} from './camera-views.js';
import {
  HOUSING_ID,
  HOUSING_CENTER,
  HOUSING_SECTION_PITCH,
  housingPlot,
  housingSectionIndex,
} from "./housing-data.js";
import { createHousingRuntime, homeRestTime } from "./housing-runtime.js";
import { createLeisureRuntime, familyFollowTarget } from "./leisure-runtime.js";
import { leisureOffers } from "./leisure-data.js";
import { familyPartners } from "./family-system.js";
import { cityClock } from "./jobcity-system.js";
import { jobBusiness, JOB_CITY_CENTER } from "./jobcity-data.js";
import { jobBuildingSteps, cityCar, animateCityCar } from "./jobcity-assets.js";
import { createJobCityRuntime, jobCatFrame } from "./jobcity-runtime.js";
import {
  nearestRoad,
  cityPoint,
  nearestCityGround,
  cityViewOccluders,
} from "./jobcity-navigation.js";
import { aquariumTank } from "./aquarium-data.js";
import { attractionVisibility } from "./attraction-visibility.js";
import { rideGuests } from "./ride-guests.js";
import { createRenderPacer } from "./render-pacer.js";
import { createGpuFrameQueue } from "./gpu-frame-queue.js";
import { configureStaticSubmissions } from "./static-submissions.js";
import {
  createStaticDrawBatch,
  STATIC_PICK_LAYER,
} from "./static-draw-batch.js";
import {
  prepareCatPicking,
  updateCatPickingBounds,
} from "./cat-picking-bounds.js";
import { skipUnusedSkinJoints } from "./native-skinning.js";
import { cacheNativeSkinBounds } from "./native-skin-bounds.js";
import {
  enableCatRenderBatch,
  batchSceneCats,
  CAT_PICK_LAYER,
} from "./cat-render-batch.js";
import { createCatPoseAtlas } from "./cat-pose-atlas.js";
import { createColonyRenderBatch } from "./colony-render-batch.js";
import { builderSpeed } from "./construction-boost.js";
import { bikiniFriend, BIKINI_GATE } from "./bikini-data.js";
import { createBikiniCharacter } from "./bikini-characters.js";
import { createBikiniLife } from "./bikini-life.js";
import {
  COURT_VENUES,
  ALL_COURT_VENUES,
  courtLayout,
  COURT_GATE,
  courtObject,
  courtProject,
} from "./foodcourt-data.js";
import {
  courtVenue,
  courtVenueSteps,
  courtFood,
  courtBlueprint,
} from "./foodcourt-assets.js";
import {
  courtObstacles,
  courtWalkable,
  nearestCourtGround,
  nearestCourtIdleGround,
} from "./foodcourt-navigation.js";
import { createCourtRuntime } from "./foodcourt-runtime.js";
import { createCourtCinema } from "./foodcourt-cinema.js";
import { placeCourtFood } from "./court-food-pose.js";
import { mosaDryPoint } from "./mosasaur-data.js";
import { createResidentPlay } from "./resident-play.js";
import {
  reserveSlide,
  releaseSlide,
  launchSlide,
  hasSlideRoom,
} from "./slide-riders.js";
import { createSlideAudio } from "./slide-audio.js";
import { referenceSlideSteps } from "./reference-slide-assets.js";
import { atollPreparationNeeded } from "./atoll-streaming.js";
import {applyAtollSit} from './atoll-slide-acting.js';
import {magicFarmTarget} from './magic-farm-target.js';
import {magicFarm,farmActivity} from './magic-farms-data.js';
import {farmWalkable,nearestFarmGround} from './magic-farm-harvest.js';
import { decorateBusiness } from "./business-decor.js";
import {
  attachBuilderHammer,
  attachBuilderGlow,
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
import {
  islandOverviewDistance,
  randomCameraCat,
  attractionCameraView,
} from "./camera-views.js";
import { placeWorldBadge } from "./world-hud.js";
import { islandProjectModel } from "./island-project-model.js";
import { islandObjects } from "./world-objects.js";
import { swimFrame } from "./swimming.js";
import { activeCats } from "./cat-roster.js";
import { catAppearance } from "./cat-breeds.js";
import {stepCatGround} from "./cat-ground-motion.js";
import { createRideOutings } from "./ride-outings.js";
import { watchWorldViewport } from "./world-viewport.js";
import { createWorldMotes } from "./world-effects.js";
import { catNavigationRadius } from "./cat-navigation-size.js";
import {
  pauseHiddenMatrixUpdates,
  prepareIslandMatrices,
} from "./scene-visibility.js";
import {
  incomeForVenue,
  incomeSymbol,
  businessVenues,
  businessLevel,
  revenueRate,
  businessXP,
} from "./business.js";
import {
  spaObject,
  SPA_GATE,
  SPA_ENTRANCES,
  SPA_DRINKS,
  SPA_JACUZZI,
} from "./spa-data.js";
import { spaClear, spaWalkable, nearestSpaGround } from "./spa-navigation.js";
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
import { cacheSceneAdditions } from "./matrix-cache.js";
import { createFrameProfile } from "./frame-profile.js";
import { cameraBlend as blendCamera, wheelPixels } from "./camera-timing.js";
import { createShaderWarmup } from "./shader-warmup.js";
import { createGeometryResidency } from "./geometry-residency.js";
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
import {
  socialFrame,
  socialDuration,
  socialContext,
  chooseSocialRide,
} from "./social-animation.js";
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
  const slideAudio = createSlideAudio(renderer.domElement);
  const gpuFrames = createGpuFrameQueue(renderer.getContext());
  const frameProfile = createFrameProfile(renderer);
  configureStaticSubmissions(renderer);
  const geometryResidency = createGeometryResidency(renderer);
  renderer.shadowMap.enabled = true;
  // Three 0.186 already converts the removed PCFSoft type to PCF on first use.
  // Select that same effective filter before any shader is precompiled.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0xb5bfdc);
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    `Сказочный мир Чичи: ${BIOMES.length} биомов, коты и атттракционы`,
  );
  const scene = new THREE.Scene();
  const matrixCache = cacheSceneAdditions(scene);
  const attractionViews = new WeakMap(),
    attractionFrustum = new THREE.Frustum(),
    attractionProjection = new THREE.Matrix4();
  scene.matrixAutoUpdate = false;
  scene.fog = new THREE.FogExp2(0xc0bfd7, 0.0035);
  // The closest allowed orbit is 21 units. A less extreme near/far ratio gives
  // small ground decorations more depth precision without clipping that orbit.
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 1200);
  const staticDraws = createStaticDrawBatch(scene, renderer, camera, {
    prepare: (root) => shaderWarmup.prepare(root, {
      background: true,
      needed: () => root.parent === scene,
    }),
  });
  const look = new THREE.Vector3(0, 0, 0),
    desiredLook = look.clone();
  let azimuth = 0.72,
    distance = 37,
    desiredDistance = 37,
    elevation = 0.67,
    overviewElevation = null,
    overviewAspect = camera.aspect;
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
  let lastCameraGesture = -Infinity,
    worldVisible = true;
  const shaderWarmup = createShaderWarmup(
    renderer,
    scene,
    camera,
    sun.shadow.camera,
    {
      canRun: () =>
        performance.now() - lastCameraGesture > 120 && !document.hidden &&
        worldVisible && !document.querySelector("dialog[open]") && !frameProfile?.suspended,
      isRelevant: (root) =>
        root.userData.placement
          ? root.userData.placement.biome === focused
          : root.userData.biomeId
            ? root.userData.biomeId === focused
            : root.visible,
    },
  );
  const sharedCats = catDrawMode() === "automatic";
  const poseAtlas = createCatPoseAtlas(scene, sun, { minimumCats: 7, sharingEnabled: sharedCats });
  const colonyDraws = createColonyRenderBatch(
    scene,
    renderer,
    camera,
    poseAtlas,
    { enabled: sharedCats },
  );
  const shadowDepth = createShadowDepthCache(renderer, scene, sun);
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
  // The large-island overview can move outside the original sky sphere.
  // Grow only its background shell; ordinary close views retain the exact sky.
  sky.material.vertexShader=sky.material.vertexShader.replace(
    "gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);",
    "gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=min(gl_Position.z,gl_Position.w*.999999);",
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
    royalCenter = [0,0],
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
  let megaGroundPlots = [];
  const megaGroundPoint = { x: 0, z: 0 };
  const rideOutings = createRideOutings();
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
    actorKey = "",
    focused = "moon",
    viewingOverview = false,
    overviewDistanceLimit = 2400,
    buildMode = null,
    preview = null,
    operation = null,
    disposed = false;
  const viewDistanceLimit=()=>viewingOverview?overviewDistanceLimit:
    Math.max(600,islandOverviewDistance(byBiome(focused)?.radius,camera.fov,camera.aspect));
  const chichiCarrier = new THREE.Group();
  chichiCarrier.position.set(-6, 0.14, -3);
  if (initialGame.catPosition) {
    const saved = initialGame.catPosition,
      p =
        saved.biome === "autumn"
          ? { ...saved, ...mosaDryPoint(saved.x, saved.z) }
          : saved.biome === "summer"
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
  const heroLocation=initialGame.catLocations?.chichi;
  if(heroLocation){
    const b=byBiome(heroLocation.biome);
    if(b){chichiCarrier.position.set(b.center[0]+heroLocation.x,heroLocation.y,b.center[1]+heroLocation.z);
      chichiCarrier.rotation.y=heroLocation.yaw;}
  }
  let heroGather = null,
    gatherUntil = 0;
  const gatherParticipants=new Set();
  let gatherSavePending=false;
  function availableGatherCats(){return selectGatherCats(game,Date.now(),id=>({working:!!jobs.get(id)?.job||crew.workers.has(id),sleeping:id==='chichi'?!!game.care?.resting:npcs.get(id)?.model.userData.mood==='sleep'}));}
  const incomeButtons = new Map(),
    projectBadges = new Map();
  let incomeSecond = -1;
  const incomeCache = new Map();
  let cat = createCat(initialGame.cat.mood);
  skipUnusedSkinJoints(cat);
  cacheNativeSkinBounds(cat);
  chichiCarrier.add(cat);
  scene.add(chichiCarrier);
  const heroVisibility = attractionVisibility(chichiCarrier);
  let followedCatId = "chichi",
    lastRandomCatId = null;
  const faceCamera = createChichiCamera(camera, cat.userData.head, {
    reduced,
    onChange: (enabled) =>
      callbacks.onCameraMode?.(
        enabled,
        enabled
          ? {
              id: followedCatId,
              name:
                followedCatId === "chichi"
                  ? "Чичи"
                  : npcs.get(followedCatId)?.profile.name,
            }
          : null,
      ),
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
  const spaRadius = catNavigationRadius;
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
        finishLeisure(receipt.catId);
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
        finishLeisure(receipt.catId);
      }
    },
  });
  const housingLife = createHousingRuntime({ reduced });
  const leisure = createLeisureRuntime();
  let leisureCatalogue = new Map(),
    leisureKey = "",
    familyLinks = new Map(),
    lifeActors = [];
  function finishLeisure(id, result = null) {
    const visit = leisure.finish(id);
    const actor = npcs.get(id);
    if (actor && visit) actor.manualUntil = 0;
    if (visit) callbacks.onLeisureComplete?.(id, visit, result);
  }
  function stepLeisure(dt, time, now) {
    if (!game.jobCity) return;
    const clock = cityClock(game.jobCity),
      actors = lifeActors;
    for (const a of actors) {
      const p = game.jobCity.profiles[a.id],
        v = jobs.get(a.id);
      if (
        v &&
        !v.job &&
        v.phase !== "leave" &&
        !v.manual &&
        !p?.trip &&
        (!clock.working || p?.schedule?.job === "rest") &&
        (familyLinks.has(a.id) || p?.schedule?.outings?.length)
      )
        jobs.cancel(a.id);
    }
    leisure.step(game, actors, dt, time, {
      clock,
      offers: leisureCatalogue,
      allow: callbacks.canSimulateLeisure?.() !== false,
      blocked: (id, visit) => {
        const n = npcs.get(id),
          p = game.jobCity.profiles[id];
        return (
          !p ||
          draggingCat?.catId === id ||
          (gatherParticipants.has(id) && (now < gatherUntil || now < (n?.gatheredUntil || 0))) ||
          crew.workers.has(id) ||
          p.trip ||
          Date.now() < (p.manualUntil || 0) ||
          (jobs.has(id) && !(visit && jobs.get(id)?.decision?.leisure)) ||
          housingLife.get(id) ||
          (id === "chichi"
            ? callbacks.isHeroBusy?.() ||
              heroGather ||
              game.care?.resting ||
              (operation && !operation.leisureTicket)
            : (!visit &&
                (now < (n?.manualUntil || 0) ||
                  residentPlay.get(id) ||
                  residentPlay.friendVisit(id) ||
                  spa.get(id) ||
                  chill.get(id) ||
                  court.get(id) ||
                  mealVisits.has(id) ||
                  swimVisits.has(id))) ||
              operation?.decision.friendId === id ||
              operation?.partyIds?.has(id))
        );
      },
      active: (id) =>
        id === "chichi"
          ? !!operation?.leisureTicket
          : !!(
              residentPlay.get(id) ||
              court.get(id) ||
              spa.get(id) ||
              chill.get(id) ||
              jobs.get(id)?.decision?.leisure
            ),
      prepare: (offer) => {
        ensureDetail(offer.biome);
        const g = itemGroups.get(offer.id);
        return !!g?.userData.built;
      },
      skip: (id, ticket) =>
        callbacks.onLeisureComplete?.(id, ticket, {
          completed: false,
          skipped: true,
        }),
      destination: (offer, a, slot, members) => {
        const b = byBiome(offer.biome);
        // Local visits start on the existing collision-aware native path.
        if (
          Math.hypot(a.position.x - b.center[0], a.position.z - b.center[1]) <
          (b.radius || 12)
        )
          return a.position;
        const arrival = b.arrival || [0, 0],
          other = members.find((id) => id !== a.id),
          gap =
            a.radius +
            (actors.find((x) => x.id === other)?.radius || 0.6) +
            0.5;
        let p = {
          x: arrival[0] + (slot ? gap : -gap / 2),
          z: arrival[1] - 3,
          y: 0.16,
        };
        if (["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id))
          p = nearestCourtGround(p, a.radius, getCourtBlockers(b.id), b.id);
        else if (b.id === "sakura")
          p = nearestChillGround(p, a.radius, chillObstacles);
        else if (b.id === "water")
          p = nearestSpaGround(p, a.radius, spaObstacles);
        if (!p) return null;
        return {
          x: b.center[0] + p.x,
          z: b.center[1] + p.z,
          y: 0.16 + islandHeight(b.id, p.x, p.z),
        };
      },
      start: (id, offer, ticket) => {
        const decision = {
          mood: "happy",
          action: offer.action,
          activityId: offer.id,
          thought: "Час для нашої маленької пригоди",
          leisure: true,
        };
        if (id === "chichi") {
          if (operation) return false;
          const promise = perform(decision, {
            leisureTicket: ticket,
            background: true,
          });
          if (operation) operation.leisureTicket = ticket;
          promise
            .then((result) => {
              if (result.completed) finishLeisure(id, result);
              else leisure.cancel(id);
            })
            .catch(() => leisure.cancel(id));
          return true;
        }
        const n = npcs.get(id);
        if (!n) return false;
        n.leisureBiome = offer.biome;
        return performResident(id, decision, { autonomous: true });
      },
      stop: (id) => {
        if (id === "chichi") {
          if (operation?.leisureTicket) cancelHeroActivity();
        } else {
          cancelResident(id);
          const n = npcs.get(id);
          if (n) n.manualUntil = 0;
        }
      },
    });
  }
  const jobs = createJobCityRuntime({
    onVisitDone: (id, decision) => {
      if (id === "chichi" && operation?.jobCity) operation.jobFinished = true;
      else if (decision) {
        callbacks.onResidentAction?.(id, decision);
        if (decision.leisure) finishLeisure(id);
      }
    },
    onAttendance: (id, job, active) =>
      callbacks.onJobAttendance?.(id, job, active),
    onTripDone: (id, trip, position) =>
      callbacks.onCityTripDone?.(id, trip, position),
  });
  const cityCars = new Map();
  let cityDriveChoice = null;
  const drivePrompt = document.createElement("button");
  drivePrompt.className = "jobcity-drive-prompt";
  drivePrompt.hidden = true;
  drivePrompt.onclick = () => {
    cityDriveChoice = null;
    drivePrompt.hidden = true;
  };
  container.append(drivePrompt);
  function applyJobFrame(v, carrier) {
    carrier.position.set(
      JOB_CITY_CENTER[0] + v.position.x,
      v.position.y,
      JOB_CITY_CENTER[1] + v.position.z,
    );
    carrier.rotation.y = v.yaw;
  }
  function updateCityCar(id, v, time) {
    // The owned car returns to inventory after exit. Keep no idle draw object
    // or parked-car stack in the scene; the next trip spawns a shared template.
    if (!v?.carVisible) {
      cityCars.get(id)?.removeFromParent();
      cityCars.delete(id);
      return;
    }
    let car = cityCars.get(id);
    const spec = v.car;
    if (!spec) return;
    if (!car || car.userData.carId !== spec) {
      car?.removeFromParent();
      car = cityCar(spec);
      cityCars.set(id, car);
      scene.add(car);
    }
    const position = v.carPosition;
    car.visible = !!position && focused === "jobcity";
    if (!position) return;
    car.position.set(
      JOB_CITY_CENTER[0] + position.x,
      0.16,
      JOB_CITY_CENTER[1] + position.z,
    );
    car.rotation.y = v.yaw;
    animateCityCar(car, jobs.get(id)?.distance || 0, v.steer || 0, reduced);
  }
  const courtModels = new Map(),
    courtPreparing = new Map();
  const referenceModels = new Map(),
    referencePreparing = new Map(),
    // Recover the latest finished build after an offline completion, without
    // preparing the whole purchased park at startup.
    referenceRequested = new Set(initialGame.placements.filter(p=>byItem(p.item)?.premiumWater&&p.readyAt>0&&isBuilt(p)).sort((a,b)=>b.readyAt-a.readyAt).slice(0,1).map(p=>p.id)),
    knownReferencePlacements = new Set(initialGame.placements.map(p=>p.id));
  function prepareReference(placement) {
    if(referencePreparing.has(placement.id))return referencePreparing.get(placement.id);
    const task=prepareSceneSteps(placement.item===MAGIC_BED_ID?magicBedModelSteps(game.farm.fields[placement.id]):referenceSlideSteps(placement.item),{scheduler:scenePreparation,priority:placement.biome});
    let staged=null,attached=false;
    const ready=task.then(async model=>{
      staged=model;
      const current=()=>game.placements.find(p=>p.id===placement.id&&p.item===placement.item);
      if(disposed||!current()||!isBuilt(current())){referencePreparing.delete(placement.id);disposeScenery(model);return false;}
      await shaderWarmup.prepare(model,{background:placement.biome!==focused});
      if(disposed||!current()||!isBuilt(current())){referencePreparing.delete(placement.id);disposeScenery(model);return false;}
      const old=itemGroups.get(placement.id);
      if(old){scene.remove(old);disposeScenery(old);itemGroups.delete(placement.id);}
      referenceModels.set(placement.id,model);attached=true;referencePreparing.delete(placement.id);referenceRequested.delete(placement.id);sceneKey="";sync(game);
      if(courtCamera?.attraction&&courtCamera.id===placement.id)applyAttractionCamera(itemGroups.get(placement.id));
      return true;
    }).catch(error=>{referencePreparing.delete(placement.id);if(staged&&!attached)disposeScenery(staged);console.warn("Water attraction preparation failed",error);return false;});
    referencePreparing.set(placement.id,ready);return ready;
  }
  let previewGeneration = 0;
  const courtBiome = byBiome("foodcourt"),
    courtFoods = new Map(),
    cinema = createCourtCinema(container);
  let courtExtra = [],
    courtBlockers = courtObstacles(),
    bikiniBlockers = courtObstacles([], "bikini"),
    aquariumBlockers = courtObstacles([], "aquarium"),
    zooBlockers=zooObstacles(),
    nextCourtStart = 0,
    courtCamera = null;
  const getCourtBlockers = (biome = "foodcourt") =>
    biome === ZOO_ID ? zooBlockers : biome === "aquarium"
      ? aquariumBlockers
      : biome === "bikini"
        ? bikiniBlockers
        : courtBlockers;
  const courtLocal = (p, biome = "foodcourt") => ({
    x: p.x - byBiome(biome).center[0],
    z: p.z - byBiome(biome).center[1],
    y: p.y,
  });
  const courtExit = document.createElement("button");
  courtExit.className = "court-camera-exit";
  courtExit.textContent = "← Вернуться на остров";
  courtExit.hidden = true;
  container.append(courtExit);
  function exitCourt(restore = true) {
    if (!courtCamera) return;
    const old = courtCamera;
    courtCamera = null;
    const roof = itemGroups.get(old.id)?.userData.roof;
    if (roof) roof.visible = true;
    courtExit.hidden = true;
    courtOrder.hidden = true;
    cinema.show(false);
    if (restore) {
      desiredLook.copy(old.look);
      desiredDistance = old.distance;
      azimuth = old.azimuth;
      elevation = old.elevation;
    }
  }
  const courtOrder = document.createElement("button");
  courtOrder.className = "court-camera-exit court-order";
  courtOrder.hidden = true;
  container.append(courtOrder);
  courtOrder.onclick = () => {
    if (courtCamera) callbacks.onCourtOrder?.(courtCamera.id);
  };
  courtExit.onclick = () => exitCourt();
  function enterCourt(id, fishIndex) {
    const o = courtObject(id),
      g = itemGroups.get(id);
    if (!o || !(g?.userData.built || o.kind === "zoo" && courtProject(game,id)?.built)) return false;
    exitCourt();
    faceCamera.setEnabled(false, look);
    focused = o.biome;
    viewingOverview = false;
    overviewElevation = null;
    const venueBiome = byBiome(o.biome);
    courtCamera = {
      id,
      look: desiredLook.clone(),
      distance: desiredDistance,
      azimuth,
      elevation,
      ...(o.kind === "zoo" && Number.isInteger(fishIndex)?{zooAnimal:fishIndex}:{}),
      ...(o.kind === "aquarium" && Number.isInteger(fishIndex)
        ? { fishIndex }
        : {}),
    };
    if (g?.userData.roof) g.userData.roof.visible = false;
    desiredLook.set(
      venueBiome.center[0] + o.x,
      1.8,
      venueBiome.center[1] + o.z + (o.kind === "cinema" ? 0 : 1),
    );

    desiredDistance =
      o.kind === "cinema" ? (mobileRender ? 40 : 30) : mobileRender ? 24 : 19;
    if (o.kind === "aquarium") {
      desiredLook.set(
        venueBiome.center[0] + o.x,
        o.h * 0.43,
        venueBiome.center[1] + o.z,
      );
      desiredDistance = mobileRender
        ? Math.max(30, o.w * 1.8)
        : Math.max(23, o.w * 1.4);
      if (Number.isInteger(fishIndex)) {
        desiredLook.copy(
          g.localToWorld(
            g.userData.fishPoint(fishIndex, performance.now() / 1000),
          ),
        );
        desiredDistance = Math.max(
          13,
          (fishIndex === 0 ? o.hero : 0.7) * 7 + 6,
        );
      }
      ensureDetail("aquarium");
    }
    azimuth = 0.06;
    if(o.kind === "zoo"){
      ensureDetail(ZOO_ID);desiredLook.y=o.species === "axolotl"?1.8:1.3;desiredDistance=Number.isInteger(fishIndex)?(mobileRender?6:4.8):mobileRender?17:14;azimuth=Math.atan2(-o.x,-o.z);
    }
    elevation =
      o.kind === "zoo" ? Number.isInteger(fishIndex) ? .2 : .48 : o.kind === "aquarium"
        ? Number.isInteger(fishIndex)
          ? 0.32
          : 0.58
        : 0.85;
    courtExit.hidden = false;
    courtOrder.hidden = false;
    courtOrder.textContent =
      o.kind === "zoo" ? "📸 Покликати Чічі до тварин" : o.kind === "aquarium"
        ? "🐠 Позвать Чичи смотреть рыбок"
        : o.kind === "cinema"
          ? "Позвать Чичи смотреть кино"
          : "Позвать Чичи · заказать";
    cinema.show(o.kind === "cinema");
    return true;
  }
  function applyAttractionCamera(g) {
    if (g.userData.jobBusiness) g.updateWorldMatrix(true, true);
    const viewFor = g.userData.jobBusiness
      ? jobBuildingCameraView
      : attractionCameraView;
    let bounds=new THREE.Box3().setFromObject(g);
    if(g.userData.loadingReference){
      const item=byItem(g.userData.placement.item),[w,d]=item.footprint;g.updateWorldMatrix(true,false);
      bounds=new THREE.Box3(new THREE.Vector3(-w/2,0,-d/2),new THREE.Vector3(w/2,item.height+5,d/2)).applyMatrix4(g.matrixWorld);
    }
    const view = viewFor(
      bounds,
      camera.fov,
      camera.aspect,
      g.rotation.y,
      (g.userData.premiumWater||byItem(g.userData.placement?.item)?.premiumWater) ? 1.02 : undefined,
    );
    desiredLook.copy(view.target);
    desiredDistance = view.distance;
    azimuth = view.azimuth;
    elevation = view.elevation;
    if (courtCamera) courtCamera.aspect = camera.aspect;
  }
  function inspectAttraction(id) {
    const g = itemGroups.get(id);
    if (!g?.userData.built&&!(g?.userData.loadingReference&&isBuilt(g.userData.placement))) return false;
    focus(g.userData.placement.biome);
    courtCamera = {
      id,
      attraction: true,
      look: desiredLook.clone(),
      distance: desiredDistance,
      azimuth,
      elevation,
    };
    if (g.userData.jobBusiness && g.userData.roof)
      g.userData.roof.visible = false;
    applyAttractionCamera(g);
    if(g.userData.loadingReference){referenceRequested.add(id);prepareReference(g.userData.placement);}
    courtExit.hidden = false;
    courtOrder.hidden = true;
    return true;
  }
  const court = createCourtRuntime({
    getObstacles: getCourtBlockers,
    canPrepare: (o) => bikiniLife.canPrepare(o),
    isReady: (id) =>
      courtProject(game, id)?.built &&
      (id !== "bikini-krusty" ||
        !itemGroups.get("bikini-sponge")?.userData.playing),
    getCinema: () => cinema.playback,
    onGreet:(id,time)=>islands.get(ZOO_ID)?.userData.greet?.(id,time),
    onComplete: (receipt) => {
      if (receipt.catId === "bikini-patrick-guest") return;
      if (receipt.catId === "chichi" && operation?.court)
        operation.spaCompleted = receipt;
      else {
        const n = npcs.get(receipt.catId),
          manual = n?.manualWellnessId === receipt.id;
        if (n) n.manualWellnessId = null;
        callbacks.onSpaVisit?.({
          ...receipt,
          ...(manual ? { manual: true } : {}),
        });
        finishLeisure(receipt.catId);
      }
    },
  });
  const bikiniLife = createBikiniLife({
    groups: itemGroups,
    court,
    center: byBiome("bikini").center,
    getObstacles: () => bikiniBlockers,
    getActors: () => {
      const actors = [...npcs]
        .filter(([, n]) => n.profile.biome === "bikini")
        .map(([id, n]) => ({
          catId: id,
          biome: "bikini",
          position: courtLocal(n.carrier.position, "bikini"),
          radius: spaRadius(n.model),
        }));
      const p = courtLocal(chichiCarrier.position, "bikini");
      if (Math.hypot(p.x, p.z) < byBiome("bikini").radius)
        actors.push({
          catId: "chichi",
          biome: "bikini",
          position: p,
          radius: spaRadius(cat),
        });
      return actors;
    },
  });
  function startHeroCourt(op) {
    op.stage = "court";
    const o = courtObject(op.decision.activityId),
      venueBiome = byBiome(o.biome),
      r = spaRadius(cat),
      local = courtLocal(chichiCarrier.position, o.biome),
      origin = nearestCourtGround(
        Math.hypot(local.x, local.z) < venueBiome.radius
          ? local
          : courtLayout(o.biome).gate,
        r,
        getCourtBlockers(o.biome),
        o.biome,
      );
    const v =
      origin &&
      court.start({
        catId: "chichi",
        objectId: o.id,
        position: origin,
        radius: r,
      });
    if (!v) {
      op.spaFailed = true;
      callbacks.onReaction?.("Здесь пока занято. Попробуем другое заведение.");
    }
  }
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
  const ambient = createWorldMotes();
  scene.add(ambient);
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
      lowOnly: biome.id !== "moon" && biome.id !== HOUSING_ID,
      placements,
      scenery,
    });
    showWhalePreview(g, biome.id);
    islandContentKeys.set(biome.id, JSON.stringify([placements, scenery]));
    g.position.set(biome.center[0], 0, biome.center[1]);
    prepareIslandMatrices(g);
    if (biome.id === HOUSING_ID) g.userData.prepareModel = model =>
      shaderWarmup.prepare(model, { background: focused !== HOUSING_ID });
    if (biome.id === HOUSING_ID) g.userData.prepareHousingSteps = steps =>
      prepareSceneSteps(steps, { scheduler: scenePreparation, priority: HOUSING_ID });
    scene.add(g);
    islands.set(biome.id, g);
    return g;
  }
  const islandRefreshes = new Map();
  const detailJobs = new Map(),
    scenePreparation = createSceneScheduler({
      getPriority: () => focused,
      canRun: priority =>
        disposed ||
        (!document.hidden && worldVisible && !frameProfile?.suspended && !document.querySelector("dialog[open]") &&
          (priority === focused || performance.now() - lastCameraGesture > 120)),
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
        { scheduler: scenePreparation, priority: island.userData.biomeId },
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
          desiredDistance < Math.max(110, (b.radius || 12) * 7,b.magicFarm?islandOverviewDistance(b.radius,camera.fov,camera.aspect)*1.1:0) &&
          Math.hypot(b.center[0] - desiredLook.x, b.center[1] - desiredLook.z) <
            (["jobcity","homestead"].includes(b.id) || b.waterpark || b.magicFarm ? b.radius + 10 : 40) && (!b.magicFarm||focused===b.id)
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
          g.userData.syncOrchard?.(game.farm?.orchards?.[id]);
          prepareIslandMatrices(g);
          g.updateMatrixWorld(true);
          // Compile against the real scene lighting while the old island remains
          // usable. Parallel shader compilation avoids the first-visit hitch.
          await sceneTurn();
          if (!disposed)
            await shaderWarmup.prepare(g, { background: id !== focused });
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
  const constructionBridges = worldRoads(BIOMES,islandHeight);
  for (const link of constructionBridges) {
    const from = new THREE.Vector3(
        link.start.x,
        link.start.y,
        link.start.z,
      ),
      to = new THREE.Vector3(link.end.x, link.end.y, link.end.z),
      direction = to.clone().sub(from).normalize(),
      side = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
    const middle = from.clone().add(to).multiplyScalar(0.5);
    const bridge = box(
      scene,
      0xc6aa85,
      middle.x,
      middle.y-.04,
      middle.z,
      WORLD_ROAD_WIDTH,
      0.12,
      from.distanceTo(to),
    );
    bridge.lookAt(to);
    for (const sign of [-1, 1]) {
      const a = from.clone().addScaledVector(side, sign * (WORLD_ROAD_WIDTH/2-.08)),
        c = to.clone().addScaledVector(side, sign * (WORLD_ROAD_WIDTH/2-.08)),
        b = a.clone().add(c).multiplyScalar(0.5);
      a.y+=.52;c.y+=.52;b.y+=.3;
      const rope = new THREE.CatmullRomCurve3([a, b, c]);
      primitive(
        scene,
        new THREE.TubeGeometry(rope, 12, 0.045, 5, false),
        0xe0c6a4,
      );
    }
  }
  let buildingSites = [],
    nextSiteCheck = 0,
    builderObstacles = new Map();
  const crew = createConstructionCrew({
    getSpeed: () => builderSpeed(game),
    bridges: constructionBridges,
    getSites: () => buildingSites,
    getObstacles: (id) => builderObstacles.get(id) || [],
  });
  let nextMagicFarmAttempt=0;
  const residentPlay = createResidentPlay({
    concurrentSlides: true,
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
    onComplete: (id, decision, result) => {
      callbacks.onResidentAction?.(id, decision, result);
      if (decision.leisure) finishLeisure(id);
    },
  });
  function cancelResident(id, keepLeisure = false) {
    if (!keepLeisure) leisure.cancel(id);
    const actor = npcs.get(id);
    if(actor){actor.pendingReference=null;actor.gatherTrip=null;actor.gatheredUntil=0;}
    if (actor && !keepLeisure) actor.leisureBiome = null;
    if (actor) actor.manualWellnessId = null;
    const greeting = residentPlay.friendVisit(id);
    if (greeting) residentPlay.cancel(greeting.id);
    residentPlay.cancel(id);
    spa.cancel(id);
    chill.cancel(id);
    court.cancel(id);
    jobs.cancel(id);
    crew.cancel(id);
    mealVisits.delete(id);
    swimVisits.delete(id);
  }
  function performResident(id, decision, { autonomous = false } = {}) {
    const n = npcs.get(id),
      object = itemGroups.get(decision.activityId);
    if(n&&object?.userData.loadingReference&&isBuilt(object.userData.placement)){
      cancelResident(id,!!decision.leisure);const token={id:decision.activityId};n.pendingReference=token;referenceRequested.add(token.id);
      prepareReference(object.userData.placement).then(ok=>{if(n.pendingReference!==token)return;n.pendingReference=null;if(ok)performResident(id,decision,{autonomous});});return true;
    }
    if (
      !n ||
      (decision.activityId &&
        (!object?.userData.built ||
          (operation?.decision.activityId === decision.activityId &&
            !hasSlideRoom(object) &&
            !object?.userData.harvests?.available() &&
            !chillObject(decision.activityId) &&
            !spaObject(decision.activityId) &&
            !courtObject(decision.activityId))))
    )
      return false;
    if (!autonomous && !object?.userData.slideWater && !object?.userData.magicFarm && !object?.userData.magicBed)
      for (const [other, v] of residentPlay.visits)
        if (
          other !== id &&
          v.autonomous &&
          v.decision.activityId === decision.activityId
        )
          cancelResident(other);
    cancelResident(id, !!decision.leisure);
    if (
      bikiniFriend(decision.activityId) &&
      !bikiniLife.reserve(decision.activityId, decision.characterAction, {
        catId: id,
        model: n.model,
      })
    )
      return false;
    n.manualAnchor = null;
    n.manualUntil = performance.now() + 90000;
    if (jobBusiness(decision.activityId))
      return !!jobs.visit(
        id,
        decision.activityId,
        {
          x: n.carrier.position.x - JOB_CITY_CENTER[0],
          y: n.carrier.position.y,
          z: n.carrier.position.z - JOB_CITY_CENTER[1],
        },
        decision,
      );
    if (courtObject(decision.activityId)) {
      const biome = courtObject(decision.activityId).biome;
      const local = courtLocal(n.carrier.position, biome),
        radius = spaRadius(n.model),
        origin = nearestCourtGround(
          local,
          radius,
          getCourtBlockers(biome),
          biome,
        );
      const v =
        origin &&
        court.start({
          catId: id,
          objectId: decision.activityId,
          position: origin,
          radius,
        });
      if (v) n.manualWellnessId = v.id;
      return !!v;
    }
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
    const started = residentPlay.start(id, decision);
    if (started && autonomous) residentPlay.get(id).autonomous = true;
    if (!started && bikiniFriend(decision.activityId))
      object.userData.playing = false;
    if(started&&autonomous&&(object?.userData.magicFarm||object?.userData.magicBed))n.manualUntil=performance.now()+5000;
    return started;
  }
  const builderHammers = new Map();
  function builderHammer(id, model, frame) {
    let hammer = builderHammers.get(id);
    if (!hammer && frame) {
      hammer = attachBuilderHammer(model);
      if (hammer) {
        hammer.userData.boostGlow = attachBuilderGlow(model);
        builderHammers.set(id, hammer);
      }
    }
    if (hammer) {
      hammer.visible = !!frame;
      if (frame) hammer.rotation.x = reduced ? 0 : frame.hammerAngle;
      hammer.userData.boostGlow?.userData.updateBoost(
        performance.now() / 1000,
        frame?.speed || 1,
        reduced,
      );
    }
  }
  function sync(next) {
    game = next;
    for(const [id,g]of itemGroups)if(g.userData.magicBed)g.userData.syncFields(game.farm.fields[id]);
    for(const [id,state]of Object.entries(game.farm?.orchards||{}))islands.get(id)?.userData.syncOrchard?.(state);
    itemGroups.get("job-crypto")?.userData.setCryptoState?.(game.jobCity);
    familyLinks = familyPartners(game);
    const catalogueKey = JSON.stringify([
      game.unlocked,
      game.placements,
      game.islandConstruction,
      game.scenery,
      bowlPortions(game) > 0,
      Math.floor(game.coins / 10),
    ]);
    if (catalogueKey !== leisureKey) {
      leisureKey = catalogueKey;
      leisureCatalogue = new Map(leisureOffers(game).map((o) => [o.id, o]));
    }
    islands.get(HOUSING_ID)?.userData.syncHousing?.(game);
    housingLife.sync(game);
    incomeSecond = -1;
    const venues = new Set(businessVenues(game).map((p) => p.id));
    for (const [id, button] of incomeButtons)
      if (!venues.has(id)) {
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
    const nextActorsKey = JSON.stringify([game.adoption, game.catDestinations]);
    const key = JSON.stringify([
      game.unlocked,
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
    if (key === sceneKey) {
      if (actorKey !== nextActorsKey) {
        nextSiteCheck = 0;
        syncActors();
        actorKey = nextActorsKey;
      }
      return;
    }
    sceneKey = key;
    nextSiteCheck = 0;
    megaGroundPlots = game.placements
      .filter((p) => byItem(p.item)?.mega || byItem(p.item)?.magicBed)
      .map((p) => {
        const size = byItem(p.item).footprint,
          b = byBiome(p.biome);
        return {
          biome: p.biome,
          x: b.center[0] + p.x,
          z: b.center[1] + p.z,
          w: size[p.rotation % 2 ? 1 : 0],
          d: size[p.rotation % 2 ? 0 : 1],
        };
      });
    courtExtra = [
      ...game.placements
        .filter((p) => p.biome === "foodcourt")
        .map((p) => {
          const f = byItem(p.item).footprint;
          return {
            x: p.x,
            z: p.z,
            w: f[p.rotation % 2 ? 1 : 0],
            d: f[p.rotation % 2 ? 0 : 1],
          };
        }),
      ...(game.scenery || [])
        .filter((r) => !r.stored && r.biome === "foodcourt")
        .map((r) => {
          const f = sceneryFootprint(r);
          return { x: r.x, z: r.z, radius: Math.min(f[0], f[1]) * 0.2 };
        }),
    ];
    courtBlockers = courtObstacles(courtExtra);
    bikiniBlockers = courtObstacles(
      [
        ...game.placements
          .filter((p) => p.biome === "bikini")
          .map((p) => ({
            ...p,
            w: byItem(p.item).footprint[p.rotation % 2 ? 1 : 0],
            d: byItem(p.item).footprint[p.rotation % 2 ? 0 : 1],
          })),
        ...(game.scenery || [])
          .filter((r) => !r.stored && r.biome === "bikini")
          .map((r) => ({
            ...r,
            radius: Math.min(...sceneryFootprint(r)) * 0.2,
          })),
      ],
      "bikini",
    );
    aquariumBlockers = courtObstacles(
      [
        ...game.placements
          .filter((p) => p.biome === "aquarium")
          .map((p) => {
            const dims = byItem(p.item).footprint;
            const f = p.rotation % 2 ? [dims[1], dims[0]] : dims;
            return { x: p.x, z: p.z, w: f[0], d: f[1] };
          }),
        ...(game.scenery || [])
          .filter((r) => r.biome === "aquarium" && !r.stored)
          .map((r) => {
            const f = sceneryFootprint(r);
            return { x: r.x, z: r.z, w: f[0], d: f[1] };
          }),
      ],
      "aquarium",
    );
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
    for (const [id, island] of islands) {showWhalePreview(island, id);if(id===ZOO_ID)island.userData.setZooState?.(game.zoo);}
    for(const e of ZOO_EXHIBITS)itemGroups.get(e.id)?.userData.setZooState?.(game.zoo);
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
      if (
        (courtObject(o.id) || jobBusiness(o.id)) &&
        built &&
        !courtModels.has(o.id) &&
        !existing?.userData.built
      ) {
        if (!courtPreparing.has(o.id)) {
          const task = prepareSceneSteps(
            jobBusiness(o.id)
              ? jobBuildingSteps(o.id)
              : courtVenueSteps(courtObject(o.id), {
                  staff: !courtObject(o.id).nautical,
                }),
            {
              scheduler: scenePreparation,
              priority: jobBusiness(o.id) ? "jobcity" : courtObject(o.id)?.kind === "zoo" ? ZOO_ID : "foodcourt",
            },
          );
          courtPreparing.set(o.id, task);
          task
            .then((g) => {
              courtPreparing.delete(o.id);
              if (disposed) {
                g.userData.disposeStaff?.();
                disposeScenery(g);
                return;
              }
              courtModels.set(o.id, g);
              sceneKey = "";
              sync(game);
            })
            .catch((error) => {
              courtPreparing.delete(o.id);
              console.warn("Court venue build failed", error);
            });
        }
        continue;
      }
      if (existing) {
        scene.remove(existing);
        existing.userData.disposeStaff?.();
        disposeScenery(existing);
        itemGroups.delete(o.id);
      }
      let g;
      if(o.magicFarm){
        const actors=[],actorCache=new Map(),farm=byBiome(o.magicFarm);
        const actor=(id,p,radius)=>{let a=actorCache.get(id);if(!a){a={x:0,z:0,radius};actorCache.set(id,a);}a.x=p.x-farm.center[0];a.z=p.z-farm.center[1];a.radius=radius;actors.push(a);};
        g=magicFarmTarget(o.magicFarm,{getState:()=>game.farm?.orchards?.[o.magicFarm],onPick:(id,yes)=>islands.get(o.magicFarm)?.userData.setPlantPicked?.(id,yes),getActors:id=>{
          actors.length=0;
          for(const [catId,n]of npcs)if(catId!==id&&(n.profile.biome===farm.id||g.userData.harvests.visits.has(catId)))actor(catId,n.carrier.position,spaRadius(n.model));
          if(id!=='chichi'&&Math.hypot(chichiCarrier.position.x-farm.center[0],chichiCarrier.position.z-farm.center[1])<farm.radius)actor('chichi',chichiCarrier.position,spaRadius(cat));
          return actors;
        }});
      }else if (jobBusiness(o.id)) {
        g = courtModels.get(o.id);
        courtModels.delete(o.id);
      } else if (courtObject(o.id)) {
        g = built
          ? courtModels.get(o.id)
          : courtBlueprint(courtObject(o.id), courtProject(game, o.id));
        courtModels.delete(o.id);
        if (o.id === "court-cinema") cinema.setSurface(g.userData.videoSurface);
      } else if (bikiniFriend(o.id)) {
        g = createBikiniCharacter(bikiniFriend(o.id).kind);
      } else if (chillObject(o.id)?.kind === "bed") {
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
        o.magicFarm ? 0 : o.type === "swim-lagoon"
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
      if (g.userData.slideWater)
        g.userData.onWaterImpact = (power) => {
          if (g.position.distanceToSquared(camera.position) < 140 * 140)
            slideAudio.splash(power);
        };
      g.userData.permanent = true;
      g.userData.unstarted = !!o.unstarted;
      if (g.userData.deepRide)
        g.userData.onWaterImpact = (x, z, time, force) =>
          islands
            .get(o.biome)
            ?.userData.lagoons?.get("lake-autumn")
            ?.userData.disturb?.(x, z, time, force);
      g.userData.setCryptoState?.(game.jobCity);
      scene.add(g);
      itemGroups.set(o.id, g);
      batchSceneCats(g, poseAtlas);
      if (g.userData.aquarium !== true)
        attractionViews.set(g, attractionVisibility(g));
    }
    for (const [id, g] of itemGroups) {
      if (g.userData.homeObject) continue;
      const retained = game.placements.find((p) => p.id === id);
      if(retained&&byItem(retained.item)?.premiumWater&&isBuilt(retained)&&
        (!g.userData.built&&!g.userData.loadingReference||JSON.stringify(retained)!==JSON.stringify(g.userData.placement)))referenceRequested.add(id);
      if(!retained){knownReferencePlacements.delete(id);referenceRequested.delete(id);}
      if (
        retained &&
        (byItem(retained.item)?.referenceSlide||byItem(retained.item)?.magicBed) &&
        retained.item === g.userData.placement.item &&
        isBuilt(retained) &&
        (g.userData.referenceSlide || g.userData.loadingReference || g.userData.magicBed)
      ) {
        if (JSON.stringify(retained) !== JSON.stringify(g.userData.placement)) {
          g.userData.clearApproachCache?.();
          if(g.userData.magicBed&&operation?.decision.activityId===id)cancelHeroActivity();
          for (const [catId, v] of residentPlay.visits)
            if (v.decision.activityId === id) cancelResident(catId);
          const b = byBiome(retained.biome);
          g.position.set(
            b.center[0] + retained.x,
            0.16 + islandHeight(b.id, retained.x, retained.z),
            b.center[1] + retained.z,
          );
          g.rotation.y = (retained.rotation * Math.PI) / 2;
          g.userData.placement = retained;
        }
        g.userData.syncFields?.(game.farm.fields[id]);
        continue;
      }
      if (g.userData.magicBed){if(operation?.decision.activityId===id)cancelHeroActivity();for(const catId of [...g.userData.harvests?.visits.keys()||[]])if(catId!=='chichi')cancelResident(catId);}
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
      g.userData.disposeStaff?.();
      disposeScenery(g);
      itemGroups.delete(id);
    }
    for (const placement of game.placements) {
      if(!knownReferencePlacements.has(placement.id)){
        knownReferencePlacements.add(placement.id);
        if(byItem(placement.item)?.premiumWater&&isBuilt(placement))referenceRequested.add(placement.id);
      }
      if (itemGroups.has(placement.id)) continue;
      const built = isBuilt(placement),
        reference = !!byItem(placement.item)?.referenceSlide || placement.item===MAGIC_BED_ID,
        prepared = referenceModels.get(placement.id),
        loadingReference = reference && built && !prepared;
      if (loadingReference && !byItem(placement.item)?.premiumWater)
        prepareReference(placement);
      const g =
          built && !loadingReference
            ? prepared ||
              makeAttraction(placement.item, game.farm?.fields?.[placement.id])
            : constructionModel(placement.item),
        b = byBiome(placement.biome);
      referenceModels.delete(placement.id);
      g.userData.loadingReference = loadingReference;
      g.position.set(
        b.center[0] + placement.x,
        0.16 + islandHeight(placement.biome, placement.x, placement.z),
        b.center[1] + placement.z,
      );
      g.rotation.y = (placement.rotation * Math.PI) / 2;
      g.userData.placement = placement;
      g.userData.built = built && !loadingReference;
      if (g.userData.slideWater)
        g.userData.onWaterImpact = (power) => {
          if (g.position.distanceToSquared(camera.position) < 140 * 140)
            slideAudio.splash(power);
        };
      g.userData.fieldKey = JSON.stringify(
        (game.farm?.fields?.[placement.id] || []).map((c) => [
          c.crop,
          c.readyAt,
          Date.now() >= c.readyAt,
        ]),
      );
      g.userData.placementId = placement.id;
      if(g.userData.magicBed){
        const actors=[],cache=new Map(),point=new THREE.Vector3();
        const actor=(id,p,radius)=>{point.copy(p);g.worldToLocal(point);if(Math.hypot(point.x,point.z)>30)return;let a=cache.get(id);if(!a){a={};cache.set(id,a);}a.x=point.x;a.z=point.z;a.radius=radius;actors.push(a);};
        attachMagicBedInteraction(g,placement.id,{getCells:()=>game.farm.fields[placement.id],getActors:excluded=>{actors.length=0;for(const [id,n]of npcs)if(id!==excluded)actor(id,n.carrier.position,spaRadius(n.model));if(excluded!=='chichi')actor('chichi',chichiCarrier.position,spaRadius(cat));return actors;},getBlockers:()=>game.placements.filter(p=>p.id!==placement.id&&p.biome===g.userData.placement.biome).map(p=>{const centre=byBiome(p.biome).center;point.set(centre[0]+p.x,0,centre[1]+p.z);g.worldToLocal(point);const dims=byItem(p.item).footprint,turn=(p.rotation-g.userData.placement.rotation)%2;return {x:point.x,z:point.z,w:dims[turn?1:0],d:dims[turn?0:1]};})});
        g.userData.syncFields(game.farm.fields[placement.id]);
      }
      scene.add(g);
      itemGroups.set(placement.id, g);
      batchSceneCats(g, poseAtlas);
      attractionViews.set(g, attractionVisibility(g));
    }
    for (const p of businessVenues(game)) {
      const g = itemGroups.get(p.id);
      if (g?.userData.built)
        decorateBusiness(g, p.item, businessLevel(game, p.id));
    }
    staticDraws.sync(itemGroups.values());
    if (
      operation?.decision.activityId &&
      !operation.spa &&
      !operation.court &&
      !operation.jobCity && !operation.harvester
    ) {
      operation.attraction = itemGroups.get(operation.decision.activityId);
      operation.destination
        .copy(operation.attraction.position)
        .add(new THREE.Vector3(0, 0, 0.8));
    }
    syncActors();
    actorKey = nextActorsKey;
  }
  function syncActors() {
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
      enableCatRenderBatch(model, poseAtlas);
      // Move the exact existing tiny model into the normal actor rig. The
      // cook and second visitor stay at the counter; no duplicate mesh is drawn.
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.visible = true;
      carrier.add(model);
      pauseHiddenMatrixUpdates(carrier);
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
      if(b.magicFarm)carrier.position.z=b.center[1]+b.radius-20+Math.cos(index*2.4)*2;
      if (b.id === "autumn") {
        const dry = mosaDryPoint(
          carrier.position.x - b.center[0],
          carrier.position.z - b.center[1],
        );
        carrier.position.set(b.center[0] + dry.x, 0.16, b.center[1] + dry.z);
      }
      if (profile.venueHome && venue) {
        carrier.position.copy(
          venue.localToWorld(new THREE.Vector3(1.65, 0, 1.9)),
        );
        carrier.position.y = venue.position.y;
      }
      if (["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id)) {
        const dry = nearestCourtIdleGround(
          courtLocal(carrier.position, b.id),
          spaRadius(model),
          getCourtBlockers(b.id),
          b.id,
        );
        if (dry)
          carrier.position.set(b.center[0] + dry.x, 0.16, b.center[1] + dry.z);
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
      const savedLocation=game.catLocations?.[profile.id];
      if(savedLocation?.biome===b.id){
        carrier.position.set(b.center[0]+savedLocation.x,savedLocation.y,b.center[1]+savedLocation.z);
        carrier.rotation.y=savedLocation.yaw;
      }
      scene.add(carrier);
      const inView = attractionVisibility(carrier, { padding: 2 });
      npcs.set(profile.id, { carrier, model, profile, index, hatRig, inView });
    }
    const activeIds = new Set(activeCats(game).map((c) => c.id));
    for (const [id, n] of npcs)
      if (!activeIds.has(id)) {
        if (followedCatId === id) {
          faceCamera.setEnabled(false, look);
          followedCatId = "chichi";
          faceCamera.setTarget(cat.userData.head, look);
          focus(focused, false, true);
        }
        spa.cancel(id);
        crew.cancel(id);
        builderHammers.get(id)?.userData.boostGlow?.removeFromParent();
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
    lifeActors = [
      { id: "chichi", index: -1, model: cat, carrier: chichiCarrier },
      ...[...npcs].map(([id, n]) => ({
        id,
        index: n.index,
        model: n.model,
        carrier: n.carrier,
        resident: n,
      })),
    ].map((a) => ({
      ...a,
      position: a.carrier.position,
      radius: spaRadius(a.model),
      local: { x: 0, y: 0, z: 0 },
    }));
    colonyDraws.sync();
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
  sync = profileFunction("world.sync", sync);
  sync(initialGame);
  function focus(id, overview = false, keepFollow = false) {
    exitCourt(false);
    if (!keepFollow) faceCamera.setEnabled(false, look);
    const b = byBiome(id) || byBiome("moon");
    if (!overview) focused = b.id;
    viewingOverview = overview;
    if (!overview && camera.far !== 1200) {
      camera.far = 1200;
      camera.updateProjectionMatrix();
    }
    overviewElevation = null;
    const enchanted =
      !!RENEWED_ISLANDS[b.id] || b.legendary || b.id === "sakura";
    sky.material.uniforms.top.value.set(
      b.id === "autumn"
        ? 0x75b9e4
        : b.id === "sakura"
          ? 0xbba4d4
          : b.legendary || b.id === "aquapark"
            ? 0x010914
            : enchanted
              ? 0x172749
              : 0x788ab9,
    );
    sky.material.uniforms.bottom.value.set(
      b.id === "autumn"
        ? 0xeee2dd
        : b.id === "sakura"
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
    if (
      mobileRender &&
      (b.legendary || b.id === "water" || b.buildableAreaMultiplier)
    )
      desiredDistance = Math.max(
        desiredDistance,
        (b.radius * 1.08) /
          (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
            Math.min(1, camera.aspect)),
      );
    if(b.magicFarm&&!overview){
      overviewElevation=1.03;
      overviewAspect=camera.aspect;
      desiredDistance=islandOverviewDistance(b.radius,camera.fov,camera.aspect);
      camera.far=islandCameraFar(desiredDistance,b.radius);
      camera.updateProjectionMatrix();
    }
    if (overview) {
      const bounds = new THREE.Box3();
      const targets = [...BIOMES];
      const sections = islands.get(HOUSING_ID)?.userData.sections.size || 1;
      if (sections > 1)
        targets.push({
          center: [
            HOUSING_CENTER[0] - (sections - 1) * HOUSING_SECTION_PITCH,
            HOUSING_CENTER[1],
          ],
          radius: byBiome(HOUSING_ID).radius,
        });
      for (const island of targets) {
        const r = (island.radius || 12) + 2;
        bounds.expandByPoint(
          new THREE.Vector3(island.center[0] - r, 0, island.center[1] - r),
        );
        bounds.expandByPoint(
          new THREE.Vector3(island.center[0] + r, 0, island.center[1] + r),
        );
      }
      bounds.getCenter(desiredLook);
      overviewDistanceLimit = Math.max(
        2400,
        (bounds.getSize(new THREE.Vector3()).length() * 2) /
          Math.min(1, camera.aspect),
      );
      camera.far = Math.max(4000, overviewDistanceLimit * 2);
      camera.updateProjectionMatrix();
      const view = camera.clone();
      const fitStep = Math.max(5, overviewDistanceLimit / 1000);
      for (let fit = 150; fit <= overviewDistanceLimit; fit += fitStep) {
        view.position.set(
          desiredLook.x + Math.sin(azimuth) * Math.cos(elevation) * fit,
          Math.sin(elevation) * fit,
          desiredLook.z + Math.cos(azimuth) * Math.cos(elevation) * fit,
        );
        view.lookAt(desiredLook);
        view.updateMatrixWorld();
        desiredDistance = fit;
        if (
          targets.every((island) =>
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
    for (const root of itemGroups.values())
      if (root.userData.placement?.biome === b.id) shaderWarmup.enqueue(root);
    callbacks.onFocus?.(b.id, overview);
  }
  function focusHousingSection(localX) {
    const section = housingSectionIndex(localX,game.housing);
    focus(HOUSING_ID);
    desiredLook.set(HOUSING_CENTER[0]-section*HOUSING_SECTION_PITCH,0,HOUSING_CENTER[1]);
    return section;
  }
  function showCatHome(id) {
    const h = game.housing?.homes[id];
    if (!h) return false;
    focus(HOUSING_ID);
    const p = housingPlot(h.plot);
    desiredLook.set(HOUSING_CENTER[0] + p.x, 1.5, HOUSING_CENTER[1] + p.z);
    desiredDistance = mobileRender ? 34 : 26;
    azimuth = 0.08;
    elevation = 0.46;
    return true;
  }
  function viewedIsland() {
    if (!faceCamera.enabled) return focused;
    const point = faceCamera.facePoint(new THREE.Vector3());
    return BIOMES.filter((b) => game.unlocked.includes(b.id)).reduce(
      (best, b) =>
        Math.hypot(point.x - b.center[0], point.z - b.center[1]) <
        Math.hypot(point.x - best.center[0], point.z - best.center[1])
          ? b
          : best,
      byBiome(focused),
    ).id;
  }
  function islandOverview() {
    const id = viewedIsland();
    const housingLook = id === HOUSING_ID ? look.clone() : null;
    focus(id);
    if (housingLook)
      desiredLook.set(
        HOUSING_CENTER[0] -
          Math.max(
            0,
            Math.round(
              -(housingLook.x - HOUSING_CENTER[0]) / HOUSING_SECTION_PITCH,
            ),
          ) *
            HOUSING_SECTION_PITCH,
        0,
        HOUSING_CENTER[1],
      );
    overviewElevation = 1.03;
    overviewAspect = camera.aspect;
    desiredDistance = islandOverviewDistance(
      byBiome(id).radius,
      camera.fov,
      camera.aspect,
    );
    camera.far=islandCameraFar(desiredDistance,byBiome(id).radius);
    camera.updateProjectionMatrix();
    return id;
  }
  function followCat(id) {
    const model = id === "chichi" ? cat : npcs.get(id)?.model;
    if (!model) return false;
    exitCourt(false);
    followedCatId = id;
    faceCamera.setTarget(model.userData.head, look);
    faceCamera.setEnabled(true, look);
    if (!reduced && model.userData.mood === "happy") emoteCat(model, "curious");
    return true;
  }
  function followRandomCat() {
    const target = randomCameraCat(
      [...npcs]
        .filter(([, n]) => n.carrier.parent && n.model.userData.head)
        .map(([id, n]) => ({ id, ...n })),
      faceCamera.enabled ? followedCatId : lastRandomCatId,
    );
    if (!target) {
      followCat("chichi");
      return "chichi";
    }
    lastRandomCatId = target.id;
    focus(target.profile.biome);
    followCat(target.id);
    return target.id;
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
  function cancelHeroActivity(keepLeisure = false) {
    if (!keepLeisure) leisure.cancel("chichi");
    court.cancel("chichi");
    if (operation) {
      spa.cancel("chichi");
      crew.cancel("chichi");
      chill.cancel("chichi");
      resetYarn(operation.attraction);
      if (operation.attraction) {
        if(operation.harvester&&operation.stage==='activity'&&operation.attraction.userData.magicBed)chichiCarrier.position.copy(operation.attraction.localToWorld(new THREE.Vector3(operation.harvester.entry.x,.16,operation.harvester.entry.z)));
        operation.attraction.userData.releaseHarvest?.('chichi');
        operation.attraction.userData.releasePlay?.(chichiCarrier);
        operation.attraction.userData.playing = false;
        delete operation.attraction.userData.heroPlayPos;
        releaseSlide(operation.attraction, "chichi");
        if (!operation.attraction.userData.slideRiders?.size)
          delete operation.attraction.userData.rideElapsed;
        if (
          operation.attraction.userData.deepRide ||
          operation.attraction.userData.mega
        ) {
          chichiCarrier.position.copy(
            operation.attraction.localToWorld(
              new THREE.Vector3(...operation.attraction.userData.dismount),
            ),
          );
          chichiCarrier.position.y = 0.16;
          chichiCarrier.rotation.x = 0;
          chichiCarrier.rotation.z = 0;
          if (!operation.attraction.userData.slideRiders?.size)
            delete operation.attraction.userData.rideElapsed;
        }
      }
      if (operation.neighbor) {
        const b = byBiome(operation.neighbor.profile.biome);
        for (const carrier of [chichiCarrier, operation.neighbor.carrier])
          carrier.position.y =
            0.16 +
            islandHeight(
              b.id,
              carrier.position.x - b.center[0],
              carrier.position.z - b.center[1],
            );
      }
      operation.resolve({ cancelled: true });
      operation = null;
    }
  }
  function perform(
    decision,
    { manualFriendDrop = false, leisureTicket = null, background = false } = {},
  ) {
    const pending=decision.activityId&&itemGroups.get(decision.activityId);
    if(pending?.userData.loadingReference&&isBuilt(pending.userData.placement)){
      if(!background)focus(pending.userData.placement.biome,false,true);
      referenceRequested.add(decision.activityId);
      return prepareReference(pending.userData.placement).then(ok=>ok?perform(decision,{manualFriendDrop,leisureTicket,background}):{cancelled:true});
    }
    if (
      bikiniFriend(decision.activityId) &&
      !bikiniLife.reserve(decision.activityId, decision.characterAction, {
        catId: "chichi",
        model: cat,
      })
    )
      return Promise.reject(
        new Error(
          "Губка Боб заканчивает заказ. Скоро он снова сможет поиграть!",
        ),
      );
    heroGather = null;
    court.cancel("chichi");
    socialGlow.visible = false;
    sync(game);
    cancelHeroActivity(!!leisureTicket);
    switchMood(decision.mood);
    choiceExpression(decision);
    if (jobBusiness(decision.activityId)) {
      if (!background) focus("jobcity", false, true);
      return new Promise((resolve) => {
        const visit = jobs.visit(
          "chichi",
          decision.activityId,
          {
            x: chichiCarrier.position.x - JOB_CITY_CENTER[0],
            y: chichiCarrier.position.y,
            z: chichiCarrier.position.z - JOB_CITY_CENTER[1],
          },
          decision,
        );
        if (!visit) {
          resolve({ cancelled: true });
          return;
        }
        operation = {
          jobCity: true,
          decision,
          stage: "jobcity",
          resolve,
          attraction: itemGroups.get(decision.activityId),
          from: chichiCarrier.position.clone(),
          destination: new THREE.Vector3(
            JOB_CITY_CENTER[0] + jobBusiness(decision.activityId).x,
            0.32,
            JOB_CITY_CENTER[1] + jobBusiness(decision.activityId).z + 11.7,
          ),
        };
      });
    }
    if (
      decision.activityId &&
      !itemGroups.get(decision.activityId)?.userData.slideWater && !itemGroups.get(decision.activityId)?.userData.magicFarm && !itemGroups.get(decision.activityId)?.userData.magicBed
    )
      for (const [id, v] of residentPlay.visits)
        if (v.decision.activityId === decision.activityId)
          residentPlay.cancel(id);
    const attraction = decision.activityId
      ? itemGroups.get(decision.activityId)
      : null;
    const harvester=decision.action==='farm'&&(attraction?.userData.magicFarm||attraction?.userData.magicBed)?attraction.userData.reserveHarvest('chichi',spaRadius(cat),decision.bedCell):null;
    if((attraction?.userData.magicFarm||attraction?.userData.magicBed)&&decision.action==='farm'&&!harvester)return Promise.reject(Error('Зараз усі стиглі рослини зайняті або врожай ще росте.'));
    const rider =
      decision.action === "ride" && attraction?.userData.slideWater
        ? reserveSlide(attraction, "chichi")
        : null;
    if (decision.action === "ride" && attraction?.userData.slideWater && !rider)
      return Promise.reject(
        new Error("Горка занята: дождитесь свободного места."),
      );
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

    if (neighbor) cancelResident(decision.friendId);
    const social = neighbor
      ? socialContext(cat, neighbor.model, {
          ride: manualFriendDrop && chooseSocialRide(),
        })
      : null;
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
      if (!courtCamera || courtCamera.id !== decision.activityId)
        if (!background)
          focus(attraction.userData.placement.biome, false, true);
    } else if (neighbor) {
      destination = neighbor.carrier.position
        .clone()
        .add(new THREE.Vector3(social.gap, 0, 0));
      if (!background) focus(neighbor.profile.biome, false, true);
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
    if (!neighbor)
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
    if (attraction?.userData.approachOffset)
      destination.copy(
        attraction.localToWorld(
          new THREE.Vector3(...attraction.userData.approachOffset),
        ),
      );
    if (rider)
      destination.copy(
        attraction.localToWorld(new THREE.Vector3(...rider.queue)),
      );
    const courtTarget = courtObject(decision.activityId);
    if(harvester)destination.copy(attraction.localToWorld(new THREE.Vector3(harvester.entry.x,harvester.entry.y,harvester.entry.z)));
    const targetCourtBiome = courtTarget
      ? byBiome(courtTarget.biome)
      : courtBiome;
    if (courtTarget)
      destination.set(
        targetCourtBiome.center[0] + courtLayout(courtTarget.biome).gate.x,
        0.16,
        targetCourtBiome.center[1] + courtLayout(courtTarget.biome).gate.z,
      );
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
        court: courtTarget,
        chill: chillTarget,
        spa: spaTarget,
        decision,
        attraction,
        rider,
        harvester,
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
        social,
        socialEncounterKind: neighbor
          ? encounterKind(game, decision.friendId, decision.socialIntent)
          : null,
        socialKind: social?.ride
          ? "piggyback"
          : neighbor
            ? encounterKind(game, decision.friendId, decision.socialIntent)
            : null,
        socialOrigin: neighbor?.carrier.position.clone(),
        from: chichiCarrier.position.clone(),
        destination,
        dismount,
        start: performance.now(),
        duration: reduced
          ? 50
          : attraction?.userData.approachDuration
          ? attraction.userData.approachDuration(attraction.worldToLocal(chichiCarrier.position.clone()).toArray(),attraction.worldToLocal(destination.clone()).toArray())
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
      if (
        courtTarget &&
        Math.hypot(
          chichiCarrier.position.x - targetCourtBiome.center[0],
          chichiCarrier.position.z - targetCourtBiome.center[1],
        ) < targetCourtBiome.radius
      )
        startHeroCourt(operation);
    });
  }
  function beginBuild(mode) {
    const previewId = ++previewGeneration;
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
    const reference = !mode.scenery && (byItem(mode.item)?.referenceSlide || mode.item===MAGIC_BED_ID);
    preview = mode.scenery
      ? createSceneryModel(game.scenery.find((r) => r.id === mode.ignoreId))
      : reference
        ? constructionModel(mode.item)
        : makeAttraction(mode.item);
    if (reference)
      prepareSceneSteps(mode.item===MAGIC_BED_ID?magicBedModelSteps(game.farm.fields[mode.ignoreId]):referenceSlideSteps(mode.item), {
        scheduler: scenePreparation,
        priority: mode.biome,
      })
        .then(async (model) => {
          if (disposed || previewId !== previewGeneration || !buildMode) {
            disposeScenery(model);
            return;
          }
          model.traverse((o) => {
            if (o.isMesh) {
              const source=o.material;
              o.material = source.clone();
              if(mode.item===MAGIC_BED_ID){o.material.onBeforeCompile=source.onBeforeCompile;o.material.customProgramCacheKey=source.customProgramCacheKey;}
              o.material.userData.sharedScenery = false;
              o.material.transparent = true;
              o.material.opacity = 0.62;
              o.castShadow = false;
            }
          });
          if(mode.item===MAGIC_BED_ID)await shaderWarmup.prepare(model,{background:false});
          if(disposed||previewId!==previewGeneration||!buildMode){disposeScenery(model);return;}
          scene.remove(preview);disposeScenery(preview);preview=model;
          scene.add(preview);
          updatePreview();
        })
        .catch((error) =>
          console.warn("Water attraction preview preparation failed", error),
        );
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
  raycaster.layers.enable(CAT_PICK_LAYER);
  raycaster.layers.enable(STATIC_PICK_LAYER);
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
    const friendActors = [...npcs.values()];
    if (draggingCat?.catId && draggingCat.catId !== "chichi")
      friendActors.push({ profile: { id: "chichi" }, carrier: chichiCarrier });
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
    const friends = friendActors
      .filter((n) => n.carrier.visible && n.profile.id !== draggingCat?.catId)
      .map((n) => ({
        id: n.profile.id,
        x: n.carrier.position.x,
        z: n.carrier.position.z,
      }));
    const targets = new Map([
      ...friendActors
        .filter((n) => n.carrier.visible && n.profile.id !== draggingCat?.catId)
        .map((n) => [n.carrier, { friendId: n.profile.id }]),
      ...[...itemGroups.values()].map((g) => [
        g,
        g.userData.built
          ? { activityId: g.userData.placementId }
          : { unavailable: true },
      ]),
    ]);
    for (const actor of friendActors)
      if (actor.carrier.visible && actor.profile.id !== draggingCat?.catId)
        prepareCatPicking(actor.model || cat);
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
    const screenFriends = friendActors
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
      friends: ["chichi", ...npcs.keys()].map((id) => ({ id })),
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
      ? selection.friendId === "chichi"
        ? "Чичи"
        : npcs.get(selection.friendId).profile.name
      : HOME_OBJECTS.find((o) => o.id === selection.activityId)?.name ||
        byItem(itemGroups.get(selection.activityId).userData.id).name;
    dropHint.textContent = "Отпусти: " + verbs[decision.action] + " · " + name;
  }
  const activePointers = new Set();
  let pointerDown = null,
    pinchDistance = null,
    draggingCat = null,
    pendingTap = false;
  let pendingBikiniCat = null;
  let pendingAquariumCat = null;
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
    // A second finger usually follows immediately. Do not traverse cat rigs
    // just to begin a pinch; resolve a single touch once its intent is known.
    if (e.pointerType === "touch")
      pointerDown.pick = {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
      };
    else beginCatDrag(e);
  });
  function beginCatDrag(e) {
    if (!pointerDown || faceCamera.enabled || buildMode || pointerDown.multi)
      return;
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
        ].filter(Boolean);
      for (const part of parts) updateCatPickingBounds(part);
      const hit = raycaster.intersectObjects(parts, false)[0];
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

  renderer.domElement.addEventListener("pointermove", (e) => {
    if (pointerDown) lastCameraGesture = performance.now();
    if (pointerDown?.multi) return;
    if (pointerDown?.pick) {
      if (Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) < 7)
        return;
      beginCatDrag(pointerDown.pick);
      pointerDown.pick = null;
    }
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
    overviewElevation = null;
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
    if (pointerDown?.pick) {
      beginCatDrag(pointerDown.pick);
      pointerDown.pick = null;
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
            ? selection.friendId === "chichi"
              ? BIOMES.find(
                  (b) =>
                    game.unlocked.includes(b.id) &&
                    Math.hypot(
                      chichiCarrier.position.x - b.center[0],
                      chichiCarrier.position.z - b.center[1],
                    ) < (b.radius || 11.65),
                )?.id
              : npcs.get(selection.friendId)?.profile.biome
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
      if (
        !moved &&
        (original.catId === "chichi"
          ? Math.hypot(
              original.x - byBiome("bikini").center[0],
              original.z - byBiome("bikini").center[1],
            ) < byBiome("bikini").radius
          : npcs.get(original.catId)?.profile.biome === "bikini")
      ) {
        pendingBikiniCat = original.catId;
        pendingTap = true;
      }
      if (
        !moved &&
        (original.catId === "chichi"
          ? Math.hypot(
              original.x - byBiome("aquarium").center[0],
              original.z - byBiome("aquarium").center[1],
            ) < byBiome("aquarium").radius
          : npcs.get(original.catId)?.profile.biome === "aquarium")
      ) {
        pendingAquariumCat = original.catId;
        pendingTap = true;
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
    if (pendingAquariumCat) {
      const id = pendingAquariumCat;
      pendingAquariumCat = null;
      const model = id === "chichi" ? cat : npcs.get(id)?.model;
      if (model) emoteCat(model, "curious", { crowd: id !== "chichi" });
      callbacks.onReaction?.("Мур-р! Как красиво плывут рыбки-котики 🐠");
      return;
    }
    if (pendingBikiniCat) {
      const id = pendingBikiniCat;
      pendingBikiniCat = null;
      callbacks.onSelectBikiniFriend?.("bikini-sponge", id);
      return;
    }
    pointer(e);
    if (cityDriveChoice) {
      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(ground, point)) return;
      const local = {
        x: point.x - JOB_CITY_CENTER[0],
        z: point.z - JOB_CITY_CENTER[1],
      };
      if (!cityPoint(local, 2)) {
        callbacks.onReaction?.("Виберіть дорогу на острові Cat Job City");
        return;
      }
      const road = nearestRoad(local),
        choice = cityDriveChoice;
      cityDriveChoice = null;
      drivePrompt.hidden = true;
      callbacks.onCityDrive?.(choice.id, choice.car, road);
      return;
    }
    if (focused === HOUSING_ID) {
      const homes = islands.get(HOUSING_ID)?.userData.houses;
      const hit =
        homes &&
        raycaster.intersectObjects(
          [...homes.values()].filter((g) => g.visible),
          true,
        )[0];
      if (hit?.object.userData.housingHouseId) {
        showCatHome(hit.object.userData.housingHouseId);
        return;
      }
    }
    const hits = raycaster.intersectObjects(
      [
        ...[...itemGroups.values()].filter(
          (g) => g.userData.aquarium !== true || g.visible,
        ),
        ...sceneryGroups().filter(
          (g) => g.visible && raycaster.ray.intersectsBox(sceneryBounds(g)),
        ),
      ],
      true,
    );
    // Clear glass must not consume a tap on the fish visible behind it.
    const hit = hits.find((h) => h.object.userData.aquariumFish) || hits[0];
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
      else if (root?.userData.jobBusiness)
        callbacks.onSelectJobCity?.(root.userData.placementId);
      else if (root?.userData.bikiniFriend)
        callbacks.onSelectBikiniFriend?.(root.userData.placementId);
      else if (root?.userData.foodcourt)
        callbacks.onSelectCourt?.(
          root.userData.placementId,
          hit.object.userData.aquariumFish ? hit.instanceId : undefined,
        );
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
    if (clickedBiome?.id === HOUSING_ID) {
      focusHousingSection(islandHit.point.x-HOUSING_CENTER[0]);
      return;
    }
    if (clickedBiome && (viewingOverview || clickedBiome.id !== focused)) {
      focus(clickedBiome.id);
      return;
    }
    if(clickedBiome?.id===ZOO_ID && islandHit?.object.userData.zooExhibit){callbacks.onSelectCourt?.(islandHit.object.userData.zooExhibit);return;}
    if (
      clickedBiome?.id === "aquarium" &&
      islandHit?.object.userData.aquariumBuilding
    ) {
      callbacks.onSelectCourt?.("aquarium-aurora");
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
      else if (placement.userData.jobBusiness)
        callbacks.onSelectJobCity?.(placement.userData.placementId);
      else if (placement.userData.bikiniFriend)
        callbacks.onSelectBikiniFriend?.(placement.userData.placementId);
      else if (placement.userData.foodcourt)
        callbacks.onSelectCourt?.(placement.userData.placementId);
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
      lastCameraGesture = performance.now();
      const delta = wheelPixels(
        e,
        e.deltaMode === 2 ? container.clientHeight : 0,
      );
      if (faceCamera.enabled) {
        faceCamera.zoom(delta * 0.001);
        return;
      }
      desiredDistance = THREE.MathUtils.clamp(
        desiredDistance + delta * 0.025,
        courtCamera ? 10 : 21,
        viewDistanceLimit(),
      );
    },
    { passive: false },
  );
  renderer.domElement.addEventListener(
    "touchmove",
    (e) => {
      lastCameraGesture = performance.now();
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
            courtCamera ? 10 : 21,
            viewDistanceLimit(),
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
  const visibility = globalThis.IntersectionObserver
    ? new IntersectionObserver(
        ([entry]) => {
          worldVisible = entry.isIntersecting;
          if (!worldVisible) cinema.pause();
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
    frameProfile?.contextLost();
    gpuFrames.clear();
    recovery.hidden = false;
  };
  const restoreContext = () => {
    contextLost = false;
    viewport.invalidate();
  };
  const resume = () => {
    frameProfile?.pause();
    if (document.hidden) cinema.pause();
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
  let previousTime = performance.now();
  const renderDue = createRenderPacer();
  function loop(now) {
    if (disposed) return;
    frameProfile?.raf(now);
    const profileQueue = frameProfile ? performance.now() : 0;
    if (contextLost || document.hidden || !gpuFrames.ready()) {
      frameProfile?.blocked(contextLost ? "context" : document.hidden ? "hidden" : "gpu",performance.now()-profileQueue);
      requestAnimationFrame(loop);
      return;
    }
    if (frameProfile) frameProfile.queue(performance.now()-profileQueue);
    const cameraMoving =
      look.distanceToSquared(desiredLook) > 0.0001 ||
      Math.abs(distance - desiredDistance) > 0.01 ||
      (overviewElevation !== null &&
        Math.abs(elevation - overviewElevation) > 0.001);
    const dialogOpen = !!document.querySelector("dialog[open]");
    if (dialogOpen || !worldVisible) frameProfile?.pause();
    const renderInterval = dialogOpen || !worldVisible || frameProfile?.suspended ? 100 : 1000 / 60;
    if (
      !renderDue(
        now,
        renderInterval,
        viewport.pending && !dialogOpen && worldVisible,
      )
    ) {
      frameProfile?.notDue();
      requestAnimationFrame(loop);
      return;
    }
    frameProfile?.beginFrame();
    if (!dialogOpen && worldVisible) viewport.apply(renderer, camera);
    frameProfile?.section("viewport");
    const profileStart = frameProfile ? performance.now() : 0;
    if (courtCamera?.attraction) {
      const g = itemGroups.get(courtCamera.id);
      if (!g) exitCourt();
      else if (courtCamera.aspect !== camera.aspect) applyAttractionCamera(g);
    }
    const elapsed = (now - previousTime) / 1000;
    const dt = Math.min(elapsed, 0.1);
    previousTime = now;
    const time = now / 1000;
    const cameraBlend = blendCamera(elapsed, reduced);
    if (overviewElevation !== null) {
      elevation += (overviewElevation - elevation) * cameraBlend;
      if (overviewAspect !== camera.aspect) {
        overviewAspect = camera.aspect;
        desiredDistance = islandOverviewDistance(
          byBiome(focused).radius,
          camera.fov,
          camera.aspect,
        );
      }
    }
    if (
      operation?.attraction?.userData.deepRide &&
      operation.stage === "activity" &&
      !faceCamera.enabled &&
      overviewElevation === null
    ) {
      desiredLook.copy(chichiCarrier.position);
      desiredDistance = mobileRender ? 64 : 40;
    }
    if (faceCamera.enabled) faceCamera.facePoint(desiredLook);
    look.lerp(desiredLook, cameraBlend);
    distance += (desiredDistance - distance) * cameraBlend;
    const neededFar=viewingOverview ? Math.max(4000,overviewDistanceLimit*2) :
      Math.ceil(islandCameraFar(distance,byBiome(focused)?.radius)/100)*100;
    if(neededFar>camera.far||neededFar<camera.far-199){
      camera.far=neededFar;camera.updateProjectionMatrix();
    }
    camera.position.set(
      look.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
      look.y + Math.sin(elevation) * distance,
      look.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    camera.lookAt(look);
    sky.scale.setScalar(Math.max(1,(camera.position.length()+100)/520));
    // A cat can remain inside the camera view while more than 45 world units
    // from its target, especially on the enlarged lawn. Do not replace that
    // visible cat with a marker at an arbitrary distance boundary.
    camera.updateMatrixWorld();
    attractionProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    attractionFrustum.setFromProjectionMatrix(attractionProjection, camera.coordinateSystem, camera.reversedDepth);
    for (const b of BIOMES) {
      const island = islands.get(b.id),
        close =
          distance < Math.max(110, (b.radius || 12) * 7,b.magicFarm?islandOverviewDistance(b.radius,camera.fov,camera.aspect)*1.1:0) &&
          (b.id === HOUSING_ID
            ? island.userData.near(look)
            : Math.hypot(b.center[0] - look.x, b.center[1] - look.z) <
              (["jobcity","homestead"].includes(b.id) || b.waterpark || b.magicFarm ? b.radius + 10 : 39)) && (!b.magicFarm||focused===b.id);
      island.userData.detail.visible = close && !island.userData.lowOnly;
      island.userData.lowDetail.visible = !close || !!island.userData.lowOnly;
      if (close) ensureDetail(b.id);
      if (b.id === "aquarium")
        island.userData.setInteriorView?.(
          focused === "aquarium" &&
            (distance < 75 || !!aquariumTank(courtCamera?.id)),
        );
      if (!dialogOpen) island.userData.update?.(time, reduced);
    }
    frameProfile?.section("cameraAndIslands");
    if (!dialogOpen) stepLeisure(dt, time, now);
    const wallNow = Date.now(),
      lifeClock = game.jobCity ? cityClock(game.jobCity, wallNow) : null,
      restContext = { clock: lifeClock, partners: familyLinks };
    if (!dialogOpen && game.jobCity && game.unlocked.includes("jobcity")) {
      const actors = lifeActors;
      for (const a of actors) {
        a.local.x = a.position.x - JOB_CITY_CENTER[0];
        a.local.y = a.position.y;
        a.local.z = a.position.z - JOB_CITY_CENTER[1];
        a.biome =
          a.resident?.profile.biome ||
          (Math.hypot(a.local.x, a.local.z) < 67 ? "jobcity" : "");
      }
      jobs.step(game, actors, dt, time, {
        blocked: (actor) => {
          const id = actor.id,
            n = npcs.get(id),
            p = game.jobCity?.profiles[id],
            manualJob = jobs.get(id)?.manual;
          return (
            !p ||
            ((!lifeClock.working || p.schedule?.job === "rest") &&
              !p.trip &&
              !manualJob &&
              jobs.get(id)?.phase !== "leave" &&
              !jobs.get(id)?.job &&
              (leisure.has(id) ||
                familyLinks.has(id) ||
                p.schedule?.outings?.length)) ||
            (homeRestTime(game, id, wallNow, restContext) &&
              !p.trip &&
              !manualJob) ||
            (Date.now() < (p.manualUntil || 0) && !p.trip && !manualJob) ||
            draggingCat?.catId === id ||
            (now < gatherUntil && gatherParticipants.has(id)) ||
            (id === "chichi"
              ? (!!operation && !operation.jobCity) ||
                !!heroGather ||
                game.care?.resting ||
                crew.workers.has(id)
              : !!residentPlay.get(id) ||
                !!residentPlay.friendVisit(id) ||
                operation?.decision.friendId === id ||
                operation?.partyIds?.has(id) ||
                spa.get(id) ||
                chill.get(id) ||
                court.get(id) ||
                crew.workers.has(id) ||
                mealVisits.has(id) ||
                swimVisits.has(id) ||
                (now < (n?.manualUntil || 0) && !manualJob))
          );
        },
      });
    }
    if (!dialogOpen && game.housing && game.jobCity) {
      const actors = lifeActors;
      for (const a of actors) {
        a.local.x = a.position.x - HOUSING_CENTER[0];
        a.local.y = a.position.y;
        a.local.z = a.position.z - HOUSING_CENTER[1];
      }
      housingLife.step(game, actors, dt, time, {
        eligible: (actor) => homeRestTime(game, actor.id, wallNow, restContext),
        night: !lifeClock.working,
        blocked: (a) => {
          const id = a.id,
            n = npcs.get(id),
            p = game.jobCity.profiles[id];
          return (
            draggingCat?.catId === id ||
            (gatherParticipants.has(id) && (now < gatherUntil || now < (n?.gatheredUntil||0))) ||
            crew.workers.has(id) ||
            p?.trip ||
            jobs.has(id) ||
            Date.now() < (p?.manualUntil || 0) ||
            (id === "chichi"
              ? operation || heroGather || game.care?.resting
              : residentPlay.get(id) ||
                residentPlay.friendVisit(id) ||
                operation?.decision.friendId === id ||
                operation?.partyIds?.has(id) ||
                court.get(id) ||
                spa.get(id) ||
                chill.get(id) ||
                mealVisits.has(id) ||
                swimVisits.has(id) ||
                now < (n?.manualUntil || 0))
          );
        },
      });
    }
    frameProfile?.section("jobsAndHomes");
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
      if (g.userData.aquarium === true)
        g.visible = !!islands.get("aquarium")?.userData.detail.visible;
    if (
      aquariumTank(courtCamera?.id) &&
      Number.isInteger(courtCamera.fishIndex)
    ) {
      const target = itemGroups.get(courtCamera.id);
      if (target)
        desiredLook.copy(
          target.localToWorld(
            target.userData.fishPoint(courtCamera.fishIndex, time),
          ),
        );
    }
    if(courtCamera?.zooAnimal!==undefined){const zoo=islands.get(ZOO_ID);if(zoo?.userData.animalPoint){zoo.userData.animalPoint(courtCamera.id,courtCamera.zooAnimal,time,desiredLook);desiredLook.x+=byBiome(ZOO_ID).center[0];desiredLook.z+=byBiome(ZOO_ID).center[1];}}
    const occupiedAttractions = new Set(
      [...residentPlay.visits.values()].map((v) => v.object),
    );
    if (operation?.attraction) occupiedAttractions.add(operation.attraction);
    for (const g of itemGroups.values())
      if (
        (!reduced || g.userData.magicBed) &&
        !dialogOpen &&
        (g.visible || occupiedAttractions.has(g)) &&
        (!g.userData.foodcourt ||
          (focused === g.userData.placement?.biome &&
            g.position.distanceToSquared(camera.position) < 180 * 180))
      )
        animateAttraction(g, time);
    if (preview && (!reduced||preview.userData.magicBed)) animateAttraction(preview, time);
    if (now >= nextSiteCheck) {
      buildingSites = constructionSites(itemGroups);
      nextSiteCheck = now + 250;
    }
    if (!dialogOpen) {
      spa.step(dt, time);
      chill.step(dt, time);
      const courtIdle = [];
      for (const [id, n] of npcs)
        if (
          ["foodcourt", "bikini", "aquarium", ZOO_ID].includes(n.profile.biome) &&
          !court.get(id) &&
          draggingCat?.catId !== id
        )
          courtIdle.push({
            catId: id,
            biome: n.profile.biome,
            position: courtLocal(n.carrier.position, n.profile.biome),
            radius: spaRadius(n.model),
          });
      if (
        !court.get("chichi") &&
        Math.hypot(
          chichiCarrier.position.x - courtBiome.center[0],
          chichiCarrier.position.z - courtBiome.center[1],
        ) < courtBiome.radius
      )
        courtIdle.push({
          catId: "chichi",
          position: courtLocal(chichiCarrier.position),
          radius: spaRadius(cat),
        });
      let viewers = 0;
      for (const v of court.visits.values())
        if (v.kind === "cinema" && ["settle", "consume"].includes(v.phase))
          viewers++;
      const cinemaLevel = businessLevel(game, "court-cinema");
      cinema.update({
        viewers,
        active:
          worldVisible &&
          !document.hidden &&
          focused === "foodcourt" &&
          distance < 180,
        coins: revenueRate("court-cinema", cinemaLevel),
        xp: businessXP("court-cinema", cinemaLevel),
      });
      if (
        !court.get("chichi") &&
        Math.hypot(
          chichiCarrier.position.x - byBiome("aquarium").center[0],
          chichiCarrier.position.z - byBiome("aquarium").center[1],
        ) < byBiome("aquarium").radius
      )
        courtIdle.push({
          catId: "chichi",
          biome: "aquarium",
          position: courtLocal(chichiCarrier.position, "aquarium"),
          radius: spaRadius(cat),
        });
      courtIdle.push(...bikiniLife.actors());
      court.step(dt, time, courtIdle);
      for (const o of ALL_COURT_VENUES) {
        const g = itemGroups.get(o.id);
        if (g)
          g.userData.servingVisit =
            [...court.visits.values()].find(
              (v) =>
                v.objectId === o.id && ["prepare", "serve"].includes(v.phase),
            ) || null;
      }
    }
    if (!dialogOpen && game.unlocked.includes("bikini"))
      bikiniLife.step(dt, time, reduced);
    if (dialogOpen) cinema.pause();
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
    function applyChillFrame(v, carrier, model, home = false) {
      const centre = home ? HOUSING_CENTER : chillBiome.center;
      carrier.position.set(
        centre[0] + v.position.x,
        v.position.y,
        centre[1] + v.position.z,
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
    for (const [id, food] of courtFoods)
      if (!court.get(id)?.holding) {
        food.removeFromParent();
        disposeScenery(food);
        courtFoods.delete(id);
      }
    islands.get(ZOO_ID)?.userData.setZooState?.(game.zoo);
    for(const e of ZOO_EXHIBITS)itemGroups.get(e.id)?.userData.setZooState?.(game.zoo);
    function applyCourtFrame(v, carrier, model) {
      const venueBiome = byBiome(v.biome || "foodcourt");
      carrier.position.set(
        venueBiome.center[0] + v.position.x,
        v.position.y,
        venueBiome.center[1] + v.position.z,
      );
      carrier.rotation.y = v.yaw;
      if (
        v.reaction?.cue &&
        model.userData.courtCue !== `${v.id}:${v.reaction.cue}`
      ) {
        model.userData.courtCue = `${v.id}:${v.reaction.cue}`;
        emoteCat(model, v.reaction.emotion, { crowd: true });
      }
      if (v.holding) {
        let food = courtFoods.get(v.catId);
        if (!food) {
          food = v.kind === "zoo" ? zooPhotoCamera() : courtFood(v.kind);
          scene.add(food);
          courtFoods.set(v.catId, food);
        }
      }
    }
    if (!dialogOpen && !reduced && now >= gatherUntil)
      rideOutings.step(now, {
        cats: npcs,
        objects: itemGroups,
        visits: residentPlay.visits,
        reserved: (id) =>
          residentPlay.reserved(id) ||
          (operation?.decision.activityId === id &&
            !hasSlideRoom(itemGroups.get(id))),
        blocked: (n) => {
          const id = n.profile.id,
            needs = game.care?.residents[id];
          return (
            draggingCat?.catId === id ||
            operation?.decision.friendId === id ||
            operation?.partyIds?.has(id) ||
            residentPlay.get(id) ||
            residentPlay.friendVisit(id) ||
            spa.get(id) ||
            chill.get(id) ||
            court.get(id) ||
            crew.workers.has(id) ||
            jobs.has(id) ||
            housingLife.get(id) ||
            leisure.has(id) ||
            (now >= (n.gatheredUntil || 0) && (familyLinks.has(id) ||
            !!game.jobCity?.profiles[id]?.schedule?.outings?.length)) ||
            mealVisits.has(id) ||
            swimVisits.has(id) ||
            now < (n.manualUntil || 0) ||
            (needs?.hunger ?? 0) > 65 ||
            (needs?.energy ?? 100) < 25
          );
        },
        start: (id, decision) =>
          performResident(id, decision, { autonomous: true }),
      });
    const familyClock = lifeClock,
      familyFree = (who) =>
        !familyClock?.working ||
        game.jobCity?.profiles[who]?.schedule?.job === "rest";
    if(!dialogOpen&&callbacks.canSimulateLeisure?.()!==false&&now>=nextMagicFarmAttempt&&!islands.get(focused)?.userData.lowOnly){
      nextMagicFarmAttempt=now+1400;
      const harvesters=[...itemGroups.values()].filter(g=>(g.userData.magicBed&&g.userData.placement.biome===focused||g.userData.magicFarm&&g.userData.placementId==='orchard-'+focused)&&g.userData.harvests?.available());
      for(const g of harvesters){
        for(const [id,n]of npcs){
          const needs=game.care?.residents[id];
          if(n.profile.biome!==focused||residentPlay.get(id)||jobs.has(id)||leisure.has(id)||crew.workers.has(id)||housingLife.get(id)||mealVisits.has(id)||swimVisits.has(id)||draggingCat?.catId===id||operation?.decision.friendId===id||now<(n.manualUntil||0)||needs?.hunger>65||needs?.energy<25||n.carrier.position.distanceToSquared(g.position)>32*32)continue;
          if(performResident(id,{action:'farm',activityId:g.userData.placementId,mood:'happy',thought:'Зберу стиглі чарівні плоди!'},{autonomous:true}))break;
        }
      }
    }
    frameProfile?.section("venues");
    for (const [id, n] of npcs) {
      const jobFrame = jobs.has(id)
        ? jobCatFrame(jobs.get(id), time, reduced)
        : null;
      const gathering = n.gatherTrip ? gatherFrame(n.gatherTrip,now) : null;
      const homeVisit = housingLife.get(id);
      const leisureFrame = leisure.frame(id);
      const spouse = familyLinks.get(id),
        follows =
          spouse &&
          id !== "chichi" &&
          (spouse === "chichi" || game.jobCity?.profiles[id]?.sex === "female");
      const leader = follows
        ? spouse === "chichi"
          ? {
              carrier: chichiCarrier,
              model: cat,
              biome: BIOMES.filter((b) => game.unlocked.includes(b.id)).reduce(
                (a, b) =>
                  Math.hypot(
                    chichiCarrier.position.x - b.center[0],
                    chichiCarrier.position.z - b.center[1],
                  ) <
                  Math.hypot(
                    chichiCarrier.position.x - a.center[0],
                    chichiCarrier.position.z - a.center[1],
                  )
                    ? b
                    : a,
                byBiome("moon"),
              ).id,
            }
          : npcs.get(spouse)
        : null;
      const follow =
        leader &&
        familyFree(id) &&
        familyFree(spouse) &&
        !jobs.has(id) &&
        !jobs.has(spouse) &&
        !housingLife.get(spouse) &&
        now >= (n.manualUntil || 0)
          ? leader
          : null;
      const b = byBiome(
          homeVisit
            ? HOUSING_ID
            : jobFrame
              ? "jobcity"
              : leisure.get(id)?.offer.biome ||
                follow?.leisureBiome ||
                follow?.biome ||
                follow?.profile?.biome ||
                n.leisureBiome ||
                n.profile.biome,
        ),
        needs = game.care?.residents[id];
      updateCityCar(id, jobFrame, time);
      let x = n.carrier.position.x,
        z = n.carrier.position.z,
        npcWalking = false,
        npcReaction = null,
        direct = false;
      n.carrier.rotation.x = 0;
      n.carrier.rotation.z = 0;
      const draggingThis = draggingCat?.catId === id,
        manualVisit = residentPlay.get(id),
        friendVisit = residentPlay.friendVisit(id);
      const plannedFreeTime =
        familyLinks.has(id) ||
        !!game.jobCity?.profiles[id]?.schedule?.outings?.length;
      const busyWithChichi =
        operation?.decision.friendId === id ||
        operation?.partyIds?.has(id) ||
        !!manualVisit ||
        !!friendVisit ||
        !!leisureFrame;
      if (busyWithChichi || draggingThis || b.id !== "water") spa.cancel(id);
      if (
        b.id === "water" &&
        !plannedFreeTime &&
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
        !plannedFreeTime &&
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
      if (
        busyWithChichi ||
        draggingThis ||
        !["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id)
      )
        court.cancel(id);
      if (
        ["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id) &&
        !plannedFreeTime &&
        !busyWithChichi &&
        !draggingThis &&
        !dialogOpen &&
        now >= gatherUntil &&
        !court.get(id) &&
        now > nextCourtStart &&
        now > (n.manualUntil || 0) &&
        Date.now() - (n.lastCourtAt || 0) >
          (b.id === "aquarium" ? 18000 : b.id === "bikini" ? 90000 : 45000)
      ) {
        nextCourtStart = now + 1400;
        n.lastCourtAt = Date.now();
        const options = ALL_COURT_VENUES.filter(
            (o) => o.biome === b.id && courtProject(game, o.id)?.built,
          ),
          start = n.index + Math.floor(time / 25);
        for (let j = 0; j < options.length; j++) {
          const o = options[(start + j) % options.length],
            v = court.start({
              catId: id,
              objectId: o.id,
              position: courtLocal(n.carrier.position, b.id),
              radius: spaRadius(n.model),
            });
          if (v) break;
        }
      }
      const courtVisit = court.get(id);
      const chillVisit = chill.get(id);
      const spaVisit = spa.get(id);
      const canBuild =
        !jobFrame &&
        !busyWithChichi &&
        !draggingThis &&
        !dialogOpen &&
        now >= gatherUntil &&
        !spaVisit &&
        !chillVisit &&
        !courtVisit &&
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
        !["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id) &&
        !builderFrame &&
        !jobFrame &&
        !busyWithChichi &&
        now >= gatherUntil &&
        !draggingThis &&
        !mealVisits.has(id) &&
        !swimVisits.has(id) &&
        mealVisits.size < 2 &&
        (now >= Math.max(n.manualUntil||0,n.gatheredUntil||0) || needs?.hunger>=85) &&
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
        !["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id) &&
        now > (n.manualUntil || 0) &&
        !builderFrame &&
        !jobFrame &&
        !busyWithChichi &&
        now >= gatherUntil &&
        !draggingThis &&
        !mealVisits.has(id) &&
        !swimVisits.has(id) &&
        swimVisits.size < 2 &&
        now >= (n.gatheredUntil||0) &&
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
      if (
        manualVisit?.decision.action === "meet" &&
        manualVisit.phase === "activity"
      ) {
        const cue = manualFrame?.reaction?.crouch > 0.08 ? "cuddle" : "play";
        if (manualVisit.emoteCue !== cue) {
          manualVisit.emoteCue = cue;
          emoteCat(n.model, cue === "cuddle" ? "affectionate" : "delighted", {
            crowd: true,
          });
          const peer = npcs.get(manualVisit.decision.friendId);
          if (peer) emoteCat(peer.model, "delighted", { crowd: true });
        }
      }
      if (gathering && !draggingThis && !manualFrame && !jobFrame && !homeVisit) {
        n.carrier.position.set(gathering.position.x,gathering.position.y,gathering.position.z);
        n.carrier.rotation.y=gathering.yaw;
        x=gathering.position.x;z=gathering.position.z;direct=true;
        npcWalking=gathering.walking;npcReaction=gathering.reaction;
        if(gathering.done){n.manualAnchor={x,z};n.gatherTrip=null;}
      } else if (leisureFrame && !draggingThis) {
        n.carrier.position.set(
          leisureFrame.position.x,
          leisureFrame.position.y,
          leisureFrame.position.z,
        );
        n.carrier.rotation.y = leisureFrame.yaw;
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = leisureFrame.walking;
        npcReaction = leisureFrame.reaction;
      } else if (manualFrame) {
        n.carrier.position.copy(manualFrame.position);
        n.carrier.rotation.y = manualFrame.yaw;
        n.carrier.rotation.z = manualFrame.roll;
        n.carrier.rotation.x = manualFrame.pitch || 0;
        if (manualFrame.quaternion)
          n.carrier.quaternion.copy(manualFrame.quaternion);
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
      } else if (homeVisit) {
        applyChillFrame(homeVisit, n.carrier, n.model, true);
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = homeVisit.walking;
        npcReaction = homeVisit.reaction;
      } else if (jobFrame) {
        applyJobFrame(jobFrame, n.carrier);
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = jobFrame.walking;
        npcReaction = jobFrame.reaction;
      } else if (courtVisit) {
        applyCourtFrame(courtVisit, n.carrier, n.model);
        x = n.carrier.position.x;
        z = n.carrier.position.z;
        direct = true;
        npcWalking = courtVisit.walking;
        npcReaction = courtVisit.reaction;
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
      } else if (n.profile.venueHome && !busyWithChichi && !follow) {
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
        !follow &&
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
            operation.social,
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
      } else if (
        ["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id) &&
        !plannedFreeTime &&
        !busyWithChichi &&
        now >= gatherUntil
      ) {
        direct = true;
        const dry = nearestCourtIdleGround(
          courtLocal(n.carrier.position, b.id),
          spaRadius(n.model),
          getCourtBlockers(b.id),
          b.id,
        );
        if (dry) {
          n.carrier.position.set(
            b.center[0] + dry.x,
            0.16,
            b.center[1] + dry.z,
          );
          x = n.carrier.position.x;
          z = n.carrier.position.z;
        }
      } else if (follow) {
        const point = familyFollowTarget(
          { position: follow.carrier.position, yaw: follow.carrier.rotation.y },
          spaRadius(n.model),
          spaRadius(follow.model),
        );
        let target = {
          x: point.x - b.center[0],
          z: point.z - b.center[1],
          y: 0.16,
        };
        if (["foodcourt", "bikini", "aquarium", ZOO_ID].includes(b.id))
          target = nearestCourtGround(
            target,
            spaRadius(n.model),
            getCourtBlockers(b.id),
            b.id,
          );
        else if (b.id === "water")
          target = nearestSpaGround(target, spaRadius(n.model), spaObstacles);
        else if (b.id === "sakura")
          target = nearestChillGround(
            target,
            spaRadius(n.model),
            chillObstacles,
          );
        if (target) {
          x = b.center[0] + target.x;
          z = b.center[1] + target.z;
          n.carrier.position.y = 0.16 + islandHeight(b.id, target.x, target.z);
        }
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
        if(b.magicFarm)z=b.center[1]+b.radius-20+Math.cos(time*.07+n.index*2.4)*2;
        if (b.id === "autumn") {
          const dry = mosaDryPoint(x - b.center[0], z - b.center[1]);
          x = b.center[0] + dry.x;
          z = b.center[1] + dry.z;
        }
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
      if (!direct && b.id === "autumn") {
        const dry = mosaDryPoint(x - b.center[0], z - b.center[1]);
        x = b.center[0] + dry.x;
        z = b.center[1] + dry.z;
      }
      const direction = npcDirection
        .set(x, n.carrier.position.y, z)
        .sub(n.carrier.position);
      if (!direct) {
        if(b.magicFarm&&!farmWalkable(b.id,{x:x-b.center[0],z:z-b.center[1]},spaRadius(n.model))){x=n.carrier.position.x;z=n.carrier.position.z;}
        if (direction.length() > 0.03)
          n.carrier.rotation.y = Math.atan2(direction.x, direction.z);
        stepCatGround(n.carrier.position.x,n.carrier.position.z,x,z,dt,
          megaGroundPlots,b.id,spaRadius(n.model),megaGroundPoint);
        n.carrier.position.x=megaGroundPoint.x;
        n.carrier.position.z=megaGroundPoint.z;
        npcWalking = direction.length() > 0.1;
      }
      const near =
        (faceCamera.enabled && followedCatId === id) ||
        (overviewElevation !== null && b.id === focused) ||
        (distance < Math.max(110, (b.radius || 12) * 7) &&
          n.inView(attractionFrustum, sun.shadow.getFrustum()));
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
        chillVisit?.phase === "relax" ||
        homeVisit?.phase === "relax"
          ? "sleep"
          : game.social?.bestFriendId === id && game.care?.resting
            ? "sleep"
            : needs?.hunger >= 75
              ? "crazy hungry"
              : "happy");
      if (n.model.userData.mood !== desiredMood)
        setCatMood(n.model, desiredMood, { immediate: reduced });
      if (near && !dialogOpen) {
        animateCat(
          n.model,
          time +
            n.index +
            (builderFrame?.speed > 1
              ? builderFrame.elapsed * (1 - 1 / builderFrame.speed)
              : 0),
          npcWalking,
          reduced,
        );
        if (npcReaction) {reactCat(n.model, npcReaction, reduced);if(npcReaction.rideSit)applyAtollSit(n.model,npcReaction,reduced);if(manualVisit?.object?.userData.magicBed)applyMagicBedReach(n.model,manualVisit.object,manualVisit.harvester,reduced);}
        if (n.hatRig) {
          const resting =
              (spaVisit?.phase === "relax" &&
                ["spa-lounge", "spa-jacuzzi"].includes(spaVisit.objectId)) ||
              chillVisit?.phase === "relax" ||
              homeVisit?.phase === "relax",
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
    chichiCarrier.rotation.x = 0;
    chichiCarrier.rotation.z = 0;
    let walking = false,
      reaction = null;
    frameProfile?.section("residents");
    if (heroGather && !operation && !draggingCat) {
      const frame=gatherFrame(heroGather,now);
      chichiCarrier.position.set(frame.position.x,frame.position.y,frame.position.z);
      chichiCarrier.rotation.y=frame.yaw;
      walking=frame.walking;reaction=frame.reaction;
      if(frame.done)heroGather=null;
    }
    if(gatherSavePending&&!heroGather&&![...npcs.values()].some(n=>n.gatherTrip)){
      gatherSavePending=false;callbacks.onGatherComplete?.();
    }
    const heroCanBuild =
      !operation &&
      !heroGather &&
      !jobs.has("chichi") &&
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
      if (op.stage === "jobcity") {
        const v = jobs.get("chichi");
        if (v) {
          const f = jobCatFrame(v, time, reduced);
          applyJobFrame(f, chichiCarrier);
          walking = f.walking;
          reaction = f.reaction;
        }
        if (op.jobFinished || !v) {
          operation = null;
          op.resolve({
            completed: !!op.jobFinished,
            cancelled: !op.jobFinished,
          });
        }
      } else if (op.stage === "court") {
        const v = court.get("chichi");
        if (v) {
          applyCourtFrame(v, chichiCarrier, cat);
          walking = v.walking;
          reaction = v.reaction;
        }
        if (op.spaCompleted || op.spaFailed) {
          operation = null;
          op.resolve(
            op.spaFailed
              ? { cancelled: true }
              : { completed: true, spaVisit: op.spaCompleted },
          );
        }
      } else if (op.stage === "chill") {
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
      } else if (op.stage === "queue") {
        const u = reduced
          ? 1
          : THREE.MathUtils.clamp((now - op.rider.launchAt) / 1100, 0, 1);
        framePoint
          .fromArray(op.rider.queue)
          .lerp(new THREE.Vector3(...op.rider.entry), u * u * (3 - 2 * u));
        chichiCarrier.position.copy(op.attraction.localToWorld(framePoint));
        walking = u > 0 && u < 1;
        if (u >= 1) {
          op.stage = "activity";
          op.activityStart = now;
        }
      } else if (op.stage === "travel") {
        const p = Math.min((now - op.start) / op.duration, 1);
        if (op.attraction?.userData.approachFrame) {
          const g = op.attraction,
            a = g.worldToLocal(op.from.clone()),
            b = g.worldToLocal(op.destination.clone());
          chichiCarrier.position.copy(
            g.localToWorld(
              framePoint.set(
                ...g.userData.approachFrame(a.toArray(), b.toArray(), p),
              ),
            ),
          );
        } else
          chichiCarrier.position.lerpVectors(
            op.from,
            op.destination,
            p * p * (3 - 2 * p),
          );
        const d = travelDirection.copy(op.destination).sub(op.from);
        chichiCarrier.rotation.y = Math.atan2(d.x, d.z);
        if(op.attraction?.userData.approachYaw){const g=op.attraction;chichiCarrier.rotation.y=g.rotation.y+g.userData.approachYaw(g.worldToLocal(op.from.clone()).toArray(),g.worldToLocal(op.destination.clone()).toArray(),p);}
        walking = p < 1;
        if (p === 1) {
          choiceExpression(op.decision);
          if (op.court) {
            startHeroCourt(op);
          } else if (op.chill) {
            startHeroChill(op);
          } else if (op.spa) {
            startHeroSpa(op);
          } else op.stage = "activity";
          if (op.rider) {
            launchSlide(op.attraction, op.rider, now);
            op.stage = "queue";
          }
          op.activityStart = now;
          if (op.social) {
            op.social.heroYaw = chichiCarrier.rotation.y;
            op.social.friendYaw = op.neighbor.carrier.rotation.y;
          }
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
            if (op.rider) op.rider.elapsed = elapsed;
            const f = g.userData.rideFrame(
              elapsed,
              reduced,
              op.rider?.lane || 0,
            );
            walking = f.walking ?? false;
            local.set(...f.position);
            chichiCarrier.rotation.y = (f.yaw || 0) + g.rotation.y;
            chichiCarrier.rotation.z = f.roll || 0;
            chichiCarrier.rotation.x = f.pitch || 0;
            if (f.quaternion)
              chichiCarrier.quaternion
                .copy(g.quaternion)
                .multiply(new THREE.Quaternion().fromArray(f.quaternion));
            reaction = g.userData.rideReaction?.(
              elapsed,
              reduced,
              op.rider?.lane || 0,
            ) || {
              paw: f.paw || 0,
              headPitch: f.headPitch || 0,
              surprise: f.surprise || 0,
            };
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
        } else if(action==='farm'&&op.harvester){
          const f=op.harvester.frame(elapsed,reduced);chichiCarrier.position.copy(g.localToWorld(framePoint.set(...f.position)));chichiCarrier.rotation.y=g.rotation.y+f.yaw;walking=f.walking;reaction=f.reaction;g.userData.showHarvest(op.harvester,f);
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
          chichiCarrier.rotation.y = (f.yaw || 0) + g.rotation.y;
          walking = f.walking ?? !reduced;
          reaction = f.reaction || { paw: f.paw };
          if (g.userData.bikiniFriend && op.bikiniPhase !== f.phase) {
            op.bikiniPhase = f.phase;
            callbacks.onReaction?.(
              {
                greet: "Привет! Как здорово видеть тебя! 👋",
                five: "Лапку сюда — дай пять! 🐾",
                hug: "Обнимашки с морским другом 💛",
                pet: "Мур-р-р… как приятно!",
                pickup: "Оп! На ручки к Губке Бобу 🤗",
                carry: "Как уютно! Гуляем по Бикини-Боттом на ручках 💛",
                putdown: "Аккуратно на лапки… ещё погуляем! 🐾",
                play: "Лови пузырёк! Прыг — и ещё один! 🫧",
                dance: "Танцуем вместе! 🎵",
                photo: "Скажи мяу! 📸",
                sit: "Посидим рядом и посмотрим на облака ☁️",
                goodbye: "До встречи, пушистый дружок! 💛",
              }[f.phase],
            );
          }
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
          const frame = socialFrame(elapsed, op.socialKind, reduced, op.social);
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
            emoteCat(
              cat,
              op.socialKind === "piggyback" ? "delighted" : "affectionate",
            );
            emoteCat(op.neighbor.model, "delighted", { crowd: true });
            callbacks.onReaction?.(
              op.socialKind === "piggyback"
                ? "Тримайся лапками! Мур-р, пухнастий котобус вирушає! 🐾"
                : op.socialKind === "greet"
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
          op.harvester ? op.harvester.finished : elapsed >
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
          g?.userData.releasePlay?.(chichiCarrier);
          g?.userData.releaseHarvest?.('chichi');
          releaseSlide(g, "chichi");
          if (g && !g.userData.slideRiders?.size) delete g.userData.rideElapsed;
          if (
            g?.userData.deepRide &&
            !faceCamera.enabled &&
            overviewElevation === null
          ) {
            const b = byBiome("autumn");
            desiredLook.set(b.center[0], 0, b.center[1]);
            desiredDistance = mobileRender ? 85 : 57;
          }
          socialGlow.visible = false;
          operation = null;
          op.resolve({
            completed: true,
            ...(op.harvester?(g?.userData.magicBed?{bedHarvest:op.harvester.receipt}:{magicHarvest:op.harvester.receipt}):{}),
            ...(g?.userData.bikiniFriend
              ? {
                  spaVisit: {
                    id:
                      "bikini-friend-" +
                      Date.now().toString(36) +
                      "-" +
                      Math.random().toString(36).slice(2, 8),
                    catId: "chichi",
                    objectId: op.decision.activityId,
                    position: courtLocal(chichiCarrier.position, "bikini"),
                  },
                }
              : {}),
            ...(action === "meet"
              ? { socialKind: op.socialEncounterKind }
              : {}),
            ...(action === "party"
              ? { participantIds: [...op.partyPresent] }
              : {}),
          });
        }
      }
    }
    const heroJobFrame = jobs.has("chichi")
      ? jobCatFrame(jobs.get("chichi"), time, reduced)
      : null;
    updateCityCar("chichi", heroJobFrame, time);
    if (
      heroJobFrame &&
      !operation &&
      !heroGather &&
      !draggingCat &&
      !heroBuild
    ) {
      applyJobFrame(heroJobFrame, chichiCarrier);
      walking = heroJobFrame.walking;
      reaction = heroJobFrame.reaction;
    }
    const heroHome = housingLife.get("chichi");
    if (heroHome && !operation && !heroGather && !draggingCat && !heroBuild) {
      applyChillFrame(heroHome, chichiCarrier, cat, true);
      walking = heroHome.walking;
      reaction = heroHome.reaction;
    }
    const heroLeisure = leisure.frame("chichi");
    if (
      heroLeisure &&
      !operation &&
      !heroGather &&
      !draggingCat &&
      !heroBuild
    ) {
      chichiCarrier.position.set(
        heroLeisure.position.x,
        heroLeisure.position.y,
        heroLeisure.position.z,
      );
      chichiCarrier.rotation.y = heroLeisure.yaw;
      walking = heroLeisure.walking;
      reaction = heroLeisure.reaction;
    }
    if (!dialogOpen) {
      animateCat(
        cat,
        time +
          (heroBuild?.speed > 1
            ? heroBuild.elapsed * (1 - 1 / heroBuild.speed)
            : 0),
        walking,
        reduced,
      );
      if (reaction) {reactCat(cat, reaction, reduced);if(reaction.rideSit)applyAtollSit(cat,reaction,reduced);if(operation?.attraction?.userData.magicBed)applyMagicBedReach(cat,operation.attraction,operation.harvester,reduced);}
    }
    const spongeFriend = itemGroups.get("bikini-sponge");
    if (spongeFriend?.userData.playing && spongeFriend.userData.pose) {
      const visitor =
        operation?.attraction === spongeFriend
          ? cat
          : npcs.get(
              [...residentPlay.visits.values()].find(
                (v) => v.object === spongeFriend && v.phase === "activity",
              )?.id,
            )?.model;
      if (visitor) spongeFriend.userData.touchCat(visitor);
    }
    for (const [id, food] of courtFoods) {
      const visit = court.get(id),
        resident = npcs.get(id),
        model = id === "chichi" ? cat : resident?.model,
        carrier = id === "chichi" ? chichiCarrier : resident?.carrier;
      if (visit && model && carrier)
        placeCourtFood(food, model, carrier, {
          kind: visit.kind,
          drinking: visit.phase === "consume",
          time,
        });
    }
    // Apply ride tracking after the current rig pose, so even a slow frame or
    // a dive/jump cannot leave the rider outside the view for one whole frame.
    if (
      operation?.attraction?.userData.deepRide &&
      operation.stage === "activity" &&
      !faceCamera.enabled &&
      overviewElevation === null
    ) {
      desiredLook.copy(chichiCarrier.position);
      if (look.distanceTo(desiredLook) > 8) look.copy(desiredLook);
      else look.lerp(desiredLook, Math.min(1, dt * 14));
      camera.position.set(
        look.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
        look.y + Math.sin(elevation) * distance,
        look.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
      );
      camera.lookAt(look);
    }
    frameProfile?.section("chichi");
    faceCamera.update(elapsed, look);
    camera.updateMatrixWorld();
    islands
      .get(HOUSING_ID)
      ?.userData.viewHousing?.(look, distance, camera, time);
    if (dialogOpen || !worldVisible || frameProfile?.suspended) {
      requestAnimationFrame(loop);
      return;
    }
    frameProfile?.section("cameraAndHousingView");
    ambient.userData.update(time, look, reduced);
    const width = viewport.width,
      height = viewport.height;
    if (Math.floor(now / 1000) !== incomeSecond) {
      incomeSecond = Math.floor(now / 1000);
      incomeCache.clear();
      const incomeNow = Date.now();
      for (const p of businessVenues(game))
        incomeCache.set(p.id, incomeForVenue(game, p, incomeNow));
    }
    for (const [id, button] of incomeButtons) {
      const object = itemGroups.get(id),
        amount = incomeCache.get(id) || 0;
      if (!object || !amount || distance > 110 || courtCamera?.id === id) {
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
      const symbol = incomeSymbol(object.userData.placement.item),
        text = symbol + " " + amount;
      button.classList.toggle("diamond-income", symbol === "💎");
      if (button.textContent !== text) {
        button.textContent = text;
        button.setAttribute(
          "aria-label",
          "Собрать " +
            amount +
            (symbol === "💎" ? " алмазов · " : " монет · ") +
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
            courtObject(id)
              ? callbacks.onSelectCourt?.(id)
              : callbacks.onSelectIsland?.(g.userData.placement.biome);
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
        const text = g.userData.unstarted
          ? byItem(place.item).icon + (g.userData.zooExhibit?" Відкрити":" Построить")
          : "⏳ " +
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
    frameProfile?.section("ambientAndBadges");
    sun.position.set(look.x - 14, 35, look.z + 20);
    sun.target.position.copy(look);
    sun.updateWorldMatrix(true, false);
    sun.target.updateWorldMatrix(true, false);
    sun.shadow.updateMatrices(sun);
    camera.updateMatrixWorld();
    attractionProjection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    attractionFrustum.setFromProjectionMatrix(
      attractionProjection,
      camera.coordinateSystem,
      camera.reversedDepth,
    );
    chichiCarrier.visible = heroVisibility(
      attractionFrustum,
      sun.shadow.getFrustum(),
    );
    const cityOccluded = cityViewOccluders(courtCamera?.id, {
      x: camera.position.x - JOB_CITY_CENTER[0],
      y: camera.position.y,
      z: camera.position.z - JOB_CITY_CENTER[1],
    });
    for (const g of itemGroups.values()) {
      if (!attractionViews.has(g)) continue;
      const visible =
        !cityOccluded.has(g.userData.placementId) &&
        attractionViews.get(g)(attractionFrustum, sun.shadow.getFrustum());
      if (
        visible &&
        !g.visible &&
        !reduced &&
        (!g.userData.foodcourt || focused === g.userData.placement?.biome)
      )
        animateAttraction(g, time);
      g.visible = visible;
      const placement=g.userData.placement;
      if(g.userData.loadingReference && byItem(placement?.item)?.premiumWater &&
        atollPreparationNeeded(placement,byBiome(placement.biome),{
          focused,look:desiredLook,distance,visible,moving:cameraMoving||!!pointerDown,pending:referencePreparing.size,requested:referenceRequested.has(placement.id),
        }))prepareReference(placement);
    }
    // A ready native interior must not sit inside its closed loading proxy.
    // Inspection masking applies to both representations of a city building.
    islands.get("jobcity")?.userData.syncBuildingProxies?.(itemGroups, cityOccluded);
    if (cityOccluded.size) {
      for (const [id, n] of npcs) {
        const state = jobs.get(id),
          business = jobBusiness(state?.job || state?.visitor);
        if (business && cityOccluded.has(business.id))
          n.carrier.visible = false;
      }
      const hero = jobs.get("chichi"),
        business = jobBusiness(hero?.job || hero?.visitor);
      if (business && cityOccluded.has(business.id))
        chichiCarrier.visible = false;
    }
    scene.fog.density = distance > 90 ? 0.0007 : 0.0035;
    updateOcclusion(now, dt);
    // The opaque shop covers the map. Keep the simulation running, but avoid
    // competing GPU draws while its miniature scenes are being rendered.
    if (!dialogOpen) {
      frameProfile?.section("visibility");
      const profileRender = frameProfile ? performance.now() : 0;
      frameProfile?.beginRender();
      try {
        if (frameProfile) frameProfile.run("frame.renderer", renderer.render, renderer, [scene, camera]);
        else renderer.render(scene, camera);
      } finally { frameProfile?.endRender(); }
      if(frameProfile){
        frameProfile.run("frame.gpuSubmit",gpuFrames.submitted,gpuFrames,[]);
        frameProfile.run("frame.residency",geometryResidency.sweep,geometryResidency,[now]);
      }else{
        gpuFrames.submitted();
        geometryResidency.sweep(now);
      }
      if (frameProfile) frameProfile.frame({at:now,cpu:profileRender-profileStart,render:performance.now()-profileRender,
        biome:focused,cats:npcs.size,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
        geometryBytes:geometryResidency.stats.bytes,pending:gpuFrames.pending,dpr:renderer.getPixelRatio(),
        poseCats:poseAtlas.stats.updatedCats,colonyActive:colonyDraws.stats.active,
        shaderPending:shaderWarmup.stats.pending,shaderPreparing:shaderWarmup.stats.preparing,evicted:geometryResidency.stats.evicted,
        refaults:geometryResidency.stats.refaults,refaultBytes:geometryResidency.stats.refaultBytes,
        rapidRefaults:geometryResidency.stats.rapidRefaults,rapidRefaultBytes:geometryResidency.stats.rapidRefaultBytes,
        targetFps:Math.round(1000/renderInterval),programs:renderer.info.programs?.length||0,
        visible:worldVisible,moving:!!(cameraMoving||pointerDown||faceCamera.enabled),
        buffer:[renderer.domElement.width,renderer.domElement.height]});
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
    farmBusyCount(id){return itemGroups.get('orchard-'+id)?.userData.harvests?.visits.size||0;},
    syncCryptoState(state){
      if(!state||game.jobCity?.epoch!==state.epoch)return;
      if(game.jobCity!==state)game={...game,jobCity:state};
      itemGroups.get("job-crypto")?.userData.setCryptoState?.(state);
    },
    snapshotCatLocations(next,previous=next){
      const actors=[{id:'chichi',position:chichiCarrier.position,yaw:chichiCarrier.rotation.y,
        transient:!!heroGather||draggingCat?.catId==='chichi'||['ride','swim'].includes(operation?.decision.action)},
        ...[...npcs].map(([id,n])=>({id,position:n.carrier.position,yaw:n.carrier.rotation.y,
          transient:!!n.gatherTrip||draggingCat?.catId===id||!!spa.get(id)||!!chill.get(id)||swimVisits.has(id)||
            ['ride','swim'].includes(residentPlay.get(id)?.decision?.action)}))];
      return captureCatLocations(next,previous,actors);
    },
    followCat,
    inspectJobBusiness: inspectAttraction,
    showCatHome,
    focusHousingSection,
    chooseCityDrive(id, car) {
      if (!game.jobCity?.profiles[id]?.inventory[car]) return false;
      focus("jobcity");
      islandOverview();
      cityDriveChoice = { id, car };
      drivePrompt.textContent = "🚗 Натисніть дорогу для поїздки · скасувати";
      drivePrompt.hidden = false;
      return true;
    },
    enterCourt,
    exitCourt,
    performResident,
    moveResident(id, biome, position) {
      const n = npcs.get(id),
        b = byBiome(biome);
      if (!n || !b || !game.unlocked.includes(biome)) return false;
      cancelResident(id);
      if (position.nearChichi)
        position = {
          x: chichiCarrier.position.x + socialContext(cat, n.model).gap,
          z: chichiCarrier.position.z,
        };
      let p = {
        x: position.x - b.center[0],
        z: position.z - b.center[1],
        y: 0.16,
      };
      if (biome === "jobcity") p = nearestCityGround(p, spaRadius(n.model));
      else if(b.magicFarm)p=nearestFarmGround(biome,p,spaRadius(n.model));
      else if (["foodcourt", "bikini", "aquarium", ZOO_ID].includes(biome))
        p = nearestCourtGround(
          p,
          spaRadius(n.model),
          getCourtBlockers(biome),
          biome,
        );
      else if (biome === "sakura")
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
    followChichi(value = !(faceCamera.enabled && followedCatId === "chichi")) {
      if (value) followCat("chichi");
      else {
        const id = viewedIsland();
        faceCamera.setEnabled(false, look);
        focus(id, false, true);
      }
      return faceCamera.enabled && followedCatId === "chichi";
    },
    isFollowingChichi: () => faceCamera.enabled && followedCatId === "chichi",
    followRandomCat,
    inspectAttraction,
    isAttractionLoading:id=>!!itemGroups.get(id)?.userData.loadingReference,
    prepareAttraction(id){const g=itemGroups.get(id);if(!g?.userData.loadingReference||!isBuilt(g.userData.placement))return Promise.resolve(!!g?.userData.built);referenceRequested.add(id);return prepareReference(g.userData.placement);},
    rideGuests: (id) => rideGuests(id, operation, residentPlay.visits),
    followRideGuest(id) {
      const guests = rideGuests(id, operation, residentPlay.visits);
      const next = guests[(guests.indexOf(followedCatId) + 1) % guests.length];
      return next && followCat(next) ? next : null;
    },
    islandOverview,
    overview: () => focus("moon", true),
    zoom: (delta) =>
      faceCamera.enabled
        ? faceCamera.zoom(delta * 0.015)
        : (desiredDistance = THREE.MathUtils.clamp(
            desiredDistance + delta,
            courtCamera ? 10 : 21,
            viewDistanceLimit(),
          )),
    beginBuild,
    updateBuild: (mode) => {
      buildMode = { ...buildMode, ...mode };
      updatePreview();
    },
    getFocused: () => focused,
    gatherCandidates:availableGatherCats,
    gather(biome,ids=availableGatherCats()) {
      const b = byBiome(biome);
      if (!b || operation) return false;
      const arrival = b.arrival || [0, 0],
        to = new THREE.Vector3(
          b.center[0] + arrival[0],
          0.16 + islandHeight(b.id, arrival[0], arrival[1]),
          b.center[1] + arrival[1],
        );
      gatherParticipants.clear();for(const id of ids)gatherParticipants.add(id);
      const now=performance.now();gatherUntil=now+20000;gatherSavePending=true;
      const reserved=[],arrivalPoint={x:arrival[0],z:arrival[1]},
        obstacles=game.placements.filter(p=>p.biome===biome).map(p=>{
          const d=byItem(p.item),f=d?.footprint||[1,1],swap=(p.rotation||0)%2;
          return {x:p.x,z:p.z,w:f[swap?1:0],d:f[swap?0:1]};
        }),
        clear=(p,r)=>{
          if(Math.hypot(p.x,p.z)>(b.radius||11.65)-r-.3)return false;
          if(!spaClear(p,r,obstacles))return false;
          if(['foodcourt','bikini','aquarium',ZOO_ID].includes(biome))return courtWalkable(p,r,getCourtBlockers(biome),biome);
          if(biome==='water')return spaWalkable(p,r,spaObstacles);
          if(biome==='sakura')return chillWalkable(p,r,chillObstacles);
          if(biome==='autumn'){const q=mosaDryPoint(p.x,p.z);return Math.hypot(q.x-p.x,q.z-p.z)<.01;}
          if(biome==='summer'){const q=capybaraDryPoint(p.x,p.z);return Math.hypot(q.x-p.x,q.z-p.z)<.01;}
          return true;
        },
        members=ids.filter(id=>id==='chichi'||npcs.has(id)).map(id=>({id,n:id==='chichi'?null:npcs.get(id),
          radius:spaRadius(id==='chichi'?cat:npcs.get(id)?.model)}))
          .filter(a=>a.id==='chichi'||a.n).sort((a,b)=>b.radius-a.radius);
      for(const {id,n,radius}of members){
        const landing=gatherLanding(arrivalPoint,radius,reserved,clear,Math.min(b.radius*2,50));
        if(!landing)continue;
        reserved.push(landing);
        const goal={x:b.center[0]+landing.x,z:b.center[1]+landing.z,
          y:.16+islandHeight(biome,landing.x,landing.z)};
        if(id==='chichi'){
          spa.cancel(id);crew.cancel(id);chill.cancel(id);court.cancel(id);residentPlay.cancel(id);
          heroGather=gatherTrip(chichiCarrier.position,goal,now);
        }else{
          cancelResident(id);releaseGatherOverrides(n,now+20000);
          n.gatherTrip=gatherTrip(n.carrier.position,goal,now);
          n.manualUntil=now+n.gatherTrip.duration+1500;n.gatheredUntil=now+90000;
        }
      }
      // Prepare only the nearest two cold paid rides. A recall must not build
      // twenty giant complexes during an overview or leave every ride cold.
      if(b.waterpark)game.placements.filter(p=>p.biome===biome&&byItem(p.item)?.referenceSlide&&isBuilt(p))
        .sort((a,b)=>Math.hypot(a.x-arrival[0],a.z-arrival[1])-Math.hypot(b.x-arrival[0],b.z-arrival[1]))
        .slice(0,2).forEach(p=>{referenceRequested.add(p.id);prepareReference(p);});
      for (const id of ids) {
        mealVisits.delete(id);
        swimVisits.delete(id);
      }
      focus(biome, false, true);
      return true;
    },
    dispose() {
      disposed = true;
      frameProfile?.dispose();
      shaderWarmup.dispose();
      shadowDepth.dispose();
      geometryResidency.dispose();
      colonyDraws.dispose();
      poseAtlas.dispose();
      staticDraws.dispose();
      jobs.clear();
      housingLife.clear();
      leisure.clear();
      drivePrompt.remove();
      for (const car of cityCars.values()) car.removeFromParent();
      cityCars.clear();
      slideAudio.dispose();
      exitCourt(false);
      cinema.dispose();
      courtExit.remove();
      courtOrder.remove();
      for (const food of courtFoods.values()) {
        food.removeFromParent();
        disposeScenery(food);
      }
      for (const g of itemGroups.values()) g.userData.disposeStaff?.();
      spa.clear();
      crew.clear();
      chill.clear();
      court.clear();
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
      for (const hammer of builderHammers.values()) {
        hammer.userData.boostGlow?.removeFromParent();
        hammer.removeFromParent();
      }
      builderHammers.clear();
      disposeCat(cat);
      for (const npc of npcs.values()) disposeCat(npc.model);
      socialGlow.visible = false;
      royalStarGeo.dispose();
      royalStars.material.dispose();
      ambient.userData.dispose();
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
      gpuFrames.clear();
      renderer.dispose();
    },
  };
}
