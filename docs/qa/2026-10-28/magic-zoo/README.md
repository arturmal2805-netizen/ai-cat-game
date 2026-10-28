# Magical zoo

New separate `magic-zoo` island, 3 × the area of an ordinary radius-11.65 island.
The 18 previous biomes, catalogue entries and shore roads are checked against the
complete pre-zoo fixture, including the unchanged waterpark.

Six primary species, 24 animals: elephants (3), tiny axolotls (8), otters (4),
white tigers (3), polar bears (3), gorillas (3). Fourteen tiny reef fish are
explicitly requested decorative aquarium ambience. Native cats are visitors.

The first enclosure is included. Five permanent openings cost 6,500 / 11,000 /
18,000 / 29,000 / 44,000 existing coins. The island itself costs 3,600 (level 8).
No new currency or AI requests. Purchases save before success; cached phones
retain immutable receipts and concurrent duplicate purchases are rejected.

## Visual review against the supplied reference

These are authored 3D game models; they are not an exact pixel reproduction of
the supplied illustration. Compare each rendered species rather than claiming
100% visual identity:

- Elephant: large pink-grey body/ears, short ivory tusks, round shiny eyes,
  articulated tapered capped trunk, nostrils, toenails and baby scale. Weighted
  walking, resting, ear motion and a raised-trunk ballistic spray.
- Axolotl: tiny pink plump body, raised rounded head, short three-toed feet,
  forward glossy turquoise/dark eyes with two highlights, small smile, blush,
  six branching petal gills and a soft tail. Hovering, paddling, gill flutter,
  blinking and a gentle approach to the glass. Close inspection camera.
- Otter: warm brown/cream coat, whiskers, paws and long tail. Swimming route,
  dive, back roll/stroke and a rock-rest phase.
- Tiger: white body, crisp procedural dark stripes on the actual surface,
  blue eyes, pink nose, broad cheeks, whiskers and soft outline tufts. Walking,
  stretching, raised grooming paw, resting and toy play.
- Polar bear: rounded cream body, black nose, small round ears, paws/toenails,
  expressive eyes, cheeks and short tail. Swimming, deep dive, snowball and rest.
- Gorilla: dark broad shoulders/arms, soft face/cheeks, friendly toothy smile,
  separate elbows, fingers and silver fur detail. Alternating climbing arms,
  knee motion, sitting and gentle alternating chest beats. Smaller than elephants.

Geometry/instance buffers remain fixed during continuous animation. One instanced
animal submission per species uses a shared immutable pose table; shadows use the
same deformation. Native water/reef lighting is retained, with fixed waterfall
streak/bubble/fish buffers and no per-tank render targets. Whole-island detail
loads through the existing scheduler; remote scenery and animation can sleep.

The tests and screenshots use private local worlds and software WebGL. They do
not measure physical MacBook/iPhone FPS or modify player saves.

## Recall fix

The saved destination changed on recall, but a live cat could retain its old
`leisureBiome` and manual idle anchor. That old evening activity took priority
over the requested island. Recall now cancels the selected free cats' transient
activities and releases those anchors, with a temporary manual priority. It
preserves the assigned profession, balances, family, home and itinerary history.
Actual work, construction workers and sleeping cats are excluded. Their jobs
and home-rest runtimes are no longer cancelled by the global recall pause.
Chichi is not awakened or moved out of work by that invitation.

`gather-system.js`, `adoption.js`, `world.js` and `app.js` implement the policy.
Four focused tests cover working/resting/manual selections and preserved state;
the native phone audit presses the actual recall button with stale evening
islands, checks that multiple resident cats move and then completes the ordinary
zoo purchase, camera, visitor and SQLite reload checks.

The largest approved cat's measured navigation radius is 1.632428125, larger
than the original 1.1 test assumption. The final authored zoo entry, pavilion
positions, observation seats and paths accommodate that real rig. All eighteen
seats are reachable from both the gate and the actual shore road; private circle
chords receive the same exact collision guard as aquarium tanks.

Changed implementation files: `zoo-data.js`, `zoo-system.js`, `zoo-animals.js`,
`zoo-animal-motion.js`, `zoo-biome.js`, `zoo-gate.js`, `zoo-waterlife.js`,
`gather-system.js`; native integration in `game-data.js`, `biome-styles.js`,
`biome-scenes.js`, `scenery-data.js`, `world-objects.js`, `island-construction.js`,
`foodcourt-data.js`, `foodcourt-assets.js`, `foodcourt-navigation.js`,
`foodcourt-runtime.js`, `lagoon.js`, `catalog-previews.js`, `economy.js`,
`shared-world.mjs`, `save-vault.mjs`, `adoption.js`, `world.js`, `app.js`.
New and updated tests, seven new PNG previews, visual/native QA scripts and
`AGENTS.md` retain the reproducible checks and future-island standard.

## Verified checks

- All six animal close-ups and six action frames render in real WebGL without errors.
- Native DPR-2 phone: buy the island and all five paid gates, inspect an axolotl,
  actual tiny/giant visitors and held photo cameras; two SQLite reloads preserve
  every payment, receipt, island and placement.
- The actual recall button clears stale evening islands/anchors and multiple
  free resident cats move; work/sleep exclusions have independent focused tests.
- Thirty local reloads, cached devices, concurrent opening rejection, corrupt
  save fallback and the largest cat route from the actual road.
- Existing paid Mega Loops recovery/replacement and two SQLite reloads retain
  one finished copy with no second charge.
- Approved cat sculpt cache remains `sculpt-v2-a496203fa13a037a7a10a927`.

See `zoo-app.json`, `browser-errors.json`, `purchase-preservation.json`,
`model-render.json`, `models/` and `phone/` for the private-fixture evidence.
