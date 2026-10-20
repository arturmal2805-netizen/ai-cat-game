import * as THREE from "three";

let available = false;
const prepared = new WeakMap(),
  patched = new WeakSet();

// WebGL multi-draw is available in Safari 15+ and Chromium. Other renderers
// retain the original single mesh; there is no many-draw fallback.
export function configureStaticSubmissions(renderer) {
  available = renderer.extensions.has("WEBGL_multi_draw");
  return available;
}

function shader(material) {
  if (patched.has(material)) return;
  const before = material.onBeforeCompile,
    key = material.customProgramCacheKey();
  material.onBeforeCompile = function (program, ...args) {
    before.call(this, program, ...args);
    // The positions are already baked into this mesh. Multi-draw selects index
    // ranges only: no batching matrix, ID texture or extra vertex transform.
    program.vertexShader = "#undef USE_BATCHING\n" + program.vertexShader;
  };
  material.customProgramCacheKey = () => key + "-static-ranges-v1";
  material.needsUpdate = true;
  patched.add(material);
}

function eligible(mesh) {
  const m = mesh.material,
    g = mesh.geometry;
  return (
    mesh.isMesh &&
    !mesh.isSkinnedMesh &&
    !mesh.isInstancedMesh &&
    !Array.isArray(m) &&
    (m.isMeshStandardMaterial || m.isMeshBasicMaterial) &&
    !m.wireframe &&
    !m.displacementMap &&
    m.depthTest &&
    !mesh.customDepthMaterial &&
    !g.groups.length &&
    g.index?.count >= 6000 &&
    g.drawRange.start === 0 &&
    g.drawRange.count >= g.index.count &&
    !Object.keys(g.morphAttributes).length &&
    (m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile ||
      patched.has(m))
  );
}

function* partition(geometry) {
  if (prepared.has(geometry)) return prepared.get(geometry);
  const index = geometry.index,
    position = geometry.attributes.position,
    chunks = [],
    groups = [],
    point = new THREE.Vector3();
  // Preserve the original index order and vertex-cache locality as well as
  // every attribute byte. Consecutive ranges share the existing GPU buffers.
  for (let start = 0; start < index.count; start += 384) {
    const count = Math.min(384, index.count - start),
      box = new THREE.Box3();
    for (let i = start; i < start + count; i++)
      box.expandByPoint(point.fromBufferAttribute(position, index.getX(i)));
    chunks.push({ start, count, box: box.expandByScalar(0.001) });
    yield;
  }
  for (let i = 0; i < chunks.length; i += 16) {
    const members = chunks.slice(i, i + 16),
      box = new THREE.Box3();
    for (const c of members) box.union(c.box);
    const group = {
      box,
      start: members[0].start,
      count: members.reduce((n, c) => n + c.count, 0),
      members,
    };
    group.whole = [{ start: group.start, count: group.count }];
    groups.push(group);
    yield;
  }
  const result = { chunks, groups };
  prepared.set(geometry, result);
  return result;
}

// -1: outside, 0: crossing, 1: completely inside. A second level skips whole
// runs without visiting all their small bounds when the camera is far away.
function classify(frustum, box) {
  let inside = true;
  for (const p of frustum.planes) {
    const n = p.normal,
      min = box.min,
      max = box.max;
    if (
      n.x * (n.x >= 0 ? max.x : min.x) +
        n.y * (n.y >= 0 ? max.y : min.y) +
        n.z * (n.z >= 0 ? max.z : min.z) +
        p.constant <
      0
    )
      return -1;
    if (
      n.x * (n.x >= 0 ? min.x : max.x) +
        n.y * (n.y >= 0 ? min.y : max.y) +
        n.z * (n.z >= 0 ? min.z : max.z) +
        p.constant <
      0
    )
      inside = false;
  }
  return inside ? 1 : 0;
}

