import test from "node:test";
import assert from "node:assert/strict";
import { SquishSoftBody } from "../public/squish-soft-body.js";
const advance = (b, n) => {
  for (let i = 0; i < n; i++) b.step(1 / 60);
};
const dent = (b) => 3 - b.sample(0, 3, 0)[1];
function press(material, seconds = 2, displacement = [0, -0.8, 0]) {
  const b = new SquishSoftBody({ material });
  b.setContact("paw", { point: [0, 3, 0], displacement, radius: 0.9 });
  advance(b, seconds * 60);
  return b;
}
test("foam holds its imprint while jelly oscillates and recovers; cloud sinks and recovers gradually", () => {
  const jelly = press("jelly"),
    foam = press("foam"),
    cloud = press("cloud");
  const jp = dent(jelly),
    fp = dent(foam),
    cp = dent(cloud);
  for (const b of [jelly, foam, cloud]) b.release("paw");
  advance(jelly, 60);
  advance(foam, 60);
  advance(cloud, 60);
  assert(Math.abs(dent(jelly)) < jp * 0.05);
  assert(dent(foam) > fp * 0.5);
  assert(dent(cloud) > cp * 0.2);
  const cloud1 = dent(cloud),
    foam1 = dent(foam);
  advance(cloud, 240);
  advance(foam, 240);
  assert(dent(cloud) < cloud1 * 0.25);
  assert(dent(foam) < foam1 && dent(foam) > 0.1);
});
test("cloud pressure ramps over time instead of instant compression", () => {
  const b = press("cloud", 0);
  advance(b, 1);
  const early = dent(b);
  advance(b, 59);
  assert(dent(b) > early * 4);
  assert(b.diagnostics().minTetRatio > 0);
});
test("butter damage comes from local sustained strain, not contact count", () => {
  const mild = press("butter", 2, [0, -0.04, 0]),
    strong = press("butter");
  assert.equal(mild.diagnostics().damage, 0);
  assert(strong.diagnostics().damage > 0.5);
  const farIndex = strong.count - 1;
  assert(strong.damage[farIndex] < 0.05);
  strong.release("paw");
  advance(strong, 60);
  assert(dent(strong) > 0.1, "plastic fold remains after load");
});
test("two foam imprints persist separately at their actual contact locations", () => {
  const b = new SquishSoftBody({ material: "foam" });
  for (const x of [-1.1, 1.1]) {
    b.setContact("paw" + x, {
      point: [x, 3, 0],
      displacement: [0, -0.65, 0],
      radius: 0.55,
    });
    advance(b, 90);
    b.release("paw" + x);
  }
  advance(b, 60);
  const left = 3 - b.sample(-1.1, 3, 0)[1],
    right = 3 - b.sample(1.1, 3, 0)[1],
    middle = 3 - b.sample(0, 3, 0)[1];
  assert(left > 0.09 && right > 0.09);
  assert(middle < Math.min(left, right) * 0.8);
});
test("sleeping shelf bodies do no solver work; interaction wakes them and recovery sleeps again", () => {
  const b = new SquishSoftBody();
  assert.equal(b.step(0.1), 0);
  assert.equal(b.steps, 0);
  b.setContact("p", { point: [0, 3, 0] });
  advance(b, 30);
  assert(b.steps > 0 && !b.sleeping);
  b.release("p");
  advance(b, 600);
  assert(b.sleeping);
  const steps = b.steps;
  b.step(0.1);
  assert.equal(b.steps, steps);
  assert.equal(b.lastMs, 0);
});
