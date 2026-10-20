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
    compiled = new WeakMap(),
    callbacks = new WeakMap(),
    uploaded = new WeakMap(),
    add = scene.add;
  let disposed = false,
    running = false,
    callbackId = 0,
    foreground = 0,
    preparing = 0;
  const stats = {
    pending: 0,
    prepared: 0,
    reflected: 0,
    compiled: 0,
    reused: 0,
    textures: 0,
  };
  async function turn(background = false) {
    await yieldSceneTask();
    while (!disposed && (!canRun() || (background && foreground > 0)))
      await new Promise((r) => setTimeout(r, 40));
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
    const depth = base
      ? base.clone()
      : new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
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
  async function compile(
    object,
    material,
    programs,
    lighting,
    signature,
    shadow = false,
  ) {
    // Native material instances occur on hundreds of decorative meshes. The
    // exact same callback and program key have the same shader layout, while a
    // builder installing/replacing an animated shader must prepare it again.
    if (!callbacks.has(material.onBeforeCompile))
      callbacks.set(material.onBeforeCompile, ++callbackId);
    const geometry = object.geometry;
    const key = JSON.stringify([
      signature,
      shadow,
      material.version,
      callbacks.get(material.onBeforeCompile),
      material.customProgramCacheKey(),
      material.defines,
      object.type,
      !!object.isInstancedMesh,
      !!object.instanceColor,
      !!object.morphTexture,
      !!object.isBatchedMesh,
      !!object.colorsTexture,
      object.receiveShadow,
      Object.entries(geometry?.attributes || {}).map(([n, a]) => [
        n,
        a.itemSize,
        a.normalized,
      ]),
      Object.entries(geometry?.morphAttributes || {}).map(([n, a]) => [
        n,
        a.length,
        a[0]?.itemSize,
      ]),
      !!geometry?.morphTargetsRelative,
    ]);
    let variants = compiled.get(material);
    if (!variants) compiled.set(material, (variants = new Map()));
    if (key && variants.has(key)) {
      stats.reused++;
      const cached = variants.get(key);
      for (const program of cached.programs) programs.add(program);
      await cached.ready;
      return;
    }
    const proxy = Object.create(object);
    proxy.children = [];
    proxy.parent = null;
    proxy.material = material;
    const tone = renderer.toneMapping,
      color = renderer.outputColorSpace;
    let ready;
    const previous = new Set(renderer.info.programs),
      variantPrograms = new Set();
    try {
      if (shadow) {
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      }
      // compile() is synchronous; its Promise only polls readiness afterwards.
      ready = renderer.compileAsync(
        proxy,
        shadow ? shadowCamera : camera,
        lighting,
      );
      for (const program of renderer.info.programs)
        if (!previous.has(program)) {
          programs.add(program);
          variantPrograms.add(program);
        }
      const current = renderer.properties?.get(material)?.currentProgram;
      if (current) {
        programs.add(current);
        variantPrograms.add(current);
      }
    } finally {
      renderer.toneMapping = tone;
      renderer.outputColorSpace = color;
    }
    if (key) variants.set(key, { ready, programs: variantPrograms });
    try {
      await ready;
      stats.compiled++;
    } catch (e) {
      if (key) variants.delete(key);
      throw e;
    }
  }
  async function uploadTextures(material, background) {
    if (typeof renderer.initTexture !== "function") return;
    const textures = new Set(
      Object.values(material).filter((t) => t?.isTexture),
    );
    for (const u of Object.values(material.uniforms || {}))
      if (u?.value?.isTexture) textures.add(u.value);
    for (const texture of textures) {
      if (disposed) return;
      if (
        texture.isRenderTargetTexture ||
        texture.isVideoTexture ||
        uploaded.get(texture) === texture.version ||
        !texture.image ||
        texture.image.complete === false
      )
        continue;
      await turn(background);
      if (disposed) return;
      renderer.initTexture(texture);
      uploaded.set(texture, texture.version);
      stats.textures++;
    }
  }
  async function reflectReady(programs, background) {
    for (const program of programs) {
      if (disposed || reflected.has(program) || !program.program) continue;
      while (!disposed && program.program && !program.isReady())
        await turn(background);
      if (disposed) return;
      if (!program.program) continue;
      await turn(background);
      if (disposed || !program.program) continue;
      program.getUniforms();
      program.getAttributes();
      reflected.add(program);
      stats.reflected++;
    }
  }
  async function prepareRoot(root, background) {
    await turn(background);
    if (disposed) return;
    const objects = [],
      programs = new Set();
    // compileAsync traverses its target scene for lights for EACH object.
    // Use the same live lights/environment without revisiting world geometry.
    const lighting = Object.create(scene),
      lights = [];
    scene.traverseVisible((o) => {
      if (o.isLight) lights.push(o);
    });
    lighting.children = lights;
    const signature = JSON.stringify([
      lights.map((l) => [l.uuid, l.type, l.castShadow, l.layers.mask]),
      scene.environment?.uuid,
      scene.fog?.isFogExp2,
      !!scene.fog,
      renderer.shadowMap.type,
      renderer.toneMapping,
      renderer.outputColorSpace,
    ]);
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
        await uploadTextures(material, background);
        await compile(object, material, programs, lighting, signature);
        if (object.castShadow && shadowCamera)
          await compile(
            object,
            depthFor(object, material),
            programs,
            lighting,
            signature,
            true,
          );
      }
      if (performance.now() - start > 3) {
        await turn(background);
        start = performance.now();
      }
    }
    if (!disposed) {
      await reflectReady(programs, background);
      prepared.add(root);
      stats.prepared++;
    }
  }
  async function prepare(root, { background = false } = {}) {
    preparing++;
    if (!background) foreground++;
    try {
      return await prepareRoot(root, background);
    } finally {
      preparing--;
      if (!background) foreground--;
    }
  }
  async function pump() {
    if (running) return;
    running = true;
    try {
      while (!disposed && queue.size) {
        await turn(true);
        const root = queue.values().next().value;
        queue.delete(root);
        stats.pending = queue.size;
        if (root?.parent && isRelevant(root)) {
          try {
            await prepare(root, { background: true });
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
    idle: () => !running && queue.size === 0 && preparing === 0,
    dispose() {
      disposed = true;
      queue.clear();
      scene.add = add;
      for (const depth of owned) depth.dispose();
      owned.clear();
    },
  };
}
