# Static rendering validation

## Whole-map follow-up

`global-map.json` records a second full traversal of all 30 islands with 147
resident actors plus Chichi, four large placed slides and sixteen businesses.
All views retain DPR 2 and render without context loss or browser/HTTP errors.
It includes 39 exact original-prop raycasts, retained identities for 147 friend
cards during a coin update, and live hunger/relationship changes on those same
cards. Family/house integration separately passed three reloads, five identical
lost-acknowledgement retries and concurrent private SQLite clients, including an
older client. No player account was used.

`global-props.json` isolates shared small-prop submissions in four identical
frozen homestead views. Draws change **1388→1109, 1120→908, 834→690 and
1419→1140** (17–20% fewer), with exactly equal submitted triangle counts in each
pair. Pixel differences are limited to floating-point transform rounding at a
few antialiased edges: mean absolute channel error stays below 0.00026/255, using
a stricter tolerance than the existing exact cat-palette test. Aquarium prop
comparisons have zero changed channels in all four views and retain all 50 fish.

The JSON retains alternating repeated software-renderer timings. Most views'
timings overlap; one view is about 10% faster. They do **not** establish a 20%
device-FPS increase. The measured reduction concerns draw submission overhead;
unchanged GPU geometry and actual Mac/iPhone performance must be distinguished.

The original range-only proof below remains a separate pixel-exact check.

The 25 reference slides are already live at `35ff676`; the isolated gesture
picking fix is live at `7aecbaa`. This patch reduces invisible static GPU work
without changing any index/vertex/attribute bytes, material, cat or fish model,
fish count, scenery, water, shadow resolution or mobile DPR. Safari 15+ and
Chromium can submit contiguous visible index ranges with WEBGL_multi_draw;
unsupported renderers retain native mesh dispatch.

The previous homestead mismatch came from coral builders installing an animated
reef/refraction shader *after* their mesh was merged. The static helper now
recognizes that change before precompilation, preserves native dispatch and
restores native shadow handling. Tests also cover material/geometry replacement,
first shadow use, and guest clones without copied command-bound metadata.

Both committed JSON reports compare the same actual frozen world, camera,
shadows and full 776×1464 framebuffer. All four aquarium and all four crowded
homestead views have **zero changed channels**. Every approved model remains.
The aquarium retains 50 catfish; the homestead contains four large water rides,
sixteen businesses, adopted cats and workers. Index submissions fall by about
13–30% for the aquarium and 7–15% for the crowded homestead depending on view.

Timings use synchronous framebuffer readback in software Chromium, with three
samples per mode, alternating the order after warming both shaders. Homestead
medians improved 4.8–7.3%; aquarium results range from 9.5% faster to 0.2% slower.
These diagnostics are not measurements of a physical MacBook or phone and do
not establish that the user's reported lag has been completely eliminated.
No readbacks, framebuffer copies, timing probes or detail changes run in the
production game.

Reproduce with `CHICHI_STATIC_PROOF=1 CHICHI_STATIC_TIMING_REPEATS=3 node
scripts/check-aquarium.cjs`; add `CHICHI_SCENE_STRESS=1` for homestead. Run
comparisons sequentially. `CHICHI_STATIC_DIAGNOSE=1` additionally captures real
frames, repeated-frame controls, a full-range control, no-shadow control and
bisection for an unexpected image difference. All Workers use temporary private
SQLite saves and random tokens, never the real account 1427.

Final local regression checks passed: 499 full Node tests, then all 6 targeted
static tests after an additional permanent-fallback case; production build;
Wrangler dry-run; all 40 water attractions (including all 25 reference slides),
98 normal/grazing/full-DPR phone framebuffer comparisons with zero changed
channels; 77,700 GPU fish position/normal samples and 25 zero-difference fish
visibility frames. The private mobile/SQLite integration passed all 50 fish,
visitors, interior/fish cameras, actual hero/resident touch drops, friendship,
piggyback and shared save/reload. The screenshot test pins encounter time so
slow software readback cannot consume the animation between assertions.
See `validation.json`; GitHub reruns the complete suite before deploying.
