import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { releaseRevision } from "./release-check.mjs";

export async function buildWorker() {
  // Stamp the source checkout, not mutable Cloudflare dashboard variables.
  // Both GitHub Actions and a plain `wrangler deploy` use this same bundle.
  const revision = releaseRevision({});
  await mkdir(".generated", { recursive: true });
  await build({
    entryPoints: ["worker.mjs"],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    outfile: ".generated/worker.mjs",
    define: { __CHICHI_SOURCE_REVISION__: JSON.stringify(revision) },
  });
  return revision;
}
