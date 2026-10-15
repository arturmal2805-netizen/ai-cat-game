# Cotton candy island

The legendary **Остров сладкой ваты** replaces Clockwork using the existing
`clockwork` save ID. It keeps the existing level 18 unlock, ownership, coins,
purchased placements, crop/construction deadlines and decoration identities.
Its radius is 23 (3.9× the area of an ordinary radius-11.65 island). Its authored
map centre `[68, -68]` is expanded by the shared map-spacing rule to leave space
between enlarged neighbours (see `island-spacing.md`). The former central building
yard stays level. New purchases cannot straddle terrace seams.

- `cotton-data.js`: shared, stable native IDs, pool bounds, reservations and terrain heights.
- `cotton-props.js`: sculpted pigs with trot/blink/ear rigs, candy trees, cupcake houses and bridges.
- `cotton-rides.js`: cupcake wheel, piglet express, teacups, three-lane slide and three pig mounts. Each has a finite ride path and an animated seat that follows the same clock as Chichi.
- `cotton-biome.js`: stepped icing island, three pink swimming pools, eight animated waterfalls, instanced piglets and adaptive flower gardens. Trees and houses use the existing saved, movable scenery system.

Native targets: `cotton-wheel`, `cotton-express`, `cotton-teacups`,
`cotton-slide`, `cotton-pig-rose`, `cotton-pig-peach`, `cotton-pig-lilac`.
Water: `lake-clockwork`, `lake-clockwork-upper`, `lake-clockwork-cascade`.
All are exposed to AI only when the island is open, and manual drag uses the
same validated IDs. The seven ride models are also available in the shop.

The AI activity bound includes all permanent targets plus the existing 60
purchased-placement limit. Static pastel geometry optionally batches tints into
vertex colors while keeping texture maps and lighting response. Mobile cameras
fit the larger island and retain its detailed layer when zoomed out.

Validation: `npm test`, `npm run build`, and
`npx --no-install wrangler deploy --dry-run`. Focused regression tests are in
`test/cotton-island.test.mjs`: ride-seat synchronization, finite paths, AI/manual
availability, real water openings, pig animation, tint batching and 30 save/load
cycles preserving construction and crops. Preview production uses the existing
`scripts/capture-previews.mjs` optional browser tool; generated PNGs are tracked.

## Automatic island construction

A newly purchased island stores `islandConstruction.clockwork` once, in the
same snapshot as the land purchase. Teacups take 90 minutes, the wheel 180,
the slide 240 and the express 360. Their cost is included in the island.
Pigs and pools are usable immediately. Native construction does not consume
any of the player's 60 purchased-placement slots.

The live scene shows fenced, translucent versions of the actual preview
models, percentage/time badges and a project list behind the island button.
Only finished rides enter the AI/manual activity list. Deadlines use absolute
timestamps, so closing the game does not stop construction. Both phones update
completion without a click or background simulator lease. Shared saves keep
the earliest recorded start, including when an older tab omits the new field.
Already-open worlds without a construction timestamp keep their completed
park. `test/island-construction.test.mjs` covers these compatibility cases.
