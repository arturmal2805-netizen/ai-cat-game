import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  staticSubmissionSteps,
  configureStaticSubmissions,
} from "../public/static-submissions.js";
import { runSceneSteps } from "../public/scene-tasks.js";

function triangles(g) {
  const result = [];
  for (let i = 0; i < g.index.count; i += 3)
    result.push(Array.from(g.index.array.slice(i, i + 3)).join(","));
  return result.sort();
}
function field() {
  const pieces = [];
  for (let z = -3; z <= 3; z++)
    for (let x = -3; x <= 3; x++) {
      const g = new T.SphereGeometry(0.8, 16, 12);
      g.translate(x * 7, 1, z * 7);
      pieces.push(g);
    }
  return new T.Mesh(mergeGeometries(pieces), new T.MeshStandardMaterial());
}
test("spatial submission retains every oriented triangle and attribute, and all removed ranges are outside the actual transformed view", () => {
  const mesh = field(),
    original = triangles(mesh.geometry),
    index = mesh.geometry.index,
    attributes = Object.values(mesh.geometry.attributes),
    bytes = attributes.map((a) => a.array.slice());
  mesh.position.set(-45, 7, 22);
  mesh.rotation.y = 0.43;
  mesh.scale.set(1.2, 0.7, 1.5);
  mesh.updateMatrixWorld(true);
  runSceneSteps(staticSubmissionSteps(mesh, { force: true }));
  const c = mesh.userData.staticSubmission;
  assert.ok(c.chunks.length > 16);
  assert.equal(
    mesh.geometry.index,
    index,
    "keep the original index buffer and order",
  );
  assert.deepEqual(triangles(mesh.geometry), original);
  Object.values(mesh.geometry.attributes).forEach((a, i) => {
    assert.equal(a, attributes[i]);
    assert.deepEqual(a.array, bytes[i]);
  });
  const cameras = [
    new T.PerspectiveCamera(40, 390 / 700, 0.5, 1200),
    new T.OrthographicCamera(-12, 12, 12, -12, 0.1, 200),
  ];
  const p = new T.Vector3(),
    projection = new T.Matrix4(),
    frustum = new T.Frustum();
  let removed = 0;
  for (const camera of cameras)
    for (const [eye, target] of [
      [
        [0, 8, 15],
        [0, 1, 0],
      ],
      [
        [20, 6, 4],
        [0, 1, 0],
      ],
      [
        [0, 50, 0],
        [0, 0, 0],
      ],
      [
        [100, 8, 15],
        [100, 1, 0],
      ],
    ]) {
      camera.position.copy(mesh.localToWorld(new T.Vector3(...eye)));
      camera.lookAt(mesh.localToWorld(new T.Vector3(...target)));
      camera.updateMatrixWorld(true);
      c.cull(camera);
      projection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(projection);
      const selected = new Set();
      for (let n = 0; n < mesh._multiDrawCount; n++)
        for (
          let i =
            mesh._multiDrawStarts[n] /
            mesh.geometry.index.array.BYTES_PER_ELEMENT;
          i <
          mesh._multiDrawStarts[n] /
            mesh.geometry.index.array.BYTES_PER_ELEMENT +
            mesh._multiDrawCounts[n];
          i++
        )
          selected.add(i);
      for (const chunk of c.chunks) {
        for (let i = chunk.start; i < chunk.start + chunk.count; i++) {
          p.fromBufferAttribute(
            mesh.geometry.attributes.position,
            mesh.geometry.index.array[i],
          );
          assert.ok(chunk.box.containsPoint(p));
          if (!selected.has(i)) {
            removed++;
            p.applyMatrix4(mesh.matrixWorld);
            assert.equal(
              frustum.containsPoint(p),
              false,
              "never omit a visible indexed vertex",
            );
          }
        }
      }
      c.cull(camera, true);
      assert.equal(c.stats.submittedIndices, mesh.geometry.index.count);
      assert.equal(mesh._multiDrawCount, 1);
    }
  assert.ok(removed > 10000);
});
test("unsupported renderers and animated or displaced meshes keep their original renderer and buffers", () => {
  configureStaticSubmissions({ extensions: { has: () => false } });
  for (const kind of ["unsupported", "displaced", "custom-vertex"]) {
    const m = field(),
      index = m.geometry.index;
    if (kind === "displaced") m.material.displacementMap = new T.Texture();
    if (kind === "custom-vertex") m.material.onBeforeCompile = () => {};
    runSceneSteps(staticSubmissionSteps(m, { force: kind !== "unsupported" }));
    assert.equal(m.geometry.index, index);
    assert.equal(m.isBatchedMesh, undefined);
    assert.equal(m.customDepthMaterial, undefined);
  }
});
test("transparent glass keeps its exact triangle order and material", () => {
  const mesh = field(),
    material = mesh.material,
    index = mesh.geometry.index;
  material.transparent = true;
  material.opacity = 0.28;
  material.depthWrite = false;
  material.side = T.DoubleSide;
  runSceneSteps(staticSubmissionSteps(mesh, { force: true }));
  assert.ok(mesh.userData.staticSubmission);
  assert.equal(mesh.material, material);
  assert.equal(mesh.geometry.index, index);
});

