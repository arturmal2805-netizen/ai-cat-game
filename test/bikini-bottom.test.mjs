import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { BIOMES, byBiome } from "../public/game-data.js";
import {
  BIKINI_RADIUS,
  BIKINI_FRIENDS,
  BIKINI_POOLS,
  BIKINI_RESTAURANT,
  BIKINI_ACTIONS,
} from "../public/bikini-data.js";
import { createBiomeScene } from "../public/biome-scenes.js";
import {
  createBikiniCharacter,
  bikiniFriendFrame,
  FRIEND_DURATIONS,
} from "../public/bikini-characters.js";
import { createBikiniLife } from "../public/bikini-life.js";
import { courtVenue } from "../public/foodcourt-assets.js";
import {
  courtObstacles,
  courtWalkable,
  courtPath,
  courtSegment,
} from "../public/foodcourt-navigation.js";
import { createCourtRuntime } from "../public/foodcourt-runtime.js";
import {
  newGame,
  unlockBiome,
  saveGame,
  loadGame,
  worldSnapshot,
} from "../public/economy.js";
import { manualInteraction } from "../public/interactions.js";
import { xpForLevel } from "../public/progression.js";
import { incomeFor, collectIncome } from "../public/business.js";
import { completeSpaVisit } from "../public/spa-system.js";
const now = Date.UTC(2026, 9, 17);
test("Bikini Bottom appends seven ordinary island areas without moving, replacing or changing any established island", () => {
  assert.deepEqual(
    BIOMES.filter((b) => !["bikini", "homestead", "aquarium", "jobcity"].includes(b.id)),
    JSON.parse(
      fs.readFileSync(
        new URL("./fixtures/bikini-unaffected-biomes.json", import.meta.url),
      ),
    ),
  );
  assert.equal(BIOMES.length, 29);
  assert.ok(Math.abs(BIKINI_RADIUS ** 2 / 11.65 ** 2 - 7) < 1e-10);
});
test("the sky city has actual lagoon openings, submerged bottoms, deep cliffs and animated water", () => {
  const g = createBiomeScene(byBiome("bikini"), { scenery: [] });
  g.updateMatrixWorld(true);
  assert.equal(g.userData.lagoons.size, 2);
  const groundRay = new THREE.Raycaster(
    new THREE.Vector3(0, 20, 15),
    new THREE.Vector3(0, -1, 0),
  );
  assert.ok(
    groundRay
      .intersectObject(g.userData.navigationSurface, true)
      .every((hit) => hit.point.y <= 0.151),
    "cliff top stays below the walkable ground",
  );
  for (const p of BIKINI_POOLS) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(p.x, 20, p.z),
      new THREE.Vector3(0, -1, 0),
    );
    assert.ok(
      ray
        .intersectObject(g.userData.navigationSurface, true)
        .every((hit) => hit.point.y < -2),
      "no ground or cliff cap covers the water",
    );
    const pool = g.userData.lagoons.get(p.id);
    assert.ok(pool.userData.bed.position.y < 0);
  }
  assert.ok(new THREE.Box3().setFromObject(g).min.y < -15);
  g.userData.update(3);
  g.userData.dispose();
});
test("city routes and the restaurant doorway clear cats without passing through homes, lagoons or tables", () => {
  const obs = courtObstacles([], "bikini");
  for (const radius of [0.45, 0.7, 1.1])
    for (const goal of [
      { x: -17, z: -5 },
      { x: -7, z: 10 },
      { x: 8, z: 22 },
      { x: 13, z: -6.35 },
      { x: 9.35, z: -5.7 },
    ]) {
      const from = { x: 0, z: 27 },
        path = courtPath(from, goal, radius, obs, "bikini");
      assert.ok(path, JSON.stringify({ radius, goal }));
      let p = from;
      for (const q of path) {
        assert.ok(courtSegment(p, q, radius, obs, "bikini"));
        p = q;
      }
    }
  assert.equal(courtWalkable({ x: 0, z: -6 }, 0.5, obs, "bikini"), false);
  assert.equal(courtWalkable({ x: -17, z: -12 }, 0.5, obs, "bikini"), false);
});
test("every friendship has continuous finite transitions; bubble play runs and jumps, five reaches a paw, and all actions return gently", () => {
  for (const [kind, actions] of Object.entries(BIKINI_ACTIONS))
    for (const [intent] of actions) {
      let previous = bikiniFriendFrame(0, intent, kind),
        travel = 0,
        jump = 0,
        paw = 0;
      for (let t = 0.01; t <= FRIEND_DURATIONS[intent]; t += 0.01) {
        const f = bikiniFriendFrame(t, intent, kind);
        const d = new THREE.Vector3(...f.position).distanceTo(
          new THREE.Vector3(...previous.position),
        );
        assert.ok(d < 0.15, `${intent} jumps ${d} at ${t}`);
        travel += d;
        jump = Math.max(jump, f.position[1]);
        paw = Math.max(paw, f.paw);
        assert.ok(
          [
            ...f.position,
            f.yaw,
            ...Object.values(f.character).filter((v) => typeof v === "number"),
          ].every(Number.isFinite),
        );
        previous = f;
      }
      const end = bikiniFriendFrame(FRIEND_DURATIONS[intent], intent, kind);
      assert.ok(
        new THREE.Vector3(...end.position).distanceTo(
          new THREE.Vector3(0.5, 0, 2.65),
        ) < 1e-8,
      );
      if (intent === "play") {
        assert.ok(travel > 20);
        assert.ok(jump > 0.6);
      }
      if (intent === "five") assert.ok(paw > 0.6);
      assert.equal(bikiniFriendFrame(8, intent, kind, true).position[1], 0);
    }
});
test("one SpongeBob physically walks to the kitchen before preparing and handing over a real burger; Patrick also visits", () => {
  const groups = new Map(),
    center = [0, 0],
    obs = courtObstacles([], "bikini"),
    completed = [];
  for (const f of BIKINI_FRIENDS) {
    const g = createBikiniCharacter(f.kind);
    g.position.set(f.x, 0.16, f.z);
    groups.set(f.id, g);
  }
  const building = courtVenue(BIKINI_RESTAURANT, { staff: false });
  groups.set(BIKINI_RESTAURANT.id, building);
  assert.ok(building.userData.roof);
  assert.equal(building.userData.staff, undefined);
  let life;
  const court = createCourtRuntime({
    canPrepare: (o) => life.canPrepare(o),
    onComplete: (r) => completed.push(r),
  });
  life = createBikiniLife({ groups, court, center, getObstacles: () => obs });
  const v = court.start({
    catId: "chichi",
    objectId: "bikini-krusty",
    position: { x: 0, z: 27 },
  });
  assert.ok(v);
  const phases = new Set();
  let visibleFood = false,
    startedCooking = false;
  for (let i = 0; i < 14000; i++) {
    const time = i * 0.05;
    life.step(0.05, time);
    court.step(0.05, time);
    const visit = court.get("chichi");
    if (visit) {
      phases.add(visit.phase);
      if (visit.phase === "prepare") {
        assert.equal(life.canPrepare(BIKINI_RESTAURANT), true);
        startedCooking = true;
      }
    }
    visibleFood ||= building.userData.servingFood.visible;
    if (
      completed.some((r) => r.catId === "chichi") &&
      completed.some((r) => r.catId === "bikini-patrick-guest")
    )
      break;
  }
  assert.ok(startedCooking && visibleFood);
  for (const phase of ["prepare", "serve", "consume", "leave"])
    assert.ok(phases.has(phase), phase);
  assert.ok(completed.some((r) => r.catId === "chichi"));
  assert.ok(completed.some((r) => r.catId === "bikini-patrick-guest"));
  assert.ok(
    life.reserve("bikini-sponge", "five") ||
      groups.get("bikini-sponge").userData.chefBusy,
  );
});
test("unlock, restaurant income/XP, food and city coordinates use existing durable saves and idempotent receipts", () => {
  let g = newGame(now);
  g.coins = 10000;
  g.progression.xp = xpForLevel(5);
  g = unlockBiome(g, "bikini", now);
  const choice = manualInteraction(
    worldSnapshot(g),
    { activityId: "bikini-sponge", characterAction: "hug" },
    "happy",
  );
  assert.equal(choice.characterAction, "hug");
  assert.throws(() =>
    manualInteraction(
      worldSnapshot(g),
      { activityId: "bikini-patrick", characterAction: "hug" },
      "happy",
    ),
  );
  const receipt = {
    id: "bikini-meal-1",
    catId: "chichi",
    objectId: "bikini-krusty",
    position: { x: 13, z: 3 },
  };
  g = completeSpaVisit(g, receipt, now + 100);
  assert.equal(completeSpaVisit(g, receipt, now + 101), g);
  assert.equal(g.catPosition.biome, "bikini");
  assert.ok(incomeFor(g, "bikini-krusty", now + 3600000) > 0);
  const result = collectIncome(g, "bikini-krusty", now + 3600000);
  assert.ok(result.game.progression.xp > g.progression.xp);
  g = result.game;
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
    };
  for (let i = 0; i < 20; i++) {
    saveGame(storage, g);
    const restored = loadGame(storage, now + 3600000, { advance: false });
    assert.equal(restored.coins, g.coins);
    assert.equal(restored.progression.xp, g.progression.xp);
    assert.deepEqual(restored.catPosition, g.catPosition);
    assert.ok(restored.unlocked.includes("bikini"));
    g = restored;
  }
});

test("a high-five places SpongeBob's actual palm at the animated cat paw", () => {
  const g = createBikiniCharacter("sponge"),
    cat = createCat("happy"),
    carrier = new THREE.Group();
  carrier.add(cat);
  g.position.set(4, 0.16, 8);
  g.userData.setIntent("five");
  const f = g.userData.playFrame(6);
  carrier.position.copy(g.localToWorld(new THREE.Vector3(...f.position)));
  carrier.rotation.y = f.yaw;
  animateCat(cat, 6, false);
  reactCat(cat, f.reaction);
  g.userData.touchCat(cat);
  const palm = g.userData.arms[1].localToWorld(
    new THREE.Vector3(0.4, -1.02, 0.03),
  );
  const index = cat.userData.legs.findIndex(
    (l) => l.position.z > 0 && l.position.x < 0,
  );
  const paw = cat.userData.legJoints[index].ankle.localToWorld(
    new THREE.Vector3(0, -0.1, 0.1),
  );
  assert.ok(
    palm.distanceTo(paw) < 0.025,
    `palm/paw gap ${palm.distanceTo(paw)}`,
  );
  disposeCat(cat);
});
