# Mosasaur Ocean incremental release verification

The player-approved global-water release `6a5a5d9` remains the immutable rollback
reference. The player has not approved the current reef art; this increment
does not claim reference-image
equivalence or 60 FPS on a Mac or phone.

## Water correction

Deep seabed distance must not make the surface opaque over an animal just below
it. The surface now composites a thin Fresnel/scattering interface; submerged
materials retain their own depth attenuation. The existing two field samples,
single environment lookup, fixed animation buffers, DPR and shadows remain.
Custom bed textures are exposed to the existing cooperative shader warmup.

Actual WebGL checks, saved under `/workspace/qa`:

- `ocean-visibility-v11`: the rejected opaque shader retained 0.0377 of the
  submerged model's contrast; the corrected shader retained 0.8714 on desktop
  and 0.8716 at full phone DPR 2. These are image measurements, not fidelity
  percentages or FPS measurements.
- `ocean-water-v11-full`: the actual island rendered in close, top and phone
  views, with animation, no context loss and the ocean shader active. The
  recorded overview contained 535 draws and 6,097,875 triangles before the
  separate coral-culling experiment.
- `ocean-optics-v11`: 10 optical and shader-warmup tests passed.
- The earlier full suite passed 975 tests (`ocean-full-v6`); it predates the
  latest water changes and is not a final-release gate for this checkpoint.

## Release gates and visual scope

Coral silhouettes, terrain composition and water art remain an ongoing visual
iteration against the supplied reference. Reflection manifests have been
rebaked and the source build passed. Native submarine keyboard/touch controls,
both camera positions, exact pilot seat, real exit checkpoint, private SQLite
reload, automatic return and dry dismount passed (`submarine-native-v16`). The
previous ordinary-orbit interference was fixed with an independent eased camera.

All 19 registered islands plus four return visits passed real native orbit/zoom
checks at DPR 2 (`ocean-all-islands-v17`): 64 adopted cats plus native residents,
115 NPC records, no context loss, browser exceptions or HTTP errors. The full
run covered 979 tests: 968 passed; 11 strict snapshots still described the old
ocean area/arrival. Only the requested ocean fields/road were updated; all 13
final footprint, unchanged-island, road and hash follow-ups passed. The added
camera regression test and both immutable-coral-buffer tests passed too.
See `mosasaur-ocean-native-evidence-2026-11-10.json` for retained measurements.

## Separate coral-culling candidate

Near/middle coral instances are partitioned in their original contiguous order.
Their Float32 transforms, colours, geometry, animation clock and native sorting
sphere are preserved. Tight visibility bounds are checked from the final camera
by the owning LOD. Far views retain the original combined draws. No instance
buffers are rewritten during animation.

`ocean-coral-cells-v2` compares the actual prebaked coral geometry, native PBR
materials and lighting with/without partitioning. Every view below produced
**zero changed colour pixels**, with no lost context:

| View | Original triangles | Candidate triangles | Original / candidate draws |
| --- | ---: | ---: | ---: |
| Near | 3,250,075 | 944,809 | 30 / 32 |
| Away | 7,403,120 | 3,557,563 | 86 / 140 |
| Surface | 7,687,627 | 3,336,103 | 85 / 142 |
| Overview | 2,713,098 | 2,713,098 | 175 / 175 |
| Phone DPR 2 | 3,144,860 | 982,196 | 29 / 29 |

The earlier v1 changed 30 pixels and was rejected. `ocean-targeted-v12` passed
five tests, including exact colony matrices/colours, fixed-buffer updates,
surface optics and texture warmup. These checks establish image preservation
and less invisible geometry, **not a physical-device FPS gain**. The expanded
ocean was then tested separately below; no player-approved FPS tag is changed.

### Expanded-ocean follow-up

The final `ocean-coral-cells-v18` again produced zero changed pixels in all five
views. Near/away/phone draws became 29/22, 80/64 and 29/14; triangle counts became
2,953,580/765,422, 3,317,560/1,071,767 and 3,091,861/728,605 respectively.
Surface and overview draw/triangle counts remain identical. The owning LOD
skips custom frustum calculations when its original far group is selected.

Alternating, warmed WebGL measurements use a tiny readback to finish GPU work
only in the isolated QA renderer. Initial close/away/phone completed medians
were 1419/460, 1583/609 and 1412/456 ms on SwiftShader. Distant views showed
substantial software-backend variation: an initial candidate p95 spike was not
reproduced; the repeat instead had its largest spike in the baseline. Repeat
surface/overview medians were 1108/1177 and 5010/5267 ms, with CPU medians
2.7/2.9 and 3.8/8.6 ms. These measurements support reduced close-view GPU work,
but do not establish a distant-view or Mac/iPhone FPS improvement. Raw initial
and repeat values are retained in `mosasaur-coral-evidence-2026-11-10.json`.

## Requested additional area

The player explicitly selected five times the current master ocean **area**.
Both horizontal axes therefore use `sqrt(5)`, rather than five. The outer radius
is now 319.0484 m (previously 142.6828 m); water semiaxes are 234.7871 by
223.6068 m. Depth stays 200 m. Animals, cats, buildings, the original ride and
submarine retain their real scale. The original ride pickup and submarine
boarding coordinates remain stable; the dry approach reaches the new shore.

Only this island's world centre moves, to `[-450, 500]`, clearing the entire
housing expansion strip at Z=55, including future sections along X. Existing
and previous-master owned shoreline plots retain IDs,
local addresses, deadlines and dry pads/connecting walkways. Optical depth bounds,
reservations, coastal headlands and reef positions follow the enlarged ocean.
Templates, colony counts and per-frame buffers do not multiply with the area.

`ocean-expansion-v14` passed all ten expansion/physics tests. The separate
`submarine-return-v14` passed seven tests including return from both deep
caverns: leave through the actual opening before ascending beneath a solid roof.
Native browser and final-release checks are recorded above.
