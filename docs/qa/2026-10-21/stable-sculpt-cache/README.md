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

## Second independent fix: large-colony cache contract

A real 40-cat construction fixture produced 600 fur entries within 21,195,669
bytes, below the existing 24 MiB write budget. The old decoder rejected anything
over 256 entries, so even an unchanged app URL discarded the entire valid cache.
The decoder now accepts at most 4,096 entries per kind, still validates every
attribute/index, and retains its 32 MiB read ceiling. The writer shares that
entry limit and retains the original 24 MiB budget. All 600 actual variants fit;
no RAM cache entry, live geometry, fur strand or cat is removed.

The crowded WebKit check compares both old decoder/writer sources against the
new code. Control restore fails even on an unchanged warm return; the new cache
restores after both UI update and warm return. All seven geometry/pixel hashes
are identical to the original five rendered approved cats. The UI-update
restore + five-model + extra-crowd construction phases are 390+3330+1398 =
5,118 ms control versus 272+379+1531 = 2,182 ms updated. This is a private
construction workload, not whole-game loading time or device FPS. See
`crowd-webkit.json`; the extra crowd remains fully constructed in both runs.

The focused boundary test also uses 300 actual generated tiny-fur variants,
checks the original hero's exact bytes after installation, and verifies that
4,097-entry records are rejected/trimmed to the shared safe bound.

## Release gate

All 671 tests pass, including housing/family/shared-save and camera contracts.
The production build and Cloudflare Worker deployment dry run pass. Two changes
are retained as separate commits; no unproven rendering experiment is included.
