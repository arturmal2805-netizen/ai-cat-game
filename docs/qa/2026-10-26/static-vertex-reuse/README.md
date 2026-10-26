# Static vertex reuse and Job City checks

Control: released `c23986f`. The candidate changes the shared static model and
scenery builders, not the approved cat/fish rigs, gameplay, maps or saves.
Every original attribute and triangle remains. Index aliases reuse only corners
whose complete attribute bytes match. Apply them AFTER the existing index-cache
ordering so even coincident triangles retain their released order. Sources that
still need generated normals keep their original indices.

Preparation yields in bounded slices. Immutable shared primitives cache their
alias tables weakly; each copy owns its index. Temporary merge maps are consumed
after construction, never serialized in `userData`. No new render passes,
textures, render targets, per-frame uploads or quality settings are introduced.
The approved sculpt-cache fingerprint is still
`sculpt-v2-a496203fa13a037a7a10a927`; this release does not discard identical cat
construction buffers.

## Render comparison

WebKit, forced software GL, four Mesa threads, original DPR 2. Private local
SQLite fixture: 24 adopted cats plus native venue staff, eight purchased homes,
four additional legendary slides and sixteen additional businesses. All runtime
BIOMES are visited, then Job City, capybaras, aquarium and homestead are revisited.
The scene/simulation, wheel/orbit handlers, native RAF and nonblocking GPU queue
remain active during timing. Readbacks and index-switch uploads occur outside
timed sampling. The QA control also switches copied small-prop BatchedMesh
indices, rather than leaving those batches optimized in both variants.

- All **17** frozen native colour/shadow comparisons: **zero different bytes**,
  equal triangles/draws, equal DPR, zero GL errors.
- **44** native camera samples / 22 pairs: 13 higher submitted-frame rates and
  9 lower. Median paired submitted-FPS ratio **1.0204**; median render-CPU ratio
  **0.9479**. Keep the slower samples; this is a small directional result.
- The full-island run completed every render/input check but its final error
  assertion FAILED on a local save PUT HTTP 500. The Wrangler log identifies
  `ProxyWorker: Network connection lost`; a subsequent PUT succeeds. This is
  recorded in `transport.json`, not presented as a clean overall integration
  pass or silently filtered out.
- A separate, clean Job City retry prepares the work routes outside sampling
  so employee arrivals do not dominate comparison, then runs six 25-second
  native samples with alternating order. All three pairs have lower median
  render CPU; two have higher submitted FPS and one lower. Median ratios:
  submitted FPS **1.0275**, render CPU **0.8550**. Exact pixels, original DPR,
  zero context losses, **zero JS/HTTP errors**. Raw shadow/cache/buffer data are
  included. These software numbers are not physical MacBook or iPhone FPS.

This retains a bounded geometry-processing improvement, not a blanket FPS
guarantee or a replacement for the approved baseline. Every future rendering
change still needs the complete native-frame regression gate. Screenshots of
Job City, the aquarium and all eight visible homes were inspected.

## Validation

**711 tests pass**, including exact per-corner attribute/triangle order,
Float16/seam preservation, cache independence/invalidation, cooperative slicing,
and an actual building whose missing normals must retain a sharp corner.
The full suite also covers careers, weekly trades, families, housing and saves.
Build and Worker dry run pass. The phone check passes six guest/world/island
camera cycles, native dragon visibility and exact GPU-retirement/re-upload
images without context loss; see `phone-camera-buttons.json`.

Trading checks use private SQLite and mocked forecasts, never player worlds or
paid inference. The independent trading evidence is also recorded under
`../../2026-10-22/job-city-trading/`. `trading-browser.json` verifies the final
candidate: six separate native workplaces, one mocked forecast, one real
45-second settlement and three full app reloads with identical wallet/history
and no repeated forecast. Active-document exceptions: zero. Five departing-page
WebKit fetch cancellations are explicitly recorded separately; no production
save/CORS workaround was introduced. Publication results are recorded alongside
this report when complete.

Reproduce the full render probe with `CHICHI_NATIVE_MAP_AUDIT=1
CHICHI_COMPARE_STATIC_REUSE=1 CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1
CHICHI_QA_ROSTER=24 CHICHI_QA_HOMES=8 CHICHI_BROWSER=webkit LP_NUM_THREADS=4
node scripts/check-aquarium.cjs`. The focused retry adds
`CHICHI_NATIVE_SETTLE_JOBS=1 CHICHI_LIVE_BIOMES=jobcity
CHICHI_NATIVE_REPEATS=jobcity,jobcity CHICHI_NATIVE_SAMPLE_MS=25000`.
