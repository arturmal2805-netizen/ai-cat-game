import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createChichiCamera } from "../public/chichi-camera.js";
import {
  islandOverviewDistance,
  randomCameraCat,
  attractionCameraView,
} from "../public/camera-views.js";
import { BIOMES } from "../public/game-data.js";
import { surfaceTexture } from "../public/fantasy-scenery.js";

test("front attraction camera fits wide pools and tall slides on every phone orientation", () => {
  for (const aspect of [320 / 740, 390 / 700, 844 / 390, 16 / 9])
    for (const size of [
      [6, 4, 5],
      [54, 52, 48],
      [26, 35, 28],
    ])
      for (const yaw of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        const bounds = new THREE.Box3(
            new THREE.Vector3(-size[0] / 2, 0, -size[2] / 2),
            new THREE.Vector3(size[0] / 2, size[1], size[2] / 2),
          ).translate(new THREE.Vector3(-250, 0, -55)),
          view = attractionCameraView(bounds, 40, aspect, yaw),
          camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 1200);
        camera.position
          .copy(view.target)
          .add(
            new THREE.Vector3(
              Math.sin(view.azimuth) * Math.cos(view.elevation),
              Math.sin(view.elevation),
              Math.cos(view.azimuth) * Math.cos(view.elevation),
            ).multiplyScalar(view.distance),
          );
        camera.lookAt(view.target);
        camera.updateMatrixWorld();
        for (let i = 0; i < 8; i++) {
          const p = new THREE.Vector3(
            i & 1 ? bounds.max.x : bounds.min.x,
            i & 2 ? bounds.max.y : bounds.min.y,
            i & 4 ? bounds.max.z : bounds.min.z,
          ).project(camera);
          assert.ok(
            Math.abs(p.x) < 0.84 && Math.abs(p.y) < 0.8 && p.z < 1 && p.z > 0,
          );
        }
      }
});

test("island shortcut fits every entire island on portrait and landscape screens", () => {
  for (const aspect of [320 / 700, 390 / 700, 844 / 390, 1280 / 720])
    for (const biome of BIOMES) {
      const camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 1200),
        distance = islandOverviewDistance(biome.radius, 40, aspect);
      camera.far=Math.max(1200,distance+(biome.radius||12)+60);
      camera.updateProjectionMatrix();
      assert.ok(distance + (biome.radius || 12) < camera.far);
      for (const azimuth of [0, 0.72, 2.5]) {
        camera.position.set(
          Math.sin(azimuth) * Math.cos(1.03) * distance,
          Math.sin(1.03) * distance,
          Math.cos(azimuth) * Math.cos(1.03) * distance,
        );
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        for (let i = 0; i < 96; i++) {
          const angle = (i / 96) * Math.PI * 2,
            point = new THREE.Vector3(
              Math.cos(angle) * (biome.radius || 12),
              0,
              Math.sin(angle) * (biome.radius || 12),
            ).project(camera);
          assert.ok(
            Math.abs(point.x) < 0.91 &&
              Math.abs(point.y) < 0.91 &&
              point.z > 0 &&
              point.z < 1,
            biome.id + " " + aspect,
          );
        }
      }
    }
});

test("random camera selects all available cats, avoids immediate repeats and handles an empty roster", () => {
  const cats = [{ id: "kitten" }, { id: "giant" }, { id: "staff" }];
  assert.equal(randomCameraCat([], null), null);
  assert.equal(randomCameraCat([cats[0]], "kitten"), cats[0]);
  for (let i = 0; i < 100; i++)
    assert.notEqual(randomCameraCat(cats, "giant").id, "giant");
  assert.deepEqual(
    [0, 0.4, 0.99].map((r) => randomCameraCat(cats, null, () => r).id),
    ["kitten", "giant", "staff"],
  );
});

test("switching from Chichi to kittens and giant cats keeps their moving face framed without changing their rig", () => {
  const camera = new THREE.PerspectiveCamera(40, 390 / 700, 0.5, 1200),
    look = new THREE.Vector3(),
    events = [];
  camera.position.set(15, 20, 15);
  const actors = [1, 0.36, 2.5].map((scale) => {
    const carrier = new THREE.Group(),
      model = new THREE.Group(),
      head = new THREE.Group();
    carrier.add(model);
    model.add(head);
    model.scale.setScalar(scale);
    head.position.set(0, 1.25, 0.46);
    return { carrier, head };
  });
  const follow = createChichiCamera(camera, actors[0].head, {
    onChange: (enabled) => events.push(enabled),
  });
  follow.setEnabled(true, look);
  let projectedSize;
  for (const { head, carrier } of actors) {
    const position = camera.position.clone();
    follow.setTarget(head, look);
    follow.update(0, look);
    assert.ok(
      camera.position.distanceTo(position) < 1e-7,
      "target changes start from the current camera",
    );
    for (let i = 0; i < 90; i++) {
      carrier.position.set(-90 + i * 0.3, -20 + i * 0.6, 12);
      carrier.rotation.set(0, i * 0.04, Math.sin(i * 0.07) * 0.1);
      camera.position.set(15, 20, 15);
      follow.update(1 / 60, look);
      camera.updateMatrixWorld();
    }
    const face = follow.facePoint(new THREE.Vector3()),
      projected = face.clone().project(camera);
    assert.ok(Math.hypot(projected.x, projected.y) < 1e-6);
    const scale = head.getWorldScale(new THREE.Vector3()).x,
      relativeDistance = camera.position.distanceTo(face) / scale;
    if (projectedSize)
      assert.ok(Math.abs(relativeDistance - projectedSize) < 1e-6);
    projectedSize = relativeDistance;
    assert.ok(Math.abs(head.parent.scale.x - scale) < 1e-10);
  }
  follow.setEnabled(false, look);
  for (let i = 0; i < 60; i++) {
    camera.position.set(15, 20, 15);
    follow.update(1 / 60, look);
  }
  assert.ok(camera.position.distanceTo(new THREE.Vector3(15, 20, 15)) < 1e-6);
  assert.deepEqual(events, [true, true, true, false]);
});

test("large build-island lawn repeats without square seams at either texture edge", () => {
  const lawn = surfaceTexture("lawn"),
    { data, width, height } = lawn.image;
  for (let y = 0; y < height; y++)
    for (let c = 0; c < 4; c++)
      assert.equal(
        data[y * width * 4 + c],
        data[(y * width + width - 1) * 4 + c],
      );
  for (let x = 0; x < width; x++)
    for (let c = 0; c < 4; c++)
      assert.equal(data[x * 4 + c], data[((height - 1) * width + x) * 4 + c]);
  assert.equal(lawn.generateMipmaps, true);
  assert.equal(lawn.minFilter, THREE.LinearMipmapLinearFilter);
  assert.ok(
    new Set(data.filter((_, i) => i % 4 === 0)).size > 8,
    "retain grass surface detail",
  );
  assert.notEqual(
    lawn,
    surfaceTexture("ground"),
    "other islands keep their original texture",
  );
});
