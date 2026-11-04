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

The full local suite passed 948 tests; focused animation/route/save checks passed
27 tests. Dense native clearance passed 3,276 seated poses and 1,375,920 transformed
skin-vertex checks across all 19 seats (existing .03-metre tolerance). The eight
full model/buffer/framing snapshots are exact before/after matches. Re-baked
reflection files retain all eight original image hashes and 881,700 download
bytes / 2.67 MiB shared mipmapped GPU maximum; only their source-revision manifest
changes. Software-browser checks do not establish physical M2/iPhone FPS.

The private app/SQLite runs record complete success footers and error lists.
A partial checkpoint is never counted as a completed integration run.


The final renderer review completed all 68 rides: 272 seated/landing views,
72 additional performance views, 8 dismount close-ups, normal/grazing/phone
views and 136 exact original/static colour comparisons, with stable water
buffers and no context loss. The complete compact report is `render-audit.json`.
The original cat GLBs and all five zoo model payloads remain byte-identical.

A measured six-lane preparation initially occupied approximately 25 ms on this
runner (four-seat rafting approximately 15 ms). The background builder now yields
between lane tables, with no partial cache exposed; synchronous factories use
the same generator. This is a bounded construction improvement, not a physical
hardware FPS claim. Reflection images remain exact after the factory change.


Native UI integration completed eight rides/returns, both camera controls and
six isolated SQLite reloads across two independently completed worlds (16 shop
purchases, no browser/HTTP/context errors). Image inspection then found a
surf-specific regression: stronger head turns put the close guest camera under
the water sheet, despite correct face projection. A surf-only elevated frontal
view now eases in/out; ordinary cat camera orbits retain exact zero-lift behavior.
Seventeen camera/loading/timing checks pass. The surf guest image is rerun with
an explicit framebuffer check at the projected face, not just a button-state or
carrier-position assertion.

The surf rerun completed both cameras, the return walk and three additional
SQLite reloads with no browser/HTTP errors. The projected head region passes
the actual native framebuffer visibility check. The corrected close phone
image shows the kitten clearly; the earlier opaque-blue frame is retained
as regression evidence. This rerun uses another independent eight-purchase
fixture, so the completed integration total is 24 test purchases, 9 ride/return
checks (8 unique rides) and 9 SQLite reloads across three private worlds.

Final source freeze: 948/948 local tests pass; animation/route/save checks pass
27 tests and camera/loading/timing checks pass 17 tests. The exact tested app
entry is `./dist/app.js?v=64eb9cc33bd161c6`.
