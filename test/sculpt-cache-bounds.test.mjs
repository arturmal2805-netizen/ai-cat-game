import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import { createCat, disposeCat } from "../public/cat-model.js";
import { groomFur, kittenCacheSnapshot, installKittenCache, SCULPT_CACHE_MAX_ENTRIES } from "../public/chichi-sculpt.js";
import { boundedSculptSnapshot } from "../public/sculpt-cache.js";
function digest(model) {
  const hash = createHash("sha256");
  model.traverse(o => {
    if (!o.isMesh) return;
    for (const a of [o.geometry.index, ...Object.values(o.geometry.attributes)])
      if (a) hash.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
  });
  return hash.digest("hex");
}
test("a crowded but small graphics record stays decodable instead of losing every cached hero buffer", () => {
  const hero = createCat("happy"), expected = digest(hero), source = new T.BoxGeometry(1,1,1);
  for (let i=0;i<300;i++) groomFur(source, 1, {seed:100000+i, surfaceKey:"cache-bound-proof"}).dispose();
  const raw=kittenCacheSnapshot(), originalLengths=[raw.surfaces.length,raw.fur.length];
  assert.ok(raw.fur.length>256);
  assert.equal(installKittenCache(structuredClone(raw)),true,"ordinary colonies with hundreds of small variants must remain decodable");
  const bounded=boundedSculptSnapshot(raw);
  assert.ok(bounded.surfaces.length<=SCULPT_CACHE_MAX_ENTRIES&&bounded.fur.length<=SCULPT_CACHE_MAX_ENTRIES);
  assert.equal(bounded.fur.length,raw.fur.length,"all normal small variants fit the unchanged byte budget");
  assert.deepEqual([raw.surfaces.length,raw.fur.length],originalLengths,"limiting the persistent snapshot must not remove RAM cache entries or live detail");
  assert.equal(installKittenCache(structuredClone(bounded)),true);
  const after=createCat("happy");assert.equal(digest(after),expected);
  const tiny=raw.fur.at(-1)[1], excessive={schema:1,surfaces:[],fur:Array.from({length:SCULPT_CACHE_MAX_ENTRIES+1},(_,i)=>["tiny-bound-"+i,tiny])};
  assert.equal(installKittenCache(excessive),false,"metadata remains bounded as well as geometry bytes");
  const limited=boundedSculptSnapshot(excessive);assert.equal(limited.fur.length,SCULPT_CACHE_MAX_ENTRIES);assert.equal(installKittenCache(limited),true);
  disposeCat(hero);disposeCat(after);source.dispose();
});
