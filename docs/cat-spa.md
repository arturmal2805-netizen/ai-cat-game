# Cat SPA

Cat SPA replaces the `water` biome (formerly «Лагуна снов»). Its save ID,
unlock level, price and map centre stay the same. The playable radius is
`11.65 × sqrt(3)`, giving exactly three times the former ground area. No other
island centres, catalog products or cat designs are changed.

The scene has a real opening for the main pool and a separate raised warm
jacuzzi, entry steps, animated water, 24 bubbles and 8 soft rising steam puffs. One
continuous daybed has six reservable places. The pool and jacuzzi have four
places each; large cats reserve enough space to leave neighbouring places
empty. Four bar stools and a three-cat queue use the same reservation system.
Static daybed/bar geometry is merged into four material groups apiece without
removing vertices, colours or texture maps. The scene builds cooperatively
through the existing focus-prioritized scheduler.

Steam uses eight camera-facing feathered quads in a single instanced draw,
with a fade at both ends of its ascent. It is visible from the phone overview
without opaque clouds hiding the cats. The live bar has a front-facing SPA BAR
sign, drinks and the existing barista model; tapping it opens the normal drink
choices. The preview and live scene use the same furniture asset.
The canopy is shallow enough for the normal overhead camera to see the serving
counter. The bartender uses a separate platform transform, so its animation's
normal root-height reset cannot drop it underneath the counter.

`spa-runtime.js` owns transient occupancy and visit phases: approach, entry,
rest/swim/order, and exit. Dry A* routes clear the real pool/furniture footprints
and placed objects. Pool routes use the entry steps and avoid old saved plots.
Entrance reservations separate incoming and outgoing swimmers. Existing cat
rigs supply walking, swimming paws, curled sleeping poses, blinking, breathing,
ears and tails. Chichi remains controlled by the existing AI/manual pipeline;
residents choose contextual visits with a cooldown. No cat mesh is redesigned.

The bar reuses the existing item dialog and business register. Its three drinks
use ordinary cat coins; selection and queueing do not charge. Completion saves
the receipt, needs and one debit together through `commit`. Duplicate receipts
cannot debit twice, including shared-world rebases. The bar generates the
existing `cat-barista` coin/XP income and uses the existing collection buttons.
Residents receive small needs benefits; their visits do not mint extra coins.

`game.spa` holds the selected drink, bounded served receipts and visit cooldowns.
Transient reservations are released on cancellation and recreated after reload,
so interrupted unpaid orders cannot strand a seat or lose a payment. Existing
purchases, farming/construction deadlines and moved scenery retain their saved
coordinates; old objects inside the new pool receive timber platforms.

## Verification

`npm test` includes `test/cat-spa.test.mjs`: physical AI choices, insufficient
funds, wall/obstacle clearance, four simultaneous cats in each facility, a
seven-cat queue, large-cat spacing, legacy pool plots, exact debits, business XP,
30 reloads, two-device merges, open basins, animated water/steam and equivalent
synchronous/cooperative geometry.

Optional browser integration (Playwright and Chromium installed separately):

```sh
npm run build
CHICHI_PLAYWRIGHT_MODULE=/path/to/playwright CHICHI_CHROMIUM=/path/to/chromium node scripts/check-cat-spa.cjs
```

This starts a private local SQLite-backed Worker with a random save token. It
tests real phone taps, drink selection, all four visit paths, the care-menu face
camera, desktop resizing, exact cloud readback, reload and warm graphics cache.
Visit clocks are advanced in the test shim to exercise full journeys promptly.
The AI-button response is deterministic here; deployment CI separately verifies
real Cloudflare inference. Screenshots go to `/tmp/chichi-spa-review` or
`CHICHI_REVIEW_DIR`. Browser emulation/software rendering is not a hardware
phone FPS benchmark. No production world or shared account is used by tests.

The accompanying loading/camera change is documented in
[`camera-and-loading.md`](camera-and-loading.md).
