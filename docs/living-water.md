# Living water

The complete slide flow/outlet/impact contract and attraction inventory are in
[`slide-water.md`](./slide-water.md). It applies to shop and island slides and is
required for future water attractions by [`AGENTS.md`](../AGENTS.md).

`water-shading.js` supplies lagoons, pools, slide channels, streams and
waterfalls through the existing `waterMaterial` API. Classic ponds, boat basins,
slide pools and fountain jets use it on their existing meshes as well. Blue and
cotton-candy palettes stay separate. No game-state, save format, balance or AI
changes are required by this update.

The surface combines two moving wave fields, an octahedral sky/shore light probe,
angle-dependent reflection, anti-aliased microfacet highlights, optical-depth
absorption, shallow-water transparency, shore foam and expanding swimmer
wakes. The basin has a sand-to-depth colour gradient using its existing
vertices. Moving caustics also illuminate the bed, instanced fish and swaying
corals. Cascades use vertical UV coordinates so flow follows the falling sheet.
Fish (including their eyes) and corals receive a small vertex refraction from
the existing wave field, relative to their pool's world-space water level. Raised
and moved pools share that level across all underwater materials. The basin
edge stays anchored. Reflections use a baked environment approximation; there
is no ray tracing, scene-copy refraction, reflection camera or extra render target.

One lazily cached 128×128 RGBA texture holds periodic wave slopes, caustics and
flow detail. It occupies 64 KiB before mipmaps (about 85 KiB with mipmaps) for
the entire world. A second shared 128×128 field stores the environment probe;
surface shading retains the previous three texture samples. It replaces
repeated per-pixel Voronoi searches. Mipmaps
prevent the detail from shimmering when zooming out. Each thin water sheet
renders in one transparent pass. No landscape, fish, coral, water geometry,
mobile resolution or pixel ratio is removed or reduced.

Idle water skips the six wake calculations. Splash instance buffers update and
render only while droplets are visible; fish animation reuses numeric transforms
instead of allocating arrays per body part. Wakes remain bounded to six and
expire after 3.5 seconds. A moved/rotated/scaled pool converts the disturbance
from local coordinates through its full world matrix. Reduced-motion rendering
freezes waves, fish, caustics, reef sway and waterfalls consistently.

`test/water-shading.test.mjs` covers the shared texture budget, repeat boundary,
pool transforms, wake throttling/expiry, inactive particle uploads, classic water
props, composition with reef shaders and disposal safety. The complete Node test
suite also covers swimming routes, construction, purchases, shared saves and
reloads.

`node scripts/check-water.mjs` is the optional real-browser check, using the same
Playwright/Chromium environment variables as `capture-previews.mjs`. It compiles
the actual GLSL, renders blue and pink lagoons with underwater instances and
cascades, exercises swimming wakes and verifies pixel-stable reduced motion.
Pixel samples check that six nearby swim strokes do not bleach the lagoon and
that pink water retains its own palette.
It reports desktop 900×700 and mobile 390×560/DPR 2 timings and resource counts.
Set `CHICHI_WATER_BASELINE` to an earlier checkout to compare both versions in
sequence without concurrent test/build workloads. `CHICHI_WATER_REVIEW` selects
the screenshot folder. Timings from software Chromium are diagnostics, not a
claim of FPS on a physical phone.

Compared with `e3e099f`, the two-lagoon/two-waterfall browser fixture retained all
48 fish and all coral geometry. At idle it used 28 draws and 80,912 submitted
triangles instead of 30 draws and 82,712 triangles: the difference is the two
invisible splash batches. During swimming those batches return (30 draws and
82,712 triangles), preserving the original particle budget. The field adds one
shared texture. The A/B software-browser run improved median frame intervals
in both desktop and phone viewports; these noisy timings should be measured
again on the target device rather than treated as a fixed performance promise.

The initial water release passed 246 Node tests, the production build, Wrangler dry run
and all 132 catalogue/biome preview renders. Phone-sized Chromium (390×844,
DPR 2) completed a real touch drag into the lagoon and animated swim. A private
local SQLite save and reload retained the placed bed, coins, XP, last swim and
Chichi's position, with no browser errors. This did not modify the shared player
world. Separate live Cloudflare requests returned valid sleep/rest, hungry/eat
and happy/play decisions; no deployment credential is embedded in the game.

The subsequent optics polish was compared directly with `8e1448e`. Its browser
fixture retains 28 idle draws / 80,912 triangles and 30 swimming draws / 82,712
triangles, and adds just the shared environment probe. A sequential software
Chromium A/B run measured median frame intervals of 118→107 ms (desktop),
139→132 ms (phone) and 151→144 ms (swimming). These are software-renderer
diagnostics, not physical-phone FPS. Separate high, grazing and sunlit views
exercise angle-dependent reflections, and six simultaneous swim strokes retain
the blue/pink palettes. Underwater geometry and every island's source buffers
remain unchanged.

The optics/spacing release passed 251 Node tests, production build and Wrangler
dry run. Its phone-sized touch scenario completed swimming, orbiting and five
island-button transitions with fully prepared scenes, followed by a private
SQLite save/read-back/reload preserving the placed bed, coins, XP and position.
All 132 preview scenes rendered successfully with the new shaders.
