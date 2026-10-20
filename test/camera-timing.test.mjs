import test from "node:test";
import assert from "node:assert/strict";
import { cameraBlend, wheelPixels } from "../public/camera-timing.js";

test("zoom damping retains its real-time response through late frames without replaying simulation", () => {
  const smooth = (steps) =>
    steps.reduce(
      (position, dt) => position + (100 - position) * cameraBlend(dt),
      0,
    );
  assert.ok(
    Math.abs(smooth(Array(60).fill(1 / 60)) - smooth([0.4, 0.6])) < 1e-12,
  );
  assert.ok(
    cameraBlend(0.5) > 0.98,
    "a late camera must catch up, rather than applying a 100 ms physics cap",
  );
  assert.equal(cameraBlend(0.5, true), 1);
  assert.equal(cameraBlend(-1), 0);
});
test("wheel pixel input is unchanged and line/page events use their actual units", () => {
  assert.equal(wheelPixels({ deltaY: 80, deltaMode: 0 }, 900), 80);
  assert.equal(wheelPixels({ deltaY: -3, deltaMode: 1 }, 900), -48);
  assert.equal(wheelPixels({ deltaY: 1, deltaMode: 2 }, 900), 900);
});
