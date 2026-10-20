import * as THREE from "three";
import { createRenderVisibility } from "./render-visibility.js";
import { createStaticRenderTraversal } from "./static-render-traversal.js";

export const STATIC_PICK_LAYER = 30;
const ordinaryShader = THREE.Material.prototype.onBeforeCompile;
function supportedTransform(matrix) {
  if (matrix.determinant() <= 0) return false;
  const a = matrix.elements;
  const dot = (i, j) => a[i] * a[j] + a[i + 1] * a[j + 1] + a[i + 2] * a[j + 2];
  const scale = Math.max(dot(0, 0), dot(4, 4), dot(8, 8));
  return (
    Math.max(Math.abs(dot(0, 4)), Math.abs(dot(0, 8)), Math.abs(dot(4, 8))) <=
    scale * 1e-7
  );
}

// Only small, explicitly baked opaque props. Large range-culled meshes, water,
// foliage shaders, articulated cats and transparent surfaces stay native.
function key(mesh, layers, paints, layouts) {
  const g = mesh.geometry,
    m = mesh.material;
  if (
    !mesh.userData.staticModel ||
    !(layers & 1) ||
    !mesh.isMesh ||
    mesh.isInstancedMesh ||
    mesh.isBatchedMesh ||
    mesh.isSkinnedMesh ||
    Array.isArray(m) ||
    !(m.isMeshStandardMaterial || m.isMeshBasicMaterial) ||
    m.isMeshPhysicalMaterial ||
    m.transparent ||
    m.opacity !== 1 ||
    !m.visible ||
    !m.depthWrite ||
    !m.depthTest ||
    m.alphaTest ||
    m.alphaHash ||
    m.alphaToCoverage ||
    m.wireframe ||
    m.displacementMap ||
    m.onBeforeCompile !== ordinaryShader ||
    m.clippingPlanes?.length ||
    mesh.customDepthMaterial ||
    mesh.customDistanceMaterial ||
    mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender ||
    mesh.onAfterRender !== THREE.Object3D.prototype.onAfterRender ||
    mesh.onBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow ||
    mesh.onAfterShadow !== THREE.Object3D.prototype.onAfterShadow ||
    g.groups.length ||
    !g.index ||
    g.index.count >= 6000 ||
    g.drawRange.start !== 0 ||
    g.drawRange.count < g.index.count ||
    Object.keys(g.morphAttributes).length ||
    Object.values(g.attributes).some(
      (a) => a.isInterleavedBufferAttribute || a.isFloat16BufferAttribute,
    )
  )
    return null;
  for (let parent = mesh.parent; parent; parent = parent.parent)
    if (parent.isGroup && parent.renderOrder !== 0) return null;
  // Compare texture identities, not their pixels. Root Material.toJSON would
  // encode every canvas texture as a PNG during a building edit.
  let paint = paints.get(m);
  if (!paint) {
    const meta = { textures: {}, images: {} };
    for (const value of Object.values(m))
      if (value?.isTexture) meta.textures[value.uuid] = { uuid: value.uuid };
    const json = m.toJSON(meta);
    delete json.uuid;
    delete json.name;
    delete json.metadata;
    delete json.userData;
    paint = JSON.stringify(json);
    paints.set(m, paint);
  }
  let layout = layouts.get(g);
  if (!layout) {
    layout = JSON.stringify(Object.entries(g.attributes).map(([name, a]) => [
      name, a.array.constructor.name, a.itemSize, a.normalized, a.gpuType,
    ]));
    layouts.set(g, layout);
  }
  return JSON.stringify([
    paint, layout, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder,
  ]);
}

