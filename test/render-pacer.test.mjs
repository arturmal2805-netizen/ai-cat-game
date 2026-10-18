import { test } from "node:test";
import assert from "node:assert/strict";
import { createRenderPacer } from "../public/render-pacer.js";

test("jittered 60 Hz callbacks retain 30 target frames per second without restarting the interval after each delay", () => {
  const due = createRenderPacer();
  let frames = 0;
  for (let i = 0; i < 3600; i++) {
    const now = (i * 1000) / 60 + [-1, 1, -1.5, 1.5][i % 4];
    if (due(now, 1000 / 30)) frames++;
  }
  assert.ok(frames >= 1798 && frames <= 1802, frames);
});
test("camera, offscreen and viewport transitions draw immediately while a long pause never creates a GPU catch-up burst", () => {
  const due = createRenderPacer();
  assert.equal(due(100, 1000 / 30), true);
  assert.equal(due(101, 1000 / 30), false);
  assert.equal(due(102, 1000 / 60), true);
  assert.equal(due(103, 1000 / 60), false);
  assert.equal(due(104, 1000 / 60, true), true);
  assert.equal(due(1100, 1000 / 60), true);
  assert.equal(due(1100, 1000 / 60), false);
  assert.equal(due(1101, 100), true);
  assert.equal(due(1150, 100), false);
});
