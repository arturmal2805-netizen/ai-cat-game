import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createCat,
  animateCat,
  setCatMood,
  disposeCat,
} from "../public/cat-model.js";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";
import {
  CAT_PORTRAITS,
  CHICHI_PORTRAITS,
} from "../public/cat-portrait-manifest.js";
import { prepareCatPortraits } from "../public/cat-portraits.js";
import {
  prepareSceneSteps,
  runSceneSteps,
  queueSceneRefresh,
} from "../public/scene-tasks.js";
import { mergeSceneSteps } from "../public/geometry-tasks.js";
import { biomeSceneSteps, createBiomeScene } from "../public/biome-scenes.js";
import { byBiome } from "../public/game-data.js";
import { catVenue } from "../public/cat-venues.js";

function budget(root) {
  let triangles = 0,
    draws = 0,
    bytes = 0;
  root.traverseVisible((o) => {
    if (!o.isMesh) return;
    draws++;
    triangles +=
      (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
    for (const a of Object.values(o.geometry.attributes))
      bytes += a.array.byteLength;
    bytes += o.geometry.index?.array.byteLength || 0;
  });
  return { triangles, draws, bytes };
}
test("all 30 breeds use the reference-family sculpt within the previous total crowd GPU budget", () => {
  const sum = { triangles: 0, draws: 0, bytes: 0 };
  for (const profile of ADOPTION_CATS) {
    const cat = createCat("happy", {
      ...catAppearance(profile),
      detail: "npc",
    });
    assert.equal(cat.userData.referenceFamily, true);
    assert.equal(cat.userData.appearance.breed, profile.breed);
    assert.equal(cat.userData.appearance.color, profile.color);
    assert.equal(cat.userData.appearance.eyeColor, profile.eyes);
    assert.equal(cat.userData.legJoints.length, 4);
    assert.ok(cat.getObjectByName("Face").geometry.isBufferGeometry);
    const b = budget(cat);
    for (const k in sum) sum[k] += b[k];
    for (const mood of ["sleep", "crazy hungry", "happy"]) {
      setCatMood(cat, mood, { immediate: true });
      animateCat(cat, 0.15, true);
      cat.updateMatrixWorld(true);
      assert.ok(
        cat.userData.legs.every((l) =>
          Number.isFinite(l.matrixWorld.determinant()),
        ),
      );
    }
    disposeCat(cat);
  }
  // Measured from d441ff0 with precisely these 30 profiles and detail:'npc'.
  assert.ok(sum.triangles <= 490806, JSON.stringify(sum));
  assert.ok(sum.draws <= 802, JSON.stringify(sum));
  assert.ok(sum.bytes <= 35188756, JSON.stringify(sum));
});
test("venue employees and adoption guests use the same new feline rig", () => {
  for (const id of [
    "adoption-center",
    "business-coffee",
    "business-hotdog",
    "business-artist",
  ]) {
    const venue = catVenue(id),
      cats = [];
    venue.traverse((o) => {
      if (o.userData.referenceFamily) cats.push(o);
    });
    assert.ok(cats.length > 0, id);
    assert.ok(
      cats.every(
        (c) => c.userData.anatomy && c.userData.legJoints.length === 4,
      ),
    );
    cats.forEach(disposeCat);
  }
});
test("all adoption and mood portraits are real cached PNGs; opening adoption needs no browser/GPU", async () => {
  let delivered = 0;
  await prepareCatPortraits(ADOPTION_CATS, (p) => {
    assert.ok(CAT_PORTRAITS[p]);
    delivered++;
  });
  assert.equal(delivered, ADOPTION_CATS.length);
  for (const url of [
    ...Object.values(CAT_PORTRAITS),
    ...Object.values(CHICHI_PORTRAITS),
  ]) {
    const bytes = await readFile(
      new URL(
        "../public/" + url.split("?")[0].replace(/^\.\//, ""),
        import.meta.url,
      ),
    );
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), 400);
    assert.ok(bytes.length > 4000);
  }
});
test("cooperative buffer merging preserves every indexed triangle and colour", async () => {
  const parts = Array.from({ length: 12 }, (_, i) => {
    const g = new THREE.SphereGeometry(1, 12, 8);
    g.translate(i, 0, 0);
    g.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        new Float32Array(g.attributes.position.count * 3).fill(i / 12),
        3,
      ),
    );
    return g;
  });
  const expected = mergeGeometries(parts),
    actual = await prepareSceneSteps(mergeSceneSteps(parts), {
      budget: 0,
      yieldTask: async () => {},
    });
  for (const key of Object.keys(expected.attributes))
    assert.deepEqual(
      actual.attributes[key].array,
      expected.attributes[key].array,
    );
  assert.deepEqual(
    Array.from(actual.index.array),
    Array.from(expected.index.array),
  );
  actual.dispose();
  expected.dispose();
  parts.forEach((g) => g.dispose());
});
test("island preparation yields to interaction and retains the exact full scenery and animations", async () => {
  for (const id of ["nature", "clockwork", "winter"]) {
    let yields = 0;
    const first = createBiomeScene(byBiome(id));
    const next = await prepareSceneSteps(biomeSceneSteps(byBiome(id)), {
      budget: 0,
      yieldTask: async () => {
        yields++;
      },
    });
    assert.ok(yields > 50, id);
    assert.deepEqual(budget(next), budget(first));
    assert.equal(next.userData.lowOnly, false);
    assert.deepEqual(
      [...next.userData.sceneryObjects.keys()],
      [...first.userData.sceneryObjects.keys()],
    );
    assert.doesNotThrow(() => next.userData.update(3, false));
    first.userData.dispose();
    next.userData.dispose();
  }
});
test("cooperative scene tasks propagate errors and close cancelled generators", async () => {
  const controller = new AbortController();
  let closed = false;
  function* steps() {
    try {
      while (true) yield;
    } finally {
      closed = true;
    }
  }
  await assert.rejects(
    prepareSceneSteps(steps(), {
      budget: 0,
      signal: controller.signal,
      yieldTask: async () => controller.abort(),
    }),
    { name: "AbortError" },
  );
  assert.equal(closed, true);
  function* failed() {
    yield;
    throw new Error("construction failed");
  }
  assert.throws(() => runSceneSteps(failed()), /construction failed/);
});

test("queued scenery edits stay ordered and a failed refresh cannot block later changes", async () => {
  const queue = new Map(),
    order = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const failed = queueSceneRefresh(queue, "moon", async () => {
    order.push("first");
    await gate;
    throw Error("failed build");
  });
  const rejection = assert.rejects(failed, /failed build/);
  const second = queueSceneRefresh(queue, "moon", async () => {
    order.push("second");
    return "moved tree";
  });
  const third = queueSceneRefresh(queue, "moon", async () => {
    order.push("third");
    return "latest saved position";
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ["first"]);
  release();
  await rejection;
  assert.equal(await second, "moved tree");
  assert.equal(await third, "latest saved position");
  assert.deepEqual(order, ["first", "second", "third"]);
});
