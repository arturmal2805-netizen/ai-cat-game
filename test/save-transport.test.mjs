import { test } from "node:test";
import assert from "node:assert/strict";
import { cloudSaveRequest } from "../public/save-transport.js";
import { readSaveBody, SAVE_LIMIT } from "../save-vault.mjs";
import {
  newGame,
  loadGame,
  canPlace,
  findSpace,
  placeItem,
} from "../public/economy.js";
import { BIOMES, byBiome } from "../public/game-data.js";
import { MEGA_RIDES } from "../public/mega-ride-data.js";

test("a developed two-phone save fits keepalive and decompresses without changing a single saved field", async () => {
  const game = newGame(),
    payload = {
      mutationId: crypto.randomUUID(),
      expectedRevision: 15,
      game,
      baseGame: structuredClone(game),
      cooperative: true,
    };
  assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length > 60000);
  const transport = await cloudSaveRequest(payload);
  assert.equal(transport.keepalive, true);
  assert.ok(transport.body.byteLength < 60000);
  const decoded = await readSaveBody(
    new Request("https://cat/api/save", {
      method: "PUT",
      body: transport.body,
      headers: transport.headers,
    }),
  );
  assert.deepEqual(decoded, payload);
});
test("old browsers retain normal saving and small requests need no compression", async () => {
  const small = await cloudSaveRequest({ action: "small" });
  assert.equal(small.keepalive, true);
  assert.equal(typeof small.body, "string");
  const large = await cloudSaveRequest({ game: newGame() }, null);
  assert.equal(large.keepalive, new TextEncoder().encode(large.body).length < 60000);
  assert.equal(JSON.parse(large.body).game.version, 2);
});
test("compressed invalid/oversized data keeps the original save limits", async () => {
  const game = newGame(),
    huge = {
      mutationId: crypto.randomUUID(),
      expectedRevision: 0,
      game: { ...game, padding: "x".repeat(SAVE_LIMIT) },
    };
  const transport = await cloudSaveRequest(huge);
  await assert.rejects(
    readSaveBody(
      new Request("https://cat/api/save", {
        method: "PUT",
        body: transport.body,
        headers: transport.headers,
      }),
    ),
    /SAVE_TOO_LARGE/,
  );
});
test("all 28 real islands can be saved and every new mega ride fits the doubled construction island", async () => {
  const game = newGame();
  game.unlocked = BIOMES.map((b) => b.id);
  const payload = {
    mutationId: crypto.randomUUID(),
    expectedRevision: 0,
    game,
  };
  assert.deepEqual(
    (
      await readSaveBody(
        new Request("https://cat/api/save", {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
      )
    ).game.unlocked,
    game.unlocked,
  );
  assert.ok(Math.abs(byBiome("homestead").radius ** 2 / 46.6 ** 2 - 24) < 1e-10);
  for (const ride of MEGA_RIDES) {
    const g = structuredClone(game);
    g.inventory[ride.id] = 1;
    // Keep a player's existing Adoption Center; fitting a mega must not move it.
    g.placements.push({
      id: "existing-adoption",
      item: "adoption-center",
      biome: "homestead",
      x: 0,
      z: 0,
      rotation: 0,
      readyAt: 0,
    });
    const space = findSpace(g, ride.id, "homestead");
    assert.ok(space, ride.id);
    const built = placeItem(g, ride.id, "homestead", space.x, space.z),
      restored = loadGame(
        {
          getItem: (k) =>
            k === "chichi-world-v2" ? JSON.stringify(built) : null,
        },
        Date.now(),
        { advance: false },
      );
    assert.deepEqual(restored.placements, built.placements, ride.id);
    assert.ok(canPlace(restored, "adoption-center", "homestead", -40, 0).ok);
  }
});