test("wind and underwater shaders installed after merging retain native rendering, including the first shadow pass", () => {
  for (const firstPass of ["colour", "shadow"])
    for (const mutation of ["shader", "material", "geometry"]) {
      const mesh = field();
      runSceneSteps(staticSubmissionSteps(mesh, { force: true }));
      const helper = mesh.userData.staticSubmission,
        depth = mesh.customDepthMaterial;
      let disposed = 0;
      depth.addEventListener("dispose", () => disposed++);
      if (mutation === "shader") {
        mesh.material.onBeforeCompile = (shader) => {
          shader.vertexShader = "// animated reef\n" + shader.vertexShader;
        };
        mesh.material.customProgramCacheKey = () => "reef-current-v1";
      } else if (mutation === "material") mesh.material = mesh.material.clone();
      else mesh.geometry = mesh.geometry.clone();
      assert.equal(
        mesh.isBatchedMesh,
        false,
        "shader precompilation must see native mode before the first render hook",
      );
      const renderer = { extensions: { has: () => true } };
      if (firstPass === "colour") mesh.onBeforeRender(renderer, {}, {});
      else mesh.onBeforeShadow(renderer, mesh, {}, {});
      assert.equal(mesh.isBatchedMesh, false);
      assert.equal(mesh.customDepthMaterial, undefined);
      assert.equal(disposed, 1);
      helper.setEnabled(true);
      assert.equal(
        mesh.isBatchedMesh,
        false,
        "QA toggles cannot bypass safety",
      );
      mesh.onBeforeRender(renderer, {}, {});
      assert.equal(disposed, 1);
    }
});

test("guest raft clones retain shared original buffers without serializing source command bounds or callbacks", () => {
  const mesh = field();
  mesh.userData.guestRaft = true;
  runSceneSteps(staticSubmissionSteps(mesh, { force: true }));
  const clone = mesh.clone();
  assert.equal(clone.geometry, mesh.geometry);
  assert.equal(clone.material, mesh.material);
  assert.deepEqual(clone.userData, { guestRaft: true });
  assert.equal(clone.isBatchedMesh, undefined);
  assert.ok(mesh.userData.staticSubmission.chunks.length > 16);
});

test("a runtime native fallback cannot revive disposed shadow resources when the renderer changes", () => {
  const mesh = field();
  runSceneSteps(staticSubmissionSteps(mesh, { force: true }));
  mesh.onBeforeRender({ extensions: { has: () => false } }, {}, {});
  assert.equal(mesh.isBatchedMesh, false);
  assert.equal(mesh.customDepthMaterial, undefined);
  mesh.userData.staticSubmission.setEnabled(true);
  mesh.onBeforeRender({ extensions: { has: () => true } }, {}, {});
  assert.equal(mesh.isBatchedMesh, false);
});
