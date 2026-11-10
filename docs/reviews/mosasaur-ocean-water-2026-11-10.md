# Mosasaur Ocean working checkpoint

This is an unpublished candidate. The player-approved global-water release
`6a5a5d9` remains the production and rollback reference. The player has not
approved the current reef art; this checkpoint does not claim reference-image
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

## Remaining release checks

Coral silhouettes, terrain composition and water art still need visual review
against the supplied reference. Refresh reflection input manifests, rebuild,
recapture the two ocean previews, and repeat native submarine, camera,
interaction, save/ownership and other-island regression checks before publishing.
Deep-cave submarine return navigation is not fully verified. The current HTML
bundle reference has intentionally not been included in this source checkpoint.

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
and less invisible geometry, **not an FPS gain**. Higher draw counts in some
views still require representative frame-time checks before this candidate can
become an approved performance standard or be published.

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
Native browser and final-release checks are recorded separately when completed.
