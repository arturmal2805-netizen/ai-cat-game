import { test } from "node:test";
import assert from "node:assert/strict";
import { placeWorldBadge } from "../public/world-hud.js";
test("idle and offscreen world badges cause no repeated DOM writes and retain exact moving coordinates", () => {
  let hidden = true,
    transform = "",
    hiddenWrites = 0,
    transformWrites = 0;
  const button = { style: {} };
  Object.defineProperty(button, "hidden", {
    get: () => hidden,
    set: (value) => {
      hidden = value;
      hiddenWrites++;
    },
  });
  Object.defineProperty(button.style, "transform", {
    get: () => transform,
    set: (value) => {
      transform = value;
      transformWrites++;
    },
  });
  for (let i = 0; i < 10000; i++) placeWorldBadge(button, true);
  assert.deepEqual([hiddenWrites, transformWrites], [0, 0]);
  placeWorldBadge(button, false, 120.123456789, 83.25);
  const first = transform;
  for (let i = 0; i < 10000; i++)
    placeWorldBadge(button, false, 120.123456789, 83.25);
  assert.deepEqual([hiddenWrites, transformWrites], [1, 1]);
  assert.equal(transform, first);
  assert.ok(transform.includes("120.123456789px"));
  placeWorldBadge(button, false, 120.12345679, 83.25);
  assert.equal(
    transformWrites,
    2,
    "no rounding or loss of alignment during a camera move",
  );
  placeWorldBadge(button, true);
  placeWorldBadge(button, true);
  placeWorldBadge(button, false, 120.12345679, 83.25);
  assert.deepEqual([hiddenWrites, transformWrites], [3, 2]);
});
