# Live rig lifetime, hidden matrix work and durable checkpoints

All browser checks use private local SQLite worlds, Chromium software WebGL and
DPR 2. No player world, account code, approved cat/fish model, scenery, shadow
quality or render resolution is changed.

`all-island-images-and-gestures.json` covers all 30 islands and a return to
Catquarium. Each visit compares frozen native matrix/traversal rendering with
the optimized path, including colour and shadows: all 31 comparisons have zero
changed channels. Wheel, orbit and native two-finger touch also pass; pinch does
not raycast cats or change page zoom. The crowded homestead and both aquarium
visits compare an actual GPU buffer retirement/re-upload: all three match.
All 180 living batch rigs stay registered. The check additionally sums their
joint entries against the atlas, catching partial slot loss that a cat count
alone would miss. Repeated shader compilation traces are reduced to a count
and the three largest events per visit in this report.

The GPU eviction regression is independently reproduced by
`test/geometry-residency.test.mjs`: retire and reload the same living model three
times, retain registrations and pose slots, then destroy the model and release
everything once. This case failed before the lifetime fix.

`hidden-rig-work.json` counts actual `Matrix4.compose`, `multiplyMatrices` and
`invert` calls over 120 identical animation steps per approved non-hero breed.
Only hidden mesh leaves defer ordinary traversal. Local compose work falls by
38–47%, world multiplication by 20–27%, and inversions by 57–67% in these cases.
These are arithmetic work counts, not FPS. Explicit hidden skinned queries,
visible/waking matrices, pose palettes, child bones and tongue transitions have
separate regression coverage in `test/hidden-rig-matrices.test.mjs`.

The outbox keeps its released JSON bytes, merge bases, retry IDs and sequence
numbers. Each checkpoint uses two owned clones rather than three; all four
synchronous storage writes/read-back operations remain. The serializer test
checks restart, snapshot isolation, mutable values on later writes and silent
write failure. The existing shared-save suite checks concurrency, lost replies
and older clients.

`full-frame-baseline.json` records release `1eb9cc1`; the final diagnostic uses
the same all-cat/crowded fixture and ordered three-island sequence. Both warm
real full-resolution rendering before collecting 180 command-only frames per
location. Full renderer, simulation, matrices, uniform and texture commands
remain; raster draws/clears alone are suppressed. Live AI/animation phases and
software-driver stalls vary, so these samples do not establish physical-device
FPS or a uniform speedup. Outliers and slower cases are retained. Snapshot
sizes/inflight states may also differ, so checkpoint milliseconds are diagnostic;
the clone/write counts establish the bounded work change.

`chichi-images.json` has four native hero skin comparisons with zero changed
channels. `neighbor-images.json` retains the existing per-cat draw-path
comparison across three breeds and four poses: unchanged triangle counts and
the existing tiny floating-point/shadow-edge differences (at most 161 channels
in 873,600 pixels, maximum mean channel error 0.001595) pass its published
thresholds. This comparison is distinct from the exact matrix/traversal tour.
`fish-gpu-motion.json` checks real GPU positions/normals and exact images for
five hall/close/overhead/outside views per fish group.

Observed command-frame medians are 20.4→21.4 ms (Bikini Bottom), 16.2→16.7 ms
(Catquarium) and 51.3→46.7 ms (crowded homestead). These are not a uniform
improvement. The final crowded run retains all 4,952 joint entries, whereas the
published baseline fell to 4,678 because of the eviction bug. The profile's
summed native `updateMatrixWorld` self time falls from 2,225 to 1,354 ms there,
while wrapper time rises from 362 to 609 ms. Large software-driver
`uniformMatrix4fv` stalls remain in both runs. `profile-self-work.json` retains
the top aggregated self-time functions for assessment.

Reproduce the tour with `CHICHI_GESTURE_ALL=1 CHICHI_MAP_CHECK=1
CHICHI_SCENE_STRESS=1 CHICHI_MOSA_CAPTURE=0 node scripts/check-aquarium.cjs`.
Use `CHICHI_FULL_FRAME_AUDIT=1` instead of `CHICHI_GESTURE_ALL=1` for the full
frame/checkpoint diagnostic; add `CHICHI_BASELINE_REF=1eb9cc1` for the published
baseline. Set the Playwright module and Chromium executable environment
variables for the installed browser. Completed validation is recorded separately.
