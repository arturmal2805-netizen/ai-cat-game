import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Cache construction buffers by their real producers, not by the whole app's
// URL. Follow local imports automatically; the lockfile covers external Three
// geometry algorithms and their pinned integrity. Paths/mtimes do not enter it.
export async function sculptCacheVersion(
  root = fileURLToPath(new URL("../", import.meta.url)),
) {
  const { metafile } = await build({
    absWorkingDir: root,
    entryPoints: [
      "public/cat-model.js",
      "public/chichi-model.js",
      "public/sculpt-cache.js",
    ],
    outdir: "sculpt-version-probe",
    bundle: true,
    packages: "external",
    write: false,
    metafile: true,
    format: "esm",
    target: "es2022",
    logLevel: "silent",
  });
  const names = [...Object.keys(metafile.inputs), "package-lock.json"].sort();
  const contents = await Promise.all(names.map(name => readFile(path.join(root, name))));
  const hash = createHash("sha256").update("chichi-sculpt-cache-v2\0");
  for (let i = 0; i < names.length; i++)
    hash.update(names[i]).update("\0").update(contents[i]).update("\0");
  return "sculpt-v2-" + hash.digest("hex").slice(0, 24);
}
