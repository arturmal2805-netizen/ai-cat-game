import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { BIOMES, byItem } from "../public/game-data.js";
import { createBiomeScene, BIOME_STYLES } from "../public/biome-scenes.js";
import { createLagoon, waterMaterial } from "../public/lagoon.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";

test("every habitat has finite detailed scenery and an explicit, separate distant layer", () => {
  assert.deepEqual(
    Object.keys(BIOME_STYLES).sort(),
    BIOMES.map((b) => b.id).sort(),
  );
  for (const biome of BIOMES) {
    const root = createBiomeScene(biome);
    assert.equal(root.userData.lowOnly, false);
    assert.equal(root.userData.detail.visible, true);
    assert.equal(root.userData.lowDetail.visible, false);
    assert.ok(root.userData.stats.staticMeshes <= 6);
    assert.ok(root.userData.stats.sourceMeshes > 200);
    root.traverse((object) => {
      if (!object.isMesh) return;
      const position = object.geometry.getAttribute("position");
      assert.ok(position.count > 0);
      assert.ok([...position.array].every(Number.isFinite), biome.id);
    });
    const bound = new THREE.Box3().setFromObject(root);
    assert.ok(bound.min.y < -4 && bound.max.y > 2, biome.id);
    root.userData.dispose();
    const distant = createBiomeScene(biome, { lowOnly: true });
    assert.equal(distant.userData.lowOnly, true);
    assert.equal(distant.userData.detail.visible, false);
    assert.equal(distant.userData.lowDetail.visible, true);
    assert.equal(distant.userData.stats.fishCount, 0);
    distant.userData.dispose();
  }
});

test("the beach lagoon is a real opening in the ground, not a painted blue disk", () => {
  const beach = BIOMES.find((b) => b.id === "beach");
  const root = createBiomeScene(beach);
  const ground = root.children[0].children[0];
  root.updateMatrixWorld(true);
  const [x, z] = BIOME_STYLES.beach.water;
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, 10, z),
    new THREE.Vector3(0, -1, 0),
  );
  assert.equal(ray.intersectObject(ground).length, 0);
  ray.set(new THREE.Vector3(0, 10, 6), new THREE.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(ground).length > 0);
  const lagoon = root.userData.detail.getObjectByName("Lagoon");
  assert.equal(lagoon.userData.fishCount, 36);
  root.userData.dispose();
});

test("fish remain underwater, move along the lagoon and honor reduced motion", () => {
  const lagoon = createLagoon({ rx: 5, rz: 3.4, fishCount: 36 });
  const fish = lagoon.children.find((m) => m.isInstancedMesh && m.count === 36);
  const before = [...fish.instanceMatrix.array];
  lagoon.userData.update(14);
  assert.notDeepEqual([...fish.instanceMatrix.array], before);
  const matrix = new THREE.Matrix4(),
    position = new THREE.Vector3();
  for (let i = 0; i < fish.count; i++) {
    fish.getMatrixAt(i, matrix);
    position.setFromMatrixPosition(matrix);
    assert.ok(position.y < -0.15);
    assert.ok((position.x / 5) ** 2 + (position.z / 3.4) ** 2 < 1);
  }
  assert.ok(
    new Set([...fish.instanceColor.array].map((n) => n.toFixed(3))).size > 6,
  );
  lagoon.userData.update(50, true);
  assert.deepEqual([...fish.instanceMatrix.array], before);
  const water = waterMaterial();
  assert.equal(water.transparent, true);
  assert.equal(water.depthWrite, false);
  water.dispose();
});

test("decorative gardens make room for buildings without changing saved placements", () => {
  const root = createBiomeScene(BIOMES[0]);
  const placements = [{ item: "coaster-cloud", x: 0, z: 0, rotation: 1 }];
  const original = structuredClone(placements);
  const garden = root.getObjectByName("Adaptive gardens");
  const oldVertices = garden.children.reduce(
    (n, m) => n + m.geometry.getAttribute("position").count,
    0,
  );
  root.userData.updatePlacements(placements);
  const next = root.getObjectByName("Adaptive gardens");
  assert.notEqual(garden, next);
  assert.ok(
    next.children.reduce(
      (n, m) => n + m.geometry.getAttribute("position").count,
      0,
    ) < oldVertices,
  );
  root.userData.updatePlacements(placements);
  assert.equal(root.getObjectByName("Adaptive gardens"), next);
  assert.deepEqual(placements, original);
  root.userData.dispose();
});

test("all six new coasters preserve moving seats, themed scenery and construction times", () => {
  for (const id of [
    "coaster-lagoon",
    "coaster-sakura",
    "coaster-moon",
    "coaster-mushroom",
    "coaster-cloud",
    "coaster-clockwork",
  ]) {
    const item = byItem(id),
      ride = makeAttraction(id);
    assert.equal(ride.userData.dressed, true);
    assert.ok(item.buildMinutes >= 360 && item.buildMinutes <= 1440);
    const before = ride.userData.moving.position.clone();
    animateAttraction(ride, 3.5);
    assert.ok(ride.userData.moving.position.distanceTo(before) > 0.1);
    assert.ok(ride.userData.curve.getPoint(0.4).y > 0);
    if (id === "coaster-lagoon") {
      assert.equal(ride.userData.aquarium.userData.fishCount, 12);
      assert.equal(
        ride.userData.aquarium.userData.water.uniforms.uTime.value,
        3.5,
      );
    }
  }
});

test("the original illustration atlas is shipped as an RGBA asset", async () => {
  const file = await readFile(
    new URL("../public/art/fantasy-atlas.png", import.meta.url),
  );
  assert.equal(file.subarray(1, 4).toString(), "PNG");
  assert.equal(file.readUInt32BE(16), 1536);
  assert.equal(file.readUInt32BE(20), 1024);
  assert.equal(file[25], 6); // Truecolor with alpha, retaining original transparency.
});
