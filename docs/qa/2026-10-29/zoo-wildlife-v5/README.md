# Continuous wildlife faces and grizzlies

The gorilla's broad nasal bridge, orbital ridges, cheeks and muzzle are relief
on a single continuous skin. The final pass rounds the brow in profile and
recesses the eyes, instead of layering visible primitive shapes. Dense offline
sculpts receive analytic skin normals and are simplified inside the released
runtime budgets. Head relief derivatives are tested against the actual field.
The elephant has more continuous temples/cheeks, clearer eyes and a symmetric
neutral trunk. Body proportions and the original contact/branch/palm anchors
remain compatible with the native visitor choreography.

The former polar enclosure now contains three brown grizzlies, green cedars,
stone landings, the existing clear lagoon and cone play. Its historical
`zoo-polar` / `polar` IDs, price, receipts and all five-action schedules remain
intact. All five habitats and 21 animals remain alive, including behind unpaid
gates. Otters and axolotls also receive continuous detail/material refinements.
Other islands, native cat meshes, water, shadows and mobile pixel ratio are
unchanged.

One selected-only generated material sheet supplies bear, gorilla and otter
coats and elephant skin. The lossless WebP has identical decoded RGBA pixels to
the generated PNG and reduces its download from 4,001,064 to 2,360,034 bytes.
Its 1254² shared GPU image is about 8 MiB with mipmaps; this is additional fixed
texture residency, not a memory or measured FPS improvement. Models retain one
species batch, the same fur-card counts, shared scalar frame controls and no
per-frame geometry/texture/instance-matrix uploads. All five native materials
verified the same successfully decoded image. Offline failures retain the
procedural material without repeated fetch attempts. The material is generated
original artwork, not an extracted Rockstar model/texture or the supplied stock
photograph. The realism references guide form; this is not AAA/1:1 fidelity.

| Model | Released triangles | New triangles | Released vertices | New vertices |
| --- | ---: | ---: | ---: | ---: |
| Elephant | 44,604 | 42,856 | 24,027 | 23,179 |
| Axolotl | 38,928 | 38,228 | 22,370 | 22,154 |
| Otter | 34,384 | 33,316 | 26,429 | 25,920 |
| Grizzly | 53,136 | 51,568 | 42,137 | 41,663 |
| Gorilla | 51,868 | 50,728 | 39,888 | 39,513 |

`resources.json` records exact buffers and unchanged pose bytes. Standard gzip
recompression is separated from actual served gzip bytes. Geometry budgets are
not a physical-device frame-rate benchmark. The pose cache is `wildlife-v5` /
`grizzly-v6`; gorillas retain 496 rows including the released carry/swing clips,
other species 400. The approved native cat cache identity is unchanged.

Validation:

- Full suite: **846 passed, zero failed**; production build and Worker dry-run
  passed. New checks cover continuous normals, facial-relief derivatives, closed
  skin seams, all five runtime budgets, neutral trunk and shared coat success /
  failure / coalescing. Existing geometry/pose codec equality, sole contacts,
  animation transitions, branch grips, carry, navigation and save tests passed.
- Source renders: all five species, front and side, all five independent actions
  per species; no WebGL errors. Final gorilla/elephant shape diagnostic includes
  untextured clay so the coat cannot hide surface joins.
- Native phone/SQLite: actual mouse clicks **and** touchscreen taps on every
  habitat; all five enclosure and animal cameras; native tiny/giant cat carry,
  random visitor camera and world/island returns; four gate payments; two real
  durable reloads without duplicate payments/objects. No browser or HTTP errors.
- Separate native cat play render: 12 pickup/shared-jump/putdown frames, no WebGL
  errors. These are full-detail software-browser diagnostics, not M2/iPhone FPS.

Only six zoo previews were refreshed. Source and publication verification are
recorded separately so a source commit is not mistaken for a finished deployment.
