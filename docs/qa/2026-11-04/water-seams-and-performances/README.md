# Continuous river banks and distinct rider performances

Baseline: published `6a74662`. The approved clear-water shaders, mobile DPR,
water fields, scenery detail and native cat geometry remain unchanged.

The canyon and river had eroded bank toes outside the solid channel bed.
Their submerged toes now overlap the wet edge; the same original floor buffers
extend under the banks. The extension tapers to zero at open mouths. An initial
constant-width trial exposed a small apron at the catch pool and was rejected
on rendered review. The floor repair retains its original triangle count. No new water texture,
render target or draw pass is introduced. The same eight 256-square scenery probes were rebaked; only changed scenery images differ (881,700 total download bytes / 2.67 MiB mipmapped).

The spline frame carried a generic `ride` label which overwrote `rafting`,
`drop`, `boost` and `float`, disabling phase-specific reactions. The authored
phase now wins. Eight performances add anticipation/peeking, bracing, passenger
waves and glances, flight and crest gestures, paddling, balance, splash shake
and recovery, using the approved native joints. Group passengers differ while
the boat clock and original occupied transforms remain exact.

All 37,697 vehicle frames checked at 30 Hz retain their previous path and
orientation. Seat-height corrections are confined to boarding/dismounting; wet
mechanics and duration remain unchanged. Nineteen passenger pose tables share
935,712 CPU bytes,
use at most 512 intervals per type and only interpolate during play. Tests
verify no route reevaluation, mutable rows, seek drift or reduced-motion pose.
Four static models retain exact full geometry/frame digests through the final
dock fix; their checked images remain valid. The four changed docks were fully
rendered again after opening their landing gates.

The focused bank/rig checks passed 22 tests and the dock checks passed 2 tests.
The final full suite passed 941 tests. The final gallery passed 144 native
performance frames, 32 seated/landing frames, 8 dismount close-ups, 16 mobile
views and 24 exact native/static colour comparisons. Native save audits follow.
Software-renderer images and resource parity do not establish device FPS.

Dense native skin/deck inspection passed all 19 passenger seats through 3,276
poses and 1,375,920 transformed paw-vertex checks (existing .03-metre tolerance).
This includes anticipation, lift, hold, active travel, splash and unloading.
The previous early seat-height fade caused sinking just before dismounting;
mounting now reaches support height before the first seated frame, and support
is released during the exit walk. Landing body compression retains supporting
forepaws. The regression test now includes early anticipation and splash poses.

The last close inspection found dock posts/rails passing through a moored raft.
All four landing gates now clear the actual hull with finished end posts,
while retaining their original dock paths and surrounding fences. Ordinary
railings keep their exact original 24-segment geometry; tests inspect actual
post/handrail vertices against real hulls. This is an access fix, not an FPS
claim. Static image/framing checks cover the resulting scenery.
