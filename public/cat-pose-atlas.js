import * as THREE from "three";
import { uploadPoseTextureRows } from "./pose-texture-upload.js";

// A single Float32 pose store shared by the colony's colour and shadow draws.
// The sculpt/weights stay unchanged. Upload only rows whose joint poses changed,
// instead of uploading full matrix uniform arrays again for every cat material.
const WIDTH = 512,
  HEIGHT = 512,
  STRIDE = 32;
export function createCatPoseAtlas(
  scene,
  sun = null,
  { minimumCats = 1, sharingEnabled = true } = {},
) {
  const data = new Float32Array(WIDTH * HEIGHT * 4),
    texture = new THREE.DataTexture(
      data,
      WIDTH,
      HEIGHT,
      THREE.RGBAFormat,
      THREE.FloatType,
    ),
    dirty = new Uint8Array(HEIGHT),
    free = [{ start: 0, count: data.length / STRIDE }],
    cats = new Map(),
    materials = new Set(),
    relevant = new Set(),
    views = new Map(),
    viewIds = Array.from({ length: 1024 }, (_, i) => 1023 - i),
    viewMatrix = new THREE.Matrix4(),
    viewNormal = new THREE.Matrix3(),
    rounded = new Float32Array(25);
  texture.name = "Exact colony joint poses · shared colour and shadow palette";
  texture.generateMipmaps = false;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  const uniform = { value: texture };
  const viewUniform = { value: null };
  let enabled = true,
    rowUploadEnabled = true,
    disposed = false,
    sharing = false;
  const stats = { entries: 0, rows: 0, bytes: 0, cats: 0, updatedCats: 0 },
    projection = new THREE.Matrix4(),
    frustum = new THREE.Frustum();
  function allocate(count) {
    const i = free.findIndex((r) => r.count >= count);
    if (i < 0 || disposed) return null; // Native uniform palette is the fallback.
    const start = free[i].start;
    free[i].start += count;
    free[i].count -= count;
    if (!free[i].count) free.splice(i, 1);
    stats.entries += count;
    let released = false;
    return {
      offset: { value: start * 8 },
      write(palette) {
        if (released) return;
        const p = palette.positions.value,
          n = palette.normals.value,
          shown = palette.shown.value;
        for (let entry = 0; entry < count; entry++) {
          const base = (start + entry) * STRIDE;
          let changed = false;
          for (let k = 0; k < 16; k++) {
            const v = p[entry * 16 + k];
            if (data[base + k] !== v) {
              data[base + k] = v;
              changed = true;
            }
          }
          for (let k = 0; k < 9; k++) {
            const at = base + 16 + Math.floor(k / 3) * 4 + (k % 3),
              v = n[entry * 9 + k];
            if (data[at] !== v) {
              data[at] = v;
              changed = true;
            }
          }
          if (data[base + 28] !== shown[entry]) {
            data[base + 28] = shown[entry];
            changed = true;
          }
          if (changed) dirty[Math.floor(base / (WIDTH * 4))] = 1;
        }
      },
      release() {
        if (released) return;
        released = true;
        stats.entries -= count;
        free.push({ start, count });
        free.sort((a, b) => a.start - b.start);
        for (let j = free.length - 1; j > 0; j--)
          if (free[j - 1].start + free[j - 1].count === free[j].start) {
            free[j - 1].count += free[j].count;
            free.splice(j, 1);
          }
      },
    };
  }
  function flush(renderer) {
    if (!dirty.some(Boolean)) {
      stats.rows = stats.bytes = 0;
      return;
    }
    // A paused/hidden renderer may not have consumed earlier texture updates.
    // Keep their rows, but never accumulate duplicate ranges indefinitely.
    for (const range of texture.updateRanges)
      dirty[Math.floor(range.start / (WIDTH * 4))] = 1;
    texture.clearUpdateRanges();
    let rows = 0;
    for (let row = 0; row < HEIGHT; row++)
      if (dirty[row]) {
        texture.addUpdateRange(row * WIDTH * 4, WIDTH * 4);
        dirty[row] = 0;
        rows++;
      }
    stats.rows = rows;
    stats.bytes = rows * WIDTH * 4 * 4;
    if (rows && !(rowUploadEnabled && renderer && uploadPoseTextureRows(renderer, texture)))
      texture.needsUpdate = true;
  }
  function attachedVisible(cat) {
    for (let p = cat; p; p = p.parent) {
      if (!p.visible) return false;
      if (p === scene) return true;
    }
    return false;
  }
  const before = scene.onBeforeRender;
  function prepare(renderer, ...args) {
    before.call(scene, renderer, ...args);
    if (disposed || !enabled) return;
    relevant.clear();
    for (const cat of cats.keys()) if (attachedVisible(cat)) relevant.add(cat);
    // Quiet islands retain the original renderer without evaluating an unused
    // colony pose palette, per-part frusta or render-only rig graph.
    if (relevant.size < minimumCats) {
      sharing = false;
      stats.updatedCats = relevant.size;
      stats.rows = stats.bytes = 0;
      return;
    }
    const camera = args[1];
    if (sun && camera) {
      projection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(
        projection,
        camera.coordinateSystem,
        camera.reversedDepth,
      );
      sun.shadow.updateMatrices(sun);
    }
    for (const cat of relevant)
      if (
        !(
          !sun ||
          !camera ||
          cat.userData.renderBatches.batches.some(
            (mesh) =>
              mesh.visible &&
              (frustum.intersectsObject(mesh) ||
                (mesh.castShadow &&
                  sun.shadow.getFrustum().intersectsObject(mesh))),
          )
        )
      )
        relevant.delete(cat);
    stats.updatedCats = relevant.size;
    sharing = sharingEnabled && relevant.size >= minimumCats;
    if (sharing) {
      for (const cat of relevant) cats.get(cat).update(renderer);
      flush(renderer);
    } else stats.rows = stats.bytes = 0;
  }
  scene.onBeforeRender = prepare;
  return {
    uniform,
    viewUniform,
    stats,
    allocate,
    forEachCat(callback) {
      for (const cat of cats.keys()) callback(cat);
    },
    relevant(cat) {
      return relevant.has(cat);
    },
    view(camera, renderer) {
      let record = views.get(camera);
      if (!record) {
        if (views.size >= 8) {
          const old = views.keys().next().value;
          views.get(old).texture.dispose();
          views.delete(old);
        }
        const data = new Float32Array(32 * 256 * 4),
          texture = new THREE.DataTexture(
            data,
            32,
            256,
            THREE.RGBAFormat,
            THREE.FloatType,
          );
        texture.name = "Exact colony model-view matrices · " + camera.type;
        texture.needsUpdate = true;
        record = { data, texture, frame: -1 };
        views.set(camera, record);
      }
      if (record.frame !== renderer.info.render.frame) {
        record.frame = renderer.info.render.frame;
        let changed = false;
        for (const cat of relevant) {
          const id = cats.get(cat)?.viewId;
          if (id == null) continue;
          viewMatrix.multiplyMatrices(
            camera.matrixWorldInverse,
            cat.matrixWorld,
          );
          viewNormal.getNormalMatrix(viewMatrix);
          viewMatrix.toArray(rounded, 0);
          viewNormal.toArray(rounded, 16);
          const start = id * 32;
          for (let k = 0; k < 25; k++) {
            const at =
              start +
              (k < 16 ? k : 16 + Math.floor((k - 16) / 3) * 4 + ((k - 16) % 3));
            if (record.data[at] !== rounded[k]) {
              record.data[at] = rounded[k];
              changed = true;
            }
          }
        }
        if (changed) record.texture.needsUpdate = true;
      }
      viewUniform.value = record.texture;
    },
    get enabled() {
      return enabled;
    },
    get sharing() {
      return enabled && sharing;
    },
    register(cat, update) {
      const viewId = viewIds.pop() ?? null;
      cats.set(cat, { update, viewId });
      stats.cats = cats.size;
      return viewId;
    },
    unregister(cat) {
      const record = cats.get(cat);
      if (record?.viewId != null) viewIds.push(record.viewId);
      cats.delete(cat);
      relevant.delete(cat);
      stats.cats = cats.size;
    },
    material(m) {
      materials.add(m);
      m.addEventListener("dispose", () => materials.delete(m));
    },
    flush,
    setRowUploadEnabled(value) { rowUploadEnabled = !!value; },
    setSharingEnabled(value) { sharingEnabled = !!value; if (!sharingEnabled) sharing = false; },
    setEnabled(value) {
      if (enabled === !!value) return;
      enabled = !!value;
      for (const m of materials) m.needsUpdate = true;
    },
    dispose() {
      disposed = true;
      if (scene.onBeforeRender === prepare) scene.onBeforeRender = before;
      cats.clear();
      materials.clear();
      relevant.clear();
      for (const record of views.values()) record.texture.dispose();
      views.clear();
      texture.dispose();
    },
  };
}
