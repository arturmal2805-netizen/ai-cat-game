import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { versionSiteAssets } from "../scripts/build-site.mjs";

const input = {
  bundle:
    'import {apiBase} from "./config.js";console.log("old world",apiBase);',
  stylesheet: "body{color:purple}",
  html: '<link href="./style.css?v=old"><script src="./dist/app.js?v=old"></script>',
};
test("published HTML requests the actual built script and stylesheet under new cache keys", () => {
  const site = versionSiteAssets(input);
  assert.equal(
    site.scriptVersion,
    createHash("sha256").update(site.script).digest("hex").slice(0, 16),
  );
  assert.ok(site.html.includes(`./dist/app.js?v=${site.scriptVersion}`));
  assert.ok(site.html.includes(`./style.css?v=${site.styleVersion}`));
  assert.match(site.script, /from "\.\.\/config\.js\?v=[a-f0-9]{16}"/);
  assert.ok(!site.html.includes("v=old"));
  assert.deepEqual(versionSiteAssets({ ...input, html: site.html }), site);
});
test("changing game code bypasses old script and configuration caches without invalidating unchanged styles", () => {
  const old = versionSiteAssets(input),
    next = versionSiteAssets({
      ...input,
      bundle: input.bundle.replace("old world", "new adopted world"),
    });
  assert.notEqual(next.scriptVersion, old.scriptVersion);
  assert.notEqual(
    next.script.match(/config\.js\?v=[a-f0-9]+/)[0],
    old.script.match(/config\.js\?v=[a-f0-9]+/)[0],
  );
  assert.equal(next.styleVersion, old.styleVersion);
});
test("changing only the UI style refreshes the stylesheet without fetching an unchanged game bundle", () => {
  const old = versionSiteAssets(input),
    next = versionSiteAssets({ ...input, stylesheet: "body{color:green}" });
  assert.notEqual(next.styleVersion, old.styleVersion);
  assert.equal(next.scriptVersion, old.scriptVersion);
});
