import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  squishCatActing,
  SQUISH_CAT_STATES,
} from "../public/squish-cat-choreography.js";
import {
  createCat,
  animateCat,
  disposeCat,
  reactCat,
} from "../public/cat-model.js";
import { applyAtollSit } from "../public/atoll-slide-acting.js";
import { createSquishToy } from "../public/squish-model.js";
import { createSquishCatContacts } from "../public/squish-cat-contacts.js";
test("all 22 native actions have bounded distinct material sequences and finite reversible reactions", () => {
  assert.equal(SQUISH_CAT_STATES.length, 22);
  const signatures = new Set();
  for (const mat of [
    "butter",
    "slime",
    "jelly",
    "cloud",
    "foam",
    "crunchy",
    "mochi",
    "giant",
  ]) {
    const states = [];
    for (let time = 0; time < 32; time += 0.1) {
      const f = squishCatActing(mat, time);
      if (!states.includes(f.state)) states.push(f.state);
      assert(
        Object.values(f.reaction).every(
          (v) => typeof v === "boolean" || Number.isFinite(v),
        ),
      );
      assert(f.blend >= 0 && f.blend <= 1);
    }
    signatures.add(states.join(","));
    assert(squishCatActing(mat, 60).done);
  }
  assert.equal(
    signatures.size,
    8,
    "material-specific performance, not eight recoloured loops",
  );
});
test("original native belly settles onto cloud skin and releases without changing original geometry", () => {
  const toy = createSquishToy({ material: "cloud" }),
    carrier = new T.Group(),
    cat = createCat(),
    contacts = createSquishCatContacts(),
    scene = new T.Scene();
  scene.add(toy, carrier);
  carrier.add(cat);
  const original = cat.userData.body.geometry.attributes.position.array.slice();
  for (let i = 0; i < 45; i++) {
    animateCat(cat, i / 60);
    carrier.position.set(0, toy.userData.surface(0, 0) + 0.012, 0);
    applyAtollSit(cat, { waterProne: 0.8 });
    contacts.collect("chichi", cat, carrier, toy, i / 60, false, {
      state: "SquishLieDown",
      bodyContact: true,
    });
    contacts.flush(1 / 60, [toy]);
    if (i > 8) {
      const b = contacts.diagnostics.find((d) => d.kind === "body");
      assert(b);
      assert(Math.abs(b.error) < 0.03);
    }
  }
  assert(toy.userData.solver.contacts.has("chichi:body"));
  assert(toy.userData.solver.diagnostics().maxDeformation > 0.03);
  assert.deepEqual(
    cat.userData.body.geometry.attributes.position.array,
    original,
  );
  contacts.clear();
  animateCat(cat, 1);
  assert.equal(toy.userData.solver.contacts.size, 0);
  toy.userData.dispose();
  disposeCat(cat);
});
import { createSquishCatVisits } from "../public/squish-cat-visits.js";
import { WAREHOUSE_ACCESS as A } from "../public/warehouse-access-data.js";
import { WAREHOUSE as W } from "../public/mosasaur-expansion-data.js";
function fakeVenue() {
  const interior = new T.Group();
  interior.position.set(W.x - 10, A.foot + 0.36, W.z + W.depth / 2 - 70);
  const toy = new T.Group();
  toy.userData = { material: "jelly", surface: () => A.foot + 3.7 };
  interior.add(toy);
  interior.userData = { toys: [toy], scratch: new T.Vector3() };
  return interior;
}
const visitor = () => ({
  id: "chichi",
  boat: 1,
  age: 0,
  walkPhase: 0,
  activity: { action: "explore" },
  local: { x: W.x, y: A.foot, z: A.lobby.z - 40 },
  yaw: 0,
  frame: {},
  squishWanted: true,
  squishMaterialWanted: "jelly",
});
test("autonomous approach follows aisles, uses 9.81 gravity, finishes bounce before manual descent and releases ownership", () => {
  const interior = fakeVenue(),
    visits = createSquishCatVisits({
      getInterior: () => interior,
      origin: { x: 0, z: 0 },
    }),
    v = visitor();
  let last = null,
    vel = null,
    ballistic = 0,
    jumped = false,
    finished = false,
    cancelled = false;
  for (let i = 0; i < 12000; i++) {
    visits.update(v, 1 / 60, i / 60);
    const s = visits.get(v.id);
    if (!s) {
      finished = true;
      break;
    }
    if (s.phase === "jump" && s.from) {
      const vy = last === null ? null : (v.local.y - last) * 60;
      if (vel !== null && vy !== null) {
        assert(Math.abs((vy - vel) * 60 + 9.81) < 1e-4);
        ballistic++;
      }
      last = v.local.y;
      vel = vy;
      jumped = true;
    } else {
      last = null;
      vel = null;
    }
    if (
      v.frame.squishState === "JellyBounce" &&
      v.local.y > A.foot + 4 &&
      !cancelled
    ) {
      v.manualWanted = true;
      cancelled = true;
    }
    assert(Object.values(v.local).every(Number.isFinite));
  }
  assert(jumped && ballistic > 10);
  assert(cancelled && finished);
  assert(
    Math.abs(v.local.y - A.foot) < 0.02,
    "manual handoff only on real floor",
  );
});
test("manual request while safely approaching does not force a return voyage or finish the routine", () => {
  const visits = createSquishCatVisits({
      getInterior: () => fakeVenue(),
      origin: { x: 0, z: 0 },
    }),
    v = visitor();
  for (let i = 0; i < 90; i++) visits.update(v, 1 / 60, i / 60);
  assert(visits.get(v.id));
  assert(!visits.unsafe(v.id));
  v.manualWanted = true;
  assert.equal(visits.update(v, 1 / 60, 2), false);
  assert.equal(visits.get(v.id), undefined);
  assert.equal(v.local.y, A.foot);
});
