import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nativeCatView, worldFogDensity } from '../public/cat-view-policy.js';

test('focused cats retain native bodies beyond the old zoom boundary while remote islands retain bounded waking', () => {
  for (const radius of [12, 30, 120, 390])
    for (const distance of [57, 109.9, 110, 140, 500, 1800, 3000]) {
      assert.equal(nativeCatView(distance, radius, true), true);
      assert.equal(nativeCatView(distance, radius, false), distance < Math.max(110, radius * 7));
    }
});

test('close fog stays exact, ordinary zoom has no 90-metre flash and distant target contrast remains readable', () => {
  for (const distance of [0, 5, 25, 57, 65])
    assert.equal(worldFogDensity(distance), .0035);
  for (let d = 65; d < 180; d += .05)
    assert.ok(Math.abs(worldFogDensity(d + .05) - worldFogDensity(d)) < .000004);
  for (const distance of [120, 200, 500, 1200, 2400, 4000]) {
    const density = worldFogDensity(distance), targetFog = 1 - Math.exp(-((density * distance) ** 2));
    assert.ok(density > 0 && density <= .000700001);
    assert.ok(targetFog <= .116, `target fog at ${distance}: ${targetFog}`);
  }
});
