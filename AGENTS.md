# Working on Chichi

Preserve the approved Chichi and adoption cat meshes, existing save IDs, owned
buildings, inventory, balances and shared-world synchronization unless the user
explicitly requests a change. Use the existing rendering, interaction and save
systems. Do not replace the game with a separate mockup.

## Every water slide, including island attractions

- Register each water slide/channel in `public/water-ride-data.js`. Its catalogue
  entry must expose the water contract. Include every lane and every connecting
  section; a six-lane slide needs six working streams. Diving towers have impact
  effects but must not emit idle rider splashes.
- Build flowing water from the actual three-dimensional rider route with
  `public/slide-water.js`. A flat plane beneath a sloping slide, an opaque water
  tube, or an empty channel is not a finished implementation. Give the water
  longitudinal metre-based UVs and downhill motion. Retain the shared reflection
  and wave fields, the authored palette and stable smooth surface normals.
- Connect each wet outlet to its real receiving basin or next wet surface.
  Check the whole falling sheet/jet, contact foam, expanding rings and ballistic
  droplets. Water should run and make small outlet splashes while idle; an actual
  cat landing adds a separate larger burst and basin waves once per impact.
- Put rafts and cat paws above the actual channel/bowl floor. Tilt the raft and
  cat together on sloped surfaces. Inspect their real transformed mesh vertices,
  not just a route centreline. Keep support poles below bowl floors and open
  connecting mouths clear of riders. Keep entry, ride, drain and exit continuous. Hide
  unoccupied water rafts. Verify both main-cat and resident manual actions and
  autonomous resident visits, with manual actions and cat needs taking priority.
- Give riding cats choreography derived from the actual seat's speed, height,
  descent, acceleration and signed turns through `public/ride-acting.js`. Cover
  anticipation, bracing/grip, leaning, airtime, landing blink/shake and recovery.
  Reuse the approved cat rig and cached motion tables; keep the carrier on its
  seat. Main and resident cats use the same reactions. Verify cancellation and
  reduced motion restore the ordinary face and limbs without lasting changes.
- Reuse textures/material batches. Continuous effects use fixed GPU buffers;
  never rebuild geometry, upload all particle matrices, create render targets or
  perform scene-copy reflections each frame. Bound concurrent riders and bursts.
  Reduced motion must remain stable. Preserve mobile DPR and graphical detail.
- Extend `test/slide-water.test.mjs` and the water registry coverage check. Run
  relevant route/geometry/interaction/save tests, then the full test suite/build.
  Render every water attraction with `scripts/check-slide-water.mjs`; inspect
  normal, grazing and phone views. A successful build alone is insufficient.
  Use private local saves for browser tests. Never overwrite a live player world
  to test a model. When benchmarking, compare checkouts sequentially and separate
  software-browser diagnostics from claims about physical-phone FPS.

## Expanding buildable islands

Enlarge the terrain/usable area, rather than scaling the houses and decorations.
Preserve the island-local coordinates of owned objects. Maintain the themed core
and leave genuinely buildable outer land. Check all shore clearances, camera fit,
bridges, old and new placements, and repeated saves. Update only snapshots whose
records were explicitly changed by the user's request; add an independent test
that all other island records and existing save fields stay unchanged.
