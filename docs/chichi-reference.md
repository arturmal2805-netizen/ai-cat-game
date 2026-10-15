# Chichi reference kitten

The default `createCat()` now builds an independent reference kitten in
`public/chichi-model.js`. Every neighbour, adoptable cat, venue employee and
visitor now uses the same reference-family sculpt. The full Chichi hero remains
unchanged; other cats use a compact version with their breed, coat, eye colours,
body type, ear fold, short tail, socks and gait. Save data, economy, AI choices
and world ownership do not change.

The target is the supplied grey, green-eyed kitten: broad cheeks, short muzzle,
large round pupils, soft pink ear interiors, compact body and an upright plush
tail. `public/chichi-sculpt.js` builds continuous head/body/leg surfaces and
area-samples the actual skin for groomed triangle fur. There are no face photos,
billboards or camera-facing cutouts in the model.

The named mood and activity rig remains compatible with the world. Chichi also
has weighted knee and ankle joints; each leg's skin, fur and toe grooves share
its skeleton. Walking, paw reactions and exported animation clips use those
joints. Closed eyes have fur-covered eyelids. Sleeping, hungry and happy use one
underlying kitten model.

The full sculpt and every generated strand remain present. Cached geometry
templates avoid rebuilding hair for each mood portrait. Normalised 16-bit GPU
normals and 8-bit fur colours/skin weights reduce memory and GLB size. Static
parts merge by material while animated eyes, jaws, ears and joints stay separate.
Other cats use the same continuous anatomical surfaces at crowd resolution,
with compact geometric fur, skinned knees and ankles, convex irises and animated
lids. Half-float positions/colours and 16-bit normals reduce crowd bandwidth.
Static colour parts merge within each animated rig node. Cat shapes and breed
traits remain visible; no island objects or landscape details are removed.

All 32 adoption portraits and three mood portraits are baked from the actual
models into `public/art/cats`. Opening the menu creates no temporary 3D scenes.
To regenerate them, run `scripts/render-cat-portraits.mjs` with a local Playwright
installation (`PLAYWRIGHT_MODULE` may point to its module) and `CHROMIUM_PATH`.
Pass `--adoption-only` to leave all approved Chichi images untouched, or
`--venues` to refresh the shop pictures of businesses and the adoption
centre as well. This optional authoring step is separate from production builds.

The three downloadable GLBs include the geometric fur, weighted skin, PBR
materials and both live-rig clips. The game's additional procedural undercoat
shader is a WebGL detail and is not a glTF material extension. Each GLB must stay
below the 25 MiB static asset limit; the export regression test enforces it.

Validation includes the complete Node test suite, actual Chromium renders from
front/side/walking views, all three expressions, re-importing the built GLB and
playing its joint animations, plus touch gameplay at 390×844 / DPR 2. The mobile
check exercises yarn play, a placed bed, swimming and real local SQLite
save/reload. Software-rendered browser checks do not establish frame rates on
every physical phone.

Geometry, animation and export tests check concrete technical properties. They
cannot certify AAA art quality or pixel-identical resemblance to a single
reference photograph. Visual likeness must be judged from actual rendered views.

The subsequent breed refinements preserve the approved hero exactly. Frozen
geometry/material/pose fingerprints cover all three moods; the browser review
also compares the hero's rendered pixels against the preceding checkout.
See [Breed refinements](breed-refinements.md) for the cheek fix and crowd traits.
