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
