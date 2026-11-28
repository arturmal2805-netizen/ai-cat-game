import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { squishInteriorArtSteps } from "../public/squish-interior-art.js";
import { SQUISH_SECTORS } from "../public/squish-interior-layout.js";
import { WAREHOUSE as W } from "../public/mosasaur-expansion-data.js";
test("ten distinct sectors stay inside the frozen shell with bounded static draws and complete disposal", () => {
  const unchanged = JSON.stringify(W),
    iterator = squishInteriorArtSteps();
  let out,
    steps = 0;
  do {
    out = iterator.next();
    steps++;
  } while (!out.done);
  const art = out.value;
  assert.equal(new Set(SQUISH_SECTORS.map((s) => s.id)).size, 10);
  assert(art.userData.collectables >= 2000);
  assert(steps > 100, "cooperative construction");
  let meshes = 0,
    lights = 0,
    instances = 0;
  art.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      assert(o.geometry.attributes.position.array.every(Number.isFinite));
    }
    if (o.isInstancedMesh) instances += o.count;
    if (o.isLight) lights++;
  });
  assert(meshes < 35, "material batches, not one draw per shelf or tube");
  assert.equal(lights, 0, "no global light variant changes");
  assert(instances >= 2000);
  for (const s of SQUISH_SECTORS) {
    assert(Math.abs(s.x) < W.width / 2 - 20);
    assert(s.z > -W.depth + 70 && s.z < 40);
  }
  const scene = new T.Scene();
  scene.add(art);
  art.userData.dispose();
  assert.equal(art.parent, null);
  assert.equal(JSON.stringify(W), unchanged);
});
