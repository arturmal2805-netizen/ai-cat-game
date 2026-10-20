import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createShaderWarmup } from "../public/shader-warmup.js";

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
  assert.equal(calls.length, 4, "a retired material is never prepared again");
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
