import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createSquishToy } from "../public/squish-model.js";
import { createSquishPlayer } from "../public/squish-player.js";

class Element extends EventTarget {
  constructor(doc) {
    super();
    this.ownerDocument = doc;
    this.style = {};
    this.dataset = {};
    this.children = [];
  }
  append(...children) {
    this.children.push(...children);
  }
  setAttribute(k, v) {
    this[k] = v;
  }
  remove() {}
  setPointerCapture() {}
  releasePointerCapture() {}
  getBoundingClientRect() {
    return { x: 0, y: 0, left: 0, top: 0, width: 1000, height: 1000 };
  }
}
function pointer(target, type, x, y) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, { clientX: x, clientY: y, button: 0, pointerId: 17 });
  target.dispatchEvent(e);
}

test("six scoped player actions hold/release real contacts and leave ordinary camera input intact", () => {
  const old = globalThis.document;
  const doc = {
    defaultView: new EventTarget(),
    createElement() {
      return new Element(doc);
    },
  };
  globalThis.document = doc;
  const canvas = new Element(doc),
    container = new Element(doc),
    camera = new T.PerspectiveCamera(48, 1, 0.1, 100);
  const interior = new T.Group(),
    toy = createSquishToy({ material: "slime" });
  interior.add(toy);
  toy.rotation.y = 0.65;
  camera.position.set(0, 6, 10);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld(true);
  interior.updateWorldMatrix(true, true);
  interior.userData.toys = [toy];
  const player = createSquishPlayer({
    canvas,
    camera,
    container,
    getInterior: () => interior,
  });
  let cameraEvents = 0;
  canvas.addEventListener("pointerdown", () => cameraEvents++);
  const orientation = camera.quaternion.clone(),
    solver = toy.userData.solver;
  const button = (mode) =>
    container.children[0].children.find((b) => b.dataset?.squishMode === mode);
  const p = toy.localToWorld(new T.Vector3(0, 2.6, 1.9)).project(camera),
    x = (p.x + 1) * 500,
    y = (1 - p.y) * 500;
  try {
    for (const mode of ["press", "hold", "drag", "stretch", "twist"]) {
      button(mode).onclick();
      pointer(canvas, "pointerdown", x, y);
      assert.equal(solver.contacts.size, 1, mode + " actual hit");
      player.update(0.25);
      pointer(canvas, "pointermove", x + 65, y - 30);
      const c = solver.contacts.get("player");
      assert(c.duration >= 0.25);
      assert.equal(c.kind, mode);
      assert(c.displacement.every(Number.isFinite));
      if (mode === "drag" || mode === "stretch" || mode === "twist")
        assert(
          Math.hypot(c.displacement[0], c.displacement[2]) > 0.02,
          mode + " changes actual local constraint",
        );
      button("release").onclick();
      assert.equal(solver.contacts.size, 0);
    }
    assert.equal(cameraEvents, 0, "material action consumes camera gestures");
    button("camera").onclick();
    pointer(canvas, "pointerdown", x, y);
    assert.equal(cameraEvents, 1, "normal camera gestures pass through");
    assert.deepEqual(camera.quaternion.toArray(), orientation.toArray());
    button("hold").onclick();
    pointer(canvas, "pointerdown", x, y);
    doc.defaultView.dispatchEvent(new Event("blur"));
    assert.equal(solver.contacts.size, 0);
  } finally {
    player.dispose();
    toy.userData.dispose();
    globalThis.document = old;
  }
});
