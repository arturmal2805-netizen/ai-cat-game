import { RENEWED_ISLANDS } from "./renewal-data.js";
import { islandHeight } from "./renewed-biomes.js";
import { islandProjectModel } from "./island-project-model.js";
import { islandObjects } from "./world-objects.js";
import { swimFrame } from "./swimming.js";
import { activeCats } from "./cat-roster.js";
import { catAppearance } from "./cat-breeds.js";
import { incomeFor } from "./business.js";
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
  disposeCat,
  moodNames,
} from "./cat-model.js";
import { BIOMES, NEIGHBORS, byBiome, byItem } from "./game-data.js";
import { canPlace, isBuilt } from "./economy.js";
import { byScenery } from "./scenery-data.js";
import {
  createSceneryModel,
  disposeScenery,
  fadeScenery,
} from "./scenery-models.js";
import { createBiomeScene } from "./biome-scenes.js";
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
    alpha: true,
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
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
  const look = new THREE.Vector3(0, 0, 0),
    desiredLook = look.clone();
  let azimuth = 0.72,
    distance = 37,
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
    royalStarsPositions = [];
  for (let i = 0; i < 420; i++) {
    const a = i * 2.399,
      r = 38 + (i % 11) * 9;
    royalStarsPositions.push(
      88 + Math.cos(a) * r,
      -8 + (i % 17) * 5,
      36 + Math.sin(a) * r,
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
    labels = new Map(),
    itemGroups = new Map(),
    npcs = new Map();
  const mealVisits = new Map(),
    swimVisits = new Map();
  const islandContentKeys = new Map();
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
    const p = initialGame.catPosition,
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
    const label = document.createElement("button");
    label.className = "island-label";
    label.textContent = biome.icon + " " + biome.name;
    label.setAttribute("aria-label", "Остров " + biome.name);
    label.onclick = () => focus(biome.id);
    container.append(label);
    labels.set(biome.id, label);
    return g;
  }
  function ensureDetail(id) {
    const data = islands.get(id)?.userData;
    if (!data || !data.lowOnly) return;
    detailQueue.add(id);
    if (detailTimer) return;
    const upgrade = () => {
      detailTimer = null;
      if (disposed || !detailQueue.size) return;
      if (document.getElementById("shop-dialog")?.open) {
        detailTimer = setTimeout(upgrade, 200);
        return;
      }
      const id = detailQueue.has(focused)
        ? focused
        : detailQueue.values().next().value;
      detailQueue.delete(id);
      const old = islands.get(id),
        b = byBiome(id);
      if (
        old &&
        old.userData.lowOnly &&
        distance < Math.max(110, (b.radius || 12) * 7) &&
        Math.hypot(b.center[0] - desiredLook.x, b.center[1] - desiredLook.z) <
          40
      ) {
        const g = createBiomeScene(b, {
          placements: game.placements.filter((p) => p.biome === id),
          scenery: game.scenery?.filter((r) => r.biome === id),
        });
        showWhalePreview(g, id);
        g.position.copy(old.position);
        scene.remove(old);
        old.userData.dispose?.();
        scene.add(g);
        islands.set(id, g);
      }
      if (detailQueue.size) detailTimer = setTimeout(upgrade, 32);
    };
    detailTimer = setTimeout(upgrade, 16);
  }
  for (const biome of BIOMES) makeIsland(biome);
  function sceneryGroups() {
    return [...islands.values()]
      .filter((island) => island.userData.detail.visible)
      .flatMap((island) => [...island.userData.sceneryObjects.values()]);
  }
  // Connect nearby shores instead of drawing long roads across other islands.
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
    from.addScaledVector(direction, link.from.radius || 11.3);
    to.addScaledVector(direction, -(link.to.radius || 11.3));
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
  function sync(next) {
    game = next;
    incomeSecond = -1;
    for (const [id, button] of incomeButtons)
      if (!game.placements.some((p) => p.id === id)) {
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
    for (const [id, island] of islands) showWhalePreview(island, id);
    // Keep unchanged vegetation and scenery buffers when income, adoption or
    // herd destinations change. Only an edited island needs new geometry.
    for (const [id, island] of islands) {
      const placements = game.placements.filter((p) => p.biome === id),
        scenery = game.scenery?.filter((r) => r.biome === id),
        contentKey = JSON.stringify([placements, scenery]);
      if (islandContentKeys.get(id) === contentKey) continue;
      island.userData.updatePlacements?.(placements, scenery);
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
      if (o.type === "swim-lagoon") {
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
      } else g = built ? makeAttraction(o.type) : islandProjectModel(o.type);
      if (o.scale) g.scale.setScalar(o.scale);
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
    if (operation?.decision.activityId) {
      operation.attraction = itemGroups.get(operation.decision.activityId);
      operation.destination
        .copy(operation.attraction.position)
        .add(new THREE.Vector3(0, 0, 0.8));
    }
    for (const biome of BIOMES) {
      const unlocked = game.unlocked.includes(biome.id);
      const label = labels.get(biome.id);
      label.classList.toggle("locked", !unlocked);
      label.textContent = (unlocked ? biome.icon : "🔒") + " " + biome.name;
    }
    for (const profile of activeCats(game)) {
      if (npcs.has(profile.id)) {
        npcs.get(profile.id).profile = profile;
        continue;
      }
      const carrier = new THREE.Group(),
        model = createCat("happy", {
          detail: "npc",
          ...catAppearance(profile),
        });
      model.scale.setScalar(0.63 * (profile.size || 1));
      carrier.add(model);
      if (profile.hat) {
        const hat = primitive(
          carrier,
          new THREE.ConeGeometry(0.33, 0.65, 8),
          0x6f638b,
          0,
          1.57,
          0.2,
        );
        primitive(
          carrier,
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
      scene.add(carrier);
      npcs.set(profile.id, { carrier, model, profile, index });
    }
    const activeIds = new Set(activeCats(game).map((c) => c.id));
    for (const [id, n] of npcs)
      if (!activeIds.has(id)) {
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
  function focus(id, overview = false) {
    const b = byBiome(id) || byBiome("moon");
    focused = b.id;
    viewingOverview = overview;
    const enchanted = !!RENEWED_ISLANDS[b.id] || b.legendary;
    sky.material.uniforms.top.value.set(
      b.legendary || b.id === "aquapark"
        ? 0x010914
        : enchanted
          ? 0x172749
          : 0x788ab9,
    );
    sky.material.uniforms.bottom.value.set(
      b.legendary || b.id === "aquapark"
        ? 0x153054
        : enchanted
          ? 0x697da9
          : 0xb2b8d5,
    );
    royalStars.visible = b.id === "aquapark" || enchanted;
    royalStars.position.set(
      enchanted ? b.center[0] - 88 : 0,
      0,
      enchanted ? b.center[1] - 36 : 0,
    );
    scene.fog.color.set(
      b.legendary || b.id === "aquapark" ? 0x162f52 : 0xc0bfd7,
    );
    desiredLook.set(b.center[0], 0, overview ? 0 : b.center[1]);
    distance = b.radius ? (mobileRender ? (b.radius > 18 ? 85 : 65) : 57) : 37;
    if (mobileRender && b.legendary)
      distance = Math.max(
        distance,
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
        distance = fit;
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
    callbacks.onFocus?.(b.id, overview);
  }
  function switchMood(mood) {
    if (cat.userData.mood === mood) return;
    setCatMood(cat, mood, { immediate: reduced });
  }
  function perform(decision) {
    heroGather = null;
    socialGlow.visible = false;
    sync(game);
    if (operation) {
      resetYarn(operation.attraction);
      if (operation.attraction) {
        operation.attraction.userData.playing = false;
        delete operation.attraction.userData.heroPlayPos;
      }
      operation.resolve({ cancelled: true });
      operation = null;
    }
    switchMood(decision.mood);
    const attraction = decision.activityId
      ? itemGroups.get(decision.activityId)
      : null;
    const neighbor = decision.friendId ? npcs.get(decision.friendId) : null;
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
      focus(attraction.userData.placement.biome);
    } else if (neighbor) {
      destination = neighbor.carrier.position.clone();
      focus(neighbor.profile.biome);
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
      dismount = attraction.localToWorld(new THREE.Vector3(0, 0, 0.8));
      const biome = byBiome(attraction.userData.placement.biome);
      dismount.y =
        islandHeight(
          biome.id,
          dismount.x - biome.center[0],
          dismount.z - biome.center[1],
        ) + 0.16;
    }
    return new Promise((resolve) => {
      operation = {
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
        chichiCarrier.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      ];
      if (preview)
        targets.push(
          preview.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
        );
      if (operation?.attraction)
        targets.push(
          operation.attraction.position
            .clone()
            .add(new THREE.Vector3(0, 0.6, 0)),
        );
      for (const object of objects) object.updateWorldMatrix(true, true);
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
            occlusionRay.ray.intersectBox(
              occlusionBounds.setFromObject(g),
              occlusionPoint,
            ) &&
            camera.position.distanceTo(occlusionPoint) <= occlusionRay.far,
        );
        for (const hit of occlusionRay.intersectObjects(candidates, true)) {
          let root = hit.object;
          while (root && !root.userData.sceneryId) root = root.parent;
          if (root) occludedScenery.add(root.userData.sceneryId);
        }
      }
    }
    for (const object of objects) {
      const target = occludedScenery.has(object.userData.sceneryId) ? 0.27 : 1;
      const opacity = reduced
        ? target
        : THREE.MathUtils.lerp(
            object.userData.opacity,
            target,
            1 - Math.exp(-dt * 12),
          );
      if (Math.abs(opacity - object.userData.opacity) > 0.001)
        fadeScenery(object, opacity);
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
        : undefined,
    }));
    const friends = [...npcs.values()]
      .filter((n) => n.carrier.visible)
      .map((n) => ({
        id: n.profile.id,
        x: n.carrier.position.x,
        z: n.carrier.position.z,
      }));
    const targets = new Map([
      ...[...npcs.values()]
        .filter((n) => n.carrier.visible)
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
      .filter((n) => n.carrier.visible)
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
      !bowlPortions(game)
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
    const decision = manualInteraction(snapshot, selection, cat.userData.mood);
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
    if (!buildMode && !operation && callbacks.canDragCat?.() !== false) {
      pointer(e);
      const bounds = renderer.domElement.getBoundingClientRect();
      const projected = chichiCarrier.position
        .clone()
        .add(new THREE.Vector3(0, 0.9, 0))
        .project(camera);
      const nearCat =
        distance < Math.max(80, (byBiome(focused)?.radius || 12) * 7) &&
        Math.hypot(
          e.clientX - (bounds.left + ((projected.x + 1) * bounds.width) / 2),
          e.clientY - (bounds.top + ((1 - projected.y) * bounds.height) / 2),
        ) < (e.pointerType === "touch" ? 22 : 11);
      if (nearCat || raycaster.intersectObject(chichiCarrier, true).length)
        draggingCat = chichiCarrier.position.clone();
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
        chichiCarrier.position.copy(point);
      }
      return;
    }
    if (buildMode) {
      if (pointerDown) chooseGround(e);
      return;
    }
    if (!pointerDown) return;
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
        chichiCarrier.position.copy(draggingCat);
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
      chichiCarrier.position.copy(original);
      draggingCat = null;
      pointerDown = null;
      hideDrop();
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
    if (!pendingTap) return;
    pendingTap = false;
    pointer(e);
    const hit = raycaster.intersectObjects(
      [...itemGroups.values(), ...sceneryGroups().filter((g) => g.visible)],
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
        [w, d] = byItem(g.userData.placement.item).footprint;
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
      chichiCarrier.position.copy(draggingCat);
      draggingCat = null;
    }
  });
  renderer.domElement.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      distance = THREE.MathUtils.clamp(distance + e.deltaY * 0.025, 21, 600);
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
        if (pinchDistance)
          distance = THREE.MathUtils.clamp(
            distance + (pinchDistance - d) * 0.1,
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
  const resize = new ResizeObserver(() => {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resize.observe(container);
  let previousTime = performance.now(),
    lastRender = 0;
  function loop(now) {
    if (disposed) return;
    if (now - lastRender < (operation || pointerDown || heroGather ? 16 : 33)) {
      requestAnimationFrame(loop);
      return;
    }
    lastRender = now;
    const dt = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    const time = now / 1000;
    look.lerp(desiredLook, reduced ? 1 : 1 - Math.exp(-dt * 8));
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
      island.userData.update?.(time, reduced);
    }
    for (const g of itemGroups.values())
      if (!reduced) animateAttraction(g, time);
    if (preview && !reduced) animateAttraction(preview, time);
    for (const [id, n] of npcs) {
      const b = byBiome(n.profile.biome),
        needs = game.care?.residents[id];
      let x = n.carrier.position.x,
        z = n.carrier.position.z,
        npcWalking = false,
        npcReaction = null,
        direct = false;
      const busyWithChichi =
        operation?.decision.friendId === id || operation?.partyIds?.has(id);
      if (
        !busyWithChichi &&
        now >= gatherUntil &&
        !draggingCat &&
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
      if (busyWithChichi || draggingCat) {
        mealVisits.delete(id);
        swimVisits.delete(id);
      }
      if (
        !busyWithChichi &&
        now >= gatherUntil &&
        !draggingCat &&
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
      if (visit && !busyWithChichi && !draggingCat) {
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
      } else if (swim && !busyWithChichi && !draggingCat) {
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
              new THREE.Vector3(f.x, f.y, f.z).multiplyScalar(
                enter * enter * (3 - 2 * enter),
              ),
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
              swim.lake.localToWorld(
                new THREE.Vector3(bounds.rx + 0.5, 0.01, 0),
              ),
            );
            n.carrier.position.y = swim.lake.userData.shoreHeight ?? 0.16;
            swimVisits.delete(id);
            callbacks.onResidentSwam?.(id);
          }
        }
      } else if (draggingCat) {
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
        if (n.carrier.position.distanceTo(new THREE.Vector3(x, 0.16, z)) < 1.6)
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
        n.carrier.position.y =
          0.16 +
          islandHeight(
            b.id,
            n.carrier.position.x - b.center[0],
            n.carrier.position.z - b.center[1],
          );
      }
      const direction = new THREE.Vector3(x, n.carrier.position.y, z).sub(
        n.carrier.position,
      );
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
        game.social?.bestFriendId === id && game.care?.resting
          ? "sleep"
          : needs?.hunger >= 75
            ? "crazy hungry"
            : "happy";
      if (n.model.userData.mood !== desiredMood)
        setCatMood(n.model, desiredMood, { immediate: reduced });
      if (near) {
        animateCat(n.model, time + n.index, npcWalking, reduced);
        if (npcReaction) reactCat(n.model, npcReaction, reduced);
      }
    }
    npcMarkers.instanceMatrix.needsUpdate = true;
    chichiCarrier.rotation.z = 0;
    const localSwim = new THREE.Vector3();
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
    if (operation) {
      const op = operation;
      if (op.stage === "travel") {
        const p = Math.min((now - op.start) / op.duration, 1);
        chichiCarrier.position.lerpVectors(
          op.from,
          op.destination,
          p * p * (3 - 2 * p),
        );
        const d = op.destination.clone().sub(op.from);
        chichiCarrier.rotation.y = Math.atan2(d.x, d.z);
        walking = p < 1;
        if (p === 1) {
          op.stage = "activity";
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
          let local = new THREE.Vector3(0, g.userData.seatHeight, 0);
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
              new THREE.Vector3(0, g.userData.seatHeight, 0),
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
            const shore = new THREE.Vector3(
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
              new THREE.Vector3(
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
              new THREE.Vector3(frame.cat.x, 0.16 + frame.jump, frame.cat.z),
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
            g.localToWorld(new THREE.Vector3(...f.position)),
          );
          chichiCarrier.rotation.y = f.yaw;
          walking = !reduced;
          reaction = { paw: f.paw };
        } else if (action === "play" && g) {
          const local = new THREE.Vector3(
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
              new THREE.Vector3(0, g.userData.id === "bed" ? 0.3 : 0.16, 0),
            ),
          );
          reaction = { headPitch: 0.12 };
        } else if (action === "eat" && g) {
          chichiCarrier.position.copy(
            g.localToWorld(new THREE.Vector3(-0.3, 0.16, 0.8)),
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
    animateCat(cat, time, walking, reduced);
    if (reaction) reactCat(cat, reaction, reduced);
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
      for (const p of game.placements)
        incomeCache.set(p.id, incomeFor(game, p.id));
    }
    for (const [id, button] of incomeButtons) {
      const object = itemGroups.get(id),
        amount = incomeCache.get(id) || 0;
      button.hidden = !object || !amount || distance > 110;
      if (button.hidden) continue;
      const point = object.position
        .clone()
        .add(new THREE.Vector3(0, 3.6, 0))
        .project(camera);
      button.hidden =
        point.z > 1 || Math.abs(point.x) > 1.1 || Math.abs(point.y) > 1.1;
      button.textContent = "✦ " + amount;
      button.setAttribute(
        "aria-label",
        "Собрать " +
          amount +
          " монет · " +
          byItem(object.userData.placement.item).name,
      );
      button.style.transform = `translate(-50%,-50%) translate(${((point.x + 1) * width) / 2}px,${((1 - point.y) * height) / 2}px)`;
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
          p = g.position
            .clone()
            .add(new THREE.Vector3(0, 2, 0))
            .project(camera);
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
        button.style.transform = `translate(-50%,-50%) translate(${((p.x + 1) * width) / 2}px,${((1 - p.y) * height) / 2}px)`;
        button.hidden =
          p.z > 1 ||
          Math.abs(p.x) > 0.98 ||
          Math.abs(p.y) > 0.94 ||
          distance > 170;
      }
    for (const b of BIOMES) {
      const p = new THREE.Vector3(b.center[0], 0.3, b.center[1] - 9).project(
        camera,
      );
      const label = labels.get(b.id);
      label.style.transform = `translate(-50%,-50%) translate(${((p.x + 1) * width) / 2}px,${((1 - p.y) * height) / 2}px)`;
      label.hidden =
        p.z > 1 || p.x > 1.15 || p.x < -1.15 || p.y > 1.1 || p.y < -1.1;
      label.style.opacity = b.id === focused ? "1" : ".7";
    }
    sun.position.set(look.x - 14, 35, look.z + 20);
    sun.target.position.copy(look);
    scene.fog.density = distance > 90 ? 0.0007 : 0.0035;
    updateOcclusion(now, dt);
    // The opaque shop covers the map. Keep the simulation running, but avoid
    // competing GPU draws while its miniature scenes are being rendered.
    if (!document.querySelector("dialog[open]")) renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // Portraits and the live hero share the same photo-inspired model.
  const portraitRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  portraitRenderer.setSize(192, 192);
  portraitRenderer.setPixelRatio(2);
  for (const mood of moodNames) {
    const portrait = new THREE.Scene();
    portrait.add(new THREE.HemisphereLight(0xf2f4ff, 0x777b7f, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(3, 5, 5);
    portrait.add(light);
    const model = createCat(mood);
    portrait.add(model);
    const view = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    view.position.set(2, 2.2, 4);
    view.lookAt(0, 0.9, 0);
    portraitRenderer.render(portrait, view);
    const image = document.querySelector(`[data-mood-image="${mood}"]`);
    if (image) image.src = portraitRenderer.domElement.toDataURL("image/png");
    if (mood === "happy" && image) {
      const avatar = document.getElementById("care-avatar");
      if (avatar) {
        avatar.onload = () => {
          avatar.hidden = false;
          document.getElementById("care-avatar-fallback").hidden = true;
        };
        avatar.src = image.src;
      }
    }

    disposeCat(model);
  }
  portraitRenderer.dispose();
  return {
    perform,
    sync,
    focus,
    overview: () => focus("moon", true),
    zoom: (delta) =>
      (distance = THREE.MathUtils.clamp(distance + delta, 21, 600)),
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
      focus(biome);
      return true;
    },
    dispose() {
      disposed = true;
      for (const button of incomeButtons.values()) button.remove();
      for (const button of projectBadges.values()) button.remove();
      clearTimeout(detailTimer);
      for (const island of islands.values()) island.userData.dispose?.();
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
      resize.disconnect();
      renderer.dispose();
    },
  };
}
