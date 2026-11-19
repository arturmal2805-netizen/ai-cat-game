# V8 progress — 19 November 2026, Europe/Kyiv

Stable live remains c477057b6eda6e251f02bc27735e4220d737112b.
WIP branch: codex/spa-v8-visual-overhaul. No V8 release yet.

- ae0e7ba freezes exact V8 specification and physical layout.
- 0c17d17 adds first eight-room dressing and original SPA-only PBR material.
- 9a489e6 adds real curved conversation groups, ceiling medallions, more curved
  petals and finer/subtler 3.5m marble. Existing approved cat models untouched.
- before/: all8 rooms + facade, exact native bundle9a922bbe799ab3ff1bdc5a24e6a0cbd6f2ebd92270df7514a151b97eb9038930
  matches the V7 final source control. Actual Group and root transforms included.
- stage1/: four real rendered views. Visual inspection rejected micro-detail alone
  as insufficient; large voids, too-coarse veins and missing compositional rhythm.
  DPR1 was an iteration shortcut, not a matched DPR2 hardware performance result.
  Its first view also preceded complete Mall preparation. Final V8 harness now
  explicitly awaits the real Mall before capturing; do not interpret that earlier
  temporary missing background as a deleted Mall.
- /workspace/qa/spa-v8-stage2 is the running nine-view DPR1 art review on9a489e6.
  Inspect each PNG against the user's latest photo tutorial, not just one success.

Checks: Node22 build stage1 PASS. All96 full-body approach routes and both stair
routes PASS after initial furnishing and after the new conversation groups.
The Thermal groups were subsequently moved inside the original room perimeter;
its affected16 routes + physical headroom + all14 pool exits + frozen layout then
PASS (6 checks,20s). Existing full route suite defaults to all96 in CI; optional
CHICHI_SPA_ROUTE_ROOMS limits local affected-room iterations only.

Remaining: inspect stage2 views and improve weak rooms; prepare final9 offline
probes ONLY after static art lock (source/workspace guard forbids mutation during
bake); matched DPR2 BEFORE/AFTER8+facade; actual private native booking/return,
SQLite reload/receipts, Cloud download and phone control; final Node22 build,
complete CI, live HTML/app/CSS/atlas byte verification. Successful workflow does
not imply user visual approval or Mac/phone FPS certification.

Private QA uses scripts/check-aquarium.cjs with CHICHI_EXPLORER_AUDIT=1,
CHICHI_RESORT_SPA_AUDIT=1, CHICHI_SPA_V7_MASS_AUDIT=1,
CHICHI_SPA_V8_AUDIT=1, CHICHI_SPA_V7_PHASE=interiors.
Baseline actual matrices: layout-world-transforms-baseline.json, physical
contract: SPA_LAYOUT_BASELINE.json. Room markers are identity transforms under
root(-450,-165,480); physical centers are authored local coordinates + root.
Never move the markers to their physical centers.

Archive every completed native run with archive-spa-stage.py; explicitly force
add native.log despite *.log and verify all manifest paths against git bytes.
Do not archive the private SQLite/token/export save. Current stage2 source is
saved remotely; do not rebuild from a loose reconstructed description.

## New user corrections — not approved stage2
Thermal/Golden/Cabana paired visual corrections are recorded in
spa-v8-visual-corrections-2026-11-19.md. The user explicitly rejected stage2's
visible progress. Do not present it as a finished visual improvement.

After6fcaa45: local shallow SPA optics, shared-field animated caustics, gold
step edges, lower bubble opacity, hanging balcony foliage, Golden perimeter
sakura/sconces, preserved dark upper public floor, rounded Cabana upholstery.
The original service contact height .92 and foot support stay intact.
Found and fixed caustic composition order: room lighting could discard a hook
installed earlier. New test exercises the actual final batched liner material,
its time/physical-depth uniforms and composed lamp shader (PASS).
Golden30 full-body approaches PASS, Cabana6 PASS, all frozen anchors unchanged.

Water diagnosis1 proves the large dark polygon persists with the actual water
interface hidden; do not claim the water interface shader is the proven cause.
Integrated native run now isolates the bed's world-shadow reception before
changing it. No shadow/collision bypass has been shipped.

Free invitation's first native run reached the dry entrance and preserved all
balances/receipts. Its second click timed out because normal focus closed the
SPA panel. The QA flow now reopens the panel and checks repeat + actual SQLite
reload. Keep the first failed/partial run; do not mark it a full native pass.
Environment restart interrupted diagnostic2 before frames; no success claim.
Current combined private run: /workspace/qa/spa-v8-integrated (.log), one GPU.

Local npm test returned1191/1191 but product sources changed while it was running
for the new user corrections. Treat it as partial supporting information, NOT
an exact-source final gate. Final clean Node22 CI is still required.
