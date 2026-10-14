import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createCat, disposeCat } from "../public/cat-model.js";
import { catAnimations } from "./cat-animation.mjs";
import { buildWorker } from "./build-worker.mjs";
import { versionSiteAssets } from "./build-site.mjs";
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
  async readAsDataURL(blob) {
    this.result =
      "data:application/octet-stream;base64," +
      Buffer.from(await blob.arrayBuffer()).toString("base64");
    this.onloadend?.();
  }
};
await mkdir("public/dist", { recursive: true });
await mkdir("public/models", { recursive: true });
await build({
  entryPoints: ["public/app.js"],
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2022",
  outfile: "public/dist/app.js",
  external: ["./config.js"],
});
// The bundle is served from dist; runtime configuration stays at the site root.
const site = versionSiteAssets({
  bundle: await readFile("public/dist/app.js", "utf8"),
  stylesheet: await readFile("public/style.css"),
  html: await readFile("public/index.html", "utf8"),
});
await writeFile("public/dist/app.js", site.script);
await writeFile("public/index.html", site.html);
for (const mood of ["sleep", "crazy hungry", "happy"]) {
  const model = createCat(mood),
    animations = catAnimations(model);
  model.traverse((node) => {
    node.userData = {};
  });
  const bytes = await new GLTFExporter().parseAsync(model, {
    binary: true,
    animations,
  });
  await writeFile(
    `public/models/chichi-${mood.replace(" ", "-")}.glb`,
    Buffer.from(bytes),
  );
  disposeCat(model);
}
const revision = await buildWorker();
console.log(`Built 3D world, Chichi GLB models and Worker commit ${revision}.`);
