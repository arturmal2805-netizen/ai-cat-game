# Stable identity for persistent cat construction buffers

The previous cache key was the complete client bundle's `?v=` value. Every UI,
island or save patch therefore rejected identical cached cat surfaces/fur. The
build now fingerprints the local transitive construction/cache inputs plus the
locked external libraries, and embeds that separate identity in the client.
No geometry, cache schema, renderer, model count, animation, save or API changes.

The first upgrade to this key rebuilds the optional graphics cache once. Later
unrelated releases reuse it. Actual producer/library changes and corrupt data
retain the original reconstruction fallback.

## Verification

- Twelve focused checks pass, including transitive imports, unimported UI/world
  changes, library changes and equal keys in different checkout directories.
- Linux WebKit 26.5 / four software-renderer threads, five approved models
  (Chichi, Nimbus, Cloudberry, Dumpling, Sphynx), DPR 2, real IndexedDB and fresh
  pages. A simulated UI release changes the real bundle URL.
- Control UI update: cache miss, restore 144 ms + construction 2,992 ms. New UI
  update: cache hit, restore 340 ms + construction 713 ms. This specific loading
  phase changes 3,136 → 1,053 ms; it is not a MacBook frame-rate measurement.
- Same-release warm returns hit both caches. A changed model version rejects
  the cached record. All seven loads retain exact hashes of 25,279,225 geometry
  bytes and full-resolution colour/shadow pixels; 667,817 triangles, DPR 2 and
  zero WebGL errors/context losses remain unchanged.
- Player-save/outbox sentinels are untouched; no API or inference calls occur.

Run `CHICHI_BROWSER=webkit CHICHI_PLAYWRIGHT_MODULE=<playwright>
node scripts/check-sculpt-cache-releases.mjs`; raw results are in
`version-webkit.json`. The generic renderer/grass prototypes are separate and
were not promoted based on mixed or sparse frame-rate samples.
