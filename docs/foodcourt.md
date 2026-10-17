# Cat Food Court

The new `foodcourt` island is appended after the established map layout. Its
radius is `11.65 * sqrt(8)`: eight times the ordinary island's playable area.
All 24 previous biome records are frozen in the regression fixture. No player
cat model, breed, purchased plot or existing unlock is replaced.

Five permanent venues use the normal catalogue/interaction and business systems:
McDonald's, Boba Cloud, Murrbucks, the cat-cookie bakery and an outdoor cinema.
Coffee and cinema are initially open. Three explicit, paid construction sites
persist write-once start timestamps in `islandConstruction`. Their real-world
40/70/100 minute deadlines continue while the game is closed. Existing cat
builders work on paid projects; unpaid blueprints never recruit builders or earn
income. Buildings collect ordinary coins and XP, and use existing business
upgrades. Shared saves reject a second concurrent payment for the same site.

`foodcourt-runtime.js` reserves seats and a short ordering queue. A shared door
lock coordinates entering/leaving. Routes clear the actual walls, fountain,
counters and tables for normal and giant cats. Visits cover approach, order,
preparation, handover, walking with food, eating/drinking, watching and departure.
Cancellation releases both seats and door locks. Completed visits use the
existing idempotent SPA receipt ledger and usual shared save transaction.

`foodcourt-assets.js` builds approved cat chefs, glass storefronts, distinct
roofs/signs, interior equipment, shelves, tables and detailed food. Static
geometry is combined by compatible material; food templates share buffers.
Venue construction and island gardens run through the cooperative scene
scheduler instead of a single blocking geometry merge. The custom navigation
uses a binary heap, cached collision masks and waypoint simplification; it does
not run a complete path search every frame. Distant chefs do not update their
rigs. The AI snapshot omits rendering-only island fields, keeping the full
25-island scene below the existing request limit.

Tapping a ready venue enters a closer overhead interior camera and hides its
separate roof. The exit button, island navigation and Chichi face camera restore
it. The small order button sends Chichi through the same physical interaction.

## Cinema content

No episode/video files were present in the project. `cinema-playlist.js` is an
intentionally empty list of project-provided video URLs. Add actual provided
files and their titles there. The in-world screen uses `THREE.VideoTexture`,
not a poster or an invented substitute cartoon. The player may also select a
local MP4/WebM video; a local file is only available on that device and is not
uploaded to a shared save. User taps control play/pause; videos pause on exit,
page backgrounding and when the world scrolls out of view.

The browser QA uses a private generated colour test clip to check decoding,
texture updates, pause and mobile input. That clip is never shipped or described
as a SpongeBob episode. Add supplied episodes separately to enable that content.

## Validation

`node --test test/foodcourt.test.mjs` checks the unchanged map, construction,
repeated reloads, two-phone merging, income/XP, food receipts, normal/giant paths,
twenty concurrent customers, cancellation and cooperative scene/model assembly.

`scripts/check-foodcourt.cjs` uses a random private local SQLite-backed save,
real mobile touch input, physical blueprint payment, all five interior cameras,
Chichi ordering/eating, real video decoding and exact cloud persistence. Its
construction clocks are advanced only in the private test world. It never uses
the players' account code or production save. Chromium's software renderer
validates graphics and input; its FPS is not an iPhone hardware benchmark.

The final contact regression raycasts the actual batched cushions and poufs;
reserved seat heights match their surfaces. `settle`/`stand` transitions animate
climbing onto and leaving the seat, and indoor walking follows the real floor
height. The chef's working height belongs to a separate carrier so the existing
cat animation's local bob cannot push the barista behind the counter.

In a host CPU sample of 12,000 simulation steps with twenty simultaneous mixed
visitors, all visits completed; the 99th percentile was below 0.05 ms. A separate
same-layout navigation sample reduced a cold route from about 55 ms with the
existing grid search to about 12 ms with the new heap search and two smoothed
waypoints. These are CPU measurements on the development host, not mobile GPU
FPS claims. The artwork, geometry detail, water shader and approved pet rigs
remain intact.
