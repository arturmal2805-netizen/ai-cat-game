# Horizontal rebuild — active implementation

User source: `docs/specifications/underwater-cat-mall-rebuild-2026-11-11.md`.
The tower checkpoints are preserved at 6800da2 and 2fd8112; neither is published.
The new reference supersedes their architecture, not the tested private-wallet,
receipt/stock/inventory, same-batch AI, lift and restart logic.

New canonical floor plan (`mall-layout.js`, not yet wired): 60 m central glass
body, two 68×70 m rounded wings, two further radius-18 m pavilions, seven actual
levels and a radius-22 m open atrium. Numerical union-contour area: 104,220 m²
compared with 23,285 m² preceding usable floor/pavilion area, or 4.476×. Cat scales
stay native. Broad front galleries serve four 28×24 m wing shops per level;
up to three further rooms face the atrium. Existing venue/product IDs persist.

Implementation direction: rebuild floor slabs as one connected union contour;
independent large shop rooms reuse the improved detailed merchandise, not the
old shop-sized enclosing boxes. Clear cat-scale tills, warm local room light,
central jelly aquarium, genuine escalators and balconies, cyan glass domes,
visible outward shop fronts, two additional pavilions and the left-front lift.
Do not use black rectangular billboard walls to conceal missing interiors.

Keep the roof beneath the mosasaur's deepest approved body envelope. Excavate
only the construction/inspection cove in this ocean; preserve all other islands,
shore/pickup IDs and the animal's approved anatomy/ride. Refit only intersecting
unowned peripheral reefs, retaining detailed templates/counts and matching real
navigation/optical fields. Verify mesh/reef/vehicle clearance, not just centres.
Warm brighter turquoise underwater light belongs to the existing ocean shader;
limit real light counts and implement batched room emitters without per-shop
render targets or a global shader-variant storm.

Navigation must scale with the new area: broad connected gallery road nodes,
short local existing-A* segments, cooperative reusable walkability, actual
furniture bounds and old-goal layout migration. Returning visits keep receipts;
no replayed money, duplicate items or generic cat teleport to the surface.

Next gates: real native full/atrium/luxury/restaurant/cinema/water/phone captures,
reference comparison, private shopping/reload, all-island camera/ownership gates,
full tests/build and only then incremental publication. No unsupported fidelity
percentage or hardware FPS claim.

Initial replacement geometry is implemented separately in `mall-rebuild-model.js`,
`mall-architecture.js`, `mall-kit.js` and `mall-rooms.js`; it is not yet the live
Mall builder. It includes connected union slabs, the full room shells and real
shop fixtures, true side wings/pavilions/bridges, broad atrium galleries, curved
glass marquee, cat-head dome and a relocated physical lift. Animated escalator
treads use fixed instances and one clock, with matching native CPU raycasts and
colour/depth movement. The reusable merchandise library was extracted without
changing the old scene; all twelve mall/route/conveyor tests passed afterward.
The proposed base is -165 m so its crown can stay below the mosasaur's approved
deep-dive body envelope; verify actual transformed anatomy before accepting it.

## Current unconnected geometry checkpoint

Submarine controls/ArrowDown/fourfold jump are separately published at eb6cbec
(workflow 43041608095 successful; 985/985 local and workflow tests). Their commits
are included in this branch. The broad Mall remains a private rebuild.

The upper slabs now have an open front atrium, not a closed stack of rings.
The front pressure window is one tall clear pane with the floor bands removed
from its opening. Bevelled volumetric mascot ears, curved layered eyes/whiskers,
larger curved marquee lettering and two smaller cat-headed wing crowns replace
the thin wire-only face. The additional pavilions moved outward to x ±128 m,
with explicit bridge anchors, matching glass door openings and bridge roofs.

Each gallery has its own real fittings: luxury floral arches, café terraces,
cinema/arcade marquees, book/home reading niches, hanging garden/jelly lanterns
and observatory instruments. Room fronts differ by category and have opaque
fitted rear walls, wall storage, hanging lights that survive the cutaway and
large real kitchens/cabinets. A genuine five-jelly multi-storey aquarium and an
approved native cat fountain statue occupy the atrium. The lamp field is one
immutable 2 KiB texture plus one byte per static vertex, without per-shop passes.

Authoring-only native WebGL reviews v2/v3/v4 have no GL or browser errors.
They still show an unfinished, sparsely occupied mall in a flat review world;
these images are not a native-game fidelity or device FPS acceptance. Current
model is NOT wired into the native Mall, ocean excavation, save migration,
cameras or final resource lifecycle yet. Do not publish this checkpoint alone.

Geometry route survey v7: 108/108 measured shop/pavilion approaches pass at cat
radii .45, .85 and 1.8. The public-lobby decorations were moved out of the lift
queue. New routing uses bounded cooperative gallery graphs and short existing
A* segments, with exact-radius caches and a bounded finer local retry for large
cats that fit a doorway between coarse grid samples. Repeat the survey with
independent segment sampling after integration; also check actual cashier/seat
approaches, six-cat paths, touch and private once-only shopping/reload.
