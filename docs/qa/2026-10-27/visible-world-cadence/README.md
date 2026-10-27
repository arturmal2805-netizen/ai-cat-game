# Visible-world cadence and the physical Moon report

The supplied `dd8a71705ddfa88f` report is the latest released individual-cat
renderer on Chrome / Metal M2, DPR 2, 2804 x 1384 drawing buffer, Moon scene,
64 NPCs with two relevant poses. The player describes the small island without
their own buildings. Native rendering still includes authored scenery and cats:
352 calls / 528,932 triangles / 30,801,264 geometry bytes in the final frame.

Reported FPS is **33.18**, gap p95 33.4 ms / max **1333.3 ms**. CPU median is
1.1 ms, render-submission median 3.8 ms; elapsed GPU render spans have median
11.4 ms / p95 14.83 ms. These spans are not a utilization measurement.
There are **zero window evictions and refaults**. The preceding cache fix does
not explain or solve the remaining quiet-scene frame rate.

The last frame is stationary, and the released world explicitly requested
30 FPS for that state. The complete window also contains a real 605 ms main
task, a 610.4 ms Long Animation Frame with 559.9 ms blocking, and a 1333.3 ms
frame gap. Native compilation occurred: 75 links / 75 program-info calls,
324.1 ms total program-info time, 19.6 ms maximum individual call. Last-frame
preparation zero does not establish that the whole window was fully warm.
These aggregates cannot assign the entire hitch to a single cause. It is
**not claimed fixed** by changing cadence.

## Independent corrections

1. The render pacer kept only 0.5 ms of early tolerance. On a controlled 60 Hz
   timestamp stream with alternating +1.5/-1.5 ms jitter, one initial phase
   submitted 324 frames in ten seconds rather than 600; the opposite phase
   submitted 600. This is an actual scheduling defect independent of geometry.
   The correction uses a bounded allowance (at most 4 ms, one quarter interval,
   plus a 0.0001 ms floating-point boundary tolerance). It advances using that
   same tolerated deadline. Absolute cadence survives late callbacks, with no
   repeated submission at the same timestamp and no catch-up replay.
2. Visible play now requests 60 FPS even with a stationary camera. Covered,
   offscreen and diagnostic-paused simulation retains its 100 ms cadence;
   hidden documents submit no frames. The two-frame nonblocking GPU fence
   limit and all graphics are unchanged. This removes a rate cap; it does not
   reduce rendering work per frame or establish hardware throughput.
3. Native hero skin-bound calculation retains Three's sphere algorithm and
   exact vertex order, but reuses each bone-matrix product within that one
   synchronous calculation. The approved hero pose tests reduce these products
   from **142,582 to 48** with bit-identical sphere centres/radii across moods,
   walking and nonuniform world transforms. Native/custom callbacks retain their
   original path, and temporary overrides restore on errors. No matrices are
   cached across poses, no geometry/shader/model changes, and no conservative
   replacement of sorting spheres is made. Four actual native colour/shadow
   images have zero changed bytes and identical calls/triangles. This removes
   proven duplicate CPU work on initial bounds; the physical hitch's complete
   cause remains unassigned.
4. Explicit local diagnostics now separate RAF callback frequency and the
   game's own cadence skips from rendered FPS. Reports show `targetFps`, program
   count, bounded frame sections (viewport, world/camera, jobs/homes, venues,
   residents, Chichi, housing view, ambient/HUD, visibility), and separate
   renderer, GPU-submission and residency elapsed times. GL timing includes
   fence creation and shader/program setup, without adding driver queries or
   retaining arguments. All detailed clocks/counters remain `profile=1` only.
   This is attribution for the unresolved hitch, not a claimed FPS fix.

Live models, poses, water, lighting, shadows, geometry, pixel ratio, picking,
durable saves and all personal cat-life systems are retained. The earlier
successful native renderer and bounded geometry-cache changes remain in place.
No existing approved baseline reference is advanced on the basis of these
timings.

## Evidence and validation

`synthetic-clock-controls.json` compares the released pacer with the correction
for every tested initial phase at 60, 90, 120, 144 and 240 Hz, with requested
10/30/60 FPS. The failing 60 Hz phase changes 324 -> 600 submissions per ten
seconds; the other phase stays 600. Unit tests add more +/-2 ms patterns,
duplicate callbacks, viewport/interval transitions and long-pause recovery.
This is a deterministic clock control, not physical-device FPS.

`isolated-native-raf-webgl.json` runs actual native RAF, complete fixed WebGL
frames and the original nonblocking GPU queue in Chromium/SwiftShader, at
DPR 2. All cases have zero changed framebuffer bytes, identical draw/triangle
counts, no context loss, no JS/GL errors and at most two pending frames.
The small stationary fixture changes about 30.00 -> 59.34 submitted FPS after
the cap correction. The clock-stress cases use actual RAF timestamps adjusted
by +/-1.5 ms; they produce 56.03 / 57.35 FPS with differing GPU-block counts.
That single native stress pair does not establish an FPS gain. This is a tiny
12-triangle cadence fixture, not a game or M2 benchmark.

The final full local suite passes **746 tests**, including exact native bounds
and error restoration. Final targeted cadence/diagnostic tests pass **13 tests**.
Whole-map, diagnostic-browser and publication records follow with their exact
renderer and scope. Private local SQLite is used throughout; no player save,
API key or paid inference is used.

An earlier 5-second orbit/zoom audit completed all 17 unique views and their
exact native/return images, then failed the Summer return's orbit-range
assertion. Its failing interval was not captured, so its cause is not assigned
and it is not counted as a passing 21-view audit. The final run uses 8-second
windows with the same real-input orbit/zoom thresholds; failed intervals now
retain input-state evidence. No production input handler or assertion was
relaxed. The earlier partial run and its failure summary are retained.

The final phone-WebKit stress audit completes **21 native RAF orbit/zoom views
across all 17 runtime islands**, including all four returns. The fixture has
64 mobile NPCs, embedded staff, eight homes, four large slides and sixteen
businesses. Every view retains DPR 2, an intact context, the real GPU queue
and actual input-handler rotation/zoom. All 17 native pose-resource comparisons
and all 17 retirement/re-upload comparisons change zero framebuffer bytes,
with equal calls/triangles and stable living cat/pose-slot registrations. Browser
JS and HTTP errors are zero. Software frame rates are recorded without claiming
a hardware FPS gain. The original five-second failed interval is not included
in those passing totals.

The graphics construction cache version remains
`sculpt-v2-a496203fa13a037a7a10a927`.

The actual diagnostic-browser check passes on private cold Chromium/SwiftShader:
clipboard and textarea fallback, original DPR/context, target 60, separate
RAF/cadence counters and all renderer/submission/residency sections are present.
It has zero JS/HTTP errors and retains no private cloud token. This cold
software-rendered report is a functional/schema check, not a measured game
performance gain or a reproduction of the physical M2 ready-world load.

Final production bundle SHA-256: `0fef7db1295474d0c6368a4025d7e538d1d8cba4b2bc817bea9e22589e86b7a8`.
Private QA globals are absent.
