import * as THREE from "three";
import { deferHiddenLeafMatrices } from "./scene-visibility.js";
import { isGeometryBufferRetirement, retainGeometryForGrace } from "./geometry-residency.js";

// The approved rig remains the source of animation, camera anchors and picking.
// Only its draw submission changes. No remodelling, LOD or triangle removal.
export const CAT_PICK_LAYER = 31;
export function rigShader(material, palette, atlas) {
  const before = material.onBeforeCompile,
    key = material.customProgramCacheKey(),
    n = palette.entries.length;
  material.onBeforeCompile = function (shader, ...args) {
    before.call(this, shader, ...args);
    const stored = palette.textureMode && palette.slot && atlas.enabled;
    // Three reuses a material's uniform object when returning to an already
    // compiled program. Keep both bindings present across diagnostic/fallback
    // switches; inactive uniforms are excluded by the linked program itself.
    if (palette.slot)
      Object.assign(shader.uniforms, {
        uRigTexture: atlas.uniform,
        uRigOffset: palette.slot.offset,
      });
    if (palette.positions)
      Object.assign(shader.uniforms, {
        uRigMatrix: palette.positions,
        uRigNormal: palette.normals,
        uRigShown: palette.shown,
      });
    shader.vertexShader =
      `
      attribute vec4 aRigJoints;
      attribute vec4 aRigWeights;
      ${
        stored
          ? `
      uniform highp sampler2D uRigTexture;
      uniform int uRigOffset;
      vec4 rigTexel(int entry,int column){
        int at=uRigOffset+entry*8+column;
        return texelFetch(uRigTexture,ivec2(at%512,at/512),0);
      }
      mat4 rigMatrix(int entry){return mat4(rigTexel(entry,0),rigTexel(entry,1),rigTexel(entry,2),rigTexel(entry,3));}
      mat3 rigNormalMatrix(int entry){return mat3(rigTexel(entry,4).xyz,rigTexel(entry,5).xyz,rigTexel(entry,6).xyz);}
      float rigShown(int entry){return rigTexel(entry,7).x;}
      `
          : `uniform mat4 uRigMatrix[${n}];
      uniform mat3 uRigNormal[${n}];
      uniform float uRigShown[${n}];
      mat4 rigMatrix(int entry){return uRigMatrix[entry];}
      mat3 rigNormalMatrix(int entry){return uRigNormal[entry];}
      float rigShown(int entry){return uRigShown[entry];}
      `
      }
      vec3 rigPosition(vec3 p){
        int a=int(aRigJoints.x);
        if(rigShown(a)<.5)return vec3(0.);
        vec4 r=(rigMatrix(a)*vec4(p,1.))*aRigWeights.x;
        if(aRigWeights.y>0.)r+=(rigMatrix(int(aRigJoints.y))*vec4(p,1.))*aRigWeights.y;
        if(aRigWeights.z>0.)r+=(rigMatrix(int(aRigJoints.z))*vec4(p,1.))*aRigWeights.z;
        if(aRigWeights.w>0.)r+=(rigMatrix(int(aRigJoints.w))*vec4(p,1.))*aRigWeights.w;
        return r.xyz;
      }
      vec3 rigNormal(vec3 p){
        vec3 r=(rigNormalMatrix(int(aRigJoints.x))*p)*aRigWeights.x;
        if(aRigWeights.y>0.)r+=(rigNormalMatrix(int(aRigJoints.y))*p)*aRigWeights.y;
        if(aRigWeights.z>0.)r+=(rigNormalMatrix(int(aRigJoints.z))*p)*aRigWeights.z;
        if(aRigWeights.w>0.)r+=(rigNormalMatrix(int(aRigJoints.w))*p)*aRigWeights.w;
        return r;
      }
    ` +
      shader.vertexShader
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed=rigPosition(transformed);",
        )
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nobjectNormal=rigNormal(objectNormal);",
        );
  };
  material.customProgramCacheKey = () =>
    key +
    (palette.textureMode && palette.slot && atlas.enabled
      ? "-exact-rig-texture-v1"
      : "-exact-rig-palette-v2-" + n);
  atlas?.material(material);
  return material;
}

