import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createShaderWarmup } from "../public/shader-warmup.js";

test("many attached/direct background preparations share one job per root and never flood the GPU concurrently", async () => {
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  let active = 0, maximum = 0, calls = 0;
  const renderer = {
    toneMapping: THREE.ACESFilmicToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { type: THREE.PCFShadowMap }, info: { programs: [] },
    async compileAsync() {
      calls++;
      active++;
      maximum = Math.max(maximum, active);
      await new Promise(r => setTimeout(r, 2));
      active--;
    },
  };
  const warm = createShaderWarmup(renderer, scene, camera, camera), jobs = [];
  for (let i = 0; i < 100; i++) {
    const root = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    root.userData.placement = { biome: "moon" };
    scene.add(root);
    const one = warm.prepare(root, { background: true });
    assert.equal(one, warm.prepare(root, { background: true }));
    jobs.push(one);
  }
  await Promise.all(jobs);
  assert.equal(maximum, 1, "100 buildings must not launch 100 parallel GPU warmups");
  assert.equal(calls, 100, "auto attachment and explicit preparation share the same work");
  assert.equal(warm.idle(), true);
  warm.dispose();
});

test("a newly selected root promotes its queued preparation ahead of unrelated background roots", async () => {
  const scene = new THREE.Scene(), camera = new THREE.Camera(), calls = [];
  const renderer = {
    toneMapping: THREE.ACESFilmicToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { type: THREE.PCFShadowMap }, info: { programs: [] },
    async compileAsync(object) { calls.push(object.name); },
  };
  const warm = createShaderWarmup(renderer, scene, camera, camera);
  const other = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const selected = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  other.name = "other"; selected.name = "selected";
  const background = warm.prepare(other, { background: true });
  const selectedBackground = warm.prepare(selected, { background: true });
  assert.equal(warm.prepare(selected), selectedBackground);
  await Promise.all([background, selectedBackground]);
  assert.deepEqual(calls, ["selected", "other"]);
  warm.dispose();
});

test("preparation mirrors native colour and depth variants without changing objects or renderer state", async () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(),
    shadow = new THREE.OrthographicCamera(),
    calls = [];
  let reflects = 0,
    attributes = 0;
  const renderer = {
    toneMapping: THREE.ACESFilmicToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { type: THREE.PCFSoftShadowMap },
    info: {
      programs: [
        {
          program: {},
          isReady: () => true,
          getUniforms: () => reflects++,
          getAttributes: () => attributes++,
        },
      ],
    },
    async compileAsync(object, view, target) {
      calls.push({
        object,
        view,
        target,
        tone: this.toneMapping,
        color: this.outputColorSpace,
      });
    },
  };
  renderer.properties = {
    get: () => ({ currentProgram: renderer.info.programs[0] }),
  };
  const warm = createShaderWarmup(renderer, scene, camera, shadow),
    root = new THREE.Group(),
    material = new THREE.MeshStandardMaterial({
      map: new THREE.Texture(),
      alphaTest: 0.2,
    }),
    mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  mesh.castShadow = true;
  root.add(mesh);
  const old = mesh.updateMatrixWorld,
    children = root.children;
  await warm.prepare(root);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].object.material, material);
  assert.equal(calls[1].view, shadow);
  assert.equal(calls[1].object.material.side, THREE.BackSide);
  assert.equal(calls[1].object.material.depthPacking, new THREE.MeshDepthMaterial().depthPacking);
  assert.equal(calls[1].object.material.map, material.map);
  assert.equal(calls[1].object.material.alphaTest, 0.2);
  assert.equal(calls[1].tone, THREE.NoToneMapping);
  assert.equal(calls[1].color, THREE.LinearSRGBColorSpace);
  assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(renderer.outputColorSpace, THREE.SRGBColorSpace);
  assert.equal(mesh.updateMatrixWorld, old);
  assert.equal(root.children, children);
  assert.equal(mesh.parent, root);
  assert.equal(mesh.material, material);
  await warm.prepare(root);
  assert.equal(reflects, 1);
  assert.equal(attributes, 1);
  let disposed = 0;
  calls[1].object.material.addEventListener("dispose", () => disposed++);
  material.dispose();
  assert.equal(disposed, 1);
  await warm.prepare(root);
  assert.equal(
    calls.length,
    2,
    "identical variants reuse preparation; retired materials are never prepared again",
  );
  warm.dispose();
  assert.equal(disposed, 1);
});

test("custom depth shaders retain rig callbacks and program keys; cancellation restores renderer state", async () => {
  const scene = new THREE.Scene(),
    camera = new THREE.Camera(),
    source = new THREE.MeshStandardMaterial(),
    mesh = new THREE.Mesh(new THREE.BoxGeometry(), source),
    depth = new THREE.MeshDepthMaterial();
  depth.onBeforeCompile = () => {};
  depth.customProgramCacheKey = () => "approved-custom-rig";
  mesh.customDepthMaterial = depth;
  mesh.castShadow = true;
  let prepared;
  const renderer = {
    toneMapping: THREE.ACESFilmicToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { type: THREE.PCFSoftShadowMap },
    info: { programs: [] },
    async compileAsync(proxy) {
      if (proxy.material.isMeshDepthMaterial) {
        prepared = proxy.material;
        throw Error("compile failed");
      }
    },
  };
  const warm = createShaderWarmup(renderer, scene, camera, camera);
  await assert.rejects(warm.prepare(mesh), /compile failed/);
  assert.equal(prepared.onBeforeCompile, depth.onBeforeCompile);
  assert.equal(prepared.customProgramCacheKey(), "approved-custom-rig");
  assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(renderer.outputColorSpace, THREE.SRGBColorSpace);
  warm.dispose();
});

