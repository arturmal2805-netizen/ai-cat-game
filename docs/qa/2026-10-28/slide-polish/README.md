# Faster, continuous water rides and clear receiving pools

The player's request covers the entire water collection, not only Mega Loops.
`WATER_RIDES` still has 60 entries: 14 earlier slides/channels, the diving tower,
25 dream complexes and 20 giant atoll mini-biomes. No catalogue ID, price,
ownership receipt, island centre, save field, cat mesh or renderer policy changes.
The approved cat cache remains `sculpt-v2-a496203fa13a037a7a10a927`.

## Ride clocks and continuity

`water-ride-pace.js` accelerates wet ride/slide/vortex/drain/underwater/lift phases
by **1.33**. The same physical path takes its old duration divided by 1.33;
this is 33% more speed, not 33% less total excursion time. Walking, boarding,
true-gravity airborne trajectories and landing recovery retain their durations.
The diving tower's real ballistic falls and unrelated coasters remain unchanged.
Legacy occupied-raft updates temporarily use their authored clock and restore
all fields in `finally`; public seats and splash events use the accelerated clock.
Canonical lanes map geometry stages, impact times and launches to the same clock.

The original phase audit found 227 orientation discontinuities above 0.03 rad,
including boarding and recovery. Smooth turns occur during boarding/airtime or
outlet settling, never by flattening a water loop. Transported path frames avoid
projection singularities. Construction-time Gaussian path/frame fairing retains
all 601 samples and exactly matching flume/water/seat bases. Kernel weights and
angular thresholds are computed once, rather than in a frame update. Complete
last-loop inversions, real 9.81-gravity flights and dry return poses are tested.

Tight or intersecting connectors were revised in crystal loops, twin canyons,
orbital/luminous approaches, ribbon tower, cloud star, rainbow race, root valley
and Mega Loops. Race lanes retain distinct endpoints and impacts. The ribbon
receiving pool is wider; its original flowers move outside that pool. Spiral
bowl seats no longer circle an almost zero-radius centre. Four-tier bowls have
independent incoming/outgoing control points. Existing silhouettes, landscape
components, footprints and normal object scale remain.

Native geometry tests cover the largest approved cat in all flumes and vortex
bowls, with the real articulated paws, measured reactions and sitting pose.
The vortex check examined 37,785 transformed vertices at five spiral positions;
none crossed its concave floor (minimum vertical gap 0.203492 world units).
Simultaneous race paths are independently checked with a spatial grid, including
separate finish points. Tests exercise multiple riders, cancellation, reduced
motion, autonomous residents, ownership, construction and repeated saves.

## Receiving water

The 45 ShapeGeometry catch pools had metre-coordinate UVs. The lake shader uses
a centred unit domain; the old mismatch treated much of the surface as shore
foam and obscured optical depth. `slide-basin-optics.js` normalizes the actual
surface UVs once, including cloned/shared geometry safety. All 60 receiving
pools have clear-blue water and a genuinely lit floor. `SLIDE_CATCH_POOL` isolates
the colour/transparency adjustment from ordinary island lakes and waterfalls.

The existing shared sky/reflection and wave fields, Fresnel highlights, caustics,
wakes, real outlets, contact foam and ballistic droplets remain. There are no
new render targets, scene copies, wave textures or continuous geometry/matrix
uploads. Pool depth and original scenery/cat detail, full mobile DPR, shadows,
renderer cadence and residency policies are retained.

## Validation

The WebGL harness inventories every entry and checks normal, grazing and
390 × 560 phone views at DPR 2 (780 × 1120 drawing buffer), plus flow/outlet,
whole-basin/grazing-basin close-ups and three occupied-seat/one landing views.
It compares native and batched static pixels, flowing animation, stable reduced
motion, fixed effect attributes, idle/landing effects and context status.
Private app checks use local Worker/SQLite saves and mocked AI, never player
worlds or paid inference. GPU browser jobs run sequentially. Chromium SwiftShader
images/resource counts are correctness evidence, not M2/iPhone FPS measurements.

The harness now supports resumable report checkpoints. The first pass exposed a
harness-only assumption that every attraction has a wet flume leg; the diving
tower only has flight legs. Its seated view now selects the real flight leg.
Completed normal/grazing checks were retained; every phone view is rendered in
the final pass. This avoids silently excluding older slides or the tower.


The final local suite passed all **783 tests**, with application build, Worker
 dry run and the four shipped-preview/cache tests passing. All 60 water previews
and their manifest were regenerated; every unrelated PNG is unchanged.
The full WebGL pass retained **180 exact native/batched frames** (normal,
grazing, phone), 240 occupied/landing frames and no browser/shader/context errors.
The private phone shop/camera check retained all twenty paid plots through two
SQLite reloads, with hero/tiny/giant seat errors below 0.001 (recorded as zero).
The separate Mega Loops check completed a cold model at camera distance 900,
started two real riders, opened its cold inspection camera and stored/re-placed
the finished model without a second payment or deadline. Both browser/HTTP error
lists were empty.

The older Titan browser harness now centres the camera before comparing native
joint values: offscreen rigs intentionally sleep while their seats keep moving.
Its old outer-land fixture also filters the runtime BIOMES list rather than
trying to build on three islands the player already removed. These are test
corrections, not runtime visibility changes or restored islands. Occupied image
checks call the native four-argument `animateCat(cat,time,walking,reduced)` with
walking disabled while seated; no extra timestep argument is supplied.

The final legacy Titan phone run passed autonomous selection, native hero/tiny/
giant choreography and exact seats, an actual touch drag onto the attraction,
water impacts, ordinary completion, surviving Candy outer-land placement and
cached-client protection through the real SQLite Worker/reload. No browser or
shader errors remained. This last run used the corrected visible-pose and
runtime-island fixture. All 240 seated screenshots were also repeated with the
native non-walking animation call before finalizing this report.
