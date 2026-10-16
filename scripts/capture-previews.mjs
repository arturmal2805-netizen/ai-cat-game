import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { CATALOG, BIOMES } from "../public/game-data.js";

// Optional art production tool. Normal installs, builds and CI do not need a
// browser: the finished images are versioned alongside their source scenes.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const selected =
  process.env.CHICHI_PREVIEW_KEYS?.split(",")
    .map((k) => k.trim())
    .filter(Boolean) || null;
const { chromium } = createRequire(import.meta.url)(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const bundle = await build({
  entryPoints: [resolve(root, "public/catalog-previews.js")],
  bundle: true,
  format: "esm",
  write: false,
  target: "es2022",
});
const assets = new Map();
for (const name of ["fantasy-atlas", "tree-varieties"])
  assets.set(
    `/art/${name}.png`,
    await readFile(resolve(root, `public/art/${name}.png`)),
  );
const server = createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/favicon.ico") {
    response.writeHead(204);
    response.end();
  } else if (assets.has(path)) {
    response.writeHead(200, { "Content-Type": "image/png" });
    response.end(assets.get(path));
  } else if (path === "/preview.js") {
    response.writeHead(200, { "Content-Type": "text/javascript" });
    response.end(bundle.outputFiles[0].contents);
  } else if (path === "/") {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(
      '<script type="module">import {catalogPreviews} from "/preview.js";catalogPreviews((key)=>console.log("Captured "+key),{forceRender:true,keys:' +
        JSON.stringify(selected) +
        "}).then(map=>window.previews=Object.fromEntries(map)).catch(error=>window.captureError=error.message);</script>",
    );
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHICHI_CHROMIUM || undefined,
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage(),
    errors = [];
  let count = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    else if (message.text().startsWith("Captured ") && ++count % 20 === 0)
      console.log(`Rendered ${count} previews`);
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(
    () => window.previews || window.captureError,
    {},
    { timeout: 240000 },
  );
  const error = await page.evaluate(() => window.captureError);
  if (error || errors.length) throw Error(error || errors.join("\n"));
  const images = await page.evaluate(() => window.previews),
    folder = resolve(root, "public/art/previews");
  const expected = [
    ...CATALOG.map((item) => item.id),
    ...BIOMES.map((biome) => "biome-" + biome.id),
  ];
  const requested = selected || expected;
  if (!requested.every((key) => expected.includes(key)))
    throw Error("Unknown preview key");
  if (
    Object.keys(images).length !== requested.length ||
    !requested.every((key) => images[key])
  )
    throw Error("The preview capture is incomplete");
  await mkdir(folder, { recursive: true });
  const revision = createHash("sha256");
  for (const key of expected.slice().sort())
    revision
      .update(key)
      .update(
        images[key]
          ? Buffer.from(images[key].split(",")[1], "base64")
          : await readFile(resolve(folder, key + ".png")),
      );
  for (const [key, data] of Object.entries(images)) {
    if (!/^[\w-]+$/.test(key) || !data.startsWith("data:image/png;base64,"))
      throw Error("Invalid preview output");
    await writeFile(
      resolve(folder, key + ".png"),
      Buffer.from(data.split(",")[1], "base64"),
    );
  }
  await writeFile(
    resolve(folder, "catalog.json"),
    JSON.stringify(
      {
        version: revision.digest("hex").slice(0, 12),
        items: expected.sort(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Saved ${Object.keys(images).length} shop and biome previews.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
