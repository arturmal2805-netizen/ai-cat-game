# SPA V6 ninth iteration — actual-scene reflection capture, offline WIP

Production remains39708e32a6a4f86b9a6a09d777fc4c38526a7f33. Eighth visual
checkpoint d72d101137ecfc24b7c3e36536c5f868b37ccdf8; exact native source2125531.
Furniture shadows restored; dry Cafe ribs/pendant cleared from sky water.
Still visual WIP, not final R1/R2/R4/R5 match. No V6 release yet.

scripts/bake-resort-spa-native-probes.mjs added as AUTHORING ONLY to existing
private native harness. Does not run in production and adds no runtime assets
or reflection changes yet. Syntax checked; actual GPU bake is next.

Command Node22/Playwright/Chromium paths from recovery docs:
CHICHI_EXPLORER_AUDIT=1 CHICHI_RESORT_SPA_AUDIT=1 CHICHI_SPA_PROBE_BAKE=1
CHICHI_DESKTOP=1 CHICHI_REVIEW_DIR=/workspace/qa/spa-v6-probes
node scripts/check-aquarium.cjs

One GPU browser. Actual prepared game scene, 14 room+sky capture points, exact
native lights/geometry/materials, native sun target follows the corresponding
room view. Characters/SPA fish/water masked and all state restored in finally.
HDR capture128px, linear radiance/4, no tone mapping/sRGB during data packing.
Each octahedral PNG/progress record saved immediately; final512px4x4 sheet,
raw15-layer bytes gzip/hash, exact bundle/source/art-asset/baker hashes. Abort
promotion if workspace changes. Capturing private world never writes user data.

First inspect outputs and shader/errors/renderer restoration. Do NOT copy a
reference picture into reflections or claim final mirrors/device FPS. Current
mask explicitly covers native cats and SPA aquarium fish, not a proof of every
ambient animal outside; inspect for unwanted moving-entity ghosts before use.
The script hides water to avoid a recursive self-capture. Existing fallback
floor probes are still used during this first-bounce capture; no self-feedback.

Possible runtime after verified bake: checksum-addressed sheet→DataArrayTexture
128x128x15 RGBA8 (~1.25MiB mipmapped), linear NoColorSpace and byte/orientation
verification. Independent layer mipmaps prevent atlas bleed. Native GLSL3 array
sampling must actually compile in pinned WebGL2. Derive existing lamp room ID
layer floor((aMallRoom-1)/4), preserve previous static shader/cache hooks; water
uses identical shared optics with a SPA-only reflection layer. Sky15th layer.
Prepare through existing selected SPA Promise, bounded; fallback on failure.
No changes to global water/Mall/cat shaders, AI, money or save schema.

Before building probes further, keep exact eighth-stage/current checkpoints
remote. A failed/partial bake is evidence only, not a recovered final asset.
After successful capture, persist real PNG/data/source provenance in Git, then
implement loader/integration with meaningful color/GLSL/fallback tests and
repeat actual R1/R2/R4/R5 comparison. Fuller furnishings/gardens still needed.
