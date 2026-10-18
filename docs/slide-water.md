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

- Full Node suite: 447 passed. The additional compositing regression also passes
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
