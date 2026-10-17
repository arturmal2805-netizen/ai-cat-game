import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";
import { courtFood } from "../public/foodcourt-assets.js";
import { placeCourtFood } from "../public/court-food-pose.js";

test("coffee stays ahead of the animated muzzle and its near rim meets the lips at a sip for Chichi, kittens and giant breeds", () => {
  const profiles = [
    null,
    ...["maine", "sphynx", "munchkin", "persian"].map((breed) =>
      ADOPTION_CATS.find((p) => p.breed === breed),
    ),
    ...ADOPTION_CATS.filter((p) => p.size >= 2).slice(-3),
  ];
  const cup = courtFood("coffee"),
    lip = new THREE.Vector3(),
    rim = new THREE.Vector3(),
    center = new THREE.Vector3(),
    forward = new THREE.Vector3();
  for (const profile of profiles) {
    assert.notEqual(profile, undefined);
    const cat = createCat(
        "happy",
        profile ? { detail: "npc", ...catAppearance(profile) } : {},
      ),
      carrier = new THREE.Group();
    carrier.add(cat);
    cat.scale.setScalar(profile ? 0.63 * (profile.size || 1) : 0.95);
    carrier.position.set(12, 0.67, -9);
    for (const yaw of [0, 1.3, Math.PI])
      for (const t of [0, Math.PI / 6, 1.1, 2.8]) {
        carrier.rotation.y = yaw;
        animateCat(cat, t, false);
        reactCat(cat, { paw: 0.4, headPitch: 0.17, headRoll: 0.03 });
        placeCourtFood(cup, cat, carrier, {
          kind: "coffee",
          drinking: true,
          time: t,
        });
        lip
          .copy(cat.userData.mouth.position)
          .applyMatrix4(cat.userData.head.matrixWorld);
        forward.set(Math.sin(yaw), 0, Math.cos(yaw));
        cup.localToWorld(rim.set(0, 0.55, -0.23));
        cup.getWorldPosition(center);
        assert.ok(
          center.sub(lip).dot(forward) > 0.05 * cat.scale.x,
          profile?.id || "Chichi",
        );
        assert.ok(
          rim.sub(lip).dot(forward) >= 0.024 * cat.scale.x,
          "the drinking rim never goes inside the face",
        );
        if (t === Math.PI / 6)
          assert.ok(
            rim.length() < 0.026 * cat.scale.x,
            "lip contact at the top of a sip",
          );
        assert.ok(
          [...cup.position.toArray(), ...cup.quaternion.toArray()].every(
            Number.isFinite,
          ),
        );
      }
    disposeCat(cat);
  }
});

test("bubble tea places the straw at the lips, keeping the cup below the face; carrying lowers it", () => {
  const cat = createCat("happy"),
    carrier = new THREE.Group(),
    cup = courtFood("boba"),
    p = new THREE.Vector3(),
    lip = new THREE.Vector3();
  carrier.add(cat);
  animateCat(cat, 0.5);
  placeCourtFood(cup, cat, carrier, {
    kind: "boba",
    drinking: true,
    time: Math.PI / 6,
  });
  cat.userData.head.localToWorld(lip.copy(cat.userData.mouth.position));
  cup.localToWorld(p.set(0.16, 1, 0));
  assert.ok(p.distanceTo(lip) < 0.026);
  const drinkingY = cup.position.y;
  placeCourtFood(cup, cat, carrier, {
    kind: "boba",
    drinking: false,
    time: Math.PI / 6,
  });
  assert.ok(cup.position.y < drinkingY - 0.15);
  disposeCat(cat);
});
