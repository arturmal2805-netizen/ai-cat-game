import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createCat, disposeCat } from "../public/cat-model.js";
import { catAnimations } from "./cat-animation.mjs";
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
const { readFile } = await import("node:fs/promises");
const bundle = await readFile("public/dist/app.js", "utf8");
await writeFile(
  "public/dist/app.js",
  bundle.replaceAll('"./config.js"', '"../config.js"'),
);
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
console.log("Built 3D world and three downloadable Chichi GLB models.");
