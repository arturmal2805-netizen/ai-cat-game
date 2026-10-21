# Frame-stall investigation and retained changes

The approved world baseline remains preserved. This investigation uses released
`273d6e5` as its immediate control and retains three bounded changes (final source is recorded at publication):

- Copy the complete native PCF depth attachment with a depth-only GPU blit and
  tracked READ/DRAW framebuffer restoration. The generic texture copier queries
  unpack state. An isolated CPU profile attributed 2,223 ms to that query;
  the direct-copy profile removed it. First shader-link work remained. This
  establishes a removed blocking operation, not a uniform FPS gain.
- Prepare Three 0.186's actual native `BasicDepthPacking` variant. Explicit
  custom depth packing and callbacks remain unchanged.
- Cache exact content dimensions for HUD projection in the resize observer.
  A 120-frame regression test performs zero additional layout reads; actual
  orientation/resize measurements still update the dimensions.

## Rejected experiments

The five-change trial also bypassed alpha blending for known alpha-one scenery,
retaining transparent sorting and restoring ordinary blending for fading trees.
All 34 full-resolution comparisons were pixel-identical, but the full live
trial did not establish a stable improvement (24 of 34 submitted-frame samples
were slower). Arbitrary construction-preview clones also change opacity
outside the tree-fade helper. The bypass was removed from the retained code;
it is not a new template or quality setting. Native transparency is unchanged.

Cross-material native preparation reuse was also removed. Its work-count test
reduced 200 preparations to two, but the eight core native-frame samples did
not establish a stable benefit (median submitted-FPS ratio 0.983). Colour
materials still need their individual native initialization before first use;
removing preparation work alone is not evidence of a smoother first draw. The
released per-material preparation and ownership behavior remain unchanged.

Other private experiments (fence count/flush changes, disabling the shadow cache,
moving scenery to the opaque pass, and individual cat pose textures) did not
produce a stable gain and were not retained. Approved cat/fish models, counts,
water, vegetation, lighting, shadow resolution, DPR and GPU-residency policy
remain unchanged.

## Browser method and limits

`check-native-map-frames.mjs` runs the actual world RAF, simulation, render and
nonblocking frame queue. It neither suppresses raster work nor steps the world
manually during timing. A separate QA-only full readback drains old GPU work
before sampling. Submitted FPS and a completion lower bound are recorded
separately. Real pointer capture must reach an empty canvas point, and measured
camera rotation and zoom ranges are asserted; overlapping HUD controls cannot
silently pass as an orbit. Timed wheel/orbit trajectories follow elapsed time.
The private fixture holds only the city clock at noon, preserving real lease
and save time. No player world or real AI inference is used.

All-island control and five-change runs cover 30 islands and four return visits,
with equal DPR 2 and full detail. `all-island-colour-proof.json` separately
compares all 34 frozen images and equal triangles/calls; zero bytes differ.
The eight invalidation cases in `shadow-depth-proof.json` independently compare
the retained depth copier with native shadows, including movement, removal,
material-side changes and camera/light changes; zero bytes differ.

These are Linux software-renderer diagnostics, not physical MacBook or iPhone
FPS. Software-thread oversubscription and sparse GPU-bound samples limit
precision. The later four-island runs explicitly set `LP_NUM_THREADS=4` to match
the execution machine's four-core quota; their absolute values must not be
compared with the earlier default-thread runs. Keep raw slower results and do
not promote a uniform FPS claim from work counts, loading time or a single run.
The common template's new regression gate makes that requirement explicit.

The core reference produced all eight render/input samples, then failed its
transport assertion on one private Wrangler `ProxyWorker` PUT returning
`Network connection lost`/HTTP 500. It is retained as diagnostic data, not
represented as a clean browser/save test pass. The unchanged production save
code is checked separately by the full suite and private family/save test.

## Checks

The intermediate four-change source passed **651 tests, zero failures**, build
and Worker dry run in GitHub workflow `39605004782`. Final three-change focused
checks passed **15 tests**. Final full-suite, publication and private
family/reload evidence are recorded separately when complete. No rendering
optimization is promoted as a new FPS standard merely because correctness
checks pass.
