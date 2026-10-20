# Map and Catquarium rendering

The October 2026 optimization retains every existing island, all 50 Catquarium
fish, their sizes and journeys, 120 bubbles, 55 world fireflies, water materials,
cat meshes, shadows and mobile DPR 2. The catfish eye cap is a new convex kitten
eye with a coloured iris, large pupil and catchlights. Approved adoption/Chichi
geometry is unchanged.

Fish geometry is shared across all tanks. Per-vertex part and surface attributes
preserve individual tail/fin articulation and the original roughness/metalness
while rendering each tank's shoal in one draw. One fixed pose palette updates
translation, heading and limbs without replacing instance matrices or geometry.
CPU picking uses the same displayed pose, with separate articulated collision
parts. Bubble and firefly motion use fixed instances and shader clocks.

Hidden island layers and distant cat carriers defer descendant world-matrix
updates until visible. Explicit world-space queries still update correctly.
Static batched meshes keep their baked identity transforms. Large merged buffers
and their exact bounds are prepared cooperatively; their source attributes no
longer incur an extra full-array clone.

Navigation uses stable rest-anatomy radii plus breathing clearance. Pathfinding
keeps at most 48 masks per obstacle snapshot; actor animation can no longer
accumulate unbounded size variants. Idle reward polling returns the same world
when nothing is due, Kyiv date formatting is shared, and bulk register reads
avoid repeatedly enumerating every business. Existing coin/diamond/XP formulas
and shared saves are unchanged.

Checks:

- `npm test` and `npm run build`.
- `node scripts/check-aquarium.cjs`: real phone gestures, fish tracking/raycast,
  visitors, roof restoration and a private local shared save/reload.
- `node scripts/check-aquarium-motion.mjs`: GPU transform feedback compares
  displayed vertices/normals to CPU picking poses in all five tanks, including
  reduced motion; also captures front, profile and phone views.
- `CHICHI_PERF_ONLY=1 node scripts/check-aquarium.cjs`: raw counts/CPU diagnostics;
  `CHICHI_BASELINE_REF=<commit>` uses that committed source for comparison.
- `CHICHI_ALL_ISLANDS=1 node scripts/check-world-loading.mjs`: sequential island
  preparation without removing detail or changing DPR.

In the same 390 px / DPR 2 aquarium view, the first sequential software-browser
comparison changed 436 draw calls to 364 (72 fewer), uploaded instance-buffer
bytes per rendered frame from 42,688 to 19,008 (55% less), and geometry objects
from 514 to 460. The five shoals changed 25 draws to 5; fireflies changed 55 draws
to 3. Both runs retained 56 textures and a 776 × 1464 drawing buffer. These are
workload measurements, not physical-phone FPS guarantees.

The follow-up also removes unseen fish using the complete articulated bounds,
not screen-size thresholds. A stable logical-ID palette preserves coats,
raycasts and fish tracking when GPU instance order changes. All 25 tested
hall/close/side/overhead/away views at DPR 2 produced identical framebuffer
pixels with culling enabled. Close views can submit about 70% fewer fish
triangles. The fish shader no longer fetches and reapplies identity native
instance matrices after its own pose palette. Index-cache ordering retains the
exact oriented triangles and every existing attribute byte.

Owned attractions defer visual animation and matrix traversal outside both the
final camera and its shadow view. Active ride simulation continues, including
jumps, diving and guest tracking. The same conservative bounds stop Chichi's
off-camera, deliberately non-culled leg meshes submitting invisible triangles.
Her approved geometry/material/animation renderer remains unchanged.

Other live cats, including business staff and their tiny visitors, submit their
existing rig in groups per original material. The GPU receives exact weighted
bone/rigid transforms and normal transforms; skin, coat fibres, iris clearcoat,
colours, Float16 coordinates and shadow behaviour are retained. Native rig
meshes stay available for the existing drag raycasts on layer 31. Geometry and
uniform storage remain fixed during animation. A private loaded-island audit
uses four large water attractions, sixteen businesses and sixteen adopted cats;
it compares original and batched draws in the same scene/pose.

Additional checks are `test/render-workload.test.mjs`,
`test/cat-render-batch.test.mjs` (every adoption profile),
`scripts/check-cat-render-batch.mjs` (real colour/shadow frame comparisons), and
`CHICHI_DRAW_AUDIT=1 CHICHI_SCENE_STRESS=1 node scripts/check-aquarium.cjs`.
The real phone checks in `scripts/check-mega-rides.cjs` accept
`CHICHI_CAMERA_CHECKS=1` to exercise both item-dialog camera buttons. Attraction
overview fits the real model bounds from slightly above its front, including
portrait/landscape resize; guest tracking selects actual active riders without
starting/cancelling their visits or changing the saved world.

