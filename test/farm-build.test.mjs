import { xpForLevel } from "../public/progression.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  purchase,
  findSpace,
  placeItem,
  isBuilt,
  worldSnapshot,
  storeItem,
  plantCrop,
  harvestField,
  sellHarvest,
  gatherResource,
  saveGame,
  loadGame,
  SAVE_KEY,
  unlockBiome,
  biomeRequirement,
} from "../public/economy.js";
import { CATALOG, BIOMES, CROPS } from "../public/game-data.js";
const now = Date.UTC(2026, 9, 14, 12);
test("construction deadlines block usage until done, then appear in AI snapshot", () => {
  const seed = newGame(now);
  seed.progression.xp = xpForLevel(6);
  seed.coins = 5000;
  let game = purchase(seed, "coaster");
  const spot = findSpace(game, "coaster", "moon");
  game = placeItem(game, "coaster", "moon", spot.x, spot.z, 0, now);
  const p = game.placements.at(-1);
  assert.equal(p.readyAt, now + 4 * 3600000);
  assert.equal(isBuilt(p, now), false);
  assert.throws(() => storeItem(game, p.id, now));
  assert.equal(isBuilt(p, p.readyAt), true);
  p.readyAt = Date.now() - 1;
  assert.ok(worldSnapshot(game).activities.some((a) => a.id === p.id));
});
test("completed objects returned to bag do not require another construction wait", () => {
  let game = newGame(now);
  game = storeItem(game, "welcome-yarn", now);
  const spot = findSpace(game, "yarn", "moon");
  game = placeItem(game, "yarn", "moon", spot.x, spot.z, 0, now);
  assert.equal(game.placements.at(-1).readyAt, 0);
});
test("harvest and sale pay once; seed growth respects saved deadlines", () => {
  let result = harvestField(newGame(now), "welcome-farm", now);
  assert.equal(result.count, 2);
  assert.throws(() => harvestField(result.game, "welcome-farm", now));
  let game = plantCrop(result.game, "welcome-farm", 0, "wheat", now);
  assert.equal(game.coins, 418);
  assert.throws(() => harvestField(game, "welcome-farm", now + 179999));
  game = harvestField(game, "welcome-farm", now + 180000).game;
  const sold = sellHarvest(game);
  assert.equal(sold.value, 24);
  assert.equal(sold.game.coins, 442);
  assert.throws(() => sellHarvest(sold.game));
});
test("resource jobs unlock with biomes and cannot be collected twice", () => {
  const seed = newGame(now);
  seed.progression.xp = xpForLevel(5);
  seed.coins = 5000;
  let game = unlockBiome(seed, "beach");
  game = gatherResource(game, "fishing", now);
  assert.equal(game.farm.stock.fish, 1);
  assert.throws(() => gatherResource(game, "fishing", now + 100));
  assert.equal(
    gatherResource(game, "fishing", now + 1200000).farm.stock.fish,
    2,
  );
  assert.throws(() => gatherResource(newGame(now), "fishing", now));
});
test("save is verified, previous save is retained, corrupt primary restores backup", () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, v),
    };
  let game = newGame(now);
  assert.ok(saveGame(storage, game));
  const previous = game.coins;
  game = purchase(game, "yarn");
  assert.ok(saveGame(storage, game));
  assert.ok(values.has(SAVE_KEY + ":backup"));
  values.set(SAVE_KEY, "corrupt");
  assert.equal(loadGame(storage, now).coins, previous);
  assert.equal(
    saveGame({ getItem: () => null, setItem: () => {} }, game),
    false,
  );
  assert.equal(
    saveGame(
      {
        getItem: () => null,
        setItem: () => {
          throw Error("Quota");
        },
      },
      game,
    ),
    false,
  );
});
test("farm saves restore crops, inventory and construction timestamps", () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, v),
    };
  let game = harvestField(newGame(now), "welcome-farm", now).game;
  game = plantCrop(game, "welcome-farm", 0, "wheat", now);
  saveGame(storage, game);
  const restored = loadGame(storage, now + 60000);
  assert.equal(restored.farm.fields["welcome-farm"][0].readyAt, now + 180000);
  assert.equal(restored.farm.stock.wheat, 2);
});
test("expanded world has 24 biomes and 85 objects, with legendary build times and unlock quests", () => {
  assert.equal(CATALOG.length, 85);
  assert.equal(BIOMES.length, 24);
  assert.equal(
    CATALOG.find((i) => i.id === "coaster-mystic").buildMinutes,
    1440,
  );
  assert.ok(biomeRequirement(newGame(now), "ice"));
  assert.throws(() => plantCrop(newGame(now), "welcome-farm", 2, "berry", now));
});
test("every biome unlocks a unique crop and every catalog object fits on an island", () => {
  const game = newGame(now);
  game.unlocked = BIOMES.map((b) => b.id);
  game.placements = [];
  game.scenery = []; // All movable objects can be stored to clear a ride site.
  for (const biome of BIOMES)
    assert.ok(
      CROPS.some((c) => c.biome === biome.id),
      biome.id,
    );
  for (const item of CATALOG)
    assert.ok(
      BIOMES.some((b) => findSpace(game, item.id, b.id)),
      item.id + " must be placeable",
    );
});
