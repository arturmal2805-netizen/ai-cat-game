# Manual Mall return: source trace and cold-loading check

Published source: b2071a6f36ec79a4d53a28acd946aa9003c68c74.
The public Pages bundle was downloaded on 2026-11-15; SHA256 prefix
`e545b37a0c6440fa` matches the actual index asset reference. Workflow
43648549789 completed successfully. This does not claim direct access to the
workers.dev endpoint, which the current network policy blocks.

## Actual obstruction

`public/mall-architecture.js`, `movingEscalator`: positive-side ramp centre
X=18.4, width=3.3, positive edge gives X=20.05. The original navy TubeGeometry
has radius .16 and runs from (20.05,.18,51.5) to (20.05,8.68,78.5).
Its projected collider is hx=.1599998474, hz=13.5480442047. This is an
individual authored rail, not a merged box accidentally closing an opening.
An actual glass side pane follows the same line and rises 1.05m above it.

Collider Z is relative to MALL.z=65; render meshes add their floor height and
biome centre (-450,500). F1's lower rail reaches F2 at
(-429.95,-156.32,578.5) in world coordinates. The same authored ramp exists
on F2 leading toward F3; its projected bounds also cover the ramp footprint.
The 2D projection is conservative and does not assert a solid vertical wall
at every height along the whole ramp.

The return crosses at Z=79.7, beyond the real Z=78.5 rail/glass endpoint,
within the actual upper landing. It then enters the ramp at X=18.4 and walks
down. The published native-radius walker regression traverses every segment,
both sides and all six floor transitions. Neither the collision geometry nor
the native body radius was weakened. A free endpoint alone is not its proof.

## Cold native scenario

An ordinary source export of the published commit ran the actual game in
Chromium at DPR2 with an isolated workerd/SQLite save. No player data or live
AI inference was used. Render submissions were paused between real captures;
simulation and cooperative preparation continued.

The complete exit/swim/reboard/World/airlock/Mall/F2/Island-return scenario
passed. The final F2 reload intentionally did NOT call Mall.ensure(). At
camera release: root=false, ready=false, paused=true. The return itself
requested its required resources and reached docked. An additional durable
save and reload preserved docked and controlled=false with no explorer.
Balances, inventory and placements matched the fixture. JS/HTTP errors: none.

The loading/warmup canRun policies use visibility, modal/frame suspension and
bounded gesture gates; faceCamera.enabled does not itself block these queues.
The diagnostic `moving` flag includes face tracking but is not the loader gate.
The earlier root=false observations were fresh reloads, distinct from the
previous ready-scene handrail stall. No global loading restrictions changed.

This check alone does not prove all keyboard/mobile combinations, autonomous
post-return work, final camera art quality or physical-device FPS. Those are
separate assertions in the expanded audit.

## Follow-up input fix and complete native audit

A regression first failed with movement held while focusing an input. The
runtime now clears held controls on text focus and hidden-document events,
recognizes contenteditable inputs, and removes those listeners on disposal.
The existing window-blur and keyup clearing remain intact.

`input-and-life.json` records the subsequent full native run with that fix,
including separate W/S/A/D and diagonal input in both swimming and Mall modes,
keyup stop, blur dispatch, focus while holding W, typing without movement, and
phone-layout pointer controls for W/S/A/D plus swimming ascent/descent.
Boat/airlock controls use actual touchscreen taps. The input probes walk back
with opposite input; they do not reset actor positions to hide displacement.
The existing private full-flow fixture places a boat at the Mall approach and
places Chichi at the foot of the authored escalator to isolate those scenarios;
that is test setup, not a production navigation change.

Following the cold return and dock reload, the fixture enables an ordinary
established work assignment at the working game clock. The unmodified normal
job runtime starts `to-work`; another SQLite reload restarts that assignment
while the submarine remains docked and uncontrolled. This checks eligibility
for ordinary life, rather than merely substituting a phase label. The normal
job engine's pre-existing city-gate arrival policy is unchanged. No new AI
calls or production saves are involved. The balances/inventory/placement
comparison is made before this explicit private work fixture.

The additional actual-model route regression starts at X=±20.84,Z=78.5,
plans to the upper landing, then sweeps the full native-radius walker around
the rail end and down to the lower floor. All 12 side/floor cases pass;
`test/mall-navigation.test.mjs`: 6 tests passed. Node22 build passed and
all tracked model manifests remained unchanged.

Final validation: 1021 full-suite tests passed under Node22 (no failures/skips),
plus the expanded six-test actual-model navigation suite. Node22 build and
Wrangler deploy --dry-run passed. Candidate public bundle: `1dcfdd349f5d11c1`.
Vacation source/save-merge work is deliberately outside this release.