export function createStaticDrawBatch(
  scene,
  renderer,
  camera = null,
  { prepare = null } = {},
) {
  const supported = renderer.extensions.has("WEBGL_multi_draw");
  let entries = [],
    batches = [],
    enabled = true,
    available = supported,
    prunable = 0;
  const visibility = createRenderVisibility(scene);
  const traversal = createStaticRenderTraversal(scene, renderer);
  const previous = scene.onBeforeRender;
  const stats = { sources: 0, batches: 0 };
  function compatible(e) {
    const m = e.material,
      b = e.batch.material;
    return (
      enabled &&
      available &&
      e.batch.userData.shaderReady &&
      e.transform &&
      e.mesh.material === m &&
      e.mesh.geometry === e.geometry &&
      e.mesh.onBeforeRender === THREE.Object3D.prototype.onBeforeRender &&
      e.mesh.onAfterRender === THREE.Object3D.prototype.onAfterRender &&
      e.mesh.onBeforeShadow === THREE.Object3D.prototype.onBeforeShadow &&
      e.mesh.onAfterShadow === THREE.Object3D.prototype.onAfterShadow &&
      m.version === e.version &&
      m.onBeforeCompile === ordinaryShader &&
      !m.transparent &&
      m.opacity === 1 &&
      m.depthWrite &&
      m.depthTest &&
      m.visible === b.visible &&
      m.map === b.map &&
      m.bumpMap === b.bumpMap &&
      m.bumpScale === b.bumpScale &&
      m.normalMap === b.normalMap &&
      m.toneMapped === b.toneMapped &&
      m.fog === b.fog &&
      m.colorWrite === b.colorWrite &&
      m.side === b.side &&
      m.color.equals(b.color) &&
      m.roughness === b.roughness &&
      m.metalness === b.metalness &&
      m.emissiveIntensity === b.emissiveIntensity &&
      (!m.emissive || m.emissive.equals(b.emissive))
    );
  }
  function retire(batch) {
    batch.removeFromParent();
    batch.dispose();
    batch.material.dispose();
  }
  function restore() {
    for (const e of entries) e.mesh.layers.mask = e.layers;
    for (const b of batches) retire(b);
    entries = [];
    batches = [];
    stats.sources = stats.batches = 0;
  }
  function prepareBatch(batch) {
    if (batch.userData.shaderReady || batch.userData.shaderPreparing) return;
    batch.userData.shaderPreparing = true;
    void (prepare ? prepare(batch) : renderer.compileAsync(batch, camera, scene))
      .then(() => {
        if (batch.parent === scene && batches.includes(batch))
          batch.userData.shaderReady = true;
      })
      .catch(() => {});
  }
  function update(prepareVisible = false) {
    available = renderer.extensions.has("WEBGL_multi_draw");
    visibility.reset();
    prunable = 0;
    for (const b of batches) b.visible = false;
    for (const e of entries) {
      e.prunable = false;
      // Hidden sources cannot draw or cast a shadow. Recheck their complete
      // transform/material on wake; retain native layer restoration on fallback.
      const shown = visibility.visible(e.mesh);
      if (!shown && enabled && available) {
        e.batch.setVisibleAt(e.id, false);
        continue;
      }
      if (shown && prepareVisible && enabled && available)
        prepareBatch(e.batch);
      if (!e.matrix.equals(e.mesh.matrixWorld)) {
        e.matrix.copy(e.mesh.matrixWorld);
        e.transform = supportedTransform(e.matrix);
        if (e.transform) e.batch.setMatrixAt(e.id, e.matrix);
      }
      const nativeCompatible = compatible(e);
      e.prunable = shown && nativeCompatible;
      if (e.prunable && !e.mesh.children.length) prunable++;
      e.mesh.layers.mask = nativeCompatible
        ? (e.layers & ~1) | (1 << STATIC_PICK_LAYER)
        : e.layers;
      e.batch.setVisibleAt(e.id, shown && nativeCompatible);
      if (shown && nativeCompatible) e.batch.visible = true;
    }
  }
  scene.onBeforeRender = function (...args) {
    previous.apply(this, args);
    update(true); // Prepare only after final view culling and matrix updates.
    // Small scenes are cheaper to traverse natively than to filter parent
    // arrays. Dense owned islands benefit; sparse lagoons keep the light path.
    traversal.prune(entries, prunable >= 64);
  };
  return {
    stats,
    traversal,
    sync(roots) {
      if (!supported) return;
      const groups = new Map(), paints = new WeakMap(), layouts = new WeakMap();
      const layers = new Map(entries.map((e) => [e.mesh, e.layers]));
      for (const root of roots) {
        // Guest rafts clone the native moving template lazily. Keep it and
        // its bounded guest copies on their original render/picking layers.
        const moving = new Set(
          [root.userData.moving, ...(root.userData.slideVehicles || [])].filter(
            Boolean,
          ),
        );
        root.traverse((mesh) => {
          for (let p = mesh; p && p !== root; p = p.parent)
            if (moving.has(p)) return;
          const k = key(mesh, layers.get(mesh) ?? mesh.layers.mask, paints, layouts);
          if (k === null) return;
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(mesh);
        });
      }
      const candidates = [...groups].filter(([, g]) => g.length >= 3);
      const old = new Map(batches.map(b => [b.userData.groupKey, { batch: b, entries: [] }]));
      for (const e of entries) {
        e.mesh.layers.mask = e.layers;
        old.get(e.batch.userData.groupKey).entries.push(e);
      }
      entries = [];
      batches = [];
      for (const [groupKey, sources] of candidates) {
        const previous = old.get(groupKey);
        if (previous && sources.length === previous.entries.length && sources.every((m, i) => {
          const e = previous.entries[i];
          return m === e.mesh && m.geometry === e.geometry &&
            m.material === e.material && m.material.version === e.version;
        })) {
          batches.push(previous.batch);
          entries.push(...previous.entries);
          old.delete(groupKey);
          continue;
        }
        const vertices = sources.reduce(
          (s, m) => s + m.geometry.attributes.position.count,
          0,
        );
        const indices = sources.reduce((s, m) => s + m.geometry.index.count, 0);
        const material = sources[0].material.clone();
        const batch = new THREE.BatchedMesh(
          sources.length,
          vertices,
          indices,
          material,
        );
        batch.name = "Shared exact static props";
        batch.userData.groupKey = groupKey;
        batch.castShadow = sources[0].castShadow;
        batch.receiveShadow = sources[0].receiveShadow;
        batch.renderOrder = sources[0].renderOrder;
        batch.frustumCulled = false;
        batch.sortObjects = false;
        batch.raycast = () => {}; // Pick the unchanged original object instead.
        batch.userData.shaderReady = !camera || !renderer.compileAsync;
        scene.add(batch);
        batches.push(batch);
        for (const mesh of sources) {
          const id = batch.addInstance(batch.addGeometry(mesh.geometry));
          mesh.updateWorldMatrix(true, false);
          batch.setMatrixAt(id, mesh.matrixWorld);
          entries.push({
            mesh,
            geometry: mesh.geometry,
            material: mesh.material,
            version: mesh.material.version,
            layers: mesh.layers.mask,
            matrix: mesh.matrixWorld.clone(),
            transform: supportedTransform(mesh.matrixWorld),
            batch,
            id,
          });
        }
        // Keep native props until their actually visible batch is prepared.
        // Hundreds of remote businesses must not start parallel GPU jobs here.
      }
      for (const { batch } of old.values()) retire(batch);
      stats.sources = entries.length;
      stats.batches = batches.length;
      update();
    },
    setEnabled(value) {
      enabled = !!value;
      update();
    },
    dispose() {
      traversal.dispose();
      restore();
      visibility.reset();
      scene.onBeforeRender = previous;
    },
  };
}