`render-pacer.js` retains frame deadlines through callback jitter instead of
restarting the 30/60 Hz interval after a late frame. A one-minute synthetic
60 Hz jitter trace retains 1,800 idle draws; the previous limiter admitted only
1,349. This is a scheduling regression test, not a device frame-rate benchmark.
The private browser Workers copy their tested bundle into their own temporary
directory so a concurrent Worker build cannot hot-reload the save test.

The subsequent aquarium patch precomposes the four fish-part transforms once
per fish and shares their matrix rows with every vertex. CPU picking reuses the
same cached transforms. Part and surface IDs use exact byte-sized indices;
the two original roughness/metalness pairs are recovered exactly in the shader.
Vertices, triangles, colours, tank populations and DPR remain intact. The user's
later eye request increases only the convex eye caps and kitten pupils.

`gpu-frame-queue.js` polls nonblocking WebGL fences and permits at most two
submitted frames. It avoids filling the driver's queue with stale camera views
on a busy phone. No resolution or scene detail is adjusted. Chichi retains native
skinning; the vertex shader skips only bone fetches whose weight is exactly zero.
`CHICHI_NATIVE_SKIN_CHECK=1 node scripts/check-cat-render-batch.mjs` compares her
original and optimized colour/shadow frames; all four poses matched pixel for pixel.

`cat-picking-bounds.js` avoids the first-gesture scan of every skinned vertex.
It unions rest geometry boxes transformed by each current joint. Positive
normalized skin weights keep every actual vertex inside this conservative
volume. Exact native triangle raycasts remain in use after that early test.
The same preparation covers hero/resident selection and cat-to-object drops.
`cat-picking-bounds.test.mjs` checks actual articulated vertices through walking
and ride reactions, plus identical ray hit faces, distances and positions.

Large merged static meshes now submit only contiguous original index ranges
inside the actual colour/shadow camera. Fixed multi-draw command arrays share
the existing index/attribute buffers and preserve transparent triangle order.
Unsupported renderers retain native dispatch. Builders that install wind,
reef sway or refraction after merging are detected before shader precompilation
and retain native rendering, since their vertices no longer obey static bounds.
Transient command bounds are excluded from Three's JSON-based guest raft clones.
Actual full-resolution same-pose comparisons, repeated software timings and
limits of those measurements are recorded in `docs/qa/2026-10-19/README.md`.

## Whole-map follow-up

The next pass covers all 30 current islands with 147 resident cats plus Chichi,
four large placed slides and sixteen businesses. Small baked opaque props with
identical material settings share multi-draw submissions. Their complete source
geometry, index order and materials remain available for picking on layer 30.
Each instance uses the actual colour/shadow camera; hidden parents, interior
roofs, moving/stored buildings and later shader changes retain native behaviour.
Moving raft templates and guest clones remain native. Unsupported devices,
animated shaders, transparent water, large existing range batches, Float16 cat
geometry and unsupported transforms retain their previous rendering.

Matrices upload only when an object actually moves. Removed/replaced batches
release their GPU resources. Comparing material settings uses texture identities
without encoding canvas images during building edits.
Shared shaders prepare in parallel against the real scene lighting; original
props remain visible until preparation finishes, including native fallback on
failure and safe retirement of an island/building while preparation is pending.

The simulation reuses roster records/position references across leisure, work
and housing, and shares the frame's clock/partner lookup. Simultaneous attendance
events retain their ordered timestamps and wages in one immutable update and
one microtask commit. Player purchases and cloud/backups keep their existing
immediate persistence. Friend cards retain their DOM nodes across income/save
updates; needs, relationships, adoption availability and card-only sex badges
continue updating. Family date formatters are shared rather than reconstructed
for every label.

Additional reproducible checks:

- `CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1 node scripts/check-aquarium.cjs`:
  actual renders and camera transitions on every island at DPR 2, resident crowd,
  original prop raycasts and unchanged/live-updating friend cards.
- `CHICHI_PROP_PROOF=1 CHICHI_SCENE_STRESS=1 node scripts/check-aquarium.cjs`:
  same frozen full-resolution crowded island, native versus shared static props,
  four views, complete shadows and alternating repeated timing samples.
- The same proof without `CHICHI_SCENE_STRESS` covers Catquarium. Its 50 fish,
  bubbles, tank water, approved models and framebuffer resolution are unchanged.
- `test/static-draw-batch.test.mjs` checks every original attribute/index,
  native fallbacks, live transforms, hidden branches, exact picking, fixed
  matrix storage, raft clones, texture handling and resource retirement.
- `test/jobcity.test.mjs` compares grouped attendance with the same ordered
  individual events, subsequent wages and immutable input.

These browser timings use software Chromium. Draw workload and image parity are
separate from FPS on a physical Mac/iPhone. Batched matrix multiplication may
round a few antialiased edge samples differently; the prop proof bounds this
below the existing cat palette image tolerance. It never permits a changed model,
missing object, texture downgrade, reduced shadow map or lower pixel ratio.

## Shared colony rendering

