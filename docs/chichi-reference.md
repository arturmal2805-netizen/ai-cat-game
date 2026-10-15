# Chichi reference kitten

The default `createCat()` now builds an independent reference kitten in
`public/chichi-model.js`. Cats with an explicit breed or coat colour still use
the existing neighbour/adoption models. Save data, economy, AI choices and world
ownership do not change.

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
No other cat or world geometry is simplified for this change.

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
