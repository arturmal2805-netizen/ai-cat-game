import test from 'node:test';
import assert from 'node:assert/strict';
import { DataTexture, RGBAFormat, FloatType, EquirectangularReflectionMapping } from 'three';
import { WebGLEnvironments } from '../node_modules/three/src/renderers/webgl/WebGLEnvironments.js';
import { createQaRenderGate } from '../scripts/qa-render-gate.cjs';

test('QA pauses and counts only the exact main scene/camera pair', () => {
  const qa = { drawPaused: true, commandOnly: false }, scene = {}, camera = {};
  const decide = createQaRenderGate(qa, scene, camera);
  assert.deepEqual(decide(scene, camera), { shouldRender: false, track: false });
  for (const pair of [[{}, camera], [scene, {}], [{}, {}]])
    assert.deepEqual(decide(...pair), { shouldRender: true, track: false });
  qa.commandOnly = true;
  assert.deepEqual(decide(scene, camera), { shouldRender: true, track: true });
  qa.commandOnly = false;
  qa.drawPaused = false;
  assert.deepEqual(decide(scene, camera), { shouldRender: true, track: true });
});

// Run the actual Three conversion/cache implementation with a renderer spy.
// This proves dispatch and cache behavior, not GPU pixels or HDR brightness.
function conversionHarness(gateFactory) {
  const qa = { drawPaused: true, commandOnly: false }, scene = {}, camera = {};
  // Same format and dimensions as the owned Warehouse HDR source. No browser,
  // renderer context or dependency on an in-progress artistic texture is needed.
  const source = new DataTexture(new Float32Array(256 * 128 * 4).fill(1), 256, 128, RGBAFormat, FloatType);
  source.mapping = EquirectangularReflectionMapping;
  source.needsUpdate = true;
  let target = null, environments, mainCalls = 0, internalCalls = 0, tracked = 0;
  const renderer = {
    xr: { enabled: false }, autoClear: true,
    getRenderTarget: () => target,
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    setRenderTarget: value => { target = value; },
    render(renderScene) {
      if (renderScene === scene) {
        mainCalls++;
        environments.get(source, true);
      } else internalCalls++;
    },
  };
  environments = WebGLEnvironments(renderer);
  const draw = renderer.render.bind(renderer), decide = gateFactory(qa, scene, camera);
  renderer.render = (...args) => {
    const decision = decide(...args);
    if (!decision.shouldRender) return;
    draw(...args);
    if (decision.track) tracked++;
  };
  return {
    qa, renderer, scene, camera,
    // Matches the native-frame bypass used by the real screenshot harness.
    drawFrame: () => draw(scene, camera),
    convert: texture => environments.get(texture, true),
    source,
    stats: () => ({ mainCalls, internalCalls, tracked }),
    dispose() { environments.dispose(); source.dispose(); },
  };
}

test('real Three PMREM executes all 17 offscreen passes while QA world draws are paused', () => {
  const h = conversionHarness(createQaRenderGate);
  try {
    h.renderer.render(h.scene, h.camera);
    assert.deepEqual(h.stats(), { mainCalls: 0, internalCalls: 0, tracked: 0 });
    h.drawFrame();
    assert.deepEqual(h.stats(), { mainCalls: 1, internalCalls: 17, tracked: 0 });
    const converted = h.convert(h.source);
    assert.equal(converted.image.width, 336);
    assert.equal(converted.image.height, 256);
    assert.equal(h.renderer.getRenderTarget(), null, 'native PMREM restores its render target');
    h.qa.drawPaused = false;
    h.renderer.render(h.scene, h.camera);
    assert.deepEqual(h.stats(), { mainCalls: 2, internalCalls: 17, tracked: 1 }, 'cached PMREM is reused and only a main frame is counted');
  } finally { h.dispose(); }
});

test('the prior broad pause suppresses PMREM once and unpausing cannot repair the cached target', () => {
  const h = conversionHarness(qa => () => ({ shouldRender: !qa.drawPaused || !!qa.commandOnly, track: true }));
  const replacement = h.source.clone();
  try {
    h.drawFrame();
    const cached = h.convert(h.source);
    assert.deepEqual(h.stats(), { mainCalls: 1, internalCalls: 0, tracked: 0 });
    h.qa.drawPaused = false;
    h.drawFrame();
    assert.equal(h.convert(h.source), cached);
    assert.deepEqual(h.stats(), { mainCalls: 2, internalCalls: 0, tracked: 0 }, 'unpausing keeps the first cached untouched PMREM');
    assert.notEqual(h.convert(replacement), cached);
    assert.equal(h.stats().internalCalls, 17, 'a fresh source identity regenerates the suppressed conversion');
  } finally { replacement.dispose(); h.dispose(); }
});
