# Current — 28 November 2026, Europe/Kyiv

Canonical memory: `codex/ocean-recovery-memory`. This worktree's code is historical.
Use `/workspace/chichi-squish-v16`, branch `codex/warehouse-squish-v16`.
Preserve every older worktree. No subagents without explicit user instruction.

## Published

Main **541293e6f5d9ba24e0f71485820e4e2547e01da8**, source23a5043, PR21,
run46049325298 all test shards/test/deploy/pages SUCCESS; actual HTTP and deployed
Worker full SHA verified. [Game](https://arturmal2805-netizen.github.io/ai-cat-game/?v=541293e).
No newer V16–V19 update is published. Published entry/submarines/wallets preserved.

## Active user objective

V16 full Squish Warehouse physics/interior + V17 repeated reference validation +
V18 visual overhaul + V19 all 41 physics requirements. New **V19.1** explicitly
changes strategy to breadth first: baseline ALL five materials, then polish,
then references/performance/regression. Do not perfect one dent indefinitely or
redo already verified manual landing/camera without regression. **V19.2** adds
measured local pressure diagnosis, no duplicate procedural pressure, actual
original/side/top/debug/release views. It does not cancel V19/V19.1.

All V16/17/18/19/19.1/19.2 uploads fully read, exact specs under active codebranch
`docs/specifications/`. Latest full user file V19.2 local upload:
`/workspace/attachments/d0a9d8e1-686f-492a-bb8c-3f9a90cf089c/Вставленный текст.txt`.
Master tracker **`docs/SQUISH_V19_IMPLEMENTATION_TRACKER.md`** contains all 41
original sections INCLUDING verbatim nested requirements, 12 phase statuses,
honest five-material completeness matrix and diagnostic hypotheses. Update it.
No full-section VERIFIED claims based only on unit tests.

## Exact safe code checkpoint

**47b512c** (read fullSHA from code worktree/remote), prior normalized-pressure checkpoint **6a1b28b680ae7417ac4b76515d6b9326b8c050e9**, remote verified. Before it
**23ada02a790ac3e74cccb0639884a6663c822013** fixed negative deep-world floor,
Warehouse-only third-person clearance and reversible native slope orientation.
Actual coarse-touch takeover/jump/deformed landing/safe release PASS:
`/workspace/qa/squish-v19-manual-camera-fix`.
Do NOT edit protected `public/chichi-manual.js` (hash guard); scoped existing
camera/transport hooks are sufficient. Original cats/buffers untouched.

Current code fixes **double contact-influence attenuation** in the primary XPBD
solver. Prior weighted displacement divided by max(1,total), then multiplied
by total again: small paw loads became quadratically weak. Isolated same-input
42-unit cloud comparison: 0.060143m old vs0.283871m normalized depth. New compact
C1 contact support keeps remote giant skin quiet; foam mounted/volume-cell caps
avoid tet folding. Final exact compact-kernel/native values must be measured,
not borrowed from that isolated A/B. Estimated game mass8.5 shares gravity among
actual supporting paws; body uses total effective weight. Actual surface normals,
contact duration/penetration/share now stored. Ray support uses the rendered mesh.

**48 targeted tests PASS** at `/workspace/qa/squish-v19-final-core-tests.log`.
Includes prior material/native paw/entry/Worker guards plus new load/mesh metrics.
Explicit HOLD/DRAG/RELEASE added alongside PRESS/STRETCH/TWIST/KNEAD; actual native
interaction regressions for new actions pending. Opt-in `?squishDebug=1` red actual
contacts/green skinned paws/normal+pressure lines/table; measured mesh displacement,
contact depth, force, active nodes, compliance, timestep, actual collider identity.
No ordinary debug UI. Node/constraint/damage visualizations still pending.

Rejected alternative: independent cloud/jelly fine surface pressure field was
implemented experimentally but REMOVED from active source under V19.2 (avoid
duplicate pressure). Safely archived `/workspace/qa/squish-v19-secondary-field-rejected`.
Existing fine foam-pad toe imprint system retained. No whole-object scale trick.

## Current verified baseline and running QA

Actual source6a1b28b Cloud phone PASS, archived on codebranch checkpointd946411
`docs/qa/2026-11-28/squish-v19/pressure-native-phone/`. Four actual paws share
83.385 effective game-force units; max contact depth0.33855m/exact vertex0.40802m,
errors<1e-6m, positive tets/no fallback. Release0.4432m→0.10876m at2s→0.000402m
at10s. Same native actor/toy/entry. Body capture precedes full sink, still PassB.

Current **51 tests PASS** with new nested LOD/immutable groom guards. Source47b512c
adds contact HERO7³ / idle ACTIVE4³ (giant11x9x11→6x5x6), exact nested
promotion retaining solver/contact identity/clock/plastic/damage; no damaged or
recovering demotion. Secondary existing instanced collectibles share GPU VISUAL
body/face+depth/distance shaders, fading continuously to STATIC at100m. No per-toy
solver or instance uploads. Native actual playing-body tests still required.

Cloud FULL8000fibres/40000vertices now uses actual343-displacement GPU texture;
CPU body/ears retain deformed collision/picking. Native WebGL2 transform-feedback
**24 actual GPU points/normals already PASS**: positionerror1.407456e-7m,
normalerror1.251071e-7, GLerror0; uploaded original native cage texture, same
production GLSL. Proof `/workspace/qa/squish-v19-gpu-lod-native-pc/gpu-cage-parity.json`.
5632 bytes per cage update replace ~960000 bytes of CPU groom position/normal
updates. This is upload/CPU-work improvement, NOT a physical-device FPS claim.

ONE GPU exec **4537**, `/workspace/qa/squish-v19-gpu-lod-native-pc.log`, source47b512c.
ActualPC nativeCloud→original/side/top/release/recovery→allfive real pointer
material states in SAME browser. Freeze public/build/testharness until done.
Then inspect images/errors, archive exact evidence and update tracker.

Outside independent draft (not yet integrated):
`/workspace/qa/squish-detail-draft/squish-test-scene.js` developer-only5realmodels+
ONE original-factory isolated native test rig, deterministic fixed60Hz/seed4419,
4statecycles. Needs foam shape:"cat" option without replacing existing foam pad,
queryflag-only integration, native20states/reset/proper fullvideos. Its test
actor is explicitly temporary originalauthoring, not replacement for player.

## Implemented baseline, not final acceptance

343-node XPBD/positive tetra volume/structural edges/shape/plastic rest/fixed60Hz,
16 bounded contacts; 1089-node full giant. Eight differentiated profiles; five
required foam/jelly/slime/butter/cloud basics exist. Foam held real palm/toe dents,
jelly bounce/recovery, cloud slow pressure/fleece, layered Butter strain/rind/
24 pooled fragments, XPBD slime strands and volume-normalized implicit2-centre
merge approximation (NOT physical fluid merge), crunchy12clusters/96beads.
22 native material choreography states, actual skinned paws/body, 3 original
submarines and native AI/entry, owned manual transport. No paid per-cat AI calls.
Ten stable zones + basic gold arches/ownIBL/2220 instanced collectibles; V18 art
still basic/sparse vs original inline reference, not artistic acceptance.
Full historical successes AND failures archived on codebranch
`docs/qa/2026-11-28/squish-v16/`. Older details in linked previous CURRENT.

## Next concrete work

1. Inspect current native pressure results, register exact metrics/real images.
2. Continue breadth first: explicit four LODs, developer-only five-real-model
   deterministic test mode, multi-cat/eight contacts, interaction/cycle coverage.
3. Finish phone verification and archive GPU/LOD native results; GL parity is now measured PASS. No extra pressure field.
4. Full20 actual-state comparison board and five complete real cycle clips;
   original inline images have no mounted image bytes, record missing paths.
5. Pass B material/IK/physical merge/bending/volume/art/light polish, then device-
   honest performance, full native PC+touch/saves/19islands/full CI/build, normal
   PR merge, deploy/pages and actual HTTP+Worker fullSHA before claiming release.

Freeze exterior Warehouse/dimensions/coords/10 zone anchors, Mall/SPA/restaurant/
trampoline/ocean/native cats/economy/save format. V19.2 forbids reconstruction;
V18 art work stays interior only and must not displace physics priorities.
Node22 PATH `/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin`.
ONE GPU browser; during run independent drafts only OUTSIDE source. Never
stage `scripts/__pycache__/`. Sparse QA paths require `git add --sparse`.
User authorized autonomous work and repeated remote checkpoints; do not stop
at a WIP commit, ask repeated permissions, or claim unverified work complete.
