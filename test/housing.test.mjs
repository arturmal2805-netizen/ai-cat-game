import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { BIOMES, byBiome } from "../public/game-data.js";
import { newGame, loadGame, saveGame, SAVE_KEY } from "../public/economy.js";
import {
  ensureJobCity,
  localJobPlan,
  applyJobPlan,
  jobAIState,
} from "../public/jobcity-system.js";
import {
  HOUSE_TYPES,
  HOUSING_ID,
  HOUSING_RADIUS,
  HOUSING_CENTER,
  housingPlot,
  housingSectionCount,
} from "../public/housing-data.js";
import {
  buyCatHome,
  ownedHomes,
  normalizeHousing,
  setActiveHome,
  setHomeRoommate,
  applyHousingDecisions,
} from "../public/housing-system.js";
import { createHousingRuntime } from "../public/housing-runtime.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { validateCityAIState, requestCityPlan } from "../jobcity-ai.mjs";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import fs from "node:fs";
import { chunkedSaveStorage } from "../chunked-save-store.mjs";
const now = Date.UTC(2026, 9, 19, 12);
test("the residential island is appended without changing any existing island, including Chill Land and Cat Job City", () => {
  const original = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/housing-unaffected-biomes.json", import.meta.url),
    ),
  );
  assert.deepEqual(
    BIOMES.filter((b) => b.id !== HOUSING_ID),
    original,
  );
  assert.deepEqual(byBiome(HOUSING_ID).center, HOUSING_CENTER);
  for (const b of original)
    assert.ok(
      Math.hypot(
        b.center[0] - HOUSING_CENTER[0],
        b.center[1] - HOUSING_CENTER[1],
      ) >
        (b.radius || 11.65) + HOUSING_RADIUS + 3,
      b.id,
    );
});
function seed() {
  const g = newGame(now);
  g.unlocked.push("jobcity");
  const n = ensureJobCity(g, now);
  for (const p of Object.values(n.jobCity.profiles)) p.coins = 1000000;
  return n;
}
function buy(g, id = "chichi", type = HOUSE_TYPES[0].id, options = {}) {
  return buyCatHome(
    g,
    id,
    type,
    `buy-${id}-${g.jobCity.profiles[id].purchaseCount + 1}`,
    options,
    now,
  );
}
function restore(g) {
  const map = new Map(),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  assert.ok(saveGame(storage, g));
  return loadGame(storage, now, { advance: false });
}
test("each purchase is a distinct Chill Land house, no thirty-item or sixty-placement cap, and sections grow without moving existing lots", () => {
  let g = seed();
  const before = structuredClone(g);
  for (let i = 0; i < 75; i++) g = buy(g, "chichi", HOUSE_TYPES[i % 7].id);
  const homes = ownedHomes(g, "chichi");
  assert.equal(homes.length, 75);
  assert.equal(housingSectionCount(g.housing), 7);
  assert.equal(new Set(homes.map((h) => h.id)).size, 75);
  assert.equal(new Set(homes.map((h) => h.plot)).size, 75);
  assert.deepEqual(
    homes.map((h) => h.plot),
    Array.from({ length: 75 }, (_, i) => i),
  );
  assert.equal(
    g.jobCity.profiles.chichi.spentTotal,
    homes.reduce((n, h) => n + h.price, 0),
  );
  assert.equal(
    g.jobCity.profiles.chichi.coins,
    1000000 - g.jobCity.profiles.chichi.spentTotal,
  );
  assert.equal(g.coins, before.coins);
  assert.equal(g.diamonds, before.diamonds);
  assert.deepEqual(g.placements, before.placements);
  assert.ok(g.unlocked.includes(HOUSING_ID));
  assert.equal(g.housing.residences.chichi, homes[0].id);
  for (const h of homes) {
    const p = housingPlot(h.plot);
    assert.ok(Math.hypot(p.x + p.section * 98, p.z) + 7 < HOUSING_RADIUS);
  }
});
test("AI purchases execute automatically in the existing daily plan, while local fallback never invents a purchase", () => {
  const g = seed(),
    plan = localJobPlan(Object.values(g.jobCity.profiles), 0);
  plan.find((p) => p.id === "chichi").house = {
    type: HOUSE_TYPES[2].id,
    roommate: null,
  };
  const local = applyJobPlan(g, plan, 0, "local");
  assert.equal(local.housing, null);
  const n = applyJobPlan(g, plan, 0, "ai");
  assert.equal(ownedHomes(n, "chichi").length, 1);
  assert.equal(n.jobCity.profiles.chichi.coins, 1000000 - HOUSE_TYPES[2].price);
  assert.equal(ownedHomes(n, "chichi")[0].source, "ai");
  assert.equal(
    applyJobPlan(n, plan, 0, "ai").jobCity.profiles.chichi.coins,
    n.jobCity.profiles.chichi.coins,
  );
  let many = n;
  for (let i = 0; i < 35; i++) many = buy(many);
  const replay = applyJobPlan(restore(many), plan, 0, "ai");
  assert.equal(ownedHomes(replay, "chichi").length, 36);
  assert.equal(
    replay.jobCity.profiles.chichi.coins,
    many.jobCity.profiles.chichi.coins,
  );
});
test("unaffordable decisions do not charge or create a house and can be reconsidered on a later day", () => {
  let g = seed();
  g.jobCity.profiles.chichi.coins = 5;
  const a = [{ id: "chichi", house: { type: HOUSE_TYPES[0].id } }];
  const n = applyHousingDecisions(g, 0, a, now);
  assert.equal(n.housing, null);
  assert.equal(n.jobCity.profiles.chichi.coins, 5);
  assert.throws(() => buy(n), /недостатньо/);
  n.jobCity.profiles.chichi.coins = 2000;
  assert.equal(applyHousingDecisions(n, 0, a), n);
  const next = applyHousingDecisions(n, 1, a, now + 86400000);
  assert.equal(ownedHomes(next, "chichi").length, 1);
});
test("owner retains one active home; free roommates settle automatically, explicit selection works, and no free cat leaves an empty place", () => {
  let g = seed(),
    ids = Object.keys(g.jobCity.profiles),
    roommate = ids.find((id) => id !== "chichi");
  g = buy(g, "chichi", HOUSE_TYPES[0].id, { roommate });
  const first = ownedHomes(g, "chichi")[0];
  assert.equal(first.roommate, roommate);
  assert.equal(g.housing.residences[roommate], first.id);
  g = buy(g);
  const second = ownedHomes(g, "chichi")[1];
  assert.equal(g.housing.residences.chichi, first.id);
  assert.notEqual(second.roommate, roommate);
  assert.throws(
    () => buy(g, "chichi", HOUSE_TYPES[0].id, { roommate }),
    /активний дім/,
  );
  g = setActiveHome(g, "chichi", second.id);
  assert.equal(g.housing.residences.chichi, second.id);
  g = setHomeRoommate(g, first.id, null);
  assert.equal(g.housing.residences[roommate], undefined);
  g = setHomeRoommate(g, first.id, roommate);
  while (Object.keys(g.housing.residences).length < ids.length) g = buy(g);
  g = buy(g);
  assert.equal(ownedHomes(g, "chichi").at(-1).roommate, null);
  assert.equal(Object.keys(g.housing.residences).length, ids.length);
});
test("all homes, original prices, plot coordinates and complete purchase history survive twenty reloads beyond the short transaction log", () => {
  let g = seed();
  for (let i = 0; i < 45; i++) g = buy(g);
  const housing = structuredClone(g.housing),
    coins = g.jobCity.profiles.chichi.coins;
  for (let i = 0; i < 20; i++) g = restore(g);
  assert.deepEqual(g.housing, housing);
  assert.equal(g.jobCity.profiles.chichi.coins, coins);
  assert.equal(g.jobCity.profiles.chichi.transactions.length, 12);
  assert.equal(ownedHomes(g, "chichi").length, 45);
  assert.equal(buyCatHome(g, "chichi", HOUSE_TYPES[0].id, "buy-chichi-1"), g);
  assert.deepEqual(normalizeHousing(g.housing), g.housing);
});
test("a failed local write cannot acknowledge a house or replace the previous confirmed home ledger and wallet", () => {
  const original = buy(seed()),
    next = buy(original),
    encoded = JSON.stringify(original),
    map = new Map([[SAVE_KEY, encoded]]);
  const storage = {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => {
      if (k === SAVE_KEY && v !== encoded) throw Error("quota");
      map.set(k, v);
    },
  };
  assert.equal(saveGame(storage, next), false);
  const restored = loadGame(storage, now, { advance: false });
  assert.deepEqual(restored.housing, original.housing);
  assert.equal(
    restored.jobCity.profiles.chichi.coins,
    original.jobCity.profiles.chichi.coins,
  );
});
test("lifetime home spending and purchase sequence are never clamped to the player coin cap during normalization", () => {
  const g = buy(seed()),
    p = g.jobCity.profiles.chichi;
  p.spentTotal = 15000000;
  p.earnedTotal = 20000000;
  p.purchaseCount = 10000001;
  const saved = restore(g).jobCity.profiles.chichi;
  assert.equal(saved.spentTotal, p.spentTotal);
  assert.equal(saved.earnedTotal, p.earnedTotal);
  assert.equal(saved.purchaseCount, p.purchaseCount);
});
test("the permanent purchase ledger repairs missing receipt markers without charging again or overwriting an older home", () => {
  const a = { id: "chichi", house: { type: HOUSE_TYPES[0].id } };
  const g = applyHousingDecisions(seed(), 0, [a], now);
  delete g.jobCity.profiles.chichi.lastHousingAIDay;
  g.jobCity.profiles.chichi.purchaseCount = 0;
  assert.equal(buyCatHome(g, "chichi", HOUSE_TYPES[0].id, "buy-chichi-1"), g);
  assert.equal(applyHousingDecisions(g, 0, [a]), g);
  const loaded = restore(g);
  assert.equal(loaded.jobCity.profiles.chichi.purchaseCount, 1);
  assert.equal(loaded.jobCity.profiles.chichi.lastHousingAIDay, 0);
  assert.deepEqual(loaded.housing, g.housing);
});
test("a malformed primary home ledger recovers the valid backup instead of silently dropping individual paid houses", () => {
  const original = buy(buy(seed())),
    bad = structuredClone(original);
  Object.values(bad.housing.homes)[0].type = "missing-design";
  const map = new Map([
      [SAVE_KEY, JSON.stringify(bad)],
      [SAVE_KEY + ":backup", JSON.stringify(original)],
    ]),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  assert.equal(saveGame(storage, bad), false);
  const restored = loadGame(storage, now, { advance: false });
  assert.deepEqual(restored.housing, original.housing);
  assert.equal(
    restored.jobCity.profiles.chichi.coins,
    original.jobCity.profiles.chichi.coins,
  );
});
test("housing normalization does not truncate an expanding ledger or regenerate IDs, plots or occupants", () => {
  const g = buy(seed()),
    example = ownedHomes(g, "chichi")[0];
  for (let i = 2; i <= 2500; i++) {
    const id = `house-chichi-${i}`;
    g.housing.homes[id] = {
      ...example,
      id,
      sequence: i,
      purchaseId: `buy-chichi-${i}`,
      plot: i - 1,
      roommate: null,
    };
  }
  const restored = normalizeHousing(g.housing);
  assert.equal(Object.keys(restored.homes).length, 2500);
  assert.deepEqual(restored, g.housing);
  assert.equal(housingSectionCount(restored), 209);
});
test("large permanent purchase ledgers store as atomic byte chunks, keep old small snapshots readable, and clean overwritten chunks", async () => {
  const map = new Map(),
    raw = {
      get: async (k) => structuredClone(map.get(k)),
      put: async (k, v) => {
        map.set(k, structuredClone(v));
      },
      delete: async (keys) => {
        for (const k of keys) map.delete(k);
      },
    };
  const storage = chunkedSaveStorage({
    ...raw,
    transaction: async (fn) => {
      const before = new Map(map);
      try {
        return await fn(raw);
      } catch (e) {
        map.clear();
        for (const [k, v] of before) map.set(k, v);
        throw e;
      }
    },
  });
  const snapshot = { game: buy(seed()), padding: "Чічі 🏡".repeat(150000) };
  await storage.transaction((s) => s.put("current", snapshot));
  assert.equal(map.get("current").__chichiSnapshotChunks, 1);
  assert.deepEqual(await storage.get("current"), snapshot);
  const previousKeys = [...map.get("current").keys];
  await assert.rejects(() =>
    storage.transaction(async (s) => {
      await s.put("current", { game: newGame() });
      throw Error("rollback");
    }),
  );
  assert.deepEqual(await storage.get("current"), snapshot);
  await storage.transaction((s) => s.put("current", { game: newGame() }));
  assert.ok(previousKeys.every((k) => !map.has(k)));
  assert.equal((await storage.get("current")).game.version, 2);
});
test("concurrent purchases for different cats keep both private charges and allocate distinct stable plots in either merge order", () => {
  const base = seed(),
    other = Object.keys(base.jobCity.profiles).find((id) => id !== "chichi"),
    a = buy(base),
    b = buy(base, other);
  for (const [first, second] of [
    [a, b],
    [b, a],
  ]) {
    const g = mergeSharedWorld(base, first, second);
    assert.equal(Object.keys(g.housing.homes).length, 2);
    assert.equal(
      new Set(Object.values(g.housing.homes).map((h) => h.plot)).size,
      2,
    );
    assert.equal(
      g.jobCity.profiles.chichi.coins,
      a.jobCity.profiles.chichi.coins,
    );
    assert.equal(
      g.jobCity.profiles[other].coins,
      b.jobCity.profiles[other].coins,
    );
    assert.equal(
      Object.values(first.housing.homes)[0].plot,
      Object.values(g.housing.homes).find(
        (h) => h.id === Object.values(first.housing.homes)[0].id,
      ).plot,
    );
    const again = mergeSharedWorld(base, g, second);
    assert.deepEqual(again.housing, g.housing);
  }
});
test("competing purchases on one wallet are atomic, and a cached client cannot erase houses, balances or the housing unlock", () => {
  const base = seed(),
    a = buy(base),
    b = buy(base, "chichi", HOUSE_TYPES[1].id);
  assert.throws(() => mergeSharedWorld(base, a, b), /іншому|збережено/);
  const cached = structuredClone(base);
  delete cached.housing;
  cached.unlocked = cached.unlocked.filter((id) => id !== HOUSING_ID);
  cached.cat.happiness = 88;
  const kept = mergeSharedWorld(base, a, cached);
  assert.deepEqual(kept.housing, a.housing);
  assert.ok(kept.unlocked.includes(HOUSING_ID));
  assert.equal(
    kept.jobCity.profiles.chichi.coins,
    a.jobCity.profiles.chichi.coins,
  );
});
test("a genuinely older city client omitting the new AI marker cannot reset receipts or discard an automatic home purchase", () => {
  const base = seed(),
    current = applyHousingDecisions(
      base,
      0,
      [{ id: "chichi", house: { type: HOUSE_TYPES[0].id } }],
      now,
    ),
    cached = structuredClone(base);
  delete cached.housing;
  for (const p of Object.values(cached.jobCity.profiles))
    delete p.lastHousingAIDay;
  cached.cat.happiness = 80;
  const merged = mergeSharedWorld(base, current, cached);
  assert.deepEqual(merged.housing, current.housing);
  assert.equal(merged.jobCity.profiles.chichi.lastHousingAIDay, 0);
  assert.equal(
    merged.jobCity.profiles.chichi.coins,
    current.jobCity.profiles.chichi.coins,
  );
});
test("daily batch schema exposes house prices, ownership and roommates and validates the real AI response", async () => {
  const g = buy(seed()),
    state = validateCityAIState(jobAIState(g, now));
  assert.equal(state.housingOffers.length, 7);
  assert.equal(state.cats.find((p) => p.id === "chichi").ownedHomes, 1);
  assert.equal(
    state.cats.find((p) => p.id === "chichi").activeHome,
    g.housing.residences.chichi,
  );
  const assignments = localJobPlan(Object.values(g.jobCity.profiles), 0);
  assignments[0].house = { type: HOUSE_TYPES[0].id, roommate: null };
  const result = await requestCityPlan(state, async () => ({
    response: JSON.stringify({ assignments }),
  }));
  assert.equal(result.assignments[0].house.type, HOUSE_TYPES[0].id);
  assignments[0].house.roommate = "not-a-real-cat";
  await assert.rejects(
    () =>
      requestCityPlan(state, async () => ({
        response: JSON.stringify({ assignments }),
      })),
    /покупка/,
  );
});
test("two active residents reach separate places on the original Chill bed, including far expansion sections; manual play and work cancel rest", () => {
  for (const plot of [0, 11, 12, 1200]) {
    const g = buy(seed()),
      h = ownedHomes(g, "chichi")[0];
    h.plot = plot;
    const rt = createHousingRuntime(),
      actors = [
        { id: h.owner, radius: 0.55 },
        { id: h.roommate, radius: 0.55 },
      ];
    for (let i = 0; i < 5000; i++)
      rt.step(g, actors, 1 / 30, i / 30, { night: true });
    const a = rt.get(h.owner),
      b = rt.get(h.roommate);
    assert.equal(a?.phase, "relax", `owner plot ${plot}`);
    assert.equal(b?.phase, "relax", `roommate plot ${plot}`);
    assert.ok(
      Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) >= 3,
    );
    assert.ok(Math.abs(a.position.y - 1.12) < 0.013);
    rt.step(g, actors, 1 / 30, 200, {
      night: true,
      blocked: (a) => a.id === h.owner,
    });
    assert.equal(rt.get(h.owner), undefined);
    rt.step(g, actors, 1 / 30, 201, { night: false });
    assert.equal(rt.visits.size, 0);
  }
});
test("rendered homes reuse the exact Chill architecture and nameplates refresh without rebuilding the house geometry", async () => {
  const g = buy(seed()),
    h = ownedHomes(g, "chichi")[0],
    b = byBiome(HOUSING_ID),
    root = createBiomeScene(b);
  root.position.set(...[...b.center.slice(0, 1), 0, b.center[1]]);
  root.userData.syncHousing(g);
  const p = housingPlot(h.plot),
    camera = new T.PerspectiveCamera(40, 1.5, 0.1, 200);
  camera.position.set(b.center[0] + p.x, 12, b.center[1] + p.z + 25);
  camera.lookAt(b.center[0] + p.x, 2, b.center[1] + p.z);
  camera.updateMatrixWorld();
  for (let i = 0; i < 100 && !root.userData.houses.has(h.id); i++) {
    root.userData.viewHousing(
      { x: b.center[0] + p.x, z: b.center[1] + p.z },
      25,
      camera,
      i / 4,
    );
    await new Promise((r) => setTimeout(r, 10));
  }
  const model = root.userData.houses.get(h.id);
  assert.ok(model);
  const template = root.userData.templates.get(h.type);
  assert.equal(template.userData.openFront, true);
  assert.equal(template.userData.bedCapacity, 2);
  assert.equal(template.userData.bathCapacity, 1);
  const originalGeometry = model.children[0].children.find(
    (o) => o.isMesh,
  ).geometry;
  g.jobCity.profiles.chichi.name = "Чічі Сонечко";
  root.userData.syncHousing(g);
  assert.equal(model.userData.ownerName, "Чічі Сонечко");
  assert.equal(
    model.children[0].children.find((o) => o.isMesh).geometry,
    originalGeometry,
  );
  disposeBiome(root);
});
