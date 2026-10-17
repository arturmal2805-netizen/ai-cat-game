import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { createBikiniCharacter } from "../public/bikini-characters.js";
import { createBikiniLife } from "../public/bikini-life.js";
import { CARRY_DURATION, createCarryWalk } from "../public/bikini-carry.js";
import {
  courtObstacles,
  courtSegment,
  courtWalkable,
  nearestCourtIdleGround,
} from "../public/foodcourt-navigation.js";
import { newGame, worldSnapshot } from "../public/economy.js";
import { manualInteraction } from "../public/interactions.js";
import { createResidentPlay } from "../public/resident-play.js";

function setup(scale = 1) {
  const g = createBikiniCharacter("sponge"),
    model = createCat("happy", scale === 1 ? {} : { detail: "npc" }),
    carrier = new THREE.Group();
  model.scale.setScalar(scale);
  carrier.add(model);
  g.position.set(-7, 0.16, 7);
  const obs = courtObstacles([], "bikini"),
    groups = new Map([["bikini-sponge", g]]),
    life = createBikiniLife({
      groups,
      court: { cancel() {} },
      center: [0, 0],
      getObstacles: () => obs,
    });
  return { g, model, carrier, obs, life };
}
function pose(s, time) {
  const f = s.g.userData.playFrame(time);
  s.carrier.position.copy(s.g.localToWorld(new THREE.Vector3(...f.position)));
  s.carrier.rotation.y = f.yaw;
  animateCat(s.model, time, false);
  reactCat(s.model, f.reaction);
  s.g.userData.touchCat(s.model);
  return f;
}
test("carry is a real SpongeBob interaction for the existing physical character", () => {
  const game = newGame();
  game.unlocked.push("bikini");
  const d = manualInteraction(
    worldSnapshot(game),
    { activityId: "bikini-sponge", characterAction: "carry" },
    "happy",
  );
  assert.equal(d.action, "play");
  assert.equal(d.characterAction, "carry");
  assert.throws(() =>
    manualInteraction(
      worldSnapshot(game),
      { activityId: "bikini-patrick", characterAction: "carry" },
      "happy",
    ),
  );
});
test("carry routes clear the real lagoons and buildings, are cached, and return exactly to the pickup spot", () => {
  const obs = courtObstacles([], "bikini");
  for (const radius of [1.45, 2, 2.8]) {
    const route = createCarryWalk({ x: -7, z: 7 }, obs, radius);
    assert.ok(route);
    assert.ok(route.total > 15);
    for (let i = 1; i < route.points.length; i++)
      assert.ok(
        courtSegment(
          route.points[i - 1],
          route.points[i],
          radius,
          obs,
          "bikini",
        ),
      );
    assert.deepEqual(route.points[0], route.points.at(-1));
    for (let i = 0; i <= 1000; i++) {
      const p = route.sample(i / 1000);
      assert.ok(
        courtWalkable({ x: p.x - 7, z: p.z + 7 }, radius, obs, "bikini"),
      );
    }
  }
  assert.equal(createCarryWalk({ x: 0, z: -6 }, obs), null);
});
test("Chichi, tiny kittens and giants stay in both real palms throughout the walk without changing their size", () => {
  for (const scale of [1, 0.36, 1.8]) {
    const s = setup(scale),
      d = s.g.userData;
    assert.equal(
      s.life.reserve("bikini-sponge", "carry", {
        catId: "visitor",
        model: s.model,
      }),
      true,
    );
    let travel = 0,
      last = s.carrier.position.clone();
    for (let t = 0; t <= CARRY_DURATION; t += 0.1) {
      const f = pose(s, t);
      if (t > 8 && t < 32) {
        const exact = d.rig.localToWorld(
          new THREE.Vector3(0, 2 - d.carrySize.bellyY, 0.7 + d.carrySize.depth),
        );
        assert.ok(
          s.carrier.position.distanceTo(exact) < 1e-8,
          "held cat follows the current rig transform",
        );
        for (const [i, arm] of d.arms.entries()) {
          const sign = i ? 1 : -1,
            palm = arm.localToWorld(new THREE.Vector3(sign * 0.4, -1.02, 0.03)),
            belly = s.model.localToWorld(
              new THREE.Vector3(
                sign * 0.24,
                s.model.userData.body.position.y -
                  s.model.userData.body.scale.y * 0.75,
                0,
              ),
            );
          assert.ok(
            palm.distanceTo(belly) < 1e-7,
            "both palms support the animated cat",
          );
        }
        assert.equal(f.walking, false, "held cat is not running in midair");
        travel += s.carrier.position.distanceTo(last);
      }
      assert.ok(
        [
          ...s.carrier.position,
          ...s.model.userData.head.rotation.toArray().slice(0, 3),
        ].every(Number.isFinite),
      );
      assert.equal(s.model.scale.x, scale);
      last.copy(s.carrier.position);
    }
    assert.ok(travel > 8);
    pose(s, CARRY_DURATION);
    d.releasePlay(s.carrier);
    assert.equal(d.playing, false);
    assert.equal(d.carryRoute, null);
    assert.equal(s.carrier.position.y, 0.16);
    assert.ok(courtWalkable(s.carrier.position, 0.45, s.obs, "bikini"));
    disposeCat(s.model);
  }
});
test("cancelling a walk sets the cat on clear ground and leaves SpongeBob at his actual current position", () => {
  const s = setup();
  assert.ok(
    s.life.reserve("bikini-sponge", "carry", {
      catId: "chichi",
      model: s.model,
    }),
  );
  pose(s, 17);
  const actual = s.g.userData.rig.getWorldPosition(new THREE.Vector3());
  s.g.userData.releasePlay(s.carrier);
  assert.ok(
    Math.hypot(actual.x - s.g.position.x, actual.z - s.g.position.z) < 1e-8,
  );
  assert.equal(s.carrier.position.y, 0.16);
  assert.ok(courtWalkable(s.carrier.position, 0.45, s.obs, "bikini"));
  animateCat(s.model, 18, false);
  assert.equal(s.g.userData.playing, false);
  disposeCat(s.model);
});
test("the resident runtime supports complete carrying and safe interruption, while one SpongeBob serves one visitor", () => {
  const s = setup(0.36),
    n = { carrier: s.carrier, model: s.model, profile: { biome: "bikini" } },
    runtime = createResidentPlay({
      getCat: (id) => (id === "tiny" ? n : null),
      getObject: () => s.g,
    });
  assert.ok(
    s.life.reserve("bikini-sponge", "carry", { catId: "tiny", model: s.model }),
  );
  assert.equal(
    s.life.reserve("bikini-sponge", "carry", {
      catId: "other",
      model: s.model,
    }),
    false,
  );
  const decision = {
    activityId: "bikini-sponge",
    characterAction: "carry",
    action: "play",
    mood: "happy",
  };
  assert.ok(runtime.start("tiny", decision, 0));
  runtime.frame("tiny", 10000, 10);
  let frame = runtime.frame("tiny", 24000, 24);
  s.carrier.position.copy(frame.position);
  s.carrier.rotation.y = frame.yaw;
  assert.ok(frame.position.y > 1);
  runtime.cancel("tiny");
  assert.equal(s.carrier.position.y, 0.16);
  assert.equal(s.g.userData.playing, false);
  assert.ok(
    s.life.reserve("bikini-sponge", "carry", { catId: "tiny", model: s.model }),
  );
  assert.ok(runtime.start("tiny", decision, 50000));
  runtime.frame("tiny", 60000, 60);
  frame = runtime.frame("tiny", 60000 + (CARRY_DURATION + 1) * 1000, 101);
  assert.equal(frame.completed, true);
  assert.equal(frame.position.y, 0.16);
  assert.equal(runtime.reserved("bikini-sponge"), false);
  disposeCat(s.model);
});

