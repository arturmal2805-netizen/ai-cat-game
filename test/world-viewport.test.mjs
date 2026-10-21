import { test } from "node:test";
import assert from "node:assert/strict";
import { watchWorldViewport } from "../public/world-viewport.js";

function fixture() {
  let callback,
    disconnected = false,
    bounds = { width: 390, height: 732 },
    reads = 0;
  const sizes = [],
    camera = {
      aspect: 1,
      projections: 0,
      updateProjectionMatrix() {
        this.projections++;
      },
    },
    renderer = {
      setSize(...args) {
        sizes.push(args);
      },
    },
    container = {
      getBoundingClientRect: () => bounds,
      get clientWidth() { reads++; return Math.round(bounds.width) - 2; },
      get clientHeight() { reads++; return Math.round(bounds.height) - 2; },
    },
    viewport = watchWorldViewport(
      container,
      class {
        constructor(cb) {
          callback = cb;
        }
        observe(target) {
          assert.equal(target, container);
        }
        disconnect() {
          disconnected = true;
        }
      },
    );
  return {
    viewport,
    renderer,
    camera,
    sizes,
    resize(next) {
      bounds = next;
      callback();
    },
    disconnected: () => disconnected,
    reads: () => reads,
  };
}
test("layout observation never clears the canvas; resize is deferred until the rendering frame", () => {
  const f = fixture();
  assert.deepEqual(f.sizes, []);
  assert.ok(f.viewport.pending);
  f.viewport.apply(f.renderer, f.camera);
  assert.deepEqual(f.sizes, [[390, 732, false]]);
  assert.equal(f.camera.aspect, 390 / 732);
  f.resize({ width: 390, height: 680 });
  f.resize({ width: 390, height: 700 });
  assert.equal(
    f.sizes.length,
    1,
    "No transparent frame from the ResizeObserver",
  );
  f.viewport.apply(f.renderer, f.camera);
  assert.deepEqual(f.sizes.at(-1), [390, 700, false]);
  assert.equal(f.sizes.length, 2);
  assert.equal(f.viewport.pending, false);
});
test("HUD uses exact content dimensions without synchronous layout reads in the draw loop", () => {
  const f = fixture();
  assert.equal(f.viewport.width, 388);
  assert.equal(f.viewport.height, 730);
  assert.equal(f.reads(), 2);
  for (let i = 0; i < 120; i++) {
    f.viewport.apply(f.renderer, f.camera);
    assert.equal(f.viewport.width, 388);
    assert.equal(f.viewport.height, 730);
  }
  assert.equal(f.reads(), 2, "badges never trigger frame-by-frame layout");
  f.resize({ width: 844, height: 560 });
  assert.equal(f.viewport.width, 842);
  assert.equal(f.viewport.height, 558);
  assert.equal(f.reads(), 4);
  f.resize({ width: 0, height: 0 });
  assert.equal(f.viewport.width, 842, "hidden layouts retain the last valid size");
  assert.equal(f.reads(), 4);
});
test("subpixel scroll jitter, redundant observations and a reversed resize never reallocate the buffer", () => {
  const f = fixture();
  f.viewport.apply(f.renderer, f.camera);
  f.resize({ width: 390.2, height: 731.8 });
  assert.equal(f.viewport.pending, false);
  f.resize({ width: 390, height: 600 });
  f.resize({ width: 390, height: 732 });
  assert.equal(f.viewport.pending, false);
  f.viewport.apply(f.renderer, f.camera);
  assert.equal(f.sizes.length, 1);
  assert.equal(f.camera.projections, 1);
});
test("orientation changes preserve full dimensions; zero-sized layout cannot clear the last frame", () => {
  const f = fixture();
  f.viewport.apply(f.renderer, f.camera);
  f.resize({ width: 844, height: 560 });
  f.viewport.apply(f.renderer, f.camera);
  assert.deepEqual(f.sizes.at(-1), [844, 560, false]);
  f.resize({ width: 0, height: 0 });
  assert.equal(f.viewport.pending, false);
  f.viewport.apply(f.renderer, f.camera);
  assert.equal(f.sizes.length, 2);
});
test("returning to view or a restored context requests a fresh draw without a redundant resize", () => {
  const f = fixture();
  f.viewport.apply(f.renderer, f.camera);
  f.viewport.invalidate();
  assert.ok(f.viewport.pending);
  f.viewport.apply(f.renderer, f.camera);
  assert.equal(f.sizes.length, 1);
  assert.equal(f.viewport.pending, false);
  f.viewport.dispose();
  assert.ok(f.disconnected());
});
