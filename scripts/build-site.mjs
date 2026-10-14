import { createHash } from "node:crypto";

const digest = (content) =>
  createHash("sha256").update(content).digest("hex").slice(0, 16);

// Version every entry asset by its contents. An unchanged build keeps the same
// URLs; any changed script or stylesheet gets a fresh browser cache entry.
export function versionSiteAssets({ bundle, stylesheet, html }) {
  const configVersion = digest(bundle);
  const script = bundle.replaceAll(
    '"./config.js"',
    `"../config.js?v=${configVersion}"`,
  );
  const scriptVersion = digest(script),
    styleVersion = digest(stylesheet);
  return {
    script,
    html: html
      .replace(
        /\.\/dist\/app\.js(?:\?[^"']*)?/g,
        `./dist/app.js?v=${scriptVersion}`,
      )
      .replace(/\.\/style\.css(?:\?[^"']*)?/g, `./style.css?v=${styleVersion}`),
    scriptVersion,
    styleVersion,
  };
}
