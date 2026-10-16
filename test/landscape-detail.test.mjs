import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BIOMES } from "../public/game-data.js";
import {
  BIOME_STYLES,
  createBiomeScene,
  disposeBiome,
} from "../public/biome-scenes.js";
import {
  landscapedTrees,
  createGroundCover,
  placementClearance,
} from "../public/landscape-detail.js";
import { createReef } from "../public/reef.js";
import { createLagoon } from "../public/lagoon.js";
import { RENEWED_ISLANDS } from "../public/renewal-data.js";

test("every island has authored trees with varied positions and silhouettes", () => {
  const kinds = new Set();
  for (const biome of BIOMES) {
    const trees = landscapedTrees(biome.id);
    assert.ok(
      trees.length >= 2 &&
        trees.length <=
          (biome.id === "aquapark" || RENEWED_ISLANDS[biome.id] ? 5 : 3),
      biome.id,
    );
    assert.equal(new Set(trees.map((t) => t.id)).size, trees.length);
    assert.ok(
      new Set(trees.map((t) => Math.hypot(t.x, t.z).toFixed(2))).size > 1,
      biome.id,
    );
    trees.forEach((t) => {
      kinds.add(t.kind);
      assert.ok(Math.hypot(t.x, t.z) < (biome.radius || 11));
      assert.ok(t.cell >= 0 && t.cell < 6);
    });
  }
  assert.equal(landscapedTrees("coral").length, 2);
  assert.ok(kinds.size >= 9);
  assert.ok(landscapedTrees("winter").every((t) => t.kind !== "snow"));
});

test("every meadow is deterministic, diverse and rendered in at most four draw calls", () => {
  for (const biome of BIOMES) {
    const root = createGroundCover(BIOME_STYLES[biome.id], biome.id, biome.id === "autumn" ? {radius:biome.radius} : {});
    assert.ok(root.children.length <= 4);
    assert.ok(
      root.userData.samples.length >= 300 &&
        root.userData.samples.length <= 900,
      biome.id,
    );
    assert.ok(
      root.userData.stats.flowers > 70 && root.userData.stats.tufts > 200,
      biome.id,
    );
    assert.ok(root.children.every((m) => m.isInstancedMesh));
    assert.ok(
      root.children.every((m) =>
        [...m.instanceMatrix.array].every(Number.isFinite),
      ),
    );
    disposeBiome(root);
  }
  const a = createGroundCover(BIOME_STYLES.coral, "coral"),
    b = createGroundCover(BIOME_STYLES.coral, "coral");
  assert.deepEqual(a.userData.samples, b.userData.samples);
  disposeBiome(a);
  disposeBiome(b);
});

test("ground cover leaves water and rotated building footprints clear without touching a save", () => {
  const placements = [{ item: "coaster-cloud", x: 3, z: 1, rotation: 1 }],
    original = structuredClone(placements);
  const root = createGroundCover(BIOME_STYLES.beach, "beach", { placements }),
    clear = placementClearance(placements);
  const [x, z, rx, rz] = BIOME_STYLES.beach.water;
  for (const p of root.userData.samples) {
    assert.ok(clear(p.x, p.z, 0.55));
    assert.ok(
      ((p.x - x) / (rx + 0.2)) ** 2 + ((p.z - z) / (rz + 0.2)) ** 2 >= 1,
    );
    assert.ok(Math.hypot(p.x, p.z) >= 1.35 && Math.hypot(p.x, p.z) <= 10.8);
  }
  assert.deepEqual(placements, original);
  disposeBiome(root);
});

test("moving a real tree preserves its model and clears vegetation at its new position", () => {
  const root = createBiomeScene(BIOMES.find((b) => b.id === "coral"));
  const records = [...root.userData.sceneryObjects.values()].map(
    (g) => g.userData.sceneryRecord,
  );
  const first = root.userData.trees[0],
    model = root.userData.sceneryObjects.get(first.id);
  const moved = records.map((r) =>
    r.id === first.id ? { ...r, x: 1, z: 3, rotation: 1 } : r,
  );
  root.userData.updatePlacements([], moved);
  assert.equal(root.userData.sceneryObjects.get(first.id), model);
  assert.equal(model.position.x, 1);
  assert.equal(model.rotation.y, Math.PI / 2);
  const cover = root.userData.groundCover;
  assert.ok(
    cover.userData.samples.every(
      (p) => Math.abs(p.x - 1) > 1.65 || Math.abs(p.z - 3) > 1.65,
    ),
  );
  root.userData.updatePlacements([], records);
  assert.deepEqual(
    root.userData.trees.map((t) => t.id),
    records.filter((r) => r.type.startsWith("scenery-tree-")).map((r) => r.id),
  );
  root.userData.dispose();
});

test("the breeze can be frozen while keeping all planted instances and colors", () => {
  const root = createGroundCover(BIOME_STYLES.nature, "nature");
  const grass = root.getObjectByName("Meadow grass"),
    shader = { uniforms: {}, vertexShader: "#include <begin_vertex>" };
  grass.material.onBeforeCompile(shader);
  const before = [...grass.instanceMatrix.array];
  root.userData.update(34, true);
  assert.equal(shader.uniforms.meadowMotion.value, 0);
  root.userData.update(42, false);
  assert.equal(shader.uniforms.meadowMotion.value, 1);
  assert.equal(shader.uniforms.meadowTime.value, 42);
  assert.deepEqual([...grass.instanceMatrix.array], before);
  disposeBiome(root);
});

test("colored reef geometry stays beneath the surface and is present in every lagoon", () => {
  const reef = createReef({ rx: 5, rz: 3.4, count: 18 });
  reef.updateMatrixWorld(true);
  const bound = new THREE.Box3().setFromObject(reef);
  assert.ok(bound.max.y < 0.155);
  assert.ok(bound.min.x > -5 && bound.max.x < 5);
  assert.ok(bound.min.z > -3.4 && bound.max.z < 3.4);
  assert.equal(reef.userData.clusterCount, 18);
  assert.ok(reef.children.length <= 5);
  assert.ok(reef.children.every((m) => m.geometry.getAttribute("color")));
  disposeBiome(reef);
  const lagoon = createLagoon({ rx: 3, rz: 2 });
  assert.ok(lagoon.getObjectByName("Underwater coral garden"));
  assert.equal(lagoon.userData.water.uniforms.uLake.value, 1);
  lagoon.userData.update(10, true);
  assert.equal(lagoon.userData.water.uniforms.uTime.value, 0);
  disposeBiome(lagoon);
});
