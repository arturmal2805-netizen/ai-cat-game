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
