# Небесное море мозазавра

`autumn` replaces the butterfly garden, requires level 8 for new purchases, and
retains existing unlocked ownership. Its radius is `11.65 * sqrt(6)`, so playable
land plus swimmable ocean has six times an ordinary island's area. Only this map
centre moves. The 23 other biome records are frozen in a regression fixture.

The actual basin bottom is 31.4 units below its surface: 40 times the existing
0.785-unit lagoons. The lagoon engine's default geometry and water appearance
are unchanged elsewhere. The shore mesh has a real opening; an extended rocky
foundation, beneath-island clouds and animated falls surround the ocean.

Marin uses a continuous muscular blue trunk, a separate broad reptile skull,
articulated lower jaw, two rows of teeth, inset amber eyes, nostrils, volumetric
flippers and a powerful vertical tail. A shared 256×256 procedural bump field
adds small scales; the body/fin construction buffers are cached. The stitched
navy saddle and leather girth retain the existing seat transform. No approved
cat geometry is changed.

The shared 30-second route boards, dives, swims at depth, surfaces, leaps and returns.
Deep swimming is about 4.2 times the previous speed. The submerged loops follow
the basin rather than cutting across it, leaving space for the long tail.
The 2.8-second leap has constant gravity (16 units/s²), launch velocity 22.4,
straight horizontal momentum and a roughly 15.7-unit rise. The body follows its
velocity: steep nose-up launch, a short crest and steep nose-first water entry.
Descent continues below the water before the animal levels out. There is no
smoothed-height plateau or midair circular turn.

Breach and re-entry each emit a deterministic burst: 96 instanced droplets,
three expanding foam rings and a low jagged water crown. Burst centres are
computed once. Separate underwater bubbles follow the tail. All buffers are
reused; effects are hidden outside their short windows and in reduced motion.
One quaternion drives the animal, saddle and rider. Both Chichi and residents
use the same reservation, approach, mount and dry return. Eye surprise is a
reversible activity overlay; approved cat geometry is unchanged.

The normal camera tracks the current frame's rider. Chichi's existing face
camera still uses her head transform through the water and leap. No ray tracing,
reflection framebuffer, extra shadow light or downloaded texture is added.
Static head, teeth, saddle and jaw detail are batched. The creature and jetty use
17 mesh objects including the four instanced/crown effects; there are no new
shadow-casting lights or per-frame texture uploads.

Legacy paid plots covered by the new sea move to dry land without changing IDs,
construction deadlines, crops, money or business upgrades. A full shore uses the
existing saved inventory metadata rather than deleting purchases. Re-loading is
idempotent. Production shared saves are never used by QA.

Validation: `npm test`, `npm run build`, Worker dry-run, and optional
`scripts/check-mosasaur.cjs` with Playwright/Chromium. The browser script uses a
random private local SQLite world, real mobile pointer input, both cameras,
actual rendered deep/jump images and cloud persistence checks. SwiftShader
rendering is a correctness check, not an iPhone frame-rate benchmark.
