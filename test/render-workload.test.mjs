import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { optimizeGeometryCache } from "../public/geometry-cache.js";
import { attractionVisibility } from "../public/attraction-visibility.js";
import { courtVenue } from "../public/foodcourt-assets.js";
import { AQUARIUM_TANKS } from "../public/aquarium-data.js";

function triangles(indices) {
  const result = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices.slice(i, i + 3),
      j = a.indexOf(Math.min(...a));
    result.push([a[j], a[(j + 1) % 3], a[(j + 2) % 3]].join(","));
  }
  return result.sort();
}
test("GPU cache ordering preserves every oriented triangle and every attribute byte, including skin weights", () => {
  const g = new THREE.SphereGeometry(2, 96, 64);
  g.setAttribute(
    "skinWeight",
    new THREE.Uint8BufferAttribute(
      new Uint8Array(g.attributes.position.count * 4).fill(63),
      4,
      true,
    ),
  );
  const original = g.index.array.slice(),
    attributes = Object.values(g.attributes),
    bytes = attributes.map((a) => a.array.slice());
  optimizeGeometryCache(g);
  assert.equal(g.userData.vertexCacheOptimized, true);
  assert.deepEqual(triangles(g.index.array), triangles(original));
  Object.values(g.attributes).forEach((a, i) => {
    assert.equal(a, attributes[i]);
    assert.deepEqual(a.array, bytes[i]);
  });
  const index = g.index;
  optimizeGeometryCache(g);
  assert.equal(g.index, index, "never redo work on a reused mesh");
});

test("fish culling never rejects a visible articulated vertex and restores every fish when the hall returns", () => {
  const point = new THREE.Vector3(),
    local = new THREE.Matrix4(),
    world = new THREE.Matrix4();
  let culled = 0;
  for (const o of AQUARIUM_TANKS) {
    const tank = courtVenue(o),
      mesh = tank.userData.shoal.children[0],
      pal = tank.userData.shoal.userData.palette,
      camera = new THREE.PerspectiveCamera(40, 390 / 700, 0.5, 1200),
      geometry = mesh.geometry;
    tank.position.set(-335, 0.2, 95);
    tank.rotation.y = 0.32;
    tank.updateMatrixWorld(true);
    const arrays = Object.values(geometry.attributes).map((a) => [
      a.array,
      a.version,
    ]);
    for (const time of [0, 8.25, 31.5]) {
      tank.userData.update(time, false);
      for (const eye of [
        [0, 6, 13],
        [23, 5, 2],
        [0, 30, 0],
      ]) {
        camera.position.set(eye[0] - 335, eye[1], eye[2] + 95);
        camera.lookAt(-335, 4, 95);
        camera.updateMatrixWorld();
        mesh.userData.cullFish(camera);
        const ids = new Set(pal.visibleIds.value.slice(0, mesh.count));
        assert.equal(ids.size, mesh.count);
        for (let i = 0; i < o.fish; i++)
          if (!ids.has(i)) {
            culled++;
            const transforms = ["body", "tail", "leftFin", "rightFin"].map(
              (part) => {
                pal.matrixAt(i, part, local);
                return new THREE.Matrix4().multiplyMatrices(
                  mesh.matrixWorld,
                  local,
                );
              },
            );
            for (let v = 0; v < geometry.attributes.position.count; v++) {
              world.copy(transforms[geometry.attributes.aFishPart.getX(v)]);
              point
                .fromBufferAttribute(geometry.attributes.position, v)
                .applyMatrix4(world)
                .project(camera);
              assert.ok(
                Math.abs(point.x) > 1 ||
                  Math.abs(point.y) > 1 ||
                  Math.abs(point.z) > 1,
                "no visible surface may disappear",
              );
            }
          }
      }
    }
    mesh.userData.cullFish(camera, true);
    assert.equal(mesh.count, o.fish);
    assert.deepEqual(
      [...pal.visibleIds.value],
      Array.from({ length: o.fish }, (_, i) => i),
    );
    Object.values(geometry.attributes).forEach((a, i) => {
      assert.equal(a.array, arrays[i][0]);
      assert.equal(a.version, arrays[i][1]);
    });
  }
  assert.ok(culled > 40, "close camera skips substantial unseen fish work");
});

test("whole-attraction culling includes elevated ride paths, shadows and moved plots while hidden rigs sleep", () => {
  const root = new THREE.Group(),
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(12, 5, 8),
      new THREE.MeshStandardMaterial(),
    );
  root.add(mesh);
  root.userData.duration = 30;
  root.userData.rideFrame = (t) => ({
    position: [Math.sin(t) * 8, 42 * Math.sin((t / 30) * Math.PI), 0],
  });
  const visible = attractionVisibility(root),
    camera = new THREE.PerspectiveCamera(40, 390 / 700, 0.5, 1200),
    frustum = new THREE.Frustum();
  function aim(x, y, z, tx = 0, ty = 0, tz = 0) {
    camera.position.set(x, y, z);
    camera.lookAt(tx, ty, tz);
    camera.updateMatrixWorld();
    return frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
  }
  assert.equal(
    visible(aim(0, 42, 20, 0, 42, 0)),
    true,
    "high jump remains visible",
  );
  assert.equal(visible(aim(500, 5, 20, 500, 5, 0)), false);
  const shadow = new THREE.Frustum().copy(aim(0, 8, 35));
  assert.equal(
    visible(aim(500, 5, 20, 500, 5, 0), shadow),
    true,
    "off-camera casters retain shadows",
  );
  root.visible = false;
  root.position.x = 500;
  assert.equal(
    visible(aim(500, 5, 20, 500, 5, 0)),
    true,
    "moving a hidden item refreshes its bounds",
  );
  root.visible = true;
  root.updateMatrixWorld();
  assert.equal(mesh.getWorldPosition(new THREE.Vector3()).x, 500);
});
