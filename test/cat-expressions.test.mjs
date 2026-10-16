import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createCat,
  animateCat,
  setCatMood,
  emoteCat,
  disposeCat,
  moodNames,
} from "../public/cat-model.js";
import {
  CAT_EXPRESSIONS,
  EXPRESSION_DURATION,
  expressionFrame,
} from "../public/cat-emotions.js";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";

test("both neighbour eye backings match the coat rather than exposing a black socket wedge", () => {
  for (const profile of ADOPTION_CATS) {
    const cat = createCat("happy", {
      ...catAppearance(profile),
      detail: "npc",
    });
    cat.updateMatrixWorld(true);
    for (const eye of cat.userData.eyes) {
      const globe = eye.children[0],
        backing = globe.getObjectByName(
          "EyeRim" + (eye === cat.userData.eyes[0] ? -1 : 1),
        ),
        ray = new THREE.Raycaster(
          globe.localToWorld(new THREE.Vector3(0, 0, -1)),
          new THREE.Vector3(0, 0, 1).transformDirection(globe.matrixWorld),
        ),
        hit = ray.intersectObject(backing, false)[0];
      assert.ok(hit, profile.id);
      const colors = backing.geometry.attributes.color,
        tint = new THREE.Color()
          .fromBufferAttribute(colors, hit.face.a)
          .multiply(backing.material.color),
        coat = new THREE.Color(profile.color);
      // Crowd attributes use half floats; allow their existing quantisation.
      assert.ok(
        Math.abs(tint.r - coat.r) +
          Math.abs(tint.g - coat.g) +
          Math.abs(tint.b - coat.b) <
          0.002,
        profile.id,
      );
    }
    disposeCat(cat);
  }
});

test("tongues stay inside the mouth through jaw opening, mood transitions and every breed", () => {
  for (const profile of [null, ...ADOPTION_CATS]) {
    const cat = createCat(
        "happy",
        profile ? { ...catAppearance(profile), detail: "npc" } : {},
      ),
      d = cat.userData;
    for (const mood of moodNames) {
      setCatMood(cat, mood);
      for (let frame = 0; frame < 90; frame++) {
        animateCat(cat, frame / 60);
        cat.updateMatrixWorld(true);
        if (!d.tongue.visible) continue;
        const tongue = d.head.worldToLocal(
          d.tongue.getWorldPosition(new THREE.Vector3()),
        );
        assert.ok(
          Math.abs(tongue.y - d.mouth.position.y) < 0.007,
          profile?.id || "Chichi",
        );
        assert.ok(Math.abs(tongue.x) < 1e-5);
        assert.ok(
          tongue.z > d.mouth.position.z && tongue.z < d.mouth.position.z + 0.04,
        );
      }
    }
    disposeCat(cat);
  }
});
test("short expressions ease in and out, reuse their frame and preserve the three saved AI moods", () => {
  assert.deepEqual(moodNames, ["sleep", "crazy hungry", "happy"]);
  const frame = {};
  for (const name of CAT_EXPRESSIONS) {
    const neutral = { ...expressionFrame(name, 0) };
    assert.deepEqual(expressionFrame(name, EXPRESSION_DURATION), neutral);
    assert.equal(expressionFrame(name, 1.2, frame), frame);
    assert.notDeepEqual(frame, neutral);
    for (const t of [0.001, EXPRESSION_DURATION - 0.001])
      for (const [key, value] of Object.entries(expressionFrame(name, t)))
        assert.ok(Math.abs(value - neutral[key]) < 0.001, name + ":" + key);
  }
  const cat = createCat();
  animateCat(cat, 0);
  const geometry = cat.userData.body.geometry;
  for (const name of CAT_EXPRESSIONS) {
    emoteCat(cat, name);
    const start = cat.userData.lastTime;
    for (let i = 1; i <= 180; i++) {
      animateCat(cat, start + i / 60);
      cat.updateMatrixWorld(true);
      cat.traverse((o) =>
        assert.ok(o.matrixWorld.elements.every(Number.isFinite)),
      );
    }
    assert.equal(cat.userData.mood, "happy");
    assert.equal(cat.userData.body.geometry, geometry);
    assert.equal(cat.userData.expression, null);
  }
  disposeCat(cat);
});
test("expressions never accumulate, disturb sleep, or keep moving after reduced motion is enabled", () => {
  const cat = createCat();
  animateCat(cat, 0);
  emoteCat(cat, "affectionate");
  animateCat(cat, 1.4);
  assert.ok(cat.userData.eyes[0].scale.y < 0.05);
  animateCat(cat, 1.4);
  const pose = cat.userData.head.quaternion.toArray();
  animateCat(cat, 1.4);
  assert.deepEqual(cat.userData.head.quaternion.toArray(), pose);
  animateCat(cat, 1.5, false, true);
  const reduced = cat.userData.head.quaternion.toArray();
  animateCat(cat, 8, true, true);
  assert.deepEqual(cat.userData.head.quaternion.toArray(), reduced);
  assert.equal(cat.userData.eyes[0].scale.y, 1);
  setCatMood(cat, "sleep", { immediate: true });
  animateCat(cat, 12);
  assert.ok(cat.userData.eyes.every((e) => e.scale.y < 0.05));
  assert.equal(cat.userData.tongue.visible, false);
  const neighbor = createCat("happy", catAppearance(ADOPTION_CATS[0]));
  emoteCat(neighbor, "delighted");
  assert.equal(neighbor.userData.expression, undefined);
  disposeCat(neighbor);
  disposeCat(cat);
});
