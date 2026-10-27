# Living water on every slide

The water contract covers all 14 existing water-slide/channel types and the
three-height diving tower. It is part of `AGENTS.md` and the catalogue metadata,
not a separate decorative demo. `water-ride-data.js` inventories them and the
coverage test checks shop and permanent island objects.

| Existing attraction                      | Physical water paths                                             |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Горка русалочки                          | One open curved flume, catch basin and outlet                    |
| Ленивая волшебная река                   | Flowing circuit and receiving pocket                             |
| Радужный водоворот                       | Spiral channel and central receiving basin                       |
| Водная горка титанов                     | Descending channel and catch basin                               |
| Королевский каскад / slide-royal-cascade | Rainbow open flume and existing lagoon                           |
| Радужная чаша / slide-vortex-bowl        | Spiral flume and correctly placed central pool                   |
| Тюбинг кристального города               | Complete three-dimensional spiral and catch basin                |
| Зефирный водный серпантин                | All three pink streams and three outlets                         |
| Хрустальный шторм                        | Flow inside the clear double corkscrew                           |
| Небесная водная пушка                    | Curved glass flow and a ballistic outlet jet                     |
| Титаническая воронка                     | Entry, seamless swirling bowl film, drain and both wet transfers |
| Изумрудный водопад титанов               | Full jungle flume, outlet and existing waterfall                 |
| Радужное цунами                          | All six full-length streams and six distinct basin outlets       |
| Прозрачная бездна                        | Full transparent drop/curve and basin outlet                     |
| Вышка трёх небес                         | Three real rider impacts; no unoccupied phantom spray            |

`slide-water.js` builds thin water ribbons directly from the same curve or
transported samples as the ride. Longitudinal UVs measure route distance, so
direction and speed do not depend on arbitrary world X/Z projections. The
marshmallow water follows all three sloping flumes and sits above their floors;
the former flat plane underneath them is gone. Other older water tubes become
open channels with visible water, banks and receiving basins. Clear mega-slide
shells, supports, decoration and existing cat models retain their quality.

Outlets follow downward gravity to an actual receiving surface. Gentle outlet
spray and expanding foam remain active while the pump runs. A real cat landing
adds a larger, bounded burst and a ripple through the existing basin API. Four
burst slots cover overlapping impacts; revisiting the same animation frame does
not trigger a second splash. Rotated/moved pools convert ripples to world space.
Water transfers into a sloping funnel use a matching foam normal.

The Titan's formerly horizontal raft now tilts with the rider on the concave
floor. Actual solid raft vertices are checked above the bowl/water film over its
whole spiral, including phase transitions. Entry and drain shells taper at the
bowl rather than intersecting it with a full-width tube. Unoccupied water rafts
are hidden. The connecting mouths have open upper halves, and their support
poles end below the bowl floor instead of piercing the water and riders.
Healthy idle residents can reserve and visit water attractions via
the existing interaction runtime. Reservations, meals, rest, building work,
manual actions and cooldowns take priority; at most three resident outings run
at once. These transient choices introduce no new save schema or paid actions.

`ride-acting.js` measures the actual seat's speed, height above land, slope,
signed turn force and acceleration once per ride type, in a shared table of at
most 513 samples. Chichi and residents use the same reaction layer: looking down
on a high lift, bracing paws on steep/fast descents, leaning into turns, trailing
ears/tail in the wind, spreading paws and widening eyes in flight, then blinking,
compressing and briefly shaking off the landing before recovering. Reactions
fade at phase boundaries and on boarding/exit. They move existing rig joints;
the carrier remains precisely on the real seat. Sampling and per-frame output
buffers are reused. No extra meshes, textures or saved mood changes are involved.
Cancellation and reduced motion restore the ordinary approved face and limbs.
Rig checks also measure actual skinned paw vertices, ensuring that the visible
surface moves rather than merely changing unused joint values.

Water uses the existing shared reflection probe and 128px wave field. A
continuous normal basis replaces the abrupt slope threshold; inverse-transpose
normals handle nonuniform scaling. Bowl flow is periodic around its angular
seam. Moving anti-aliased foam crests and a visible wet sheen make the flow
readable at distance. There is no ray tracing, scene copy or new water texture.
Streams and jets merge into one flow draw per attraction; the bowl retains its
own film. Two
fixed GPU effect batches replace CPU-updated particle matrices. They use at most
272 small droplet quads and 20 foam rings; idle diving towers hide both batches.
Reduced motion freezes the water and rings and hides moving spray.
Transparent basin water is drawn before contact foam and airborne droplets;
ordinary opaque geometry still occludes them through the depth test.

Checks: `test/slide-water.test.mjs`, `test/ride-outings.test.mjs`, the existing
mega-ride, cotton-island and shared-water tests, and `scripts/check-slide-water.mjs`.
The browser script compiles/renders every actual model, checks all lanes,
directed water, impacts, fixed buffers, reduced motion and full-DPR phone views.
Set `CHICHI_SLIDE_BASELINE` for a sequential comparison against another checkout;
software-renderer timings are diagnostics, not a physical-phone FPS claim.

The four requested building expansions (`candy`, `nature`, `rainbow`, `clouds`)
retain their original themes, prices, levels and island-local owned objects.
Their terrain radius is multiplied by √5, producing five times the land area,
with open outer meadows. Only these four map centres move to keep every shore
separate. `building-expansions.test.mjs` independently preserves the other 24
island records, compares real rendered terrain area and exercises outer-land
building and repeated save/reload with existing slides/adoption centres.