test("hundreds of identical props share preparation, upload original textures once and collect only the real lights", async () => {
  const scene = new THREE.Scene(),
    sun = new THREE.DirectionalLight(),
    hidden = new THREE.Group();
  hidden.visible = false;
  hidden.add(new THREE.PointLight());
  scene.add(sun, hidden);
  const texture = new THREE.DataTexture(new Uint8Array([1, 2, 3, 4]), 1, 1);
  texture.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({ map: texture }),
    root = new THREE.Group(),
    geometry = new THREE.BoxGeometry();
  for (let i = 0; i < 400; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    root.add(mesh);
  }
  const calls = [],
    uploads = [];
  const renderer = {
    toneMapping: THREE.ACESFilmicToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { type: THREE.PCFSoftShadowMap },
    info: { programs: [] },
    initTexture: (t) => uploads.push(t),
    async compileAsync(object, camera, lighting) {
      const lights = [];
      lighting.traverseVisible((o) => {
        if (o.isLight) lights.push(o);
      });
      assert.deepEqual(lights, [sun]);
      assert.equal(lighting.environment, scene.environment);
      calls.push(object);
    },
  };
  const warm = createShaderWarmup(
    renderer,
    scene,
    new THREE.Camera(),
    new THREE.Camera(),
  );
  await warm.prepare(root);
  assert.equal(calls.length, 2);
  assert.deepEqual(uploads, [texture]);
  assert.equal(warm.stats.reused, 798);
  assert.equal(root.children.length, 400);
  assert.equal(root.children[0].parent, root);
  texture.needsUpdate = true;
  material.needsUpdate = true;
  await warm.prepare(root);
  assert.equal(uploads.length, 2);
  assert.equal(
    calls.length,
    3,
    "only changed colour material requires another variant",
  );
  scene.add(new THREE.PointLight());
  renderer.compileAsync = async (object) => calls.push(object);
  await warm.prepare(root);
  assert.equal(
    calls.length,
    5,
    "a changed light layout recompiles colour and depth",
  );
  material.onBeforeCompile = () => {};
  material.customProgramCacheKey = () => "authored-garden-wind";
  await warm.prepare(root);
  assert.equal(
    calls.length,
    6,
    "one native compile for a shared custom shader",
  );
  material.onBeforeCompile = () => {};
  await warm.prepare(root);
  assert.equal(
    calls.length,
    7,
    "replacement callbacks never reuse stale variants",
  );
  warm.dispose();
});

test("selected island preparation pauses cooperative background work, then resumes it after success or failure", async () => {
  for (const fails of [false, true]) {
    const scene = new THREE.Scene(),
      camera = new THREE.Camera(),
      calls = [],
      background = new THREE.Group(),
      hero = new THREE.Mesh(
        new THREE.BoxGeometry(),
        new THREE.MeshStandardMaterial(),
      );
    let releaseFirst, releaseHero, firstStarted, heroStarted;
    const first = new Promise((r) => (firstStarted = r)),
      selected = new Promise((r) => (heroStarted = r)),
      firstGate = new Promise((r) => (releaseFirst = r)),
      heroGate = new Promise((r) => (releaseHero = r));
    for (let i = 0; i < 3; i++) {
      const material = new THREE.MeshStandardMaterial({
        map: new THREE.DataTexture(new Uint8Array(4), 1, 1),
      });
      material.name = "background-" + i;
      background.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    }
    hero.material.name = "selected";
    const renderer = {
      toneMapping: THREE.ACESFilmicToneMapping,
      outputColorSpace: THREE.SRGBColorSpace,
      shadowMap: { type: THREE.PCFShadowMap },
      info: { programs: [] },
      initTexture() {},
      async compileAsync(object) {
        const name = object.material.name;
        calls.push(name);
        if (name === "background-0") {
          firstStarted();
          await firstGate;
        }
        if (name === "selected") {
          heroStarted();
          await heroGate;
          if (fails) throw Error("selected compile failed");
        }
      },
    };
    const warm = createShaderWarmup(renderer, scene, camera, camera),
      idle = warm.prepare(background, { background: true });
    await first;
    const active = warm.prepare(hero);
    const checked = fails
      ? assert.rejects(active, /selected compile failed/)
      : active;
    await selected;
    assert.equal(warm.idle(), false);
    releaseFirst();
    await new Promise((r) => setTimeout(r, 50));
    assert.deepEqual(calls, ["background-0", "selected"]);
    releaseHero();
    await checked;
    await idle;
    assert.equal(warm.idle(), true);
    assert.deepEqual(calls, [
      "background-0",
      "selected",
      "background-1",
      "background-2",
    ]);
    warm.dispose();
  }
});

test("retired queued batches never recreate disposed GPU resources; active retirement stops at the next async boundary", async () => {
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  let needed = true, calls = 0, uploaded = 0;
  const renderer = {
    toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { type: THREE.PCFShadowMap }, info: { programs: [] },
    initTexture() { uploaded++; needed = false; },
    async compileAsync() { calls++; },
  };
  const warm = createShaderWarmup(renderer, scene, camera, camera);
  const root = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  await warm.prepare(root, { background: true, needed: () => false });
  assert.equal(calls, 0, "retired roots are not compiled after leaving the scene");
  root.material.map = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  await warm.prepare(root, { background: true, needed: () => needed });
  assert.equal(uploaded, 1);
  assert.equal(calls, 0, "retiring during an upload prevents colour and shadow preparation");
  assert.equal(warm.stats.prepared, 0);
  needed = true;
  root.material.map = null;
  await warm.prepare(root, { background: true, needed: () => needed });
  assert.equal(calls, 1, "cancellation does not cache an unfinished root");
  warm.dispose();
});
