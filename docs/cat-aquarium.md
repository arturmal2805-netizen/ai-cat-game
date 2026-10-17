# Floating cat aquarium and friendship clips

The aquarium is an appended destination (`aquarium`), available at level 14 for
3,200 coins. All 27 established island records, IDs, centres and prices are
unchanged. `test/fixtures/aquarium-unaffected-biomes.json` records their original
values. The existing shared save, unlock, care and interaction systems are used;
no new account, currency, inventory or save format is introduced.

## Palace and inhabitants

- Radius 38.5: about 10.9 ordinary islands of usable footprint. One glass palace
  covers 71.6% of the island; its five large tanks cover over half the palace.
- A continuous walkable floor, 10.4-unit front doorway, central and cross aisles,
  clear walls and dome, gold trim, cat-ear entrance, flowers, clouds, cliffs and
  five animated edge waterfalls. Close interior views hide dome ribs and lower
  roof opacity; exit restores them. Full island and tank art is rendered from
  the actual game models rather than a separate concept image.
- Fifty cat-headed fish, with five especially large fish and small companions:
  round bellies, kitten ears, white muzzle/cheeks, whiskers, layered shiny eyes,
  colourful coats, broad petal tails and individually moving fins. Fish faces
  retain white cheeks and bright eyes independently of their instance colour.
- The four new locals are ordinary cats built from the approved existing rigs.
  Existing Chichi/adoption geometry, eyes, coats and fur are unchanged.

`aquarium-data.js` owns layout/obstacles, seats, ordinary locals and fish paths.
`aquarium-fish.js` owns the shared kitten-fish geometry and instance animation.
`aquarium-assets.js` constructs each tank and transparent water.
`aquarium-biome.js` constructs the floating palace. `game-data.js`,
`biome-scenes.js`, `world-objects.js` and the existing food-court modules register
and run the island. `world.js`/`app.js` connect normal taps, drops and cameras.

## Visitors and cameras

The existing multi-seat runtime reserves independent viewing positions, walks
cats through the real entrance around tanks/walls, turns their heads toward a
moving giant fish and animates curious paws, tails and surprised/pleased faces.
After watching, cats walk back toward the lobby. Completed visits use the
idempotent SPA ledger to improve happiness; fish watching never consumes a meal
or charges coins. Both player-directed and autonomous visits use the same code.

Tapping a tank opens its close camera; tapping an instanced fish through the
clear glass selects its instance ID and follows its actual animated head.
The ordinary return button restores the previous camera and roof. Tapping a
visitor produces the existing short curious expression. Physical tanks and
building walls are navigation obstacles, including during manually directed
visits. Other island runtimes retain their existing behaviour.

## Friendship when dropping one cat onto another

Existing greeting/play/cuddle frames now use the real rig dimensions, including
small kittens and colossal cats, rather than a fixed 0.84-unit overlap. Play uses
separate tracks; cuddling turns the cats before moving them side by side.

Each manually initiated meeting samples a **37%** piggyback chance exactly once.
It is not a periodic every-third-event counter. The larger cat carries the
smaller: side-by-side preparation, a hop onto a measured back seat, a cheerful
short trot with the rider locked to local back coordinates, then a hop down.
Cancellation and completion return elevated cats to dry ground. This is a visual
variant of the existing logical friendship event, preserving relationship and
save validation. The approved meshes are not changed.

## Cost and checks

Fish templates are shared across all tanks and built through the existing
cooperative scene scheduler. There are five instanced fish draws per tank, not
one scene graph or material set per individual fish. Static palace props are
batched; bubble instances and existing shared water/caustic shaders are reused.
Far views use the existing separate distant layer. No ray tracing, scene-copy
render targets, external fish textures or per-frame geometry rebuilds are used.

The aquarium navigation uses exact long-segment wall checks. Adjacent A\* cells
reuse the mask and orthogonal-corner checks, with a small analytic circular-tank
check instead of testing every palace wall on every search edge.

Validation:

- `npm test`: includes unchanged-biome snapshots, level gates, actual transformed
  fish vertices inside all tanks, clear entrance routes for three cat sizes,
  eight simultaneous visitors, receipt idempotence and repeated save/reloads.
- `test/social-motion.test.mjs`: exact 37% threshold, separate silhouettes for
  three size pairings, continuous mount/ride/dismount, rigid back attachment,
  one random draw per encounter, safe cancellation and reduced motion.
- `scripts/check-aquarium.cjs`: optional Playwright/Chromium check using a private
  local SQLite Worker. Captures mobile/desktop palace views, fish head camera,
  both friendship variants, real fish raycast/touch selection, visitor behaviour
  and reload. Software WebGL results are functional evidence, not an iPhone FPS
  guarantee. Set `CHICHI_PLAYWRIGHT_MODULE`, `CHICHI_CHROMIUM` if needed.

Verified on 18 October 2026 (Kyiv): all **425** automated tests passed, the build
and Worker deployment dry run passed. The private browser check also passed
actual touch drops resident→resident, Chichi→resident and resident→Chichi,
fish-instance camera selection through glass, six simultaneous visitors,
unchanged legacy aquarium-coaster visibility and exact significant save fields
after reload. Reviewed large in-game screenshots of fish and piggyback poses.