The next pass targets whole-frame work in crowded scenes, rather than treating
lower draw counts as proof of higher FPS. `cat-pose-atlas.js` retains the existing
Float32 joint matrices/normals in bounded, reusable slots. Only changed rows are
uploaded; pending rows stay bounded even while a renderer is hidden. Separate
camera records share the exact CPU-combined model-view/normal matrices across
materials and shadow draws. This avoids far-from-origin rounding in close views.

`colony-render-batch.js` shares compatible opaque cat draws while retaining every
Float16 vertex, byte weight, oriented triangle, coat shader, sheen, iris clearcoat
and per-cat tint. Original articulated picking meshes remain on layer 31. Colours
stay flat per instance and multiply the original interpolated coat colour in the
fragment shader, in the original order. Current animated bounds and the actual
colour/shadow camera choose submissions; no screen-size/detail reduction occurs.

Quiet scenes retain the original individual uniform-palette renderer. Crowds
share rendering once enough cats need drawing, with hysteresis around the switch.
Native GPU draw buffers are then released without destroying CPU geometry or
unregistering a living pose slot. Fallback draws can restore their original GPU
buffers. Geometry/material/transform changes and unsupported renderers stay native.
Shared geometry and shaders prepare cooperatively before replacing visible draws.
Outfits can share paint with baked scenery; its range-only shader must retain
native cat draws, since it intentionally disables Three's instance transforms.

After complete matrix evaluation, rendering can omit CPU-only picking/bone
branches. The original child arrays are restored before scene callbacks and
input, including when rendering throws. Chichi keeps her original native renderer.
No saved IDs, buildings, wallets, water, shadow-map settings or DPR are changed.

Reproducible checks include:

- `test/cat-pose-atlas.test.mjs`: attribute/index bytes, weighted joints, bounded
  update ranges, slot reuse, GPU-only eviction, fallback/rebuild and exception-safe
  restoration of the original rig hierarchy.
- `CHICHI_COLONY_CHECK=1 node scripts/check-cat-render-batch.mjs`: actual colour
  and shadow frames of three approved cats in each breed/pose, including sleep,
  walking and ride reactions. `CHICHI_CAT_ATLAS_CHECK=1` isolates pose transport.
- `CHICHI_POSE_PROOF=1 CHICHI_SCENE_STRESS=1 node scripts/check-aquarium.cjs`:
  frozen full-resolution crowded homestead, four views, original versus shared
  draws, with every triangle retained. Run without stress for Catquarium.
- `CHICHI_FRAME_AUDIT=1 CHICHI_SCENE_STRESS=1 CHICHI_MAP_CHECK=1 node
  scripts/check-aquarium.cjs`: paired same-scene renderer diagnostics on the moon,
  homestead and aquarium, both still and with repeatable camera/gait motion.
  Raster draws/clears are suppressed only in this QA mode, after warming/draining
  real frames, to isolate traversal, matrix, shader, upload and command overhead.
  It excludes game navigation and is not physical-device FPS. Full-resolution
  rendered image checks and the complete map/phone/save integration run separately.

## Camera gestures and GPU residency

The follow-up distinguishes late camera interpolation from simulation time:
physics still caps its time step, while orbit/face tracking catch up using real
elapsed time. Wheel input respects pixel/line/page units. A touch does not start
cat raycasts until it becomes a single-finger drag or a tap; two-finger zoom
never initializes a cat drag. Exact articulated selection remains unchanged.
World-space badges do not animate their position behind the moving camera.

Stationary ordinary scene nodes cache their exact local transforms without
changing explicit matrix/world-space query APIs. Approved cat rigs remain on
native updates. New island shaders prepare both colour and shadow variants
against the current lighting, cooperatively, with uniform/attribute reflection
before reveal. The removed Three PCFSoft setting is replaced with the same PCF
filter that Three 0.186 already selects at runtime.

`geometry-residency.js` retires GPU geometry unused for at least ten seconds
when retained geometry exceeds a 192 MiB target. The complete current colour and
shadow workload always takes priority over that target. CPU attributes, exact
indices, materials, animation and saves remain intact; native Three uploads the
same data when the geometry is drawn again. Geometries sharing an attribute
retire together, and a recently drawn owner protects the whole group. Retirement
runs at most once a second with a cooperative work limit. Texture/shader caches
and the native driver/framebuffer allocations are separate from this accounting.

`CHICHI_GESTURE_ALL=1 CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1 node
scripts/check-aquarium.cjs` visits all 30 islands and returns to Catquarium. It
checks real wheel, pointer orbit and two-finger touch gestures, unchanged browser
zoom, exact frozen colour/shadow images and full DPR 2. Aquarium and crowded
homestead additionally compare pixels after GPU geometry retirement/re-upload.
WebGL buffer allocation counts are measured separately from CPU command-only
samples; software-GPU timings must not be reported as Mac or iPhone FPS.
