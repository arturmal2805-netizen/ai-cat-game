import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ADOPTION_CATS, BREEDS, catAppearance } from "../public/cat-breeds.js";
import { BUSINESSES } from "../public/business-data.js";
import { CITY_RIDES } from "../public/city-ride-data.js";
import { CATALOG, BIOMES, byItem, byBiome } from "../public/game-data.js";
import {
  newGame,
  claimRewards,
  purchase,
  placeItem,
  findSpace,
  harvestField,
  sellHarvest,
  plantCrop,
  unlockBiome,
  saveGame,
  loadGame,
  worldSnapshot,
} from "../public/economy.js";
import {
  collectIncome,
  collectAllIncome,
  incomeFor,
  normalizeBusiness,
  businessXP,
} from "../public/business.js";
import { xpForLevel, levelForXP, purchaseXP } from "../public/progression.js";
import { createCat, animateCat, disposeCat } from "../public/cat-model.js";
import { makeAttraction } from "../public/world-assets.js";
import {
  manualInteraction,
  MAX_DECISION_BYTES,
} from "../public/interactions.js";
import worker from "../worker.mjs";
const now = Date.UTC(2026, 9, 15, 12);
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
  };
};

test("32 adoptable cats include 26 distinct breeds with preserved ear, coat and tail traits", () => {
  assert.equal(ADOPTION_CATS.length, 32);
  assert.equal(Object.keys(BREEDS).length, 26);
  assert.equal(new Set(ADOPTION_CATS.map((c) => c.id)).size, 32);
  assert.equal(ADOPTION_CATS.filter((c) => c.breed === "sphynx").length, 1);
  const models = Object.fromEntries(
    ["scottish", "bengal", "abyssinian", "bobtail", "norwegian"].map(
      (breed) => [
        breed,
        createCat("happy", catAppearance({ breed, color: 0x9ca9a1 })),
      ],
    ),
  );
  for (const model of Object.values(models)) animateCat(model, 2, false, true);
  assert.ok(models.scottish.userData.ears[0].rotation.x > 0.8);
  assert.equal(models.bobtail.userData.tail.scale.x, 0.28);
  assert.ok(models.norwegian.getObjectByName("NeckRuff"));
  assert.notDeepEqual(
    models.bengal.getObjectByName("Body").geometry.attributes.color.array,
    models.abyssinian.getObjectByName("Body").geometry.attributes.color.array,
  );
  Object.values(models).forEach(disposeCat);
});
test("an affordable first-level stall and a second-level lemonade stand fit the untouched starter island", () => {
  let g = newGame(now);
  const spot = findSpace(g, "business-farmstand", "moon");
  assert.ok(spot);
  g = placeItem(
    purchase(g, "business-farmstand", now),
    "business-farmstand",
    "moon",
    spot.x,
    spot.z,
    0,
    now,
  );
  const id = g.placements.at(-1).id;
  assert.equal(g.coins, 240);
  assert.equal(incomeFor(g, id, now + 299999), 0);
  assert.equal(incomeFor(g, id, now + 365 * 60000), 960);
  g.progression.xp = xpForLevel(2);
  g.coins = 1000;
  assert.ok(findSpace(g, "business-lemonade", "moon"));
});
test("collect all awards exact income and XP once, and persisted building deadlines remain absolute", () => {
  let g = newGame(now);
  g.unlocked.push("summer");
  for (const [i, item] of ["business-coffee", "business-pizza"].entries()) {
    const biome = i ? "summer" : "moon",
      spot = findSpace(g, item, biome);
    assert.ok(spot);
    g.placements.push({
      id: "income-" + i,
      item,
      biome,
      x: spot.x,
      z: spot.z,
      rotation: 0,
      readyAt: now + 3600000,
    });
  }
  g.business = normalizeBusiness(null, g, now);
  assert.throws(() => collectAllIncome(g, now + 3599999));
  const at = now + 7200000,
    single = collectIncome(
      collectIncome(g, "income-0", at).game,
      "income-1",
      at,
    ),
    all = collectAllIncome(g, at);
  assert.equal(all.amount, 680);
  assert.equal(
    all.xp,
    businessXP("business-coffee") + businessXP("business-pizza"),
  );
  assert.deepEqual(all.game, single.game);
  assert.throws(() => collectAllIncome(all.game, at));
  const store = memory();
  saveGame(store, all.game);
  const restored = loadGame(store, at);
  assert.equal(restored.coins, all.game.coins);
  assert.equal(restored.progression.xp, all.game.progression.xp);
  assert.equal(
    restored.placements.find((p) => p.id === "income-0").readyAt,
    now + 3600000,
  );
  assert.equal(incomeFor(restored, "income-0", at), 0);
});
test("active starter farming plus two compact businesses funds the level-four whale lagoon within 90 game minutes", () => {
  let g = claimRewards(newGame(now), now, true).game,
    opened = null;
  const buy = (item, at) => {
    const spot = findSpace(g, item, "moon");
    assert.ok(spot, item);
    g = placeItem(purchase(g, item, at), item, "moon", spot.x, spot.z, 0, at);
  };
  g = sellHarvest(harvestField(g, "welcome-farm", now).game).game;
  buy("business-farmstand", now);
  for (let minute = 0; minute <= 90; minute += 3) {
    const at = now + minute * 60000;
    if (minute) g = sellHarvest(harvestField(g, "welcome-farm", at).game).game;
    if (g.placements.some((p) => incomeFor(g, p.id, at) > 0))
      g = collectAllIncome(g, at).game;
    g = claimRewards(g, at).game;
    if (
      !g.placements.some((p) => p.item === "business-lemonade") &&
      levelForXP(g.progression.xp) >= 2 &&
      g.coins >= byItem("business-lemonade").price
    )
      buy("business-lemonade", at);
    if (
      opened === null &&
      levelForXP(g.progression.xp) >= 4 &&
      g.coins >= byBiome("winter").price
    ) {
      g = unlockBiome(g, "winter", at);
      opened = minute;
    }
    for (let i = 0; i < 3; i++)
      g = plantCrop(g, "welcome-farm", i, "wheat", at);
  }
  assert.ok(opened !== null && opened <= 90);
  assert.ok(g.coins >= 0);
  assert.ok(levelForXP(g.progression.xp) < 8);
  assert.equal(g.unlocked.includes("aquapark"), false);
});
test("both purchased whales and their lagoon require exactly level four, while saved ownership remains usable", () => {
  let g = newGame(now);
  g.coins = 50000;
  g.progression.xp = xpForLevel(3);
  assert.throws(() => purchase(g, "ride-whale", now), /уровне 4/);
  assert.throws(() => unlockBiome(g, "winter", now), /уровне 4/);
  g.progression.xp = xpForLevel(4);
  for (const id of ["ride-whale", "ride-whale-aurora"])
    assert.ok(purchase(g, id, now).inventory[id]);
  g = unlockBiome(g, "winter", now);
  assert.equal(
    manualInteraction(worldSnapshot(g), { activityId: "island-whale-blue" })
      .action,
    "ride",
  );
});
test("eight city attractions have distinct continuous closed journeys, animated rigs and luminous model detail", () => {
  assert.equal(CITY_RIDES.length, 8);
  assert.equal(BUSINESSES.length, 14);
  assert.equal(CATALOG.length, 108);
  const paths = [];
  for (const spec of CITY_RIDES) {
    const g = makeAttraction(spec.id),
      f = g.userData.rideFrame,
      duration = g.userData.duration;
    assert.ok(
      new THREE.Vector3(...f(0).position).distanceTo(
        new THREE.Vector3(...f(duration).position),
      ) < 0.01,
      spec.id,
    );
    let previous = f(0);
    const path = [];
    for (let t = 0; t <= duration; t += 0.1) {
      const p = f(t);
      assert.ok(p.position.every(Number.isFinite));
      assert.ok(
        new THREE.Vector3(...p.position).distanceTo(
          new THREE.Vector3(...previous.position),
        ) < 1.5,
        spec.id,
      );
      path.push(p.position);
      previous = p;
    }
    paths.push(JSON.stringify(path));
    g.userData.update(2);
    g.userData.moving.updateMatrix();
    const before = g.userData.moving.matrix.clone();
    g.userData.update(4);
    g.userData.moving.updateMatrix();
    assert.notDeepEqual(g.userData.moving.matrix, before);
    for (let t = 0; t <= duration; t++)
      assert.deepEqual(f(t, true).position, f(0, true).position);
    assert.ok(
      new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).length() >
        4,
    );
  }
  assert.equal(new Set(paths).size, 8);
  for (const b of BUSINESSES) {
    const g = makeAttraction(b.id);
    assert.ok(g.userData.staff);
    assert.equal(g.userData.guests.length, 2);
    let glow = false;
    g.traverse((o) => {
      if (o.isMesh && o.material.emissiveIntensity > 0) glow = true;
    });
    assert.ok(glow, b.id);
  }
});
test("the bounded AI endpoint accepts all 60 cats with 110 physical targets and rejects oversized requests", async () => {
  const g = newGame(now);
  g.unlocked = BIOMES.map((b) => b.id);
  g.adoption.cats = ADOPTION_CATS.map((c) => ({ id: c.id, homeBiome: "moon" }));
  g.placements = Array.from({ length: 60 }, (_, i) => ({
    id: "full-" + i,
    item: "yarn",
    biome: "moon",
    x: 0,
    z: 0,
    rotation: 0,
    readyAt: 0,
  }));
  const body = JSON.stringify({ ...g.cat, world: worldSnapshot(g) }),
    bytes = new TextEncoder().encode(body).length;
  assert.ok(bytes > 16384 && bytes < MAX_DECISION_BYTES);
  const response = await worker.fetch(
    new Request("https://test/api/decide", { method: "POST", body }),
    {
      AI: {
        run: async () => ({
          response: {
            mood: "happy",
            action: "ride",
            activityId: "island-whale-blue",
            thought: "Полетаю над водой!",
          },
        }),
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).activityId, "island-whale-blue");
  const oversized = await worker.fetch(
    new Request("https://test/api/decide", {
      method: "POST",
      body: "x".repeat(MAX_DECISION_BYTES + 1),
    }),
    { AI: {} },
  );
  assert.equal(oversized.status, 413);
});
test("discoveries across the enlarged shop survive reload so repeat purchases cannot farm XP", () => {
  const g = newGame(now),
    ids = [...CATALOG.map((i) => i.id), ...BIOMES.map((b) => "biome-" + b.id)];
  g.progression.discoveries = ids;
  g.progression.xp = 2300;
  const store = memory();
  saveGame(store, g);
  const restored = loadGame(store, now);
  assert.deepEqual(restored.progression.discoveries, ids);
  assert.equal(restored.progression.xp, 2300);
  assert.equal(
    purchaseXP(restored, ids.at(-1), 1000, now).progression.xp,
    2300,
  );
});