export function* staticSubmissionSteps(mesh, { force = false } = {}) {
  if (
    (!available && !force) ||
    !eligible(mesh) ||
    mesh.userData.staticSubmission
  )
    return;
  const { chunks, groups } = yield* partition(mesh.geometry);
  const material = mesh.material,
    count = mesh.geometry.index.count,
    bytes = mesh.geometry.index.array.BYTES_PER_ELEMENT,
    starts = new Int32Array(chunks.length),
    counts = new Int32Array(chunks.length),
    projection = new THREE.Matrix4(),
    view = new THREE.Matrix4(),
    frustum = new THREE.Frustum();
  shader(material);
  const staticShader = material.onBeforeCompile,
    staticKey = material.customProgramCacheKey,
    geometry = mesh.geometry;
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: material.map,
    alphaMap: material.alphaMap,
    alphaTest: material.alphaTest,
  });
  shader(depth);
  mesh.customDepthMaterial = depth;
  let enabled = true,
    retired = false;
  // Builders may attach animation before compileAsync. Expose the real mode
  // there too, avoiding a redundant/wrong batched shader on the first visit.
  Object.defineProperty(mesh, "isBatchedMesh", {
    configurable: true,
    get: () => enabled && compatible(),
  });
  mesh._matricesTexture = mesh._indirectTexture = mesh._colorsTexture = null;
  mesh._multiDrawStarts = starts;
  mesh._multiDrawCounts = counts;
  mesh._multiDrawCount = 1;
  starts[0] = 0;
  counts[0] = count;
  const stats = { sourceIndices: count, submittedIndices: count, commands: 1 };
  function compatible() {
    // Some builders add reef sway/refraction or meadow wind AFTER merging.
    // Those vertices no longer obey static bounds, and their replacement
    // shader may require Three's ordinary dispatch. Keep them entirely native.
    return (
      !retired &&
      mesh.material === material &&
      mesh.geometry === geometry &&
      material.onBeforeCompile === staticShader &&
      material.customProgramCacheKey === staticKey
    );
  }
  function fallback() {
    enabled = false;
    retired = true;
    if (mesh.customDepthMaterial === depth) {
      mesh.customDepthMaterial = undefined;
      depth.dispose();
    }
  }
  function cull(camera, all = false) {
    projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    view.multiplyMatrices(projection, mesh.matrixWorld);
    frustum.setFromProjectionMatrix(
      view,
      camera.coordinateSystem,
      camera.reversedDepth,
    );
    let commands = 0,
      submitted = 0;
    if (all) {
      starts[0] = 0;
      counts[0] = count;
      commands = 1;
      submitted = count;
    } else
      for (const group of groups) {
        const visibility = classify(frustum, group.box);
        if (visibility < 0) continue;
        const members = visibility > 0 ? group.whole : group.members;
        for (const chunk of members) {
          if (visibility === 0 && !frustum.intersectsBox(chunk.box)) continue;
          const previous = commands - 1;
          if (
            previous >= 0 &&
            starts[previous] / bytes + counts[previous] === chunk.start
          )
            counts[previous] += chunk.count;
          else {
            starts[commands] = chunk.start * bytes;
            counts[commands++] = chunk.count;
          }
          submitted += chunk.count;
        }
      }
    mesh._multiDrawCount = commands;
    stats.submittedIndices = submitted;
    stats.commands = commands;
  }
  const before = mesh.onBeforeRender,
    shadow = mesh.onBeforeShadow;
  mesh.onBeforeRender = function (renderer, scene, camera, ...args) {
    before.call(this, renderer, scene, camera, ...args);
    if (!compatible() || !renderer.extensions.has("WEBGL_multi_draw"))
      fallback();
    if (this.isBatchedMesh) cull(camera);
  };
  mesh.onBeforeShadow = function (
    renderer,
    object,
    camera,
    shadowCamera,
    ...args
  ) {
    shadow.call(this, renderer, object, camera, shadowCamera, ...args);
    if (!compatible() || !renderer.extensions.has("WEBGL_multi_draw"))
      fallback();
    if (this.isBatchedMesh) cull(shadowCamera);
  };
  // Three clones userData via JSON. Do not serialize thousands of bounds into
  // each guest raft/preview, or copy closures that belong to the source mesh.
  Object.defineProperty(mesh.userData, "staticSubmission", {
    configurable: true,
    value: {
      chunks,
      stats,
      isStatic: () => compatible() && mesh.customDepthMaterial === depth,
      cull,
      setEnabled(value) {
        enabled = !!value;
      },
    },
  });
}
