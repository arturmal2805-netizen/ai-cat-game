import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorker } from "../scripts/build-worker.mjs";
import { checkReleaseResponse } from "../scripts/release-check.mjs";
import { newGame } from "../public/economy.js";

test("the deployed bundle keeps its source commit on status, durable saves and AI even if dashboard variables change", async () => {
  const revision = await buildWorker();
  const { default: bundled, SaveVault } = await import(
    `../.generated/worker.mjs?test=${crypto.randomUUID()}`
  );
  const map = new Map();
  const storage = {
    get: async (key) => structuredClone(map.get(key)),
    put: async (key, value) => map.set(key, structuredClone(value)),
    transaction: async (fn) => fn(storage),
  };
  const vault = new SaveVault({ storage });
  for (const label of [undefined, "development", "b".repeat(40)]) {
    const env = {
      GAME_RELEASE: label,
      AI: {},
      SAVE_VAULT: { idFromName: (n) => n, get: () => vault },
    };
    const status = await bundled.fetch(
      new Request("https://cat.example/api/status"),
      env,
    );
    checkReleaseResponse(status, revision);
    assert.equal((await status.json()).release, revision);
    const body = {
      expectedRevision: map.get("current")?.revision || 0,
      mutationId: crypto.randomUUID(),
      game: newGame(),
    };
    const saved = await bundled.fetch(
      new Request("https://cat.example/api/save", {
        method: "PUT",
        headers: { "X-Chichi-Save-Token": "a".repeat(64) },
        body: JSON.stringify(body),
      }),
      env,
    );
    checkReleaseResponse(saved, revision);
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).revision, body.expectedRevision + 1);
    const read = await bundled.fetch(
      new Request("https://cat.example/api/save", {
        headers: { "X-Chichi-Save-Token": "a".repeat(64) },
      }),
      env,
    );
    checkReleaseResponse(read, revision);
    assert.deepEqual((await read.json()).game, body.game);
    const invalidAI = await bundled.fetch(
      new Request("https://cat.example/api/decide", {
        method: "POST",
        body: "invalid",
      }),
      env,
    );
    checkReleaseResponse(invalidAI, revision);
    assert.equal(invalidAI.status, 400);
  }
});