## Release verification

- Full Node suite: 449 passed. The additional compositing regression also passes
  for all 15 water types.
- Actual private browser world: 10 legendary attractions, each ridden by Chichi,
  a tiny resident and a giant resident; Titan autonomous selection and a real
  CDP touch drag into its bowl; all real water impacts; no browser/GLSL errors.
- Actual outer-land business on each of the four expanded islands; cloud
  save/reload retains the exact purchases, placements, coin and XP balances.
- WebGL audit of all 15 actual models, normal/close/grazing views, full-DPR mobile
  views, fixed effect buffers and reduced motion. Sequential baseline comparison:
  each of the three advanced water channels drops from 24 to 13 draws; the
  six-lane tsunami drops from 18 to 15. No attraction gains water textures.
  Some attractions need additional draws for their new basins/flow/effects;
  these figures are not a guarantee about frame rate on a physical phone.

The shared save also handles a phone still running the pre-expansion shoreline.
If that client filters an outer plot out of its local snapshot without putting
the item in its bag, the server preserves the purchase's ID, deadline, tier,
income account and crops. It reconciles ownership counts, so genuine storage and
replacement work and concurrent changes on the other phone remain authoritative.
Regression checks cover repeated old-client saves and simultaneous storage or
replacement without resurrection or duplication.

## Twenty-five reference complexes

The additional `slide-dream-*` catalogue family is separate from all fifteen
previous water attractions. `reference-slide-data.js` defines the 5×5 reference
order, independent prices/income, footprints and shop metadata. The minimum
price is 28,000 coins; the largest four-funnel complex costs 240,000. Business
upgrades, XP and collection use the existing ledger and currency.

`reference-slide-motion.js`, `reference-slide-assets.js` and
`reference-slide-props.js` share the actual lane routes between flowing water,
raft seats, cat choreography, transparent flumes, bowls and receiving pools.
Launches are ballistic; intermediate impacts land on their actual raised wet
channel and only the final landing drives the lower basin's rings. All 25
catalogue images are pre-rendered from these real models.

`slide-riders.js` keeps four independent, bounded tickets/rafts per attraction,
separate lane choices and 5.2-second launch spacing. Lazy raft slots support
out-of-order arrivals without stopping the world loop. Rafts share geometry and
materials. Ordinary and hero cats, autonomous visits, drag actions and both
camera buttons use these same seats and clocks. New object IDs are retained
when an older cached client uploads its save; they are not duplicated.

Validation: the water rendering audit covers all 40 attractions, including
normal, grazing and DPR-2 phone views of all new complexes. The private browser
check accepts `CHICHI_REFERENCE_SLIDES=1 CHICHI_CAMERA_CHECKS=1` and exercises
hero, tiny and giant cats, independent concurrent riders, both cameras and
shared SQLite save/reload. `reference-slide-clearance.test.mjs` measures actual
animated giant paw vertices against the curved flume floor in every new lane.

## Twenty giant water worlds (4 × 5 collection)

`atoll-slide-data.js` declares twenty new `slide-atoll-*` products, leaving the
twenty-five released `slide-dream-*` records and every old island unchanged.
The reference's final-cell ambiguity was resolved with the user in favour of
Mega Loops. Recipes, route normals, water, rafts and reactions share the same
authored path. Six-lane racing, intertwined routes, terrace basins, wide wave/
halfpipe surfaces, a natural rock vortex and genuinely inverted loops are
separate experiences. Colours, landmark cliffs, roots, crystals, coral and
blossoms belong to the purchased model, not a flat reference image.

The most expensive released slide costs 240,000; new prices are at least
eight times that amount, with higher prices for the giant wave and Mega Loops.
The existing shop supports multiple copies. Its new twenty-item tab shows
prices before purchase and a persistent «Придбано» badge for bag/placed copies.
The first purchase includes the new waterpark annex. Twenty full-size plots
and wide roads fit without moving any released island, road or paid object.
Sixty existing placements plus twenty premium placements survive restoration.
Premium registers retain unpaid income when the established wallet is full;
XP still respects the existing maximum level.

Use these implementation rules for future large complexes:

1. Reuse the capybara scene scheduler and cooperative generators. Prepare one
   nearby visible premium plot at a time, after gestures settle. A far world
   view must not allocate and warm the entire park.
2. Batch the complete static geometry with its authored colours/materials;
   reuse the shared water fields and lightweight acrylic. Preserve detail,
   lighting and mobile DPR. Do not add scene-copy reflections or render targets.
3. Waterfalls/crest foam have fixed GPU buffers. Only visible or occupied
   complexes update; simulation and rider clocks continue off camera through
   the existing runtime. No particle/matrix-buffer regeneration each frame.
4. Cache the measured reaction tables per type/lane. Put temporary sitting and
   emotion changes in runtime animation, outside the sculpt producers, so
   approved cached cat geometry is retained. Reduced motion/cancellation must
   reset the normal rig.
5. Cache at most eight approach plans, using existing A* and path sampling.
   Use dry perimeter paths and separate queue/return corridors. At most four
   rafts share geometry, with the existing 5.2-second launch headway.

`atoll-slides.test.mjs` covers prices, terrain/road preservation, all eighty
placements, route continuity, inversion, separate animations, queue capacity,
income and repeat restoration. The clearance test includes actual animated
giant paw vertices with the new seated pose. `CHICHI_ATOLL_AUDIT=1` runs the
real phone shop, purchased construction, hero/tiny/giant rides, both camera
buttons and private SQLite reloads through `check-aquarium.cjs`.