test("idle city cats park outside the restaurant entrance so the returning chef can reach the kitchen", () => {
  const obs = courtObstacles([], "bikini"),
    park = nearestCourtIdleGround({ x: 11.66, z: -1.4 }, 0.52, obs, "bikini");
  assert.ok(park);
  assert.ok(
    Math.abs(park.x - 13) > 2.7 + 0.52 || Math.abs(park.z + 2.4) > 2.8 + 0.52,
  );
  const groups = new Map();
  for (const [kind, x, z] of [
    ["sponge", 13, 2],
    ["patrick", 8, 17],
  ]) {
    const g = createBikiniCharacter(kind);
    g.position.set(x, 0.16, z);
    groups.set("bikini-" + kind, g);
  }
  const visits = new Map([
    ["customer", { objectId: "bikini-krusty", phase: "order" }],
  ]);
  const life = createBikiniLife({
    groups,
    court: { visits, cancel() {}, get() {}, start() {} },
    center: [0, 0],
    getObstacles: () => obs,
    getActors: () => [
      { catId: "resting", biome: "bikini", position: park, radius: 0.52 },
    ],
  });
  for (
    let i = 0;
    i < 3000 && !groups.get("bikini-sponge").userData.chefReady;
    i++
  )
    life.step(1 / 30, i / 30);
  assert.equal(groups.get("bikini-sponge").userData.chefReady, true);
});
