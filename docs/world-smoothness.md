# Reference-family cats and smooth world navigation

All cat creation goes through `createReferenceChichi` in `chichi-model.js`.
The full Chichi hero is preserved. Explicit breed/colour profiles use the same
anatomy with a crowd budget; adoption portraits use that actual model, including
coat patterns, odd eyes, folded ears, socks and different body types.

The previous 30 adoptable NPC models (d441ff0) totalled 490,806 visible triangles,
802 mesh draws and 35,188,756 bytes of visible vertex/index buffers. The regression
test enforces those aggregate upper bounds for the new roster. This counts one
cat pass; actual world rendering also includes shadows, scenery and water.
It is not a claim of FPS on every device.

Island focus interpolates both position and distance. Camera movement requests
an animation frame even while the cat is idle. A ResizeObserver reallocates the
canvas only when dimensions actually change; mobile DPR remains capped at 2,
with no dynamic resolution or reduction of world detail.

Scene builders expose generators alongside their synchronous public APIs.
`prepareSceneSteps` advances them in short scheduled slices. Individual props,
reefs, scenery templates and large buffer merges yield rather than building a
whole island in one task. The synchronous and asynchronous routes execute the
same geometry/animation code and are compared in tests. Static batching keeps
indexed triangles, avoiding temporary expansion into three separate vertices.

The old island stays interactive until preparation and shader compilation finish.
Edits and cloud updates arriving during construction are reapplied before the
new scene is installed. Per-island refreshes run in order. Disposal waits for
queued refreshes so a completed refresh cannot revive retired scenery.

Scenery occlusion uses cached coarse bounds. It does not raycast every leaf
triangle at a fixed interval; object picking still uses real triangles after a
coarse rejection. Menu rendering no longer rebuilds unchanged island navigation,
and covered world animation runs less frequently while dialogs are open.

Validation covers every breed, cached portrait availability without a GPU,
vertex/index/colour equality for cooperative merges, complete scenery parity,
cancellation/error handling, phone touch interactions and actual SQLite save
and reload. Browser profiling uses software-rendered Chromium; CPU scheduling
measurements are kept separate from GPU/device FPS claims.

A before/after check of moon, nature, beach, cotton candy, whale lagoon and
legendary aquapark found identical landscape triangle counts, mesh counts and
source prop counts. For example, cotton candy remains 1,088,900 rendered
triangles (including instances), 232 meshes and 968 source props. The gains come
from scheduling, indexed buffers and caching, not removing the landscape.

The final roster totals 487,065 triangles, 542 mesh draws and 10,540,772 bytes
of visible buffers: about 32% fewer draws and 70% fewer buffer bytes for the cats.
The full hero is excluded from both roster totals and remains unchanged.
