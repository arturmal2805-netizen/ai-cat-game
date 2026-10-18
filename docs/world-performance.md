# Map and Catquarium rendering

The October 2026 optimization retains the 28 existing islands, all 50 Catquarium
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
