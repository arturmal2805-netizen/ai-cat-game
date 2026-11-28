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

## Current verified baseline / Pass A complete, Pass B underway

Implementation source **d5930542be77969d46bb0606360d5dae57272608**. Latest remote
code/evidence checkpoint **0439ef1515231ba73578d558625cf83a3b7ed136**.
Uncommitted Pass B files in the same worktree are intentional new work, not user
changes; do not reset them. Generated `public/index.html` fingerprint is from the
last full build; back up/restore only this generated change before code checkpoint.
Never stage `scripts/__pycache__/`.

**56 targeted tests PASS; full Node22 build PASS** at source d593054.
- Actual existing pink Cloud/Chichi phone press/body/four paws/release/2s/10s PASS
  source6a1b28b, archived `docs/qa/2026-11-28/squish-v19/pressure-native-phone`.
  Four paws share83.385 game-force units; max contact depth0.33855m/exact body
  vertex0.40802m; errors<1e-6m; positive tets/no limiting; release0.4432→0.10876
  at2s→0.000402 at10s. Existing manual takeover/jump/camera/return PASS23ada02.
- Actual native GPU cage parity PASS47b512c:24 WebGL2 transform-feedback outputs,
  positionerror1.407456e-7m/normalerror1.251071e-7, GLerror0; same production GLSL
  and uploaded physical texture. FULL8000fibres/40000vertices retain immutable
  input buffers;5632bytes/update replace~960000CPU groom pos/normal upload bytes.
  Software/resource improvement only, no physical M2/iPhone FPS claim.
- Four LODs: contact HERO7³, nested ACTIVE4³ (giant11x9x11→6x5x6), exact field
  promotion retaining solver/map/clock/plastic/damage, no recovering/damaged
  demotion; existing secondary collectibles GPU VISUAL→STATIC at100m, shared
  viewer/time for colour/depth/distance shadows. No per-instance RAF uploads.
- Original5-material PC pointer matrix f06208f PASS basic but review found Foam
 81 barrier activations: archive `five-materials-pc-foam-limited`. Fixed mounted
  cell normal compression and fine imprint RESIDUAL beyond coarse compression,
  not doubled displacements. Original foam pad retained; strong test requires0
  barrier activations. Corrected pad native phone still needs proof.
- Developer-only `?squishTest=1`:5 real cat-head solver models + ONE isolated
  temporary ORIGINAL-factory native test rig, no player/toy/save replacement.
  Fixed60Hz/seed4419/reset/pause/selection. `public/squish-test-scene.js`;
  `scripts/audit-squish-bench.mjs`, `CHICHI_SQUISH_STAGE=bench`.
- **20 actual state frames (5×4) native PC PASS source d593054**, zero faults/
  negative tets/limiting steps, true skinned paw/body errors near float precision.
  Full archive0439ef1 `docs/qa/2026-11-28/squish-v19/bench-pc-pass-a` includes all
  source/hash/bundle/HTMLboard/REVIEW. Not final artistic acceptance/full V19.
  Foam body0.425m/held0.340m at9s; Jelly compression0.363/wobble0.144/recovered8s,
  actual rendered BODY volume0.989; Butter cracks→24physicalshards/0.900m;
  Cloud wide body0.484m/recovery0.024m at9s. Slime stretch1.029m/3threads but
  TWIST frame broke1grip after discontinuous test gesture, only0.260m; MAJOR.
  Merge proxy2→1 remains labelled implicit approximation, not full fluid merge.
- Two native rigs/8 actual skinned paws/unit support shares sum1 percat PASS.
  Giant existing visit ownership now2 separated retainedslots, no overbooking.
  Actual multi-cat game frame proof still pending.

Latest user sent NEW inline Jelly target (after V19.2): glossy translucent pink
head, bubbles/depth/specular highlights, individual paw dents/deeper body well,
inertia/recovery~1–3s. Read/acknowledged and documented
`docs/specifications/warehouse-jelly-inline-reference-2026-11-28.md`. Bytes not
mounted; never use concept art as game proof. Preserve exterior/anchors/cats.

## Pass B current changes (not yet remotely checkpointed as last written)

Primary solver now has genuine LOCAL angular constraint around actual grip
normal, filtered viscosity, positive-volume guard; no whole-object rotation.
New player grip uses triangle barycentrics to original rest positions, preventing
re-grabbing already stretched coordinates as empty space; press/drag/stretch/
twist maintain actual initial deformation and camera isolation. Developer slime
stretch→twist trajectory continuous, no arbitrary inputjump/tear.
Tests `/workspace/qa/squish-v19-pass-b-grip-tests.log`4PASS (real local opposite
node torsion, deformed rotated rest-anchor picking, all6inputmodes, benchmark
no torn twist/real filaments). Broader **58tests PASS** before final target metadata.
Latest all target run **exec30343**, `/workspace/qa/squish-v19-grip-optics-tests.log`.

Jelly owned PBR optical update: roughness.085/coat.055/IOR1.38, existing env1.5,
convex thickness absorption approximation (NO new refraction/render target),
96×64 body for smoother close normals, existing anchored bubbles/face. Slime
body also96×64. NO native cat changes. New target compression ratio is diagnostic
metadata (.075stand/.17body/.25impact), not direct mesh scaling. Need actual
native GL/material/reference proof; do not call this finished yet.
Next immediate: inspect30343 → checkpoint code+tracker → ONE nativePC actual
original Chichi/Jelly contact/body/recovery + corrected Slime/Jelly bench frames;
phone corrected pad/full5states; then PassB remaining features below.

NO browser currently running as last written (20-state bench42173 completed).
Use Node22 and one GPU browser; freeze public/build/harness during each audit.
Outside draft `/workspace/qa/squish-detail-draft/squish-bending.js` is NEW unintegrated
proper XPBD second-difference bending, for mandatory core completion later.
Do NOT overwrite source with older draft model/contacts/visits/art/manual files.

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

1. Continue Pass B angular/rest-grip/Jelly optics native proof, then remaining physics/debug/audio.
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
