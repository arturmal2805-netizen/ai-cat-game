import * as THREE from "three";
import { createRenderVisibility } from "./render-visibility.js";
import { copyDepthTarget } from "./depth-target-copy.js";

// Keep the exact PCF depth attachment of stationary opaque scenery. Animated
// casters still render natively into the restored depth buffer on every frame.
// One fixed-size GPU target; no readbacks, waits, extra reflection passes or LOD.
export function createShadowDepthCache(renderer, scene, light, { minTriangles = 10000 } = {}) {
  let map = renderer.shadowMap, nativeShadow = map.render;
  const nativeDraw = renderer.renderBufferDirect, nativeClear = renderer.clear;
  const visibility = createRenderVisibility(scene), changing = new WeakSet();
  const view = new Float32Array(32), mv = new THREE.Matrix4();
  const depthKeys = ["visible","wireframe","side","alphaMap","alphaTest","map","clipShadows",
    "clippingPlanes","clipIntersection","displacementMap","displacementScale","displacementBias","wireframeLinewidth","linewidth"];
  let previousView = null, stable = 0, enabled = true, valid = false,
    target = null, records = [], cached = new Map(), mode = "", collected = [],
    disposed = false, depthTarget = null, retryFrames = 0;
  const stats = { bakes: 0, blits: 0, skippedDraws: 0, skippedTriangles: 0, cachedCasters: 0, targetBytes: 0 };
  function eligible(o) {
    const m = o.material;
    if (!o.userData.staticModel || !o.isMesh || o.isSkinnedMesh ||
        o.isInstancedMesh || changing.has(o) || Array.isArray(m) || !m?.visible ||
        m.transparent || m.wireframe || m.alphaToCoverage || m.alphaTest || m.alphaHash || m.displacementMap ||
        m.clippingPlanes?.length || Object.keys(o.geometry.morphAttributes).length) return false;
    if (o.userData.staticSubmission)
      return o.userData.staticSubmission.isStatic();
    return !o.isBatchedMesh && !o.customDepthMaterial &&
      m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile &&
      o.onBeforeShadow === THREE.Object3D.prototype.onBeforeShadow;
  }
  function snapshot(args) {
    const o = args[4], g = args[2], m = o.material;
    return { args, object: o, geometry: g, material: m, version: m.version, side: m.side, shadowSide: m.shadowSide,
      depthValues: depthKeys.map(k => args[3][k]),
      layers: o.layers.mask, range: [g.drawRange.start, g.drawRange.count],
      groups: g.groups.map(v => [v.start, v.count, v.materialIndex]), matrix: o.matrixWorld.clone(),
      modelView: new Float32Array(o.modelViewMatrix.elements),
      attributes: [g.index, ...Object.values(g.attributes)].filter(Boolean).map(a => [a, a.version]),
      triangles: o.userData.staticSubmission
        ? o.userData.staticSubmission.stats.submittedIndices / 3
        : (g.index?.count || g.attributes.position.count) / 3 };
  }
  function unchanged(r) {
    const o = r.object;
    if (!o.matrixWorld.equals(r.matrix)) { changing.add(o); return false; }
    if (!eligible(o) || !visibility.visible(o) || !o.castShadow ||
        o.layers.mask !== r.layers || o.geometry !== r.geometry ||
        o.material !== r.material || o.material.version !== r.version || o.material.side !== r.side || o.material.shadowSide !== r.shadowSide ||
        r.attributes.some(([a,v]) => a.version !== v) ||
        o.geometry.drawRange.start !== r.range[0] || o.geometry.drawRange.count !== r.range[1] ||
        o.geometry.groups.length !== r.groups.length || o.geometry.groups.some((v,i) =>
          v.start !== r.groups[i][0] || v.count !== r.groups[i][1] || v.materialIndex !== r.groups[i][2])) return false;
    const nowAttributes = [o.geometry.index, ...Object.values(o.geometry.attributes)].filter(Boolean);
    if (nowAttributes.length !== r.attributes.length || nowAttributes.some((a,i)=>a!==r.attributes[i][0])) return false;
    mv.multiplyMatrices(light.shadow.camera.matrixWorldInverse, o.matrixWorld);
    return mv.elements.every((v,i) => Math.fround(v) === r.modelView[i]);
  }
  function blit(source, destination) {
    copyDepthTarget(renderer, source, destination);
    stats.blits++;
  }
  function draw(...args) {
    const o = args[4];
    if (mode === "reuse" && cached.has(o)) {
      stats.skippedDraws++;
      stats.skippedTriangles += cached.get(o).triangles;
      return;
    }
    const result = nativeDraw.apply(renderer, args);
    if (mode === "collect" && eligible(o)) collected.push(snapshot(args));
    return result;
  }
  function clear(...args) {
    const result = nativeClear.apply(renderer, args);
    if (mode === "reuse" && renderer.getRenderTarget() === depthTarget)
      blit(target, depthTarget);
    return result;
  }
  function bake() {
    if (!collected.length || collected.reduce((s,r)=>s+r.triangles,0) < minTriangles) {
      retryFrames = 120; // Small scenes stay native; do not allocate snapshots every frame.
      return;
    }
    const source = light.shadow.map;
    if (!source?.depthTexture || source.samples || source.isWebGLCubeRenderTarget) return;
    if (!target || target.width !== source.width || target.height !== source.height) {
      target?.dispose();
      target = new THREE.WebGLRenderTarget(source.width, source.height);
      target.depthTexture = source.depthTexture.clone();
      renderer.initRenderTarget(target);
      stats.targetBytes = source.width * source.height * 8;
    }
    const current = renderer.getRenderTarget();
    const paints = new Map();
    try {
      renderer.setRenderTarget(target);
      nativeClear.call(renderer);
      for (const r of collected) {
        const o = r.object, paint = r.args[3];
        if (!paints.has(paint)) paints.set(paint, depthKeys.map(k => paint[k]));
        depthKeys.forEach((k,i) => paint[k] = r.depthValues[i]);
        o.modelViewMatrix.multiplyMatrices(light.shadow.camera.matrixWorldInverse, o.matrixWorld);
        nativeDraw.apply(renderer, r.args);
      }
      records = collected; cached = new Map(records.map(r=>[r.object,r]));
      depthTarget = source; valid = true;
      stats.cachedCasters = records.length; stats.bakes++;
    } finally {
      for (const [paint,values] of paints) depthKeys.forEach((k,i) => paint[k] = values[i]);
      renderer.setRenderTarget(current);
    }
  }
  function render(lights, world, camera) {
    stats.skippedDraws = stats.skippedTriangles = 0;
    if (disposed || !enabled || world !== scene || !map.enabled ||
        map.type !== THREE.PCFShadowMap || lights.length !== 1 || lights[0] !== light ||
        (!map.autoUpdate && !map.needsUpdate) || (!light.shadow.autoUpdate && !light.shadow.needsUpdate))
      return nativeShadow.call(map, lights, world, camera);
    light.shadow.updateMatrices(light, camera);
    view.set(light.shadow.camera.matrixWorldInverse.elements,0);
    view.set(light.shadow.camera.projectionMatrix.elements,16);
    if (!previousView || view.some((v,i)=>v!==previousView[i])) {
      previousView = view.slice(); stable = 0; valid = false; retryFrames = 0;
    } else stable++;
    visibility.reset();
    if (valid && (depthTarget !== light.shadow.map || records.some(r=>!unchanged(r)))) valid = false;
    collected = [];
    if (retryFrames > 0) retryFrames--;
    mode = valid ? "reuse" : stable >= 2 && !retryFrames ? "collect" : "";
    try {
      nativeShadow.call(map, lights, world, camera);
      if (mode === "collect") bake();
    } finally { mode = ""; collected = []; }
  }
  renderer.renderBufferDirect = draw; renderer.clear = clear; map.render = render;
  function restored() {
    target?.dispose(); target = null; valid = false; previousView = null;
    map = renderer.shadowMap; nativeShadow = map.render; map.render = render;
  }
  renderer.domElement?.addEventListener("webglcontextrestored",restored);
  return {
    stats,
    setEnabled(value) { enabled = !!value; valid = false; stable = 0; retryFrames = 0; },
    dispose() {
      disposed = true; target?.dispose(); records = []; cached.clear();
      if (map.render === render) map.render = nativeShadow;
      if (renderer.renderBufferDirect === draw) renderer.renderBufferDirect = nativeDraw;
      if (renderer.clear === clear) renderer.clear = nativeClear;
      renderer.domElement?.removeEventListener("webglcontextrestored",restored);
    },
  };
}
