# Expressive performances on all water rides

Approved production baseline: `9e0577c` (preserved locally as
`baseline/approved-water-and-rider-seams-20261104`).

All 68 registered water rides receive individual authored gesture schedules in
13 motion families, layered over their existing speed/height/turn reactions.
Independent forepaws paddle, wave, balance and celebrate; passengers look at
neighbours at different times. Waiting, descent/airtime, splash shake and recovery
retain the original routes, vehicles, support poses and common group clock.
The actual canyon rafting run is now 24/1.30 seconds and the river is 42/1.25
seconds. Walking, boarding, landing recovery and true 9.81-gravity flight retain
their original timing. Impact events follow the actual shortened public clock.

Full performances are shared fixed phase-aware tables, at most 512 intervals.
Runtime seeks interpolate into reused scratch objects without route calls,
per-rider timers, new meshes, render passes, reflection targets or texture uploads.
The native shoulder/elbow/ear channels reset on the next ordinary animation;
shoulder Y and ankle Z were rejected because the base animation doesn't reset
them. Forepaw lifts are bounded and move outward from the face. The original
sculpt producers and model payloads are unchanged.

The full local suite passed 945 tests; focused animation/route/save checks passed
26 tests. Dense native clearance passed 3,276 seated poses and 1,375,920 transformed
skin-vertex checks across all 19 seats (existing .03-metre tolerance). The eight
full model/buffer/framing snapshots are exact before/after matches. Re-baked
reflection files retain all eight original image hashes and 881,700 download
bytes / 2.67 MiB shared mipmapped GPU maximum; only their source-revision manifest
changes. Software-browser checks do not establish physical M2/iPhone FPS.

Full renderer and private app/SQLite results are recorded after completion.
