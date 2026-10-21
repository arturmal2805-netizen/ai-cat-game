import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, cp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sculptCacheVersion } from "../scripts/sculpt-cache-version.mjs";

test("model cache survives unrelated UI/world releases, but every construction dependency and library lock invalidates it", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chichi-sculpt-key-"));
  try {
    await mkdir(path.join(root, "public"));
    const write = (name, text) => writeFile(path.join(root, name), text);
    await write("public/cat-model.js", 'export { model } from "./chichi-model.js";');
    await write("public/chichi-model.js", 'import "three";import { fur } from "./fur.js";export const model=fur;');
    await write("public/fur.js", 'export const fur="approved";');
    await write("public/sculpt-cache.js", 'export const schema=1;');
    await write("package-lock.json", '{"three":"0.186.1"}');
    const first = await sculptCacheVersion(root);
    assert.match(first, /^sculpt-v2-[a-f0-9]{24}$/);
    await write("public/app.js", 'console.log("new UI, island and wallet");');
    await write("public/style.css", '.cat-wealth{color:gold}');
    assert.equal(await sculptCacheVersion(root), first);
    await write("public/fur.js", 'export const fur="new geometry";');
    assert.notEqual(await sculptCacheVersion(root), first);
    await write("public/fur.js", 'export const fur="approved";');
    assert.equal(await sculptCacheVersion(root), first);
    await write("public/ear.js", 'export const ear="new nested producer";');
    await write("public/fur.js", 'export {ear as fur} from "./ear.js";');
    const nested = await sculptCacheVersion(root);
    await write("public/ear.js", 'export const ear="changed nested producer";');
    assert.notEqual(await sculptCacheVersion(root), nested);
    await write("public/fur.js", 'export const fur="approved";');
    await write("package-lock.json", '{"three":"new algorithm"}');
    assert.notEqual(await sculptCacheVersion(root), first);
    await write("package-lock.json", '{"three":"0.186.1"}');
    const moved = path.join(root, "other-checkout");
    await mkdir(moved);await cp(path.join(root,"public"),path.join(moved,"public"),{recursive:true});
    await cp(path.join(root,"package-lock.json"),path.join(moved,"package-lock.json"));
    assert.equal(await sculptCacheVersion(moved), first, "checkout directory and unimported files must not change model identity");
  } finally {
    await rm(root, {recursive:true, force:true});
  }
});
