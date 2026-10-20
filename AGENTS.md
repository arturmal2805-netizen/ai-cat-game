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
Test shared saves from cached clients using the previous island boundaries.
Their normalization must not silently delete new outer-land purchases; preserve
IDs and attached state while permitting actual storage/replacement without
duplicating or resurrecting a building removed on the other device.

## Map and aquarium performance

- Preserve the approved cats, fish counts/sizes, authored scenery, water,
  shadow quality and mobile pixel ratio. Batch identical rendering work instead
  of reducing those details. Keep CPU camera/picking poses aligned with the
  actual GPU animation, including frozen and reduced-motion frames.
- Navigation radii must come from rest anatomy with breathing clearance, never
  the current animated body scale. Keep pathfinding caches bounded.
- Continuous ambient/fish/bubble animation must keep fixed geometry and instance
  buffers. Use shared pose palettes or clocks, not per-frame matrix uploads.
  Hidden visual branches may defer matrices, but must refresh completely when
  shown; explicit world-space queries must still work.
- Check `test/world-performance.test.mjs`, the actual GPU pose/normal probe
  `scripts/check-aquarium-motion.mjs`, and the phone/save integration in
  `scripts/check-aquarium.cjs`. Separate software-renderer diagnostics from real
  phone frame-rate claims; report counts/bytes and retain equal detail/DPR.
- Whole-attraction culling must use the FINAL camera after face tracking and
  retain shadow casters and complete airborne/underwater rider bounds. Hidden
  active rides must continue simulation. Refresh matrices when shown again.
- Keep Chichi's approved native renderer. Other live cat rigs may batch draw
  submissions per original material, retaining all vertices, Float16 data,
  weighted bone transforms, coat coordinates and depth/shadow shaders. Original
  articulated meshes remain the picking targets on `CAT_PICK_LAYER`; raycasters
  must include it. Dispose custom depth materials along with regular materials.
  Run `test/cat-render-batch.test.mjs` for every adoption profile and
  `scripts/check-cat-render-batch.mjs` for actual same-pose colour/shadow images.
- Aquarium instance culling must preserve logical fish IDs for colour, picking
  and tracking. Compare full and culled frames pixel-for-pixel, including hall,
  close, overhead and phone views; never cull by apparent size or simplify fish.
- Preserve render deadlines through RAF jitter; do not restart the idle-frame
  interval from each late callback or replay missed GPU frames in a burst.
  Browser/SQLite checks must snapshot `.generated/worker.mjs` to their own temp
  directory: `npm test` rebuilds that file and otherwise hot-reloads QA servers.
- Keep GPU submissions bounded with nonblocking fences. Never wait for GPU
  completion on the UI thread, lower DPR, or skip visual details to relieve a
  busy frame queue. Preserve native Chichi skinning and zero-weight semantics;
  verify `CHICHI_NATIVE_SKIN_CHECK=1 node scripts/check-cat-render-batch.mjs`.
- Camera gestures must not initialize picking bounds by skinning every vertex
  of every cat. Use conservative current-joint bounds before exact raycasts;
  preserve hit positions/faces and test actual articulated mesh vertices.
- Static range submissions must retain original index order and attribute
  buffers, and use the actual colour/shadow camera. Builders can install wind,
  reef sway or underwater refraction after merging: those meshes must remain
  native, including during shader precompilation. Compare actual frozen frames
  on both the aquarium and a heavily built homestead before publishing.
- Colony-wide sharing must retain original Float16 vertices, weighted joint
  palettes, material tints, exact CPU-combined model-view/normal matrices and
  separate colour/shadow camera data. Bound/reuse pose slots and reclaim only
  unused GPU draw buffers; GPU eviction must never unregister a living cat.
  Small scenes may keep individual draws when sharing adds overhead. CPU-only
  rig branches may be omitted from render traversal only after matrix updates;
  restore the original child arrays before callbacks/picking and on exceptions.
  Check same-pose images and full renderer work, not just simulation or draw
  counts. Never translate software-GPU diagnostics into device FPS claims.
  Outfit paint can be shared with static scenery: range-only materials that
  undefine Three's batching shader must remain native in colony rendering.

- Camera damping follows actual elapsed time while physics retains its capped
  step. Pinch must not eagerly raycast/cancel a cat; retain actual single-touch
  drag and tap selection. Test wheel, orbit and pinch on every island.
- Bound unused GPU geometry residency without touching CPU models, attributes,
  animation, materials or saves. Record both colour and shadow use; shared
  attribute owners retire together only when all are idle. Current rendering
  always wins over the cache budget. Compare real pixels after re-upload.

## Permanent families and personal cat lives

- Preserve released `cat-sex.js` identity assignments: changing the hash or an
  existing cat's override invalidates lifelong couples. Sex badges belong only
  on cards, never on the map or approved meshes.
- Families are permanent AI choices in the existing daily batch, reviewed every
  14 game days, with a quarter-roster introduction budget per review
  (two members per new couple). This is pacing, never a lifetime family cap: every
  compatible single cat remains eligible in future reviews. Keep existing
  partners, the calendar origin, shared active residence, personal ownership and
  private balances. A paired venue kitten must remain available after storage.
- Cached clients omitting `family` must not erase it. Conflicting partners and
  over-capacity concurrent proposals must fail atomically; progress merges must
  not replay a completed visit or a payment. Never test against a player world.
- Reuse native reserved seats, routes and animations for AI leisure. Bound active
  outings and give work/manual control priority. No additional per-cat AI calls,
  GPU portrait builds, altered approved rigs or reduced graphics.
- Run the family/leisure, housing and shared-save tests, full suite/build and
  `scripts/check-family.cjs`. Inspect real phone cards and the loaded shared
  house, not only transient simulation positions.
