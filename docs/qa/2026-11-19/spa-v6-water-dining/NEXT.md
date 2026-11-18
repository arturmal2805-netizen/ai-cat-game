# SPA V6 sixth iteration — water dining (WIP, not published)

19 November 2026 Europe/Kyiv. Fifth native checkpoint is remote
b38f5a379dced02e123a5620155c037933855b6a, with true VIP/rest/SQLite proof.

Four diagonal Cafe seats now use real 5.6m recessed pools; original four dry
seats retained, same eight reservations/product/price/receipt IDs. The upper
atrium floor has four actual, non-overlapping holes. Existing eight decorative
atrium sofas moved clear of water and stairs; their count stays unchanged.
Real tables/underwater benches block full-body movement. Entry→safe waypoint→
dining, reversed reached waypoints on normal return or cancellation. Native
Cafe drink/lick/treat poses and props reused. No new AI or save fields.
21 actual basins: previous17 plus4 Cafe pools. Existing water optical core kept.

Aquarium is now an actually closed glass cylinder with caps and fine seams.
Camera test correctly caught its new bottom at the previously free centre.
Do NOT ignore that collision or turn the assertion green by expectation only:
service-bar floor was changed from a full annulus to its actual front arc,
leaving a real rear atrium shaft at x0,z194. Tests assert BOTH the blocked tank
centre and free rear shaft in BOTH directions. Full-body radius unchanged.
The initial camera failure and corrected result are preserved beside this file.

10 targeted water/dry/stairs cases PASS; after glass caps 9/10 camera+V6 cases
PASS with the one genuine new cap collision above; corrected camera + four
wet dining/waypoint cancellations 3 PASS. Not a full final release audit.

Next native run (Node22/Chromium/Playwright per recovery docs):
CHICHI_EXPLORER_AUDIT=1 CHICHI_RESORT_SPA_AUDIT=1
CHICHI_RESORT_SPA_POOLS_AUDIT=1 CHICHI_SPA_V6_AUDIT=1
CHICHI_SPA_V6_STAGE=water-dining CHICHI_SPA_V6_CAFE_WATER=1
CHICHI_REVIEW_HOUR=12 CHICHI_DESKTOP=1
CHICHI_REVIEW_DIR=/workspace/qa/spa-v6-water-dining node scripts/check-aquarium.cjs
The clock lock is QA-only; no production clock change. Capture five references,
actual native wet drink/cup/stairs/dry return/payment/SQLite. Preserve exact
source/bundle/overlay and all results with scripts/archive-spa-stage.py.

Continue exact per-reference comparison; no final visual approval yet. Remaining:
coherent exterior galleries/facade, richer flowers/cascades/light hierarchy,
final every-room animation/contact/phone/performance and release checks.
