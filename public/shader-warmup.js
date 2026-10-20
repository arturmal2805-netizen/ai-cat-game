import * as THREE from "three";
import { yieldSceneTask } from "./scene-tasks.js";

// Colour-only compileAsync does not prepare the actual depth pass or the first
// uniform/attribute reflection. Do that cooperatively before a newly loaded
// island is revealed, and in the background for other attached world objects.
export function createShaderWarmup(
  renderer,
  scene,
  camera,
  shadowCamera,
  { canRun = () => true, isRelevant = () => true } = {},
) {
  const reflected = new WeakSet(),
    depths = new WeakMap(),
    owned = new Set(),
    watched = new WeakSet(),
    retired = new WeakSet(),
    prepared = new WeakSet(),
    queue = new Set(),
    add = scene.add;
  let disposed = false,
    running = false;
  const stats = { pending: 0, prepared: 0, reflected: 0 };
  async function turn() {
    await yieldSceneTask();
    while (!disposed && !canRun()) await new Promise((r) => setTimeout(r, 40));
  }
  function depthFor(object, source) {
    let map = depths.get(source);
    if (!map) {
      depths.set(source, (map = new Map()));
      source.addEventListener("dispose", () => {
        for (const depth of map.values()) {
          depth.dispose();
          owned.delete(depth);
        }
        map.clear();
      });
    }
    const base = object.customDepthMaterial,
      side =
        source.shadowSide ??
        (renderer.shadowMap.type === THREE.VSMShadowMap
          ? source.side
          : source.side === THREE.FrontSide
            ? THREE.BackSide
            : source.side === THREE.BackSide
              ? THREE.FrontSide
              : THREE.DoubleSide),
      key = (base?.uuid || "native-depth") + ":" + side;
    if (map.has(key)) return map.get(key);
    const depth = base ? base.clone() : new THREE.MeshDepthMaterial();
    if (base) {
      depth.onBeforeCompile = base.onBeforeCompile;
      depth.customProgramCacheKey = base.customProgramCacheKey;
    }
    for (const key of [
      "visible",
      "wireframe",
      "alphaMap",
      "map",
      "clipShadows",
      "clippingPlanes",
      "clipIntersection",
      "displacementMap",
      "displacementScale",
      "displacementBias",
      "wireframeLinewidth",
      "linewidth",
    ])
      depth[key] = source[key];
    depth.side = side;
    depth.alphaTest = source.alphaToCoverage ? 0.5 : source.alphaTest;
    map.set(key, depth);
    owned.add(depth);
    return depth;
  }
  async function compile(object, material, programs, shadow = false) {
    const proxy = Object.create(object);
    proxy.children = [];
    proxy.parent = null;
    proxy.material = material;
    const tone = renderer.toneMapping,
      color = renderer.outputColorSpace;
    let ready;
    const previous = new Set(renderer.info.programs);
    try {
      if (shadow) {
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      }
      // compile() is synchronous; its Promise only polls readiness afterwards.
      ready = renderer.compileAsync(
        proxy,
        shadow ? shadowCamera : camera,
        scene,
      );
      for (const program of renderer.info.programs)
        if (!previous.has(program)) programs.add(program);
      const current = renderer.properties?.get(material)?.currentProgram;
      if (current) programs.add(current);
    } finally {
      renderer.toneMapping = tone;
      renderer.outputColorSpace = color;
    }
    await ready;
  }
  async function reflectReady(programs) {
    for (const program of programs) {
      if (disposed || reflected.has(program) || !program.program) continue;
      while (!disposed && program.program && !program.isReady()) await turn();
      if (disposed) return;
      if (!program.program) continue;
      await turn();
      if (disposed || !program.program) continue;
      program.getUniforms();
      program.getAttributes();
      reflected.add(program);
      stats.reflected++;
    }
  }
  async function prepare(root) {
    const objects = [],
      programs = new Set();
    root.traverse((o) => {
      if (
        (o.isMesh || o.isPoints || o.isLine || o.isSprite) &&
        o.layers.isEnabled(0) &&
        !o.isSkinnedMesh &&
        !o.userData.rigMaterialSource
      )
        objects.push(o);
    });
    let start = performance.now();
    for (const object of objects) {
      if (disposed) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (!material || retired.has(material)) continue;
        if (!watched.has(material)) {
          watched.add(material);
          material.addEventListener("dispose", () => retired.add(material));
        }
        await compile(object, material, programs);
        if (object.castShadow && shadowCamera)
          await compile(object, depthFor(object, material), programs, true);
      }
      if (performance.now() - start > 3) {
        await turn();
        start = performance.now();
      }
    }
    if (!disposed) {
      await reflectReady(programs);
      prepared.add(root);
      stats.prepared++;
    }
  }
  async function pump() {
    if (running) return;
    running = true;
    try {
      while (!disposed && queue.size) {
        await turn();
        const root = queue.values().next().value;
        queue.delete(root);
        stats.pending = queue.size;
        if (root?.parent && isRelevant(root)) {
          try {
            await prepare(root);
          } catch (error) {
            console.warn("Shader preparation kept native rendering", error);
          }
        }
      }
    } finally {
      running = false;
    }
  }
  scene.add = function (...objects) {
    const result = add.apply(this, objects);
    for (const object of objects)
      if (
        object?.isObject3D &&
        !prepared.has(object) &&
        (object.userData.placement ||
          object.userData.lowDetail ||
          object.isBatchedMesh ||
          object.isInstancedMesh)
      )
        queue.add(object);
    stats.pending = queue.size;
    void pump();
    return result;
  };
  // Objects already present include the sky, lighting and distant terrain.
  for (const root of scene.children)
    if (
      root.userData.placement ||
      root.userData.lowDetail ||
      root.isBatchedMesh ||
      root.isInstancedMesh
    )
      queue.add(root);
  stats.pending = queue.size;
  void pump();
  return {
    stats,
    prepare,
    enqueue(root) {
      if (!disposed && !prepared.has(root)) {
        queue.add(root);
        stats.pending = queue.size;
        void pump();
      }
    },
    idle: () => !running && queue.size === 0,
    dispose() {
      disposed = true;
      queue.clear();
      scene.add = add;
      for (const depth of owned) depth.dispose();
      owned.clear();
    },
  };
}
