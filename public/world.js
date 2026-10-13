import * as THREE from "three";
import { createCat, animateCat, moodNames } from "./cat-model.js";
import { BIOMES, NEIGHBORS, byBiome, byItem } from "./game-data.js";
import { canPlace, isBuilt } from "./economy.js";
import { constructionModel } from "./advanced-assets.js";
import {
  primitive,
  material,
  ball,
  box,
  rod,
  tree,
  mushroom,
  glowOrb,
  makeAttraction,
  animateAttraction,
} from "./world-assets.js";
export const destinations = {
  home: [-6, -3],
  pond: [5, 5],
  garden: [-5, 5],
  tree: [5, -3],
  picnic: [-2, 6],
};
export function createWorld(container, initialGame, callbacks = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileRender =
    container.clientWidth < 700 || matchMedia("(pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: !mobileRender,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobileRender ? 1.1 : 1.5));
  renderer.shadowMap.enabled = !mobileRender;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x182434);
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Сказочный мир Чичи: 24 биомов, коты и аттракционы",
  );
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x243346, 0.006);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
  const look = new THREE.Vector3(0, 0, 0),
    desiredLook = look.clone();
  let azimuth = 0.72,
    distance = 37,
    elevation = 0.67;
  scene.add(new THREE.HemisphereLight(0xe9d9ff, 0x67748a, 1.9));
  const sun = new THREE.DirectionalLight(0xffd4b0, 2.1);
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
  const weather = [],
    islands = new Map(),
    labels = new Map(),
    itemGroups = new Map(),
    npcs = new Map();
  let game = initialGame,
    sceneKey = "",
    focused = "moon",
    buildMode = null,
    preview = null,
    operation = null,
    disposed = false;
  const chichiCarrier = new THREE.Group();
  chichiCarrier.position.set(-6, 0.14, -3);
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
  function flower(parent, x, z, color) {
    rod(parent, 0x789d8e, x, 0.23, z, 0.025, 0.46);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ball(
        parent,
        color,
        x + Math.sin(a) * 0.1,
        0.48,
        z + Math.cos(a) * 0.1,
        0.1,
      );
    }
    glowOrb(parent, 0xffddb0, x, 0.5, z, 0.05);
  }
  function cottage(parent, x, z, color = 0xb68b94) {
    const home = new THREE.Group();
    home.position.set(x, 0, z);
    parent.add(home);
    box(home, 0xb3a4a5, 0, 1, 0, 2.7, 2, 2.2);
    primitive(
      home,
      new THREE.ConeGeometry(2.3, 1.6, 4),
      color,
      0,
      2.7,
      0,
    ).rotation.y = Math.PI / 4;
    box(home, 0x5b5369, 0, 0.65, 1.13, 0.65, 1.3, 0.08);
    for (const dx of [-0.8, 0.8]) glowOrb(home, 0xffdda8, dx, 1.05, 1.14, 0.2);
    rod(home, 0x8d7a83, 0.8, 2.7, -0.4, 0.16, 1.3);
    const smoke = ball(home, 0xaaa2bd, 0.8, 3.5, -0.4, 0.16);
    smoke.material = material(0xa0a0b0);
  }
  function makeIsland(biome) {
    const g = new THREE.Group();
    g.position.set(biome.center[0], 0, biome.center[1]);
    scene.add(g);
    const cliff = primitive(
      g,
      new THREE.CylinderGeometry(11.5, 9.5, 2.2, 30, 2),
      biome.edge,
      0,
      -1.05,
      0,
    );
    cliff.geometry.computeVertexNormals();
    const ground = primitive(
      g,
      new THREE.CylinderGeometry(11.6, 11.4, 0.24, 48, 1),
      biome.ground,
      0,
      0.02,
      0,
    );
    const terrain = ground.geometry.toNonIndexed(),
      colors = [];
    const positions = terrain.getAttribute("position");
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const x = positions.getX(vertex),
        z = positions.getZ(vertex),
        shade = 0.9 + Math.sin(x * 0.6) * Math.cos(z * 0.8) * 0.095;
      const color = new THREE.Color(biome.ground).multiplyScalar(shade);
      colors.push(color.r, color.g, color.b);
    }
    terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    ground.geometry.dispose();
    ground.geometry = terrain;
    ground.material = ground.material.clone();
    ground.material.vertexColors = true;
    ground.material.color.set(0xffffff);
    // Curved paths, garden beds and rough cliff details soften the floating island.
    for (let pathIndex = 0; pathIndex < 4; pathIndex++) {
      const angle = (pathIndex * Math.PI) / 2;
      const points = [
        new THREE.Vector3(0, 0.17, 0),
        new THREE.Vector3(
          Math.sin(angle + 0.15) * 3,
          0.17,
          Math.cos(angle + 0.15) * 3,
        ),
        new THREE.Vector3(Math.sin(angle) * 7.5, 0.17, Math.cos(angle) * 7.5),
      ];
      const curve = new THREE.CatmullRomCurve3(points);
      primitive(g, new THREE.TubeGeometry(curve, 30, 0.14, 5, false), 0xa598aa);
    }
    for (let rockIndex = 0; rockIndex < 14; rockIndex++) {
      const angle = (rockIndex * Math.PI * 2) / 14,
        rock = primitive(
          g,
          new THREE.DodecahedronGeometry(0.7 + (rockIndex % 3) * 0.18, 0),
          biome.edge,
          Math.cos(angle) * 10.5,
          -0.8 - (rockIndex % 2) * 0.35,
          Math.sin(angle) * 10.5,
        );
      rock.scale.set(1, 1.7, 0.7);
    }
    const grassGeometry = new THREE.ConeGeometry(0.045, 0.25, 3),
      grassMaterial = material(biome.foliage),
      grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 65);
    const dummy = new THREE.Object3D();
    for (let grassIndex = 0; grassIndex < 65; grassIndex++) {
      const angle = grassIndex * 2.399,
        radius = 8.4 + (grassIndex % 5) * 0.43;
      dummy.position.set(
        Math.sin(angle) * radius,
        0.27,
        Math.cos(angle) * radius,
      );
      dummy.rotation.z = Math.sin(grassIndex) * 0.18;
      dummy.updateMatrix();
      grass.setMatrixAt(grassIndex, dummy.matrix);
    }
    g.add(grass);
    if (["winter", "sakura", "wizard", "autumn", "stars"].includes(biome.id)) {
      const floats = [];
      for (let particle = 0; particle < 45; particle++)
        floats.push(
          Math.sin(particle * 2.4) * 10,
          1 + (particle % 8) * 0.55,
          Math.cos(particle * 2.4) * 10,
        );
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(floats, 3));
      const points = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color: biome.accent,
          size: biome.id === "winter" ? 0.1 : 0.08,
          transparent: true,
          opacity: 0.7,
        }),
      );
      g.add(points);
      weather.push({ points, id: biome.id });
    }

    const halo = primitive(
      g,
      new THREE.TorusGeometry(11.55, 0.025, 5, 80),
      biome.accent,
      0,
      0.17,
      0,
      0.55,
    );
    halo.rotation.x = Math.PI / 2;
    primitive(
      g,
      new THREE.CylinderGeometry(1.15, 1.15, 0.03, 24),
      biome.accent,
      0,
      0.17,
      0,
    );
    const ring = primitive(
      g,
      new THREE.TorusGeometry(0.95, 0.04, 6, 40),
      biome.accent,
      0,
      0.2,
      0,
      0.6,
    );
    ring.rotation.x = Math.PI / 2;
    const type = ["beach", "desert", "water"].includes(biome.id)
      ? "palm"
      : ["winter", "wizard"].includes(biome.id)
        ? "pine"
        : "normal";
    for (let i = 0; i < 7; i++) {
      const a = i * 0.88 + 0.2,
        r = 9.8;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      if (biome.id === "desert" && i % 2) {
        rod(g, 0x90a18e, x, 0.6, z, 0.14, 1.2);
        ball(g, 0x90a18e, x, 0.95, z, 0.2);
      } else tree(g, x, z, biome.foliage, type, 0.8 + (i % 3) * 0.2);
    }
    for (let i = 0; i < 8; i++) {
      const a = i * 2.399,
        r = 9.7 - (i % 2) * 0.6,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (["moon", "autumn", "wizard", "nature"].includes(biome.id))
        mushroom(g, x, z, biome.accent, 0.4 + (i % 2) * 0.2);
      else if (["summer", "sakura", "stars"].includes(biome.id))
        flower(g, x, z, biome.accent);
      else if (biome.id === "winter") {
        const snow = ball(g, 0xe5edf0, x, 0.15, z, 0.45);
        snow.scale.y = 0.4;
      } else {
        const rock = primitive(
          g,
          new THREE.DodecahedronGeometry(0.3, 0),
          biome.accent,
          x,
          0.18,
          z,
        );
        rock.scale.y = 0.6;
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = -8 + i * 5,
        z = -8;
      rod(g, 0x6b687e, x, 1.05, z, 0.04, 2.1);
      glowOrb(g, biome.accent, x, 2.15, z, 0.13);
    }
    if (biome.id === "moon") {
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8;
        mushroom(g, Math.cos(a) * 8.8, Math.sin(a) * 8.8, 0xaf80a9, 0.5);
      }
      const portal = primitive(
        g,
        new THREE.TorusGeometry(1.1, 0.075, 8, 40),
        0xc7a7df,
        0,
        1.4,
        -9,
        0.7,
      );
      for (const x of [-1.2, 1.2]) rod(g, 0x887096, x, 0.7, -9, 0.1, 1.4);
      cottage(g, -6, -5, 0x8f739d);
      const pond = primitive(
        g,
        new THREE.CylinderGeometry(1.7, 1.7, 0.05, 32),
        0x81b9bd,
        5,
        0.18,
        4,
      );
      pond.scale.z = 0.8;
      tree(g, 5, -5, 0xa0b3a0, "normal", 1.5);
      box(g, 0xbc9baa, -2, 0.18, 5, 2.2, 0.06, 1.8);
      for (let i = 0; i < 6; i++)
        flower(g, -7 + i * 0.38, 4.5 + (i % 2) * 0.4, 0xd2b5da);
    }
    if (biome.id === "wizard") {
      for (let i = 0; i < 3; i++) mushroom(g, -7 + i * 2, 6, 0xb78cc8, 1.1);
      const crystal = makeAttraction("crystal");
      crystal.position.set(-7, 0.15, 3);
      crystal.scale.setScalar(1.6);
      g.add(crystal);
      cottage(g, 7, -5, 0x645887);
    }
    if (biome.id === "winter") {
      for (let ribbon = 0; ribbon < 3; ribbon++) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-9, 4 + ribbon * 0.4, -8),
          new THREE.Vector3(-4, 5 + ribbon * 0.3, -9),
          new THREE.Vector3(2, 4.5 + ribbon * 0.3, -9),
          new THREE.Vector3(8, 5 + ribbon * 0.3, -8),
        ]);
        const aurora = primitive(
          g,
          new THREE.TubeGeometry(curve, 40, 0.14, 6, false),
          [0x86c6c0, 0xaab5e2, 0xc7abde][ribbon],
          0,
          0,
          0,
          0.55,
        );
        aurora.material = aurora.material.clone();
        aurora.material.transparent = true;
        aurora.material.opacity = 0.5;
      }
      for (let i = 0; i < 3; i++)
        ball(g, 0xe8f3f5, 7, 0.3 + i * 0.35, -6, 0.48 - i * 0.1);
      glowOrb(g, 0xa2e8db, 0, 6, -9, 0.6);
    }
    if (biome.id === "beach" || biome.id === "water") {
      const shoreline = primitive(
        g,
        new THREE.TorusGeometry(11.6, 0.36, 8, 70),
        0x7fbac3,
        0,
        -0.02,
        0,
        0.07,
      );
      shoreline.rotation.x = Math.PI / 2;
      const pool = primitive(
        g,
        new THREE.CylinderGeometry(3, 3, 0.05, 40),
        0x7ec8c5,
        -6,
        0.16,
        -5,
      );
      pool.scale.z = 0.7;
      for (let i = 0; i < 4; i++)
        ball(g, 0xe3d6bd, -8 + i * 0.7, 0.2, -7, 0.18);
    }
    if (biome.id === "clouds") {
      cottage(g, -7, -5, 0xc6b8d9);
      cottage(g, 7, -5, 0xbab0d2);
      for (let i = 0; i < 6; i++) {
        const cloud = ball(
          g,
          0xd9d9eb,
          Math.sin(i) * 10,
          -0.3,
          Math.cos(i) * 10,
          2,
        );
        cloud.scale.y = 0.4;
      }
    }
    if (biome.id === "desert") {
      const oasis = primitive(
        g,
        new THREE.CylinderGeometry(2.2, 2.2, 0.06, 30),
        0x7faab1,
        -6,
        0.16,
        -5,
      );
      oasis.scale.z = 0.6;
      for (let i = 0; i < 4; i++) {
        const dune = ball(g, 0xcbb189, -7 + i * 4, 0.2, 8, 1.5);
        dune.scale.y = 0.3;
      }
    }
    if (biome.id === "summer") {
      for (let i = 0; i < 18; i++)
        flower(
          g,
          Math.sin(i * 2.4) * 8.5,
          Math.cos(i * 2.4) * 8.5,
          [0xf1d48f, 0xd0afd8, 0xe3b4bd][i % 3],
        );
    }
    if (biome.id === "sakura") {
      for (let i = 0; i < 3; i++) {
        rod(g, 0x9b7e9a, -7 + i * 7, 1.2, 7, 0.06, 2.4);
        glowOrb(g, 0xf0b7c8, -7 + i * 7, 2.5, 7, 0.3);
      }
    }
    if (biome.id === "stars") {
      for (let i = 0; i < 4; i++)
        primitive(
          g,
          new THREE.OctahedronGeometry(0.25, 0),
          0xe3c6eb,
          -7 + i * 4,
          3,
          -8,
          0.8,
        );
    }
    if (["water", "moon", "nature", "winter"].includes(biome.id)) {
      for (let fall = 0; fall < 3; fall++) {
        const sheet = box(
          g,
          biome.id === "winter" ? 0xc5e7ef : 0x82b6c7,
          -2.5 + fall * 0.3,
          -1.6,
          11.2,
          0.18,
          3.4,
          0.1,
        );
        sheet.material = sheet.material.clone();
        sheet.material.transparent = true;
        sheet.material.opacity = 0.65;
        sheet.material.emissive.set(0x75aabb);
        sheet.material.emissiveIntensity = 0.25;
      }
      const mist = ball(g, 0x9cb8c5, -2.2, -3.3, 11.3, 0.6);
      mist.scale.set(1.8, 0.3, 0.7);
      mist.material = mist.material.clone();
      mist.material.transparent = true;
      mist.material.opacity = 0.25;
    }
    const label = document.createElement("button");
    label.className = "island-label";
    label.textContent = biome.icon + " " + biome.name;
    label.setAttribute("aria-label", "Остров " + biome.name);
    label.onclick = () => {
      if (game.unlocked.includes(biome.id)) focus(biome.id);
      else callbacks.onLockedBiome?.(biome.id);
    };
    container.append(label);
    labels.set(biome.id, label);
    islands.set(biome.id, g);
    const detail = new THREE.Group();
    for (const child of [...g.children].slice(4)) {
      g.remove(child);
      detail.add(child);
    }
    g.add(detail);
    const lowDetail = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.4,
        x = Math.cos(a) * 9,
        z = Math.sin(a) * 9;
      rod(lowDetail, biome.edge, x, 0.7, z, 0.12, 1.4);
      if (["winter", "wizard", "ice"].includes(biome.id))
        primitive(
          lowDetail,
          new THREE.ConeGeometry(0.9, 2.1, 6),
          biome.foliage,
          x,
          1.6,
          z,
        );
      else ball(lowDetail, biome.foliage, x, 1.7, z, 0.9);
    }
    g.add(lowDetail);
    g.userData.detail = detail;
    g.userData.lowDetail = lowDetail;
    return g;
  }
  for (const biome of BIOMES) makeIsland(biome);
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
    from.addScaledVector(direction, 11.3);
    to.addScaledVector(direction, -11.3);
    const middle = from.clone().add(to).multiplyScalar(0.5);
    const bridge = box(
      scene,
      0xa799ad,
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
  for (const biome of BIOMES.slice(12)) {
    const g = islands.get(biome.id);
    if (["crystal", "ice", "galaxy"].includes(biome.id)) {
      for (let i = 0; i < 5; i++) {
        const crystal = primitive(
          g,
          new THREE.OctahedronGeometry(0.8, 0),
          biome.accent,
          Math.sin(i * 1.25) * 8,
          1.8,
          Math.cos(i * 1.25) * 8,
          0.35,
        );
        crystal.scale.y = 2.2;
      }
    }
    if (biome.id === "mushrooms")
      for (let i = 0; i < 7; i++)
        mushroom(g, Math.sin(i) * 9, Math.cos(i) * 9, biome.accent, 1.3);
    if (biome.id === "galaxy") {
      const planet = ball(g, 0xb7a2d0, -7, 4, -7, 1.3);
      primitive(
        g,
        new THREE.TorusGeometry(2, 0.09, 8, 40),
        0xf0d4ae,
        -7,
        4,
        -7,
        0.25,
      ).rotation.x = 1.1;
    }
    if (biome.id === "volcano") {
      primitive(g, new THREE.ConeGeometry(2, 3.5, 9), 0x584155, -7, 1.6, -7);
      glowOrb(g, 0xffa170, -7, 3.4, -7, 0.5);
    }
    if (biome.id === "rainbow") {
      for (let i = 0; i < 5; i++)
        primitive(
          g,
          new THREE.TorusGeometry(2.2 - i * 0.15, 0.07, 6, 40, Math.PI),
          [0xe2afba, 0xf1cf9d, 0xb7d2b0, 0xa9cbd5, 0xc7acd9][i],
          -7,
          2,
          -7,
          0.15,
        );
    }
    if (biome.id === "clockwork" || biome.id === "dusk") {
      cottage(g, -7, -7, biome.foliage);
      rod(g, biome.foliage, 7, 2.2, -7, 0.65, 4.4);
      glowOrb(g, biome.accent, 7, 4.7, -7, 0.3);
    }
  }
  function sync(next) {
    game = next;
    const key = JSON.stringify([
      game.unlocked,
      game.placements,
      game.placements.map((p) => isBuilt(p)),
      Object.entries(game.farm?.fields || {}).map(([id, cells]) => [
        id,
        cells.map((c) => [c.crop, c.readyAt, Date.now() >= c.readyAt]),
      ]),
    ]);
    if (key === sceneKey) return;
    sceneKey = key;
    for (const [id, g] of itemGroups) {
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
      g.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
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
        0.16,
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
    for (const biome of BIOMES) {
      const unlocked = game.unlocked.includes(biome.id);
      const label = labels.get(biome.id);
      label.classList.toggle("locked", !unlocked);
      label.textContent = (unlocked ? biome.icon : "🔒") + " " + biome.name;
    }
    for (const profile of NEIGHBORS) {
      if (!game.unlocked.includes(profile.biome) || npcs.has(profile.id))
        continue;
      const carrier = new THREE.Group(),
        model = createCat("happy");
      model.scale.setScalar(0.63);
      const changed = new Set();
      model.traverse((o) => {
        if (o.isMesh && !changed.has(o.material)) {
          changed.add(o.material);
          if (o.material.color.getHex() === 0xf2b479)
            o.material.color.set(profile.color);
        }
      });
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
      const index = NEIGHBORS.indexOf(profile),
        b = byBiome(profile.biome);
      carrier.position.set(
        b.center[0] + Math.sin(index * 2.4) * 6,
        0.16,
        b.center[1] + Math.cos(index * 2.4) * 6,
      );
      scene.add(carrier);
      npcs.set(profile.id, { carrier, model, profile, index });
    }
  }
  sync(initialGame);
  function focus(id, overview = false) {
    const b = byBiome(id) || byBiome("moon");
    focused = b.id;
    desiredLook.set(b.center[0], 0, overview ? 0 : b.center[1]);
    distance = 37;
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
            [-12, 12].every((dx) =>
              [-12, 12].every((dz) => {
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
    chichiCarrier.remove(cat);
    cat.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    cat = createCat(mood);
    chichiCarrier.add(cat);
  }
  function perform(decision) {
    if (operation) {
      operation.resolve({ cancelled: true });
      operation = null;
    }
    switchMood(decision.mood);
    const attraction = decision.activityId
      ? itemGroups.get(decision.activityId)
      : null;
    const neighbor = decision.friendId ? npcs.get(decision.friendId) : null;
    let destination;
    if (attraction) {
      destination = attraction.position.clone();
      focus(attraction.userData.placement.biome);
    } else if (neighbor) {
      destination = neighbor.carrier.position.clone();
      focus(neighbor.profile.biome);
    } else {
      const [x, z] = destinations[decision.target] || destinations.home;
      destination = new THREE.Vector3(x, 0.16, z);
      focus("moon");
    }
    destination.y = 0.16;
    destination.z += attraction?.userData.id === "tunnel" ? 0 : 1;
    return new Promise((resolve) => {
      operation = {
        decision,
        attraction,
        neighbor,
        partyIds:
          decision.action === "party"
            ? new Set([...npcs.keys()].slice(0, 6))
            : null,
        from: chichiCarrier.position.clone(),
        destination,
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
    buildMode = mode;
    if (preview) {
      scene.remove(preview);
      preview.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    }
    if (!mode) {
      preview = null;
      return;
    }
    preview = makeAttraction(mode.item);
    preview.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
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
      0.2,
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
        o.material.emissive.set(check.ok ? 0x376b64 : 0x9d394e);
        o.material.emissiveIntensity = 0.35;
      }
    });
    callbacks.onPreview?.({ ...buildMode, ...check });
  }
  const raycaster = new THREE.Raycaster(),
    mouse = new THREE.Vector2(),
    ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.16);
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
    activePointers.add(e.pointerId);
    pointerDown = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    pointerDown.multi = activePointers.size > 1;
    renderer.domElement.setPointerCapture(e.pointerId);
    if (!buildMode && !operation) {
      pointer(e);
      const bounds = renderer.domElement.getBoundingClientRect();
      const projected = chichiCarrier.position
        .clone()
        .add(new THREE.Vector3(0, 0.9, 0))
        .project(camera);
      const nearCat =
        distance < 80 &&
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
      }
      if (!activePointers.size) pointerDown = null;
      return;
    }
    if (draggingCat) {
      pointer(e);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(ground, point);
      const farm = [...itemGroups.values()].find(
        (g) =>
          byItem(g.userData.placement.item).category === "farm" &&
          g.userData.built &&
          (() => {
            const local = g.worldToLocal(point.clone()),
              [w, d] = byItem(g.userData.placement.item).footprint;
            return Math.abs(local.x) < w / 2 && Math.abs(local.z) < d / 2;
          })(),
      );
      chichiCarrier.position.copy(draggingCat);
      draggingCat = null;
      pointerDown = null;
      callbacks.onFarmDrag?.(farm?.userData.placementId);
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
    const hit = raycaster.intersectObjects([...itemGroups.values()], true)[0];
    if (hit) {
      let root = hit.object;
      while (root && !root.userData.placementId) root = root.parent;
      if (root) callbacks.onSelectItem?.(root.userData.placementId);
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
      callbacks.onSelectItem?.(placement.userData.placementId);
      return;
    }
    const b = BIOMES.find(
      (b) => Math.hypot(point.x - b.center[0], point.z - b.center[1]) < 11.5,
    );
    if (b && !game.unlocked.includes(b.id)) callbacks.onLockedBiome?.(b.id);
  });
  renderer.domElement.addEventListener("pointercancel", (e) => {
    activePointers.delete(e.pointerId);
    pointerDown = null;
    pendingTap = false;
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
    if (now - lastRender < (operation || pointerDown ? 33 : 50)) {
      requestAnimationFrame(loop);
      return;
    }
    lastRender = now;
    const dt = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    const time = now / 1000;
    look.lerp(desiredLook, reduced ? 1 : 0.07);
    camera.position.set(
      look.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      look.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    camera.lookAt(look);
    for (const b of BIOMES) {
      const island = islands.get(b.id),
        close =
          distance < 110 &&
          Math.hypot(b.center[0] - look.x, b.center[1] - look.z) < 39;
      island.userData.detail.visible = close;
      island.userData.lowDetail.visible = !close;
    }
    for (const g of itemGroups.values())
      if (!reduced) animateAttraction(g, time);
    if (preview && !reduced) animateAttraction(preview, time);
    for (const [id, n] of npcs) {
      let x, z;
      const b = byBiome(n.profile.biome);
      if (
        operation?.decision.action === "party" &&
        operation.partyIds?.has(id)
      ) {
        x = operation.attraction.position.x + Math.sin(n.index * 1.4) * 1.35;
        z = operation.attraction.position.z + Math.cos(n.index * 1.4) * 1.1;
        n.carrier.position.y =
          0.25 + (reduced ? 0 : Math.abs(Math.sin(time * 4 + n.index)) * 0.09);
      } else {
        x = b.center[0] + Math.sin(time * 0.07 + n.index * 2.4) * 6;
        z = b.center[1] + Math.cos(time * 0.07 + n.index * 2.4) * 6;
        n.carrier.position.y = 0.16;
      }
      const direction = new THREE.Vector3(x, n.carrier.position.y, z).sub(
        n.carrier.position,
      );
      if (direction.length() > 0.03)
        n.carrier.rotation.y = Math.atan2(direction.x, direction.z);
      n.carrier.position.x += direction.x * dt * 0.6;
      n.carrier.position.z += direction.z * dt * 0.6;
      animateCat(
        n.model,
        time + n.index,
        Math.abs(direction.x) + Math.abs(direction.z) > 0.1,
        reduced,
      );
    }
    let walking = false;
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
            !["ride", "play", "party", "meet", "farm"].includes(
              op.decision.action,
            )
          ) {
            operation = null;
            op.resolve({ completed: true });
          }
        }
      } else {
        const elapsed = (now - op.activityStart) / 1000,
          g = op.attraction,
          id = g?.userData.id,
          action = op.decision.action;
        if (action === "ride" && g) {
          let local = new THREE.Vector3(0, g.userData.seatHeight, 0);
          const moving = g.userData.moving;
          if (
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
          chichiCarrier.rotation.y = time * 0.8;
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
        } else if (action === "party") {
          chichiCarrier.position.y =
            0.35 + (reduced ? 0 : Math.abs(Math.sin(elapsed * 4)) * 0.15);
          chichiCarrier.rotation.y = Math.sin(elapsed * 2) * 0.35;
        } else if (action === "meet" && op.neighbor) {
          chichiCarrier.position.lerp(
            op.neighbor.carrier.position
              .clone()
              .add(new THREE.Vector3(0.75, 0, 0.75)),
            0.03,
          );
          chichiCarrier.rotation.y = Math.atan2(
            op.neighbor.carrier.position.x - chichiCarrier.position.x,
            op.neighbor.carrier.position.z - chichiCarrier.position.z,
          );
        }
        if (elapsed > 1 && !op.reacted && action === "ride") {
          op.reacted = true;
          callbacks.onReaction?.(
            id.includes("coaster")
              ? "Уиии! До самых звёзд! ✦"
              : "Мур! Вот это приключение! ✦",
          );
        }
        if (elapsed > (reduced ? 0.2 : g?.userData.duration || 6)) {
          chichiCarrier.position.copy(op.destination);
          operation = null;
          op.resolve({ completed: true });
        }
      }
    }
    animateCat(cat, time, walking, reduced);
    for (const item of weather) {
      if (!reduced) {
        item.points.rotation.y = time * 0.015;
        const data = item.points.geometry.getAttribute("position");
        for (let index = 0; index < data.count; index++) {
          let y = data.getY(index) - dt * (item.id === "winter" ? 0.2 : 0.05);
          if (y < 0.4) y = 5.5;
          data.setY(index, y);
        }
        data.needsUpdate = true;
      }
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
    scene.fog.density = distance > 90 ? 0.0008 : 0.006;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // Existing Chichi portraits use the unchanged model and mood system.
  const portraitRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  portraitRenderer.setSize(192, 192);
  for (const mood of moodNames) {
    const portrait = new THREE.Scene();
    portrait.add(new THREE.HemisphereLight(0xfff4e2, 0xb29b83, 3));
    const light = new THREE.DirectionalLight(0xffffff, 3);
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
    model.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
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
    dispose() {
      disposed = true;
      resize.disconnect();
      renderer.dispose();
    },
  };
}
