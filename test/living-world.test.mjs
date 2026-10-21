import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  newGame,
  saveGame,
  loadGame,
  SAVE_KEY,
  worldSnapshot,
  harvestField,
  sellHarvest,
  findSpace,
  placeItem,
  canPlace,
  moveScenery,
  storeItem,
} from "../public/economy.js";
import { adoptCat, adoptionCenters, gatherCats } from "../public/adoption.js";
import { activeCats } from "../public/cat-roster.js";
import { ADOPTION_CATS, BREEDS } from "../public/cat-breeds.js";
import {
  incomeFor,
  collectIncome,
  normalizeBusiness,
  revenueRate,
  businessXP,
} from "../public/business.js";
import { recordSocialEncounter } from "../public/social-system.js";
import {
  eatFromBowl,
  fillBowl,
  colonyNeeds,
  advanceCare,
} from "../public/care-system.js";
import { xpForLevel, DAILY_XP_LIMIT, addXP } from "../public/progression.js";
import { BIOMES, byBiome, byItem } from "../public/game-data.js";
import { RENEWED_ISLANDS, ISLAND_RIDES } from "../public/renewal-data.js";
import { createCat, animateCat, disposeCat } from "../public/cat-model.js";
import { createBiomeScene } from "../public/biome-scenes.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";
import { validateState } from "../ai.mjs";
const now = Date.UTC(2026, 9, 14, 12);
function storage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) || null, setItem: (k, v) => m.set(k, v) };
}
function prepared() {
  const g = newGame(now);
  g.coins = 99999;
  g.progression.xp = xpForLevel(20);
  g.placements.push({
    id: "adoption-test",
    item: "adoption-center",
    biome: "moon",
    x: 0,
    z: -5,
    rotation: 0,
    readyAt: 0,
  });
  return g;
}
test("adoption candidates remain absent until a finished center and a paid, level-eligible adoption", () => {
  const g = prepared(),
    before = activeCats(g).length,
    id = ADOPTION_CATS[0].id;
  assert.equal(activeCats(g).filter((n) => n.adoption).length, 0);
  assert.throws(
    () => adoptCat({ ...g, placements: [] }, id, "adoption-test", now),
    /постройте/,
  );
  assert.throws(
    () => adoptCat({ ...g, coins: 0 }, id, "adoption-test", now),
    /монет/,
  );
  assert.throws(
    () =>
      adoptCat(
        { ...g, progression: newGame(now).progression },
        id,
        "adoption-test",
        now,
      ),
    /уровне/,
  );
  const bought = adoptCat(g, id, "adoption-test", now);
  assert.equal(bought.coins, g.coins - ADOPTION_CATS[0].price);
  assert.equal(activeCats(bought).length, before + 1);
  assert.equal(bought.social.relationships[id].meetings, 0);
  assert.throws(() => adoptCat(bought, id, "adoption-test", now), /уже дома/);
  assert.equal(g.adoption.cats.length, 0);
});
test("adopted cats join food, care and animated friendship records and survive local restoration", () => {
  const id = ADOPTION_CATS[0].id;
  let g = adoptCat(prepared(), id, "adoption-test", now);
  g.farm.stock.wheat = 2;
  g = fillBowl(g, "wheat", 2);
  g = eatFromBowl(g, id, now).game;
  g = recordSocialEncounter(g, id, "play", "manual", now);
  const s = storage();
  assert.ok(saveGame(s, g));
  const restored = loadGame(s, now);
  assert.deepEqual(restored.adoption, g.adoption);
  assert.deepEqual(restored.care.residents[id], g.care.residents[id]);
  assert.deepEqual(
    restored.social.relationships[id],
    g.social.relationships[id],
  );
  assert.equal(colonyNeeds(restored).count, activeCats(g).length);
  assert.equal(
    worldSnapshot(restored).friends.some((f) => f.id === id),
    true,
  );
});
test("unadopted candidates cannot eat, gain friendship or silently become hungry offline", () => {
  const g = newGame(now),
    id = ADOPTION_CATS[0].id,
    initial = g.care.residents[id];
  assert.throws(() => eatFromBowl(g, id, now), /недоступен/);
  assert.throws(
    () => recordSocialEncounter(g, id, "play", "manual", now),
    /недоступен/,
  );
  assert.deepEqual(
    advanceCare(g, now + 3600000, { offline: true }).care.residents[id],
    initial,
  );
});
test("gathering moves only available cats, keeps their relationships and restores the destination", () => {
  let g = adoptCat(prepared(), ADOPTION_CATS[0].id, "adoption-test", now);
  g.unlocked.push("autumn");
  const before = g.social;
  g = gatherCats(g, "autumn");
  const decisionState = validateState({ ...g.cat, world: worldSnapshot(g) });
  assert.ok(decisionState.world.friends.every((cat) => cat.biome === "autumn"));
  assert.equal(Object.keys(g.catDestinations).length, activeCats(g).length);
  assert.ok(activeCats(g).every((c) => c.biome === "autumn"));
  assert.deepEqual(g.social, before);
  assert.equal(g.catDestinations[ADOPTION_CATS[1].id], undefined);
  const s = storage();
  saveGame(s, g);
  assert.deepEqual(loadGame(s, now).catDestinations, g.catDestinations);
});
test("all adoption models have finite sculpted anatomy, individual eyes and intact animated moods", () => {
  assert.equal(ADOPTION_CATS.filter((c) => c.breed === "sphynx").length, 2);
  for (const p of [{}, ...ADOPTION_CATS]) {
    const cat = createCat("happy", { ...p, detail: "npc" });
    assert.equal(cat.getObjectByName("Face").geometry.type, "BufferGeometry");
    assert.equal(cat.getObjectByName("Haunch1"), undefined);
    for (const mood of ["happy", "sleep", "crazy hungry"]) {
      cat.userData.mood = mood;
      animateCat(cat, 1, true);
      animateCat(cat, 2, true);
      cat.traverse((o) => {
        if (o.isMesh)
          assert.ok(
            [...o.geometry.attributes.position.array].every(Number.isFinite),
          );
      });
    }
    assert.ok(cat.getObjectByName("Whisker-1_0"));
    disposeCat(cat);
  }
});
test("giant and slender cats have different silhouettes and walking cadence", () => {
  const giant = createCat(
      "happy",
      ADOPTION_CATS.find((c) => c.build === "giant"),
    ),
    thin = createCat(
      "happy",
      ADOPTION_CATS.find((c) => c.breed === "siamese"),
    );
  animateCat(giant, 0.15, true);
  animateCat(thin, 0.15, true);
  assert.ok(giant.userData.body.scale.x > thin.userData.body.scale.x * 1.4);
  assert.notEqual(
    giant.userData.legs[0].rotation.x,
    thin.userData.legs[0].rotation.x,
  );
  disposeCat(giant);
  disposeCat(thin);
});
function businessGame(item = "business-coffee") {
  const g = newGame(now);
  g.placements.push({
    id: "venue-test",
    item,
    biome: "moon",
    x: 0,
    z: -5,
    rotation: 0,
    readyAt: 0,
  });
  g.business = normalizeBusiness(null, g, now);
  return g;
}
test("businesses and paid attractions accrue bounded money and XP; repeat collection pays nothing", () => {
  for (const item of [
    "business-coffee",
    "business-hotdog",
    "business-artist",
    "cat-barista",
    "coaster",
  ]) {
    const g = businessGame(item),
      at = now + 3600000,
      amount = revenueRate(item);
    assert.equal(incomeFor(g, "venue-test", at), amount);
    const collected = collectIncome(g, "venue-test", at);
    assert.equal(collected.amount, amount);
    assert.equal(collected.xp, businessXP(item));
    assert.ok(collected.game.coins >= g.coins + amount);
    assert.throws(
      () => collectIncome(collected.game, "venue-test", at),
      /копятся/,
    );
    assert.equal(incomeFor(g, "venue-test", now + 24 * 3600000), amount * 8);
  }
});
test("frequent fractional collections earn exactly the same money and experience as one collection", () => {
  let frequent = businessGame();
  const whole = collectIncome(frequent, "venue-test", now + 3600000).game;
  for (let i = 1; i <= 180; i++)
    frequent = collectIncome(frequent, "venue-test", now + i * 20000).game;
  assert.equal(frequent.coins, whole.coins);
  assert.equal(frequent.progression.xp, whole.progression.xp);
});
test("business clock rollback, construction and move-to-inventory cannot duplicate or lose earned money", () => {
  let g = businessGame();
  g.placements.at(-1).readyAt = now + 3600000;
  assert.equal(incomeFor(g, "venue-test", now + 1000), 0);
  g = businessGame();
  g = collectIncome(g, "venue-test", now + 3600000).game;
  const s = storage();
  saveGame(s, g);
  const back = loadGame(s, now);
  assert.equal(incomeFor(back, "venue-test", now + 3600000), 0);
  const stored = storeItem(g, "venue-test", now + 2 * 3600000);
  assert.ok(stored.coins >= g.coins + 180);
  assert.equal(stored.business.accounts["venue-test"], undefined);
  assert.equal(incomeFor(stored, "venue-test", now + 10 * 3600000), 0);
});
test("harvest sale debits stock and credits the exact money in the same restored snapshot", () => {
  const harvested = harvestField(newGame(now), "welcome-farm", now).game,
    sale = sellHarvest(harvested);
  assert.equal(sale.value, 28);
  assert.equal(sale.game.coins, harvested.coins + 28);
  assert.deepEqual(sale.game.farm.stock, {});
  const s = storage();
  saveGame(s, sale.game);
  const restored = loadGame(s, now);
  assert.equal(restored.coins, sale.game.coins);
  assert.equal(restored.farm.sales.at(-1).value, 28);
  assert.throws(() => sellHarvest(restored), /пустой/);
});
test("removing Witch Forest refunds once and keeps unfinished purchases, farm timers and movable decor", () => {
  const legacy = prepared();
  delete legacy.worldRevision;
  legacy.unlocked.push("wizard");
  legacy.placements.push({
    id: "old-wizard-build",
    item: "carousel",
    biome: "wizard",
    x: 0,
    z: 0,
    rotation: 0,
    readyAt: now + 7200000,
  });
  legacy.placements.push({
    id: "old-wizard-farm",
    item: "farm-field",
    biome: "wizard",
    x: 5,
    z: 0,
    rotation: 0,
    readyAt: 0,
  });
  legacy.farm.fields["old-wizard-farm"] = [
    { crop: "wheat", readyAt: now + 100000 },
    { crop: null, readyAt: 0 },
    { crop: null, readyAt: 0 },
  ];
  legacy.scenery.push({
    id: "decor-wizard-1",
    type: "scenery-tree-enchanted",
    originBiome: "wizard",
    biome: "wizard",
    x: 3,
    z: 3,
    scale: 1,
    rotation: 0,
  });
  const s = storage();
  s.setItem(SAVE_KEY, JSON.stringify(legacy));
  let restored = loadGame(s, now);
  assert.equal(restored.coins, legacy.coins + 3630);
  assert.ok(!restored.unlocked.includes("wizard"));
  assert.equal(restored.inventory.carousel, 1);
  assert.equal(
    restored.relocatedPurchases.find((p) => p.item === "carousel").readyAt,
    now + 7200000,
  );
  assert.equal(
    restored.relocatedPurchases.find((p) => p.item === "farm-field")
      .fieldCells[0].readyAt,
    now + 100000,
  );
  assert.ok(restored.scenery.find((r) => r.id === "decor-wizard-1").stored);
  saveGame(s, restored);
  assert.equal(loadGame(s, now).coins, restored.coins);
  restored.unlocked.push("homestead");
  restored.scenery = restored.scenery.filter((r) => r.biome !== "homestead");
  const spot = findSpace(restored, "carousel", "homestead");
  assert.ok(spot);
  restored = placeItem(restored, "carousel", "homestead", spot.x, spot.z, 0, now);
  assert.equal(restored.placements.at(-1).readyAt, now + 7200000);
  const tree = restored.scenery.find((r) => r.id === "decor-wizard-1");
  const treeSpot = findSpace(restored, tree.type, "homestead", 0, tree.id);
  assert.ok(treeSpot);
  restored = moveScenery(restored, tree.id, "homestead", treeSpot.x, treeSpot.z, 0);
  saveGame(s, restored);
  const afterReload = loadGame(s, now).scenery.find((r) => r.id === tree.id);
  assert.equal(afterReload.stored, false);
  assert.equal(afterReload.biome, "homestead");
  assert.equal(afterReload.x, treeSpot.x);
  assert.equal(afterReload.z, treeSpot.z);
});
test("existing XP above the new level ceiling is preserved without negative rewards", () => {
  const g = prepared(),
    s = storage();
  g.progression.xp = 90000;
  saveGame(s, g);
  const restored = loadGame(s, now);
  assert.equal(restored.progression.xp, 90000);
  assert.equal(addXP(restored, 180, now).progression.xp, 90000);
});
test("an older open tab can still submit physical targets from retired Witch Forest", () => {
  const state = validateState({
    location: "home",
    energy: 80,
    hunger: 20,
    happiness: 80,
    world: {
      biomes: ["wizard"],
      activities: [{ id: "legacy-bed", type: "bed", biome: "wizard" }],
      friends: [],
    },
  });
  assert.equal(
    state.world.activities.find((a) => a.id === "legacy-bed").biome,
    "moon",
  );
  assert.equal(
    state.world.activities.find((a) => a.id === "legacy-bed").type,
    "bed",
  );
});
test("renewed islands have distinct features, fish, animated waterfalls and two usable pools each", () => {
  assert.equal(BIOMES.length, 20);
  assert.equal(byBiome("wizard"), undefined);
  const themes = new Set();
  for (const id of Object.keys(RENEWED_ISLANDS).filter(
    (id) => id !== "autumn" && byBiome(id),
  )) {
    const root = createBiomeScene(byBiome(id));
    themes.add(root.userData.renewal.hero);
    assert.ok(root.userData.stats.fishCount >= 30);
    assert.ok(root.userData.renewal.waterfalls.length >= 3);
    assert.ok(root.userData.lagoons.has("lake-" + id + "-upper"));
    root.userData.update(2);
    const flyer = root.userData.renewal.flyers[0];
    const before = flyer.userData.moving.position.clone();
    root.userData.update(4);
    assert.notDeepEqual(flyer.userData.moving.position, before);
    root.userData.dispose();
  }
  assert.equal(themes.size, Object.keys(RENEWED_ISLANDS).filter(id=>id!=="autumn" && byBiome(id)).length);
});
test("innate rides can be chosen as physical AI targets and full adopted worlds fit the request and save limits", () => {
  let g = prepared();
  g.coins = ADOPTION_CATS.reduce((n, c) => n + c.price, 1000);
  g.unlocked = BIOMES.map((b) => b.id);
  for (const cat of ADOPTION_CATS)
    g = adoptCat(g, cat.id, "adoption-test", now);
  g.placements = Array.from({ length: 60 }, (_, i) => ({
    id: "full-" + i,
    item: "yarn",
    biome: "moon",
    x: 0,
    z: 0,
    rotation: 0,
    readyAt: 0,
  }));
  const state = { ...g.cat, world: worldSnapshot(g) };
  assert.doesNotThrow(() => validateState(state));
  assert.ok(new TextEncoder().encode(JSON.stringify(state)).length < 49152);
  assert.ok(JSON.stringify(g).length < 120000);
  for (const ride of ISLAND_RIDES.filter(r=>byBiome(r.biome)))
    assert.ok(state.world.activities.some((a) => a.id === ride.id));
});
test("new ride rigs produce finite closed journeys and move both the creature and its rider", () => {
  for (const id of [
    "ride-jellyfish",
    "ride-butterfly",
    "ride-lotus",
    "ride-dinosaur",
    "ride-dragonfly",
    "ride-whale",
    "ride-whale-aurora",
  ]) {
    const rig = makeAttraction(id),
      start = rig.userData.rideFrame(0),
      end = rig.userData.rideFrame(rig.userData.duration);
    assert.ok(
      new THREE.Vector3(...start.position).distanceTo(
        new THREE.Vector3(...end.position),
      ) < 0.1,
    );
    animateAttraction(rig, 1);
    const a = rig.userData.moving.position.clone();
    animateAttraction(rig, 3);
    assert.notDeepEqual(a, rig.userData.moving.position);
    for (let t = 0; t < rig.userData.duration; t += 0.3)
      assert.ok(rig.userData.rideFrame(t).position.every(Number.isFinite));
  }
});
