import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { CATALOG, BIOMES } from "../public/game-data.js";
import { SHOWCASE_WATER_RIDES } from "../public/showcase-water-data.js";

test("the shipped preview manifest covers every shop item and biome with a complete PNG", async () => {
  const base = new URL("../public/art/previews/", import.meta.url);
  const manifest = JSON.parse(
    await readFile(new URL("catalog.json", base), "utf8"),
  );
  const expected = [
    ...CATALOG.map((item) => item.id),
    ...BIOMES.map((biome) => "biome-" + biome.id),
  ].sort();
  assert.deepEqual(manifest.items, expected);
  const revision = createHash("sha256");
  for (const key of expected) {
    const png = await readFile(new URL(key + ".png", base));
    revision.update(key).update(png);
    assert.equal(png.subarray(1, 4).toString(), "PNG", key);
    const large=key==='farm-magic-fruits'||BIOMES.some(b=>b.magicFarm&&'biome-'+b.id===key)||SHOWCASE_WATER_RIDES.some(r=>r.id===key);
    assert.equal(png.readUInt32BE(16), large?480:300, key);
    assert.equal(png.readUInt32BE(20), large?320:200, key);
    assert.equal(png.subarray(-8, -4).toString(), "IEND", key);
    assert.ok(png.length > 500, key);
  }
  assert.equal(manifest.version, revision.digest("hex").slice(0, 12));
});
