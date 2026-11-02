# Ten water adventures

Ten new purchased 3D mini-biomes, each with its own authored route and mechanism.
The previous 25 reference slides, 20 atoll complexes, nineteen islands, roads,
prices, native cat meshes and approved wildlife assets remain unchanged.

| Reference cell | Attraction | Actual mechanism |
| --- | --- | --- |
| 1 | Giant wave | Blue curling water, moving foamy lip, bodyboard grip/prone pose and receiving lagoon |
| 2 | Jungle coaster | Two-person boat, physical lift rails, accelerating descent and a complete inversion |
| 3 | Water vortex | Two-person boat, shrinking spiral, blue crystal bowl, drain and separate receiving pool |
| 4 | Canyon rafting | Four-person round raft, natural rock banks, rapids, turns, bridges and shared spinning |
| 5 | Free-fall tower | Transparent shaft, vertical lift, held anticipation and steep drop |
| 6 | Water launch | Accelerator, visible water arc and a true 9.81 m/s² airborne boat trajectory |
| 7 | Surf halfpipe | Standing balance, repeated high wall climbs, bracing and turning on a board |
| 8 | Wild river | Forest, a giant tree, stone passage, bridges, fast currents and ring surges |
| 9 | Fountain carousel | Four separate boats on one radial mechanism, acceleration, four rotations and a fountain |
| 10 | Pool pendulum | Four-person ship, fixed 44 m suspension, increasing amplitude, water contacts and braking |

The later player instruction asks for extreme rides; the river retains its ID
but now uses stronger currents and a 42-second circuit. Prices range from
110,000 to 250,000 existing coins. Every complete prefab occupies 124 × 120
units. Wider products have safe free anchors in the existing waterpark; existing
placements are never moved. A full park retains purchases in the bag and can
offer another unlocked island.

Static sandstone, wet moss, bark and foliage use six shared immutable 128²
normal/roughness textures: approximately 512 KiB including mipmaps. They use
ordinary native PBR and the existing sun; water keeps its existing shared
reflection/light fields. No ray tracing, additional reflection targets, scene
copies, per-frame texture generation or reduced phone DPR were introduced.
Secondary waterfalls animate on fixed GPU buffers. Scenes prepare through the
existing cooperative selected-view pipeline.

New motion phases explicitly participate in measured-speed choreography.
Otherwise `rafting`, `surf` and `swing` silently received zero pose weight.
Shared boat passengers use one absolute departure clock, rather than each RAF's
arrival time. Boat frames and cat seat frames are separate: the largest native
cat's posed paws stay above the actual moving deck. Seat elevation and prone/
standing/sitting transitions ease in and out without changing approved meshes.

Validation records accompany this file. The complete Node test suite passed
892/892; it includes actual native paw vertices, phase seams for every seat,
fixed suspension/ballistic gravity, distinct reactions, cancellation, bounded
boats/effects, immutable texture/matrix buffers and repeated purchase/storage/
cached-save merges. All sixty released water models also passed the WebGL
audit; 120 before/after normal and full-DPR phone images have identical pixels.
The final new collection is checked in full, grazing, phone, occupied-rider,
flow, outlet and receiving-pool views. Native phone/SQLite checks cover real shop
buttons, individual prices/previews, placement, both cameras and restarts.
The final native phone run includes three actual passengers on one shared raft
and three SQLite reloads with no browser/HTTP errors. The previous Mega Loops
recovery/store/replacement path also retains exactly one paid, completed copy
over two reloads without another charge. All nineteen islands and two return
visits pass native RAF, actual orbit/zoom, at least six submitted frames and DPR
2 without context loss; the stress fixture contains 115 NPCs.

Rendering checks use the local software WebGL implementation. Resource and
pixel results do not establish a physical M2/iPhone frame rate. The isolated
staged-startup performance experiment is not part of this content release.

Main source: `showcase-water-{data,motion,assets,props,landscape,acting}.js`,
`showcase-waterfalls.js`,
`showcase-surface-details.js`, native catalogue/shop/placement hooks,
`slide-riders.js`, `resident-play.js` and the existing world pose integration.
QA: `test/water-ten.test.mjs`, expanded shared water/regression checks,
`scripts/check-slide-water.mjs`, `scripts/check-showcase-water-app.mjs`.