export function enableCatRenderBatch(cat, atlas = null) {
  if (
    !cat?.userData.referenceFamily ||
    cat.userData.reference ||
    cat.userData.renderBatches
  )
    return;
  cat.updateWorldMatrix(true, true);
  const groups = new Map(),
    sources = [];
  cat.traverse((o) => {
    if (
      !o.isMesh ||
      (!o.visible && o.name !== "Tongue") ||
      Array.isArray(o.material) ||
      o.material.transparent
    )
      return;
    const key = o.material.uuid + ":" + o.castShadow + ":" + o.receiveShadow;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
    sources.push(o);
  });
  const inverse = new THREE.Matrix4(),
    relative = new THREE.Matrix4(),
    skin = new THREE.Matrix4(),
    position = new THREE.Matrix4(),
    relativeNormal = new THREE.Matrix3(),
    normal = new THREE.Matrix3();
  const batches = [],
    palettes = [];
  let frame = -1,
    lastRenderer;
  function update(renderer, force = false) {
    if (
      !force &&
      lastRenderer === renderer &&
      frame === renderer.info.render.frame
    )
      return;
    lastRenderer = renderer;
    frame = renderer?.info.render.frame;
    inverse.copy(cat.matrixWorld).invert();
    for (const p of palettes) {
      let lastSource;
      for (let i = 0; i < p.entries.length; i++) {
        const { source, bone } = p.entries[i];
        if (source !== lastSource) {
          relative.multiplyMatrices(inverse, source.matrixWorld);
          relativeNormal.getNormalMatrix(relative);
          lastSource = source;
        }
        if (bone !== null) {
          skin.multiplyMatrices(
            source.skeleton.bones[bone].matrixWorld,
            source.skeleton.boneInverses[bone],
          );
          skin
            .premultiply(source.bindMatrixInverse)
            .multiply(source.bindMatrix);
          position.multiplyMatrices(relative, skin);
          normal.setFromMatrix4(skin).premultiply(relativeNormal);
        } else {
          position.copy(relative);
          normal.copy(relativeNormal);
        }
        position.toArray(p.positions.value, i * 16);
        normal.toArray(p.normals.value, i * 9);
        let shown = true;
        for (let o = source; o && o !== cat; o = o.parent)
          if (!o.visible) {
            shown = false;
            break;
          }
        p.shown.value[i] = shown ? 1 : 0;
      }
      if (atlas?.sharing) p.slot?.write(p);
    }
  }
  for (const parts of groups.values()) {
    // Separate materials keep sheen, iris clearcoat, coat fibres and shadows.
    const entries = [],
      slots = new Map();
    for (const source of parts) {
      const base = entries.length;
      if (source.isSkinnedMesh)
        for (let i = 0; i < source.skeleton.bones.length; i++)
          entries.push({ source, bone: i });
      else entries.push({ source, bone: null });
      slots.set(source, base);
    }
    const palette = {
      entries,
      positions: { value: new Float32Array(entries.length * 16) },
      normals: { value: new Float32Array(entries.length * 9) },
      shown: { value: new Float32Array(entries.length) },
      slot: atlas?.allocate(entries.length),
    };
    palettes.push(palette);
    const count = parts.reduce(
        (n, p) => n + p.geometry.attributes.position.count,
        0,
      ),
      indexCount = parts.reduce(
        (n, p) =>
          n + (p.geometry.index?.count || p.geometry.attributes.position.count),
        0,
      ),
      positions = new Uint16Array(count * 3),
      normals = new Int16Array(count * 3),
      colors = new Uint16Array(count * 3),
      joints = new Uint8Array(count * 4),
      weights = new Uint8Array(count * 4),
      indices = new Uint32Array(indexCount);
    let offset = 0,
      indexOffset = 0;
    for (const source of parts) {
      const g = source.geometry,
        base = slots.get(source),
        pos = g.attributes.position,
        norm = g.attributes.normal,
        color = g.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        for (let k = 0; k < 3; k++) {
          positions[(offset + i) * 3 + k] = pos.isFloat16BufferAttribute
            ? pos.array[i * 3 + k]
            : THREE.DataUtils.toHalfFloat(pos[["getX", "getY", "getZ"][k]](i));
          normals[(offset + i) * 3 + k] = Math.round(
            THREE.MathUtils.clamp(norm.getComponent(i, k), -1, 1) * 32767,
          );
          colors[(offset + i) * 3 + k] = color?.isFloat16BufferAttribute
            ? color.array[i * 3 + k]
            : THREE.DataUtils.toHalfFloat(
                color ? color[["getX", "getY", "getZ"][k]](i) : 1,
              );
        }
        for (let k = 0; k < 4; k++) {
          joints[(offset + i) * 4 + k] =
            base +
            (source.isSkinnedMesh
              ? g.attributes.skinIndex.getComponent(i, k)
              : 0);
          weights[(offset + i) * 4 + k] = source.isSkinnedMesh
            ? Math.round(g.attributes.skinWeight.getComponent(i, k) * 255)
            : k === 0
              ? 255
              : 0;
        }
      }
      const mirrored =
        source.matrixWorld.determinant() * cat.matrixWorld.determinant() < 0;
      for (let i = 0, n = g.index?.count || pos.count; i < n; i++) {
        const at = mirrored
          ? i % 3 === 1
            ? i + 1
            : i % 3 === 2
              ? i - 1
              : i
          : i;
        indices[indexOffset++] = offset + (g.index ? g.index.getX(at) : at);
      }
      offset += pos.count;
    }
    const geometry = retainGeometryForGrace(new THREE.BufferGeometry());
    const positionAttribute = new THREE.Float16BufferAttribute([], 3);
    positionAttribute.array = positions;
    positionAttribute.count = count;
    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(normals, 3, true),
    );
    const colorAttribute = new THREE.Float16BufferAttribute([], 3);
    colorAttribute.array = colors;
    colorAttribute.count = count;
    geometry.setAttribute("color", colorAttribute);
    geometry.setAttribute("aRigJoints", new THREE.BufferAttribute(joints, 4));
    geometry.setAttribute(
      "aRigWeights",
      new THREE.BufferAttribute(weights, 4, true),
    );
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    const material = parts[0].material.clone();
    material.onBeforeCompile = parts[0].material.onBeforeCompile;
    material.customProgramCacheKey = parts[0].material.customProgramCacheKey;
    const mesh = new THREE.Mesh(geometry, rigShader(material, palette, atlas));
    mesh.name = "Exact animated cat batch · " + parts[0].name;
    mesh.castShadow = parts[0].castShadow;
    mesh.receiveShadow = parts[0].receiveShadow;
    mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 1, 0),
      8 * Math.max(1, cat.userData.build.width),
    );
    mesh.raycast = () => {}; // Original articulated surfaces remain the pick targets.
    mesh.customDepthMaterial = rigShader(
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        side: material.side,
      }),
      palette,
      atlas,
    );
    mesh.onBeforeRender = mesh.onBeforeShadow = (renderer) => {
      mesh.userData.nativeBuffersResident = true;
      update(renderer);
    };
    mesh.userData.rigSources = parts;
    mesh.userData.rigMaterialSource = parts[0].material;
    cat.add(mesh);
    batches.push(mesh);
  }
  const bound = new THREE.Sphere();
  let branchSource = [],
    nativeBranches = [];
  const drawBranches = [];
  function renderChildren() {
    if (!cat.userData.renderBatches.enabled) return null;
    if (
      cat.children.length !== branchSource.length ||
      cat.children.some((child, i) => child !== branchSource[i])
    ) {
      branchSource = cat.children.slice();
      nativeBranches = [];
      for (const child of branchSource) {
        if (batches.includes(child)) continue;
        const candidates = [];
        child.traverse((o) => {
          if (
            (o.isMesh || o.isPoints || o.isLine || o.isLight) &&
            o.layers.isEnabled(0)
          )
            candidates.push(o);
        });
        if (candidates.length) nativeBranches.push({ child, candidates });
      }
    }
    drawBranches.length = 0;
    for (const { child, candidates } of nativeBranches) {
      let visible = false;
      for (const candidate of candidates) {
        let shown = true;
        for (let p = candidate; p && p !== cat; p = p.parent)
          if (!p.visible) {
            shown = false;
            break;
          }
        if (shown) {
          visible = true;
          break;
        }
      }
      if (visible) drawBranches.push(child);
    }
    for (const mesh of batches)
      if (mesh.visible && mesh.layers.isEnabled(0)) drawBranches.push(mesh);
    return drawBranches;
  }
  function updateBounds() {
    inverse.copy(cat.matrixWorld).invert();
    for (const mesh of batches) {
      mesh.boundingSphere.makeEmpty();
      for (const source of mesh.userData.rigSources) {
        let shown = true;
        for (let o = source; o && o !== cat; o = o.parent)
          if (!o.visible) {
            shown = false;
            break;
          }
        if (!shown) continue;
        const owner = source.isSkinnedMesh ? source : source.geometry;
        if (!owner.boundingSphere) owner.computeBoundingSphere();
        relative.multiplyMatrices(inverse, source.matrixWorld);
        bound.copy(owner.boundingSphere).applyMatrix4(relative);
        mesh.boundingSphere.union(bound);
      }
      mesh.visible =
        cat.userData.renderBatches?.enabled !== false &&
        !mesh.boundingSphere.isEmpty();
    }
  }
  const updateWorld = cat.updateMatrixWorld;
  cat.updateMatrixWorld = function (force) {
    updateWorld.call(this, force);
    updateBounds();
  };
  // Exclude original draw submissions without changing visibility, materials,
  // poses, camera anchors or the original CPU raycast surfaces.
  for (const source of sources) source.layers.set(CAT_PICK_LAYER);
  cat.userData.renderBatches = {
    enabled: true,
    batches,
    palettes,
    sources,
    atlas,
    renderChildren,
    fullRenderChildren: null,
    update: () => update(null, true),
    setEnabled(value) {
      this.enabled = !!value;
      for (const source of sources)
        source.layers.set(value ? CAT_PICK_LAYER : 0);
      updateBounds();
    },
  };
  cat.updateWorldMatrix(true, true);
  updateBounds();
  update(null, true);
  cat.userData.renderBatches.matrixDeferral = deferHiddenLeafMatrices(cat);
  if (atlas) {
    cat.userData.renderBatches.viewId = atlas.register(cat, (renderer) => {
      update(renderer, true);
      frame = renderer.info.render.frame + 1;
    });
    let remaining = batches.length;
    for (let i = 0; i < batches.length; i++) {
      const mesh = batches[i];
      let releasingDrawBuffers = false,
        released = false;
      // Retain the exact CPU geometry for fallback/picking diagnostics without
      // keeping an unused second copy of every live cat in GPU memory.
      mesh.userData.releaseDrawBuffers = () => {
        if (!mesh.userData.nativeBuffersResident) return;
        releasingDrawBuffers = true;
        try {
          mesh.geometry.dispose();
          mesh.userData.nativeBuffersResident = false;
        } finally {
          releasingDrawBuffers = false;
        }
      };
      mesh.geometry.addEventListener("dispose", () => {
        if (isGeometryBufferRetirement(mesh.geometry)) {
          mesh.userData.nativeBuffersResident = false;
          return;
        }
        if (releasingDrawBuffers || released) return;
        released = true;
        palettes[i].slot?.release();
        if (--remaining === 0) atlas.unregister(cat);
      });
    }
  }
}

export function batchSceneCats(root, atlas = null) {
  const cats = [];
  root.traverse((o) => {
    if (o.userData.referenceFamily) cats.push(o);
  });
  for (const cat of cats) enableCatRenderBatch(cat, atlas);
}
