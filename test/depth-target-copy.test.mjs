import test from "node:test";
import assert from "node:assert/strict";
import { copyDepthTarget } from "../public/depth-target-copy.js";

function fixture(current = null) {
  const calls = [], source = { width: 1024, height: 1024 },
    destination = { width: 1024, height: 1024 },
    targets = new Map([[source, { __webglFramebuffer: "source" }],
      [destination, { __webglFramebuffer: "destination" }]]);
  const forbidden = () => { throw Error("Synchronous GPU query/texture upload"); };
  const renderer = {
    getContext: () => ({ READ_FRAMEBUFFER: 1, DRAW_FRAMEBUFFER: 2,
      DEPTH_BUFFER_BIT: 3, NEAREST: 4, getParameter: forbidden,
      pixelStorei: forbidden, readPixels: forbidden, finish: forbidden,
      blitFramebuffer: (...args) => calls.push(["blit", ...args]) }),
    state: { bindFramebuffer: (...args) => calls.push(["bind", ...args]) },
    properties: { get: target => targets.get(target) },
    getRenderTarget: () => current,
    setRenderTarget: target => calls.push(["restore", target]),
  };
  return { renderer, source, destination, calls };
}

test("depth copies keep the exact full attachment on GPU without querying CPU unpack state", () => {
  for (const current of [null, { name: "native shadow target" }]) {
    const { renderer, source, destination, calls } = fixture(current);
    copyDepthTarget(renderer, source, destination);
    assert.deepEqual(calls, [
      ["bind", 1, "source"], ["bind", 2, "destination"],
      ["blit", 0, 0, 1024, 1024, 0, 0, 1024, 1024, 3, 4],
      ["bind", 1, null], ["bind", 2, null], ["restore", current],
    ]);
  }
});

test("failed GPU depth copies restore Three's READ/DRAW framebuffer bindings before propagating", () => {
  const { renderer, source, destination, calls } = fixture();
  renderer.getRenderTarget = () => source;
  const gl = renderer.getContext();
  gl.blitFramebuffer = () => { throw Error("Context transition"); };
  renderer.getContext = () => gl;
  assert.throws(() => copyDepthTarget(renderer, source, destination), /Context transition/);
  assert.deepEqual(calls.slice(-3), [
    ["bind", 1, null], ["bind", 2, null], ["restore", source],
  ]);
});

test("depth copies reject unsupported or mismatched targets before changing renderer state", () => {
  const { renderer, source, destination, calls } = fixture();
  destination.width = 512;
  assert.throws(() => copyDepthTarget(renderer, source, destination), /Unsupported/);
  assert.deepEqual(calls, []);
});
