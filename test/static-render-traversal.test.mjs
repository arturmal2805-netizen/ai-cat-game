import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createStaticRenderTraversal } from "../public/static-render-traversal.js";
test("submitted static leaves leave render traversal, preserve native effects and restore exact arrays before callbacks and after exceptions", () => {
  const scene = new T.Scene(),
    root = new T.Group();
  scene.add(root);
  const a = new T.Mesh(),
    b = new T.Mesh(),
    native = new T.Mesh();
  root.add(a, b, native);
  const children = root.children;
  let draws = 0,
    after = 0,
    fail = false;
  scene.onAfterRender = () => {
    after++;
    assert.equal(root.children, children);
    assert.equal(root.getObjectById(a.id), a);
  };
  const renderer = {
    render() {
      assert.deepEqual(root.children, [native]);
      assert.equal(a.parent, root);
      draws++;
      if (fail) throw Error("draw");
      scene.onAfterRender();
    },
  };
  const p = createStaticRenderTraversal(scene, renderer),
    entries = [
      { mesh: a, prunable: true },
      { mesh: b, prunable: true },
    ];
  p.prune(entries);
  renderer.render();
  assert.equal(root.children, children);
  assert.equal(after, 1);
  assert.equal(p.stats.omitted, 2);
  p.prune(entries);
  fail = true;
  assert.throws(() => renderer.render(), /draw/);
  assert.equal(root.children, children);
  entries[0].prunable = false;
  p.prune(entries);
  assert.deepEqual(root.children, [a, native]);
  p.restore();
  const effect = new T.Object3D();
  b.add(effect);
  p.prune(entries);
  assert.equal(
    root.children,
    children,
    "a source with a live child stays native in traversal",
  );
  p.dispose();
  assert.equal(root.children, children);
  assert.equal(draws, 2);
});
