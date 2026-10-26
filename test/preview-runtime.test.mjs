import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogPreviews } from "../public/catalog-previews.js";
import manifest from "../public/art/previews/catalog.json" with { type: "json" };
import { CATALOG, BIOMES } from "../public/game-data.js";

async function withoutGraphics(work) {
  const previous = Object.fromEntries(["document", "fetch", "requestAnimationFrame"].map(k => [k, Object.getOwnPropertyDescriptor(globalThis,k)]));
  let requests = 0, frames = 0;
  globalThis.document = { baseURI: "https://example.test/ai-cat-game/" };
  globalThis.fetch = () => { requests++; throw Error("Offline metadata request"); };
  globalThis.requestAnimationFrame = () => { frames++; throw Error("No hidden GPU preview work allowed"); };
  try { await work(); assert.equal(requests, 0); assert.equal(frames, 0); }
  finally {
    for (const [k,d] of Object.entries(previous)) {
      if (d) Object.defineProperty(globalThis,k,d); else delete globalThis[k];
    }
  }
}

test("an offline or failed preview-manifest request cannot start rendering the whole catalogue", async () => {
  await withoutGraphics(async () => {
    const ready = [], result = await catalogPreviews((key,src) => ready.push([key,src]));
    assert.equal(result.size, CATALOG.length + BIOMES.length);
    assert.equal(ready.length, result.size);
    for (const [key,src] of ready) {
      const url = new URL(src);
      assert.equal(url.pathname, "/ai-cat-game/art/previews/" + key + ".png");
      assert.equal(url.searchParams.get("v"), manifest.version);
    }
  });
});

test("a closed or hidden shop still gets exact shipped images without any GPU work", async () => {
  await withoutGraphics(async () => {
    const keys = ["slide-titan-funnel", "biome-jobcity", "biome-aquarium"];
    const result = await catalogPreviews(null, { keys, canRender: () => false });
    assert.deepEqual([...result.keys()].sort(), keys.slice().sort());
  });
});

test("one development-only missing preview retains every ready PNG and cancels before allocating a renderer", async () => {
  await withoutGraphics(async () => {
    const missing = manifest.items.at(-1), at = manifest.items.indexOf(missing);
    manifest.items.splice(at,1);
    try {
      const result = await catalogPreviews(null, { canRender: () => false });
      assert.equal(result.size, CATALOG.length + BIOMES.length - 1);
      assert.equal(result.has(missing), false);
      assert.ok(result.has("biome-jobcity"));
    } finally { manifest.items.splice(at,0,missing); }
    const cancelled = await catalogPreviews(null, { forceRender: true, keys: [missing], canRender: () => false });
    assert.equal(cancelled.size, 0);
  });
});
