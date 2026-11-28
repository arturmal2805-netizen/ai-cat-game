import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCat, animateCat, disposeCat } from "../public/cat-model.js";
import { createSquishToy } from "../public/squish-model.js";
import { createSquishCatContacts } from "../public/squish-cat-contacts.js";
test("actual skinned paw vertices follow the deformed mesh in translated deep-water world coordinates", () => {
  const scene = new T.Scene(),
    toy = createSquishToy(),
    carrier = new T.Group(),
    cat = createCat("happy"),
    contact = createSquishCatContacts();
  toy.position.set(3060, -450, 1240);
  carrier.position.set(3060, -447, 1240);
  scene.add(toy, carrier);
  carrier.add(cat);
  const attributes = cat.userData.legs.map((leg) =>
    leg.children
      .filter((o) => o.isSkinnedMesh)
      .map((o) => o.geometry.attributes.position.array.slice()),
  );
  let plantedContact;
  const plantedIndex=cat.userData.legs.findIndex(l=>l.position.z<=0);
  for (let i = 0; i < 45; i++) {
    animateCat(cat, i / 60);
    carrier.position.y =
      toy.userData.surface(carrier.position.x, carrier.position.z) + 0.012;
    carrier.updateWorldMatrix(true, true);
    contact.collect("chichi", cat, carrier, toy, i / 60);
    contact.flush(1 / 60, [toy]);
    const current=toy.userData.solver.contacts.get("chichi:paw:"+plantedIndex);
    if(i===0) plantedContact=current;
    else assert.equal(current,plantedContact,"planted paw keeps its filtered constraint across native animation frames");
    assert(contact.diagnostics.length >= 2);
    for (const p of contact.diagnostics)
      assert(Math.abs(p.error) < 0.025, "native toe/surface error " + p.error);
  }
  const d = toy.userData.solver.diagnostics();
  assert(d.contacts >= 2);
  assert(d.maxDeformation > 0.015);
  assert(d.minTetRatio > 0);
  assert(d.volumeRatio > 0.97 && d.volumeRatio < 1.03);
  for (let i = 0; i < cat.userData.legs.length; i++) {
    const meshes = cat.userData.legs[i].children.filter((o) => o.isSkinnedMesh);
    for (let j = 0; j < meshes.length; j++)
      assert.deepEqual(
        meshes[j].geometry.attributes.position.array,
        attributes[i][j],
      );
  }
  contact.clear();
  animateCat(cat, 1, false, true);
  const heights = cat.userData.legs.map((l) => l.position.y);
  assert(
    heights.every((y) => Math.abs(y - heights[0]) < 1e-8),
    "ordinary native animation resets all temporary paw height corrections",
  );
  assert.equal(toy.userData.solver.contacts.size, 0);
  toy.userData.dispose();
  disposeCat(cat);
});
