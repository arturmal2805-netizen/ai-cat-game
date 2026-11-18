# Independent underwater SPA WIP — 2026-11-18

Base published39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4 unchanged.
Node22.23.5: 4tests PASS (exclusive booking/expiry/cleaning/teardown; all6 real
massage cabinet door sweeps, full radius.571 and height2.15, tables/walls retained,
separate unobstructed therapist contacts). This is CPU geometry/state validation,
not a rendered/native procedure/economy/reload/performance pass.

Model uses six actual furnished cabins, reception, waiting seats, glass roof,
cosmetic shelves, towels and warm materials. Incoming surface maps can be shared
from existing prepared finishes; no claim of rendered resemblance yet.
Rooms are spaced11m, retaining real aisles. Initial test endpoint2.2m from table
centre overlapped its actual1.8m half-length +.571 radius. Door sweep now ends
at2.5m (still beyond contact approach3.6m); explicit table collision remains.
Nav must be root-local: root.y=-165, geometry.y relative0. Passing absolute
negative floor coordinates to primitive capture incorrectly drops all blockers.
Corrected root transform; ground test .01 root-local.

Not integrated into live world. No complete resort model, paid procedure runtime,
84-action choreography, AI routing, stairs/airlock, dedicated camera or SQLite
proof yet. Do not publish this as a completed SPA or replace old SPA/Mall.
Next: construct composed resort geometry/navigation, actual procedure state
machines driven by existing leisure/purchase ledger; native before/after and
private SQLite full scenarios, then fullCI/actual assets before separate release.

## Continuation: composed model and procedure controller

resort-spa-model.js now builds14 zones,907meshes/60567triangles before batching,
central three-level atrium, actual .3m-rise/.6m-run stairs, dome ears, pool surfaces,
furnished rooms and star points. Source construction candidate only: not rendered
or integrated into production. These counts are not performance results.
Core nav includes the six-cabin physical segments as well as common furniture.

resort-spa-runtime.js implements reservations, walking via REQUIRED injected
physical route/segment checks, therapist reservation, purchase callback, mounting,
procedure, idempotent durable-effect callback retry, dismounting and physical return.
Seven Node22tests PASS across booking, actual six-door geometry and controller.
The controller tests use injected routes and ledger stubs; they do NOT establish
real-game routing, payment persistence or finished84-action choreography.

Before integration: replace candidate shallow pool fittings with actual recessed
water volumes/stairs and floor cut-outs; check sealed shells and all corridor
openings, table mount/dismount swept clearance, connect to existing economy/AI
and shared owner, batching/lazy prep, proper scene materials and isolated camera.
Native browser pictures/real procedures/SQLite still required. Do not publish
this candidate as a finished resort or equate unit tests with those checks.

## Recessed basins and first construction render

resort-spa-basin.js: actual1.8m recessed bed, open-ended ellipse walls,
real floor holes,4m-wide .3m-rise/.75m-run steps, shared water core.
Platform surfaces are separate from coarse obstacle OBBs: use their actual
triangles for support, never a filled merged bounding box across a pool hole.
Common bridges now stop at pavilion perimeter, not at the centre of a pool.
8 Node22 tests PASS, including real triangle-ray opening/bed/step assertions.

First standalone construction render completed without JS errors:
construction-overview.png and construction-render.json.938draws/60639triangles;
not actual game lighting, loaded-map FPS, production render or visual approval.
The actual image remains visibly sparse and pale, far from the supplied target.
Do not call it reference quality. Next art pass needs architectural glass ribs,
real finishes from prepared Mall art, filled amber interiors, plants/lotus/waterfall,
local bounded lights, actual cats and native game camera/context. No shipping yet.
Recessed-pool geometry is fixed; routing/support and native swim/exit still pending.

Full first suite completed1110cases:1109PASS/1FAIL, legacy all147context length.
Shortening only SPA AI labels fixes that guard; full user interface names retained.
Latest user requested broader compaction: city-ai-pack.mjs now packs repeated
strings losslessly;23 AI targeted cases + single147case PASS. Independent release
candidate is based on3914873, with no unfinished SPA.
New appointments adapter and lift motor are independently tested, not scene-wired.
