import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createSquishNavigation } from "../public/squish-navigation.js";
import { createSquishManual } from "../public/squish-manual.js";
import { createSquishToy } from "../public/squish-model.js";
function setup() {
  const interior = new T.Group(),
    toy = createSquishToy();
  toy.position.y = 0.35;
  interior.add(toy);
  interior.userData = { toys: [toy] };
  const actor = { position: new T.Vector3(0, 0, 4.8), yaw: Math.PI },
    nav = createSquishNavigation({
      getInterior: () => interior,
      floor: 0,
      inside: (p) => Math.abs(p.x) < 20 && Math.abs(p.z) < 20,
    }),
    manual = createSquishManual({
      getActor: () => actor,
      getNavigation: () => nav,
      isActive: () => true,
      getRadius: () => 0.3,
      floor: 0,
    });
  return { toy, actor, nav, manual };
}
test("floor walking cannot pass through the body; manual jump lands on actual toy skin", () => {
  const { toy, actor, nav, manual } = setup();
  const blocked = nav.support({ x: 0, y: 0, z: 0 }, 0.3);
  assert(
    blocked === null || blocked.y > 2,
    "not an invisible floor through the toy",
  );
  manual.transport({ forward: 1, side: 0, heading: Math.PI, jump: true });
  let max = 0,
    landed = false;
  for (let i = 0; i < 150; i++) {
    manual.update(1 / 60);
    const f = manual.frame;
    actor.position.copy(f.position);
    max = Math.max(max, f.position.y);
    if (i === 45)
      manual.transport({ forward: 0, side: 0, heading: Math.PI, jump: false });
    if (i > 60 && !manual.airborne && f.squish) {
      landed = true;
      assert(
        Math.abs(
          f.position.y - toy.userData.surface(f.position.x, f.position.z),
        ) < 0.02,
      );
      break;
    }
  }
  assert(max > 3);
  assert(landed, "real jump reaches a supported soft surface");
  toy.userData.dispose();
});
test("manual release while airborne keeps ownership until a gravity-based landing on a clear floor", () => {
  const { toy, actor, manual } = setup();
  manual.transport({ forward: 1, side: 0, heading: Math.PI, jump: true });
  let released = false;
  for (let i = 0; i < 600; i++) {
    manual.update(1 / 60);
    const f = manual.frame;
    actor.position.copy(f.position);
    if (i === 40) {
      assert(manual.airborne);
      assert.equal(manual.requestRelease(), false);
    }
    if (manual.safeToRelease) {
      released = true;
      assert(Math.abs(f.position.y) < 0.1);
      assert.equal(f.squish, null);
      break;
    }
  }
  assert(released);
  toy.userData.dispose();
});

test("manual camera cannot cut through the actual soft skin", () => {
  const { toy, nav } = setup();
  assert.equal(
    nav.cameraClear(new T.Vector3(0, 2, 5), new T.Vector3(0, 2, -5)),
    false,
  );
  assert.equal(
    nav.cameraClear(new T.Vector3(0, 8, 5), new T.Vector3(0, 8, -5)),
    true,
  );
  toy.userData.dispose();
});
