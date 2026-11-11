# Underwater Cat Mall integration

Source: `docs/specifications/underwater-cat-mall-2026-11-11.md` and the player's
underwater glass cat-dome reference. Baseline: `d5821c8` (published ocean).

The mall extends `autumn`; no existing biome, paid placement, cat mesh, ocean
optics, DPR or shadow setting is replaced. `leisure-data.js` exposes real mall
destinations to the existing once-per-evening AI batch. The execution runtime
validates that intention and uses reserved walking lanes and a shared physical
lift. It makes no model requests. Work, care and manual commands take priority.

Purchases use existing `jobCity.profiles[id].coins`, `purchaseCount`, inventory
and transaction history. Permanent mall receipts and consumption live in that
same wallet's atomic merge group. Stock is derived from those receipts; a
concurrent last-item purchase must fail the final stock invariant. Cached
clients cannot erase unknown inventory/receipts. New saves are backward
compatible; malformed receipts must fail normalization, not lose purchases.

Architecture is prepared with the existing selected-priority scene scheduler
and exact shader warmup. Seven distinct floors share immutable materials and
batches; floor inspection changes visibility, never rebuilds the mall. Glass
uses bounded Fresnel shading, without scene copies or reflection render targets.
Native staff use the original cat renderer. Ambient effects keep fixed buffers.

Review actual full/front/inside/phone renders against dome silhouette, cat ears,
seven stacked warm galleries, side pavilions, cyan lift and neon pink signage.
Record deviations honestly: no unsupported numerical fidelity or device FPS
claim. Native purchases, queues, lift trips, inspection, cancellation and reload
need browser evidence, plus the existing ownership and all-island gates.

Checkpoint v15 (not a published release): 19 mall/economy/actual-fixture route/
ownership-preservation tests and 87 related city-AI/family/housing tests passed;
full build passed. Browser authoring reviewed all seven levels and six stores
at desktop and DPR-2 phone resolution, without GL or console errors. Images:
`/workspace/qa/underwater-mall-fitout-v15`. Actual new-shop routes now use measured
furniture OBBs and the existing A*; walkability masks prepare cooperatively and
remain bounded to 32 exact anatomy radii per loaded floor. Food/cinema seat
contacts, lift apertures and the entertainment landing have been corrected.

New-only garden LOD now measures distance per colony. With the same authoring
camera, selected-floor F7 submissions fell from 1.5M+ triangles in v5 to 330,977
in v15 while retaining full nearby coral geometry; ALL is 2,906,140 triangles.
These are software-browser workload counts, not evidence of Mac/iPhone FPS.
The thirteen referenced new art PNGs total 1,802,195 download bytes. Three sets
of small surface charts derive from CC0 Poly Haven inputs (source SHA-256 and
license recorded separately); labels and other art remain original. Source
images are optional offline authoring inputs and are not shipped or fetched
by the game. No existing ocean texture, geometry, light or DPR was reduced.

Pending before any publication: native private SQLite purchase/reload, real
world tapping and camera exit, ownership phone audit, every-island regressions,
full suite, and further reference art review. The reference similarity target
is not yet claimed achieved.
