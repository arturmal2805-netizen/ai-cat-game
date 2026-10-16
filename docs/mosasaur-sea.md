# Небесное море мозазавра

`autumn` replaces the butterfly garden, requires level 8 for new purchases, and
retains existing unlocked ownership. Its radius is `11.65 * sqrt(6)`, so playable
land plus swimmable ocean has six times an ordinary island's area. Only this map
centre moves. The 23 other biome records are frozen in a regression fixture.

The actual basin bottom is 31.4 units below its surface: 40 times the existing
0.785-unit lagoons. The lagoon engine's default geometry and water appearance
are unchanged elsewhere. The shore mesh has a real opening; an extended rocky
foundation, beneath-island clouds and animated falls surround the ocean.

Marin uses a continuous blue sculpt, articulated flippers, a shader-animated
tail, a saddle, an authored jetty and light instanced bubbles/spray. The shared
48-second route boards, dives, swims at depth, surfaces, leaps and returns.
One quaternion drives the animal, saddle and rider. Both Chichi and residents
use the same reservation, approach, mount and dry return. Eye surprise is a
reversible activity overlay; approved cat geometry is unchanged.

The normal camera tracks the current frame's rider. Chichi's existing face
camera still uses her head transform through the water and leap. No ray tracing,
reflection framebuffer, extra shadow light or downloaded texture is added.
Static scenery is batched; the creature and jetty use 14 meshes including effects.

Legacy paid plots covered by the new sea move to dry land without changing IDs,
construction deadlines, crops, money or business upgrades. A full shore uses the
existing saved inventory metadata rather than deleting purchases. Re-loading is
idempotent. Production shared saves are never used by QA.

Validation: `npm test`, `npm run build`, Worker dry-run, and optional
`scripts/check-mosasaur.cjs` with Playwright/Chromium. The browser script uses a
random private local SQLite world, real mobile pointer input, both cameras,
actual rendered deep/jump images and cloud persistence checks. SwiftShader
rendering is a correctness check, not an iPhone frame-rate benchmark.
