import { test } from "node:test";
import assert from "node:assert/strict";
import {
  yarnPlayFrame,
  applyYarnFrame,
  resetYarn,
} from "../public/yarn-play.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";
import { createCat, animateCat, reactCat } from "../public/cat-model.js";
const separation = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
test("yarn hunt has swats, chase, crouch, leap and a continuous repeated route", () => {
  const phases = new Set();
  let last = yarnPlayFrame(0),
    highest = 0;
  for (let i = 1; i <= 1500; i++) {
    const frame = yarnPlayFrame(i / 120);
    phases.add(frame.phase);
    highest = Math.max(highest, frame.jump);
    assert.ok(separation(frame.ball, last.ball) < 0.025);
    assert.ok(separation(frame.cat, last.cat) < 0.06);
    assert.ok(
      Math.abs(frame.ball.x) <= 0.60001 && Math.abs(frame.ball.z) <= 0.34001,
    );
    assert.ok(separation(frame.cat, frame.ball) > 0.65);
    assert.ok(
      [frame.yaw, frame.jump, frame.crouch, frame.paw, frame.roll].every(
        Number.isFinite,
      ),
    );
    last = frame;
  }
  assert.deepEqual([...phases].sort(), [
    "chase",
    "crouch",
    "pounce",
    "swat",
    "turn",
  ]);
  assert.ok(highest > 0.45);
});
test("ball rolls around its centre, idle animation cannot override the play, and cleanup resets it", () => {
  const group = makeAttraction("yarn"),
    frame = yarnPlayFrame(1.2);
  applyYarnFrame(group, frame);
  const moving = group.userData.moving,
    position = moving.position.toArray(),
    rotation = moving.rotation.toArray();
  animateAttraction(group, 80);
  assert.deepEqual(moving.position.toArray(), position);
  assert.deepEqual(moving.rotation.toArray(), rotation);
  assert.equal(moving.children[0].position.y, 0);
  assert.notEqual(moving.rotation.z, 0);
  resetYarn(group);
  assert.deepEqual(moving.position.toArray(), [0, 0.4, 0]);
  assert.deepEqual(moving.rotation.toArray().slice(0, 3), [0, 0, 0]);
});
test("paw reactions keep the AI mood and reset on the next regular animation frame", () => {
  const cat = createCat("happy");
  animateCat(cat, 2.5);
  const leg = cat.getObjectByName("Leg-1_1"),
    before = leg.rotation.x;
  reactCat(cat, { paw: 0.9, crouch: 0.1 });
  assert.notEqual(leg.rotation.x, before);
  assert.equal(cat.userData.mood, "happy");
  animateCat(cat, 2.6);
  assert.equal(leg.rotation.x, before);
});
test("reduced motion freezes the hunt and avoids jumps or paw motions", () => {
  assert.deepEqual(yarnPlayFrame(1, true), yarnPlayFrame(5, true));
  const cat = createCat(),
    pose = cat.getObjectByName("Head").quaternion.toArray();
  reactCat(cat, { paw: 1, crouch: 1 }, true);
  assert.deepEqual(cat.getObjectByName("Head").quaternion.toArray(), pose);
});
