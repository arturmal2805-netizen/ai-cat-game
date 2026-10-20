import * as THREE from "three";
import { rigShader } from "./cat-render-batch.js";
import { prepareSceneSteps } from "./scene-tasks.js";

// All approved non-hero rigs keep their individual anatomy, poses and picking.
// Share only compatible opaque material draws across the colony. No LODs.
const DRAW_SOURCE_LAYER = 29,
  identity = new THREE.Matrix4();
function dotColumn(e, a, b) {
  return e[a] * e[b] + e[a + 1] * e[b + 1] + e[a + 2] * e[b + 2];
}
function exactCameraMaterial(material, viewUniform, tintTexture) {
  const before = material.onBeforeCompile,
    key = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, ...args) {
    before.call(this, shader, ...args);
    shader.uniforms.uCatView = viewUniform;
    shader.uniforms.uCatTints = { value: tintTexture };
    shader.vertexShader =
      `
      #undef USE_BATCHING_COLOR
      uniform highp sampler2D uCatView;
      uniform highp sampler2D uCatTints;
      attribute float aRigView;
      flat varying vec3 vCatTint;
      vec4 catViewTexel(int instance,int column){
        int at=instance*8+column;
        return texelFetch(uCatView,ivec2(at%32,at/32),0);
      }
      mat4 catModelView(int instance){return mat4(catViewTexel(instance,0),catViewTexel(instance,1),catViewTexel(instance,2),catViewTexel(instance,3));}
      mat3 catViewNormal(int instance){return mat3(catViewTexel(instance,4).xyz,catViewTexel(instance,5).xyz,catViewTexel(instance,6).xyz);}
      ` +
      shader.vertexShader
        .replace(
          "#include <defaultnormal_vertex>",
          `
        vec3 transformedNormal=catViewNormal(int(aRigView))*objectNormal;
        #ifdef FLIP_SIDED
          transformedNormal=-transformedNormal;
        #endif
      `,
        )
        .replace(
          "#include <project_vertex>",
          `
        vec4 mvPosition=catModelView(int(aRigView))*vec4(transformed,1.);
        gl_Position=projectionMatrix*mvPosition;
      `,
        )
        .replace(
          "#include <color_vertex>",
          `#include <color_vertex>
        int catIndex=int(getIndirectIndex(gl_DrawID));
        int tintWidth=textureSize(uCatTints,0).x;
        vCatTint=texelFetch(uCatTints,ivec2(catIndex%tintWidth,catIndex/tintWidth),0).rgb;
      `,
        );
    shader.fragmentShader =
      "flat varying vec3 vCatTint;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        "diffuseColor.rgb*=vCatTint;\n#include <color_fragment>",
      );
  };
  material.customProgramCacheKey = () => key() + "-exact-cat-view-v2";
}
function family(source) {
  const material = source.userData.rigMaterialSource;
  if (!material || material.transparent || Array.isArray(material)) return null;
  // Outfit paint may also belong to baked scenery. Its range-only shader
  // disables native batching helpers, so preserve the original animated draw.
  if (material.customProgramCacheKey().includes("-static-ranges-")) return null;
  const meta = { textures: {}, images: {} };
  for (const v of Object.values(material))
    if (v?.isTexture) meta.textures[v.uuid] = { uuid: v.uuid };
  const json = material.toJSON(meta);
  for (const k of ["uuid", "name", "metadata", "userData", "color"])
    delete json[k];
  return JSON.stringify([
    json,
    material.customProgramCacheKey(),
    source.castShadow,
    source.receiveShadow,
    source.renderOrder,
  ]);
}
function safeMatrix(matrix) {
  if (matrix.determinant() <= 0) return false;
  const e = matrix.elements;
  const size = Math.max(
    dotColumn(e, 0, 0),
    dotColumn(e, 4, 4),
    dotColumn(e, 8, 8),
  );
  return (
    Math.max(
      Math.abs(dotColumn(e, 0, 4)),
      Math.abs(dotColumn(e, 0, 8)),
      Math.abs(dotColumn(e, 4, 8)),
    ) <=
    size * 1e-7
  );
}
function unchanged(e) {
  const m = e.source.material,
    b = e.batch.material;
  for (const [name, attr, version] of e.attributes)
    if (e.geometry.attributes[name] !== attr || attr.version !== version)
      return false;
  return (
    e.source.onBeforeRender === e.beforeRender &&
    e.source.onBeforeShadow === e.beforeShadow &&
    e.source.castShadow === e.batch.castShadow &&
    e.source.receiveShadow === e.batch.receiveShadow &&
    e.source.renderOrder === e.batch.renderOrder &&
    m.onBeforeCompile === e.compile &&
    m.customProgramCacheKey === e.shaderKey &&
    m.transparent === b.transparent &&
    m.opacity === b.opacity &&
    m.visible === b.visible &&
    m.depthWrite === b.depthWrite &&
    m.depthTest === b.depthTest &&
    m.colorWrite === b.colorWrite &&
    m.side === b.side &&
    m.roughness === b.roughness &&
    m.metalness === b.metalness &&
    m.sheen === b.sheen &&
    m.sheenRoughness === b.sheenRoughness &&
    (!m.sheenColor || m.sheenColor.equals(b.sheenColor)) &&
    m.clearcoat === b.clearcoat &&
    m.clearcoatRoughness === b.clearcoatRoughness &&
    m.emissiveIntensity === b.emissiveIntensity &&
    (!m.emissive || m.emissive.equals(b.emissive)) &&
    e.geometry.index.version === e.indexVersion
  );
}
export function createColonyRenderBatch(
  scene,
  renderer,
  camera,
  atlas,
  { minimumCats = 8 } = {},
) {
  const supported = renderer.extensions.has("WEBGL_multi_draw");
  let entries = [],
    batches = [],
    requested = [],
    generation = 0,
    disposed = false,
    active = false;
  const stats = { sources: 0, batches: 0, ready: false, active: false };
  const before = scene.onBeforeRender;
  const pruned = [],
    nativeRender = renderer.render,
    after = scene.onAfterRender;
  function restoreTrees() {
    for (const cat of pruned) {
      cat.children = cat.userData.renderBatches.fullRenderChildren;
      cat.userData.renderBatches.fullRenderChildren = null;
    }
    pruned.length = 0;
  }
  function prune(cat) {
    const b = cat.userData.renderBatches;
    const children = b.renderChildren();
    if (children && children.length < cat.children.length) {
      b.fullRenderChildren = cat.children;
      cat.children = children;
      pruned.push(cat);
    }
  }
  function draw(...args) {
    try {
      return nativeRender.apply(renderer, args);
    } finally {
      restoreTrees();
    }
  }
  if (typeof nativeRender === "function") renderer.render = draw;
  function afterRender(...args) {
    restoreTrees();
    after.apply(scene, args);
  }
  scene.onAfterRender = afterRender;
  function restore(list) {
    for (const e of list) e.source.layers.mask = e.layers;
  }
  function discard(list) {
    for (const b of list) {
      b.removeFromParent();
      b.dispose();
      b.material.dispose();
      b.customDepthMaterial.dispose();
    }
  }
  function update(...args) {
    before.apply(scene, args); // Original matrices and all current poses are ready.
    const enabled =
      atlas.enabled &&
      atlas.stats.updatedCats >= Math.max(1, minimumCats - (active ? 1 : 0)) &&
      renderer.extensions.has("WEBGL_multi_draw");
    stats.active = enabled;
    if (!enabled) {
      if (active) {
        restore(entries);
        for (const b of batches) b.visible = false;
        active = false;
      }
      if (atlas.sharing && typeof nativeRender === "function")
        atlas.forEachCat(prune);
      return;
    }
    active = true;
    for (const b of batches) b.visible = false;
    for (const e of entries) {
      const compatible =
        enabled &&
        e.source.geometry === e.geometry &&
        e.source.material === e.material &&
        e.cat.userData.renderBatches.enabled &&
        unchanged(e) &&
        safeMatrix(e.source.matrixWorld) &&
        e.source.matrix.equals(identity);
      e.source.layers.mask = compatible
        ? (e.layers & ~1) | (1 << DRAW_SOURCE_LAYER)
        : e.layers;
      const shown = compatible && atlas.relevant(e.cat) && e.source.visible;
      e.batch.setVisibleAt(e.id, shown);
      if (shown) {
        e.source.userData.releaseDrawBuffers?.();
        e.batch.visible = true;
        if (!e.matrix.equals(e.source.matrixWorld)) {
          e.matrix.copy(e.source.matrixWorld);
          e.batch.setMatrixAt(e.id, e.matrix);
        }
        if (!e.tint.equals(e.source.material.color)) {
          e.tint.copy(e.source.material.color);
          e.batch.setColorAt(e.id, e.tint);
        }
        // BatchedMesh's built-in per-camera culling uses the CURRENT articulated
        // bounds, for both colour and shadow cameras, rather than the rest pose.
        e.batch._geometryInfo[e.geometryId].boundingSphere.copy(
          e.source.boundingSphere,
        );
        e.batch._geometryInfo[e.geometryId].boundingSphere.radius += 0.002;
      }
    }
    // Matrix evaluation already ran on the complete approved rig. Neither
    // colour nor shadow traversal needs its CPU-only picking/bone branches.
    // Restore the same child arrays before callbacks/picking and on exceptions.
    if (typeof nativeRender === "function") atlas.forEachCat(prune);
  }
  scene.onBeforeRender = update;
  async function build(sources, revision) {
    const next = [],
      records = [];
    function* steps() {
      const groups = new Map();
      for (const record of sources) {
        const k = family(record.source);
        if (k !== null) {
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(record);
        }
        yield;
      }
      for (const group of groups.values()) {
        if (disposed || revision !== generation) return;
        if (group.length < 3) continue;
        const source = group[0].source,
          base = source.userData.rigMaterialSource,
          palette = {
            entries: [],
            textureMode: true,
            slot: { offset: { value: 0 } },
          },
          material = base.clone();
        material.onBeforeCompile = base.onBeforeCompile;
        material.customProgramCacheKey = base.customProgramCacheKey;
        material.color.set(0xffffff);
        material.vertexColors = true;
        rigShader(material, palette, atlas);
        const vertices = group.reduce(
            (n, e) => n + e.source.geometry.attributes.position.count,
            0,
          ),
          indices = group.reduce(
            (n, e) => n + e.source.geometry.index.count,
            0,
          ),
          batch = new THREE.BatchedMesh(
            group.length,
            vertices,
            indices,
            material,
          );
        batch.name = "Exact colony cats · shared animated material";
        batch.visible = false;
        batch.frustumCulled = false;
        batch.sortObjects = false;
        batch.castShadow = source.castShadow;
        batch.receiveShadow = source.receiveShadow;
        batch.renderOrder = source.renderOrder;
        batch.raycast = () => {};
        batch.customDepthMaterial = rigShader(
          new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            side: material.side,
          }),
          palette,
          atlas,
        );
        next.push(batch);
        for (const record of group) {
          if (disposed || revision !== generation) return;
          const { cat, source, palette } = record,
            g = source.geometry.clone(),
            joints = g.attributes.aRigJoints,
            globalJoints = new Uint16Array(joints.count * 4),
            offset = palette.slot.offset.value / 8;
          for (let i = 0; i < globalJoints.length; i++)
            globalJoints[i] = joints.array[i] + offset;
          g.setAttribute(
            "aRigJoints",
            new THREE.Uint16BufferAttribute(globalJoints, 4),
          );
          g.setAttribute(
            "aRigView",
            new THREE.Uint16BufferAttribute(
              new Uint16Array(joints.count).fill(
                cat.userData.renderBatches.viewId,
              ),
              1,
            ),
          );
          g.boundingSphere = source.boundingSphere.clone();
          const geometryId = batch.addGeometry(g),
            id = batch.addInstance(geometryId);
          // BatchedMesh allocates ordinary BufferAttributes; retain the source
          // half-float decoding as well as its exact storage bytes.
          for (const [name, attribute] of Object.entries(g.attributes))
            if (
              attribute.isFloat16BufferAttribute &&
              !batch.geometry.attributes[name].isFloat16BufferAttribute
            ) {
              const packed = batch.geometry.attributes[name],
                half = new THREE.Float16BufferAttribute(
                  [],
                  attribute.itemSize,
                  attribute.normalized,
                );
              half.array = packed.array;
              half.count = packed.count;
              batch.geometry.setAttribute(name, half);
            }
          batch.setColorAt(id, source.material.color);
          batch.setMatrixAt(id, source.matrixWorld);
          batch.setVisibleAt(id, false);
          const entry = {
            cat,
            source,
            geometry: source.geometry,
            material: source.material,
            layers: record.layers,
            matrix: source.matrixWorld.clone(),
            tint: source.material.color.clone(),
            batch,
            id,
            geometryId,
            beforeRender: source.onBeforeRender,
            beforeShadow: source.onBeforeShadow,
            compile: source.material.onBeforeCompile,
            shaderKey: source.material.customProgramCacheKey,
            indexVersion: source.geometry.index.version,
            attributes: Object.entries(source.geometry.attributes).map(
              ([name, a]) => [name, a, a.version],
            ),
          };
          records.push(entry);
          g.dispose();
          yield;
        }
        exactCameraMaterial(material, atlas.viewUniform, batch._colorsTexture);
        exactCameraMaterial(
          batch.customDepthMaterial,
          atlas.viewUniform,
          batch._colorsTexture,
        );
        const nativeBefore = batch.onBeforeRender;
        batch.onBeforeRender = function (r, s, camera, ...args) {
          atlas.view(camera, r);
          nativeBefore.call(this, r, s, camera, ...args);
        };
        yield;
      }
    }
    try {
      await prepareSceneSteps(steps(), { budget: 3 });
      for (const batch of next) {
        if (disposed || revision !== generation) break;
        await renderer.compileAsync(batch, camera, scene);
      }
      if (disposed || revision !== generation) {
        discard(next);
        return;
      }
      restore(entries);
      discard(batches);
      entries = records;
      batches = next;
      for (const batch of batches) scene.add(batch);
      stats.sources = entries.length;
      stats.batches = batches.length;
      stats.ready = true;
    } catch (error) {
      discard(next);
      console.warn("Shared cat rendering kept native draws", error);
    }
  }
  return {
    stats,
    sync() {
      if (!supported || disposed) return;
      const sources = [];
      const nativeLayers = new Map(entries.map((e) => [e.source, e.layers]));
      atlas.forEachCat((cat) => {
        // Visibility changes during play; attachment and roster are structural.
        let attached = false;
        for (let p = cat; p; p = p.parent)
          if (p === scene) {
            attached = true;
            break;
          }
        if (!attached) return;
        const b = cat.userData.renderBatches;
        for (let i = 0; i < b.batches.length; i++)
          if (b.palettes[i].slot && b.viewId != null)
            sources.push({
              cat,
              source: b.batches[i],
              palette: b.palettes[i],
              layers:
                nativeLayers.get(b.batches[i]) ?? b.batches[i].layers.mask,
            });
      });
      if (
        sources.length === requested.length &&
        sources.every((e, i) => e.source === requested[i].source)
      )
        return;
      requested = sources;
      stats.ready = false;
      void build(sources, ++generation);
    },
    dispose() {
      disposed = true;
      generation++;
      restoreTrees();
      if (renderer.render === draw) renderer.render = nativeRender;
      if (scene.onAfterRender === afterRender) scene.onAfterRender = after;
      restore(entries);
      discard(batches);
      entries = [];
      batches = [];
      if (scene.onBeforeRender === update) scene.onBeforeRender = before;
    },
  };
}
