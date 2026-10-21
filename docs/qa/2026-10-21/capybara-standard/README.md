# Capybara-standard optimization and automatic homes

Baseline: `ecfc104f409a24fca888574e22ba8b47a8439718`, also preserved remotely as
`baseline/capybara-standard`. No player-world writes or AI calls were used in
browser fixtures. The private stress world unlocks all 30 islands, includes
16 adopted cats, 4 large slides, 16 businesses, and 75 purchased houses on seven
sections. Native staff/visitors remain enabled.

## Changes and observed work

- Shared geometry baking copies the exact existing buffers rather than invoking
  procedural constructors and immediately overwriting their work. A separate
  Node comparison of 10,000 sphere copies took 1,410 ms natively versus 305 ms for
  buffer copies. Sampled capybara loading time inside the redundant sphere
  constructor fell from 357 ms to 1 ms in the repeated browser profiles.
- The selected island, placement refreshes and house templates share one
  cooperative geometry queue. Selected work preempts remote work; remote work
  pauses during camera gestures. No island construction state is discarded.
- Original Chill houses now have a cooperative generator and identical
  synchronous compatibility wrapper. Visible houses coalesce repeated requests,
  prepare at most two concurrently, prioritize the nearest purchases, and warm
  original textures/colour/depth shaders before exposure. Disposal also handles
  late template completion and model-preparation failure.
- Housing navigation reuses objects across unchanged cloned saves and checks the
  relevant section (normally up to 12 houses), rather than every purchased home.
  Path searches no longer remap every obstacle for each grid sample. Collision
  checks retain the original order/radii without copying the entire crowd array
  for each moving resident.
- Read-only diagnosis found an evening `invalid_evening` AI result blocking the
  whole after-work plan, including houses, despite affordable wallets. Ordinary
  evenings now use structured decoding too: actual venue ranges, car ownership,
  requested cat indices and bounded distinct outings. Legacy tuple receipts
  still decode. Optional purchases, existing family cadence, professions, prices,
  paid receipts and synchronous save durability retain their released behavior.
  Large-roster output budget is bounded at 8,192 tokens; ordinary requests still
  use their calculated smaller budget. No extra per-cat calls or retry loops.

## Timing limits

`profiles.json` records the sequential before/after runs and a repeat. These are
Chromium software-renderer command diagnostics, including native render
traversal/driver calls while raster is separately suppressed during timing.
They are **not Mac or iPhone FPS measurements**. Real full-resolution frames are
captured separately. Warm camera medians overlap: capybaras about 18–19 ms,
large player island about 27–31 ms. No stable whole-map FPS percentage gain is
claimed. The first after-run capybara loading time was an outlier at 9.2 s;
the repeat measured 5.7 s versus the baseline's 5.3 s. Removing redundant
construction is proven CPU-work reduction, not a claim that total shader/GPU
readiness always finishes sooner. Progressive home preparation also changes
first-frame content, so its initial raster timings are not an equivalent FPS
comparison. Heap values are transient snapshots, not garbage-collected retained
heap or evidence of lower total RAM.

## Verification

- Full local suite: **640 tests passed**, plus final housing/Chill collision and
  lifecycle checks after the small cleanup changes; production CI reruns all.
- All 30 islands plus an aquarium return: full-resolution DPR 2 images, zero
  changed comparison pixels, exact GPU-buffer retirement/re-upload, live wheel,
  orbit, pinch, no page zoom/picking regressions or context loss. See
  `all-islands.json`. Original cats, fish, vegetation, water and lighting remain.
- Private settlement: first section → seventh section → first section, all 75
  ledger entries retained, one live model per inspected purchase, seven reused
  templates, no pending builds left. See `housing-return.json`.
- All 147 residents reach 74 homes in three arrival orders without overlaps or
  deadlocks; exact section bounds also match a full-ledger search. Permanent
  purchases survive twenty reloads and old/concurrent-client merges.
- Real browser/SQLite lost-ACK scenario: two permanent families, a new automatic
  AI-response house, three reloads, five duplicate writes, concurrent old-client
  updates, one inference, one charge, visible original Chill architecture and
  separate partner sleeping positions. See `family.json`.

The capybara architecture and these constraints are permanent rules in
`AGENTS.md`. No DPR, shadow resolution, model anatomy, triangle detail, water
quality, animation rate, business rewards or save writes were reduced.
- WebKit/Safari engine: four capybara views at 2,124 × 1,360, zero changed
  colour/shadow pixels, no context loss. The retained exact shadow cache skips
  297,972 redundant shadow triangles per stable frame in this fixture, while
  preserving every triangle in the visible models. See `webkit.json`.
