import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BIOMES,
  byBiome,
  byItem,
  biomeReservations,
} from "../public/game-data.js";
import {
  COTTON_OBJECTS,
  COTTON_POOLS,
  COTTON_RIDES,
  cottonHeight,
} from "../public/cotton-data.js";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";
import {
  newGame,
  loadGame,
  saveGame,
  worldSnapshot,
  SAVE_KEY,
  canPlace,
  findSpace,
} from "../public/economy.js";
import { manualInteraction } from "../public/interactions.js";
import { validateState, parseDecision } from "../ai.mjs";
import { createPig } from "../public/cotton-props.js";
import { batchModelGeometry } from "../public/model-batching.js";
const now = Date.UTC(2026, 9, 15, 12);
function cottonGame() {
  const g = newGame(now);
  g.unlocked.push("clockwork");
  return g;
}

test("cotton candy replaces Clockwork in place, has four times the land and room between neighbors", () => {
  const b = byBiome("clockwork");
  assert.equal(BIOMES.length, 30);
  assert.equal(b.name, "Остров сладкой ваты");
  assert.equal(b.legendary, true);
  assert.ok((b.radius / 11.65) ** 2 > 3.8);
  assert.equal(b.requiredLevel, 18);
  for (const other of BIOMES.filter((o) => o !== b))
    assert.ok(
      Math.hypot(b.center[0] - other.center[0], b.center[1] - other.center[1]) >
        b.radius + (other.radius || 11.65) + 3,
      other.id,
    );
  for (const o of COTTON_OBJECTS)
    assert.ok(biomeReservations(b.id).some((r) => r.x === o.x && r.z === o.z));
  // The former building yard stays flat, so old purchased buildings are safe.
  for (let x = -10; x <= 10; x++)
    for (let z = -10; z <= 10; z++)
      if (Math.hypot(x, z) < 10.8) assert.equal(cottonHeight(x, z), 0);
});
test("all four attractions and all three pigs can be ridden manually and chosen by AI only on open land", () => {
  const g = cottonGame(),
    world = worldSnapshot(g),
    state = validateState({
      ...g.cat,
      energy: 90,
      hunger: 10,
      happiness: 90,
      world,
    });
  assert.equal(COTTON_OBJECTS.length, 7);
  for (const o of COTTON_OBJECTS) {
    assert.equal(manualInteraction(world, { activityId: o.id }).action, "ride");
    const choice = parseDecision(
      {
        mood: "happy",
        action: "ride",
        activityId: o.id,
        thought: "Хочу прокатиться на выбранном аттракционе!",
      },
      state,
    );
    assert.equal(choice.activityId, o.id);
    assert.throws(() =>
      manualInteraction(worldSnapshot(newGame(now)), { activityId: o.id }),
    );
    assert.ok(byItem(o.type).actions.includes("ride"));
  }
  for (const p of COTTON_POOLS) {
    assert.equal(manualInteraction(world, { activityId: p.id }).action, "swim");
    assert.equal(canPlace(g, "yarn", "clockwork", p.x, p.z).ok, false);
  }
});
test("each physical ride follows its actual animated seat on a finite closed route, including after reduced motion", () => {
  for (const s of COTTON_RIDES) {
    const g = makeAttraction(s.id),
      { rideFrame: frame, duration } = g.userData;
    assert.ok(duration >= 16);
    assert.ok(
      new THREE.Vector3(...frame(0).position).distanceTo(
        new THREE.Vector3(...frame(duration).position),
      ) < 0.01,
      s.id,
    );
    let height = 0,
      travel = 0,
      previous;
    for (let t = 0; t <= duration; t += 0.2) {
      const f = frame(t);
      assert.ok([...f.position, f.yaw].every(Number.isFinite), s.id);
      height = Math.max(height, f.position[1]);
      if (previous)
        travel += new THREE.Vector3(...previous).distanceTo(
          new THREE.Vector3(...f.position),
        );
      previous = f.position;
      g.userData.rideElapsed = t;
      g.userData.update(999);
      let seat;
      if (s.id.startsWith("ride-pig-"))
        seat = g.userData.moving.position
          .clone()
          .add(
            new THREE.Vector3(
              0,
              1.56 + g.userData.moving.children[0].userData.body.position.y,
              0,
            ),
          );
      else if (s.id === "ride-cupcake-wheel")
        seat = g.userData.vehicles[0].position
          .clone()
          .add(new THREE.Vector3(0, 0.66, 0));
      else if (s.id === "coaster-piglet-express")
        seat = g.userData.vehicles[0].position
          .clone()
          .add(new THREE.Vector3(0, 0.43, 0));
      else if (s.id === "ride-sugar-teacups")
        seat = g.userData.vehicles[0].position
          .clone()
          .add(new THREE.Vector3(0, 0.33, 0));
      else
        seat = g.userData.vehicles[1].position
          .clone()
          .add(new THREE.Vector3(0, 0.3, 0));
      assert.ok(
        seat.distanceTo(new THREE.Vector3(...f.position)) < 1e-5,
        s.id + " seat",
      );
    }
    assert.ok(travel > 7, s.id);
    if (!s.id.startsWith("ride-pig-") && s.id !== "ride-sugar-teacups")
      assert.ok(height > 5, s.id);
    delete g.userData.rideElapsed;
    animateAttraction(g, 4);
    g.userData.update(10, true);
    assert.ok(frame(10, true).position.every(Number.isFinite));
    disposeBiome(g);
  }
});
test("the island has real pink swimming openings, animated falls, an instanced piglet crowd and separate distant geometry", () => {
  const s = createBiomeScene(byBiome("clockwork"), { preview: true });
  assert.equal(s.userData.lagoons.size, 3);
  assert.equal(s.userData.cotton.mother.visible, true);
  assert.equal(s.userData.cotton.waterfalls.length, 8);
  assert.ok(s.userData.cotton.piglets.length >= 16);
  assert.equal(s.userData.stats.staticMeshes, 6);
  s.updateMatrixWorld(true);
  for (const p of COTTON_POOLS) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(p.x, p.y + 1, p.z),
      new THREE.Vector3(0, -1, 0),
    );
    const top = s.userData.navigationSurface.children.filter(
      (m) => m.geometry?.type === "ExtrudeGeometry",
    );
    assert.ok(
      !ray
        .intersectObjects(top)
        .some((hit) => Math.abs(hit.point.y - (p.y + 0.14)) < 0.1),
      p.id,
    );
    assert.ok(
      !ray
        .intersectObjects(s.userData.navigationSurface.children)
        .some((hit) => hit.point.y > p.y - 0.6 && hit.point.y < p.y + 0.2),
      p.id + " must expose its fish and lake floor",
    );
    const lagoon = s.userData.lagoons.get(p.id);
    assert.equal(
      lagoon.userData.water.uniforms.uColor.value.getHex(),
      0xed83ba,
    );
  }
  const f = s.userData.cotton.waterfalls[0];
  s.userData.update(4);
  const before = [
    ...f.children.find((c) => c.isInstancedMesh).instanceMatrix.array,
  ];
  s.userData.update(5);
  assert.notDeepEqual(
    [...f.children.find((c) => c.isInstancedMesh).instanceMatrix.array],
    before,
  );
  disposeBiome(s);
  const distant = createBiomeScene(byBiome("clockwork"), { lowOnly: true });
  assert.equal(distant.userData.detail.visible, false);
  assert.equal(distant.userData.lowDetail.visible, true);
  assert.equal(distant.userData.stats.fishCount, 0);
  disposeBiome(distant);
});
test("pigs have separate trot, blink and ear rigs rather than a stationary prop", () => {
  const p = createPig({ saddle: true }),
    { legs, ears, eyes } = p.userData;
  p.userData.update(1);
  const a = legs.map((l) => l.rotation.x),
    b = ears.map((e) => e.rotation.x);
  p.userData.update(2);
  assert.notDeepEqual(
    legs.map((l) => l.rotation.x),
    a,
  );
  assert.notDeepEqual(
    ears.map((e) => e.rotation.x),
    b,
  );
  p.userData.update(4.75);
  assert.ok(eyes.every((e) => e.scale.y < 0.2));
  p.userData.update(10, true);
  assert.ok(legs.every((l) => l.rotation.x === 0));
  disposeBiome(p);
});
test("old Clockwork purchases, construction and farm timers, scenery IDs and coins survive repeated reloads", () => {
  let g = cottonGame();
  g.coins = 8765;
  const spot = findSpace(g, "farm-field", "clockwork");
  assert.ok(spot);
  g.placements.push({
    id: "old-clock-farm",
    item: "farm-field",
    biome: "clockwork",
    x: spot.x,
    z: spot.z,
    rotation: 0,
    readyAt: now + 14400000,
  });
  g.farm.fields["old-clock-farm"] = [
    { crop: "wheat", readyAt: now + 1800000 },
    { crop: null, readyAt: 0 },
    { crop: null, readyAt: 0 },
  ];
  g.catPosition = { biome: "clockwork", x: 0, z: 9 };
  const expected = structuredClone(g),
    map = new Map(),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  for (let i = 0; i < 30; i++) {
    assert.ok(saveGame(storage, g));
    g = loadGame(storage, now, { advance: false });
    assert.equal(g.coins, expected.coins);
    assert.deepEqual(g.placements, expected.placements);
    assert.deepEqual(g.farm.fields, expected.farm.fields);
    assert.deepEqual(g.catPosition, expected.catPosition);
    assert.deepEqual(
      g.scenery,
      expected.scenery.map((r) => ({ ...r, stored: !!r.stored })),
    );
    assert.ok(g.unlocked.includes("clockwork"));
    assert.ok(JSON.parse(storage.getItem(SAVE_KEY)));
  }
});
test("pastel batching preserves source colors, maps and geometry while reducing draw calls", () => {
  const root = new THREE.Group();
  for (const color of [0xff99cc, 0xbbaaff, 0x99ddee]) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color, roughness: 0.42 }),
    );
    root.add(m);
  }
  const batch = batchModelGeometry(root, { combineColors: true });
  assert.equal(batch.children.length, 1);
  assert.equal(batch.children[0].material.roughness, 0.42);
  assert.equal(batch.children[0].material.vertexColors, true);
  const colors = batch.children[0].geometry.attributes.color;
  assert.equal(
    new Set(Array.from(colors.array).map((v) => v.toFixed(4))).size > 3,
    true,
  );
  disposeBiome(batch);
  disposeBiome(root);
});
