# Coastal turf stage verification

Native runtime source: `99af2e35d66b212b8c7a1ac14a10e7b4b1594c9e`.
The release checkpoint only updates generated HTML asset URLs and this evidence.

The actual Mosasaur shore now uses tiled turf, exposed soil, dense curved grass
and curved/ribbed large leaves. Original cat models, walking height, island
boundaries, paid placements, DPR, shadows and save semantics are preserved.
Grass is limited to 192 resident cells and two pending builds. Idle eviction,
return and reload regenerate identical native cell buffers in eight shore sectors.

The completed native audit retained close, gameplay, medium and wide views,
24 real moving camera frames, eight motion PNGs, all three material/grass states,
source bundle/input hashes, texture hashes and settings. Its paired control
uses the real original ground shader without grass in the same candidate scene;
its large leaves and partitioned cap are shared. A separate published-c9 run is
retained as the original complete scene, not mislabeled as this paired control.
Paired software-renderer queue overhead was 4.65%, 2.57%, 6.62% and 0.43%
respectively. Native CPU medians were 2.1–2.7 ms. SwiftShader has multi-second
GPU queue gaps in this scene; these results do not establish physical-device FPS.
See the summary JSON for actual geometry/memory counts and PNG hashes.

Node 22.23.5 build and Worker dry run passed. The full 1061-test suite passed
before the phone footer correction; 15 affected UI/runtime/camera checks and
the complete native route passed after it. The unchanged meadow/resource tests,
purchase-preservation tests and native packed-texture/all-mip checks passed.
Native audits reported no runtime/HTTP errors and retained private ownership.
The complete route includes underwater exit, third-person swimming, reboarding,
airlock entry, walking, floor 2, camera release, physical docked return, ordinary
work and private SQLite reload. Expected `docked` behavior remains asserted.

Phone controls now measure the actual inventory-footer height to avoid overlap;
desktop controls remain hidden and touch targets remain 44 px. This correction
was required by the actual native Mall route and was verified by its repeat.

The rejected forest/Mall culling and ineffective root-box LOD experiments are
excluded. The native reflection was genuinely rebaked after the final grass
normal change; no gameplay render pass was added. Publication must additionally
be confirmed by the full CI workflow and matching live JS/CSS bytes.
