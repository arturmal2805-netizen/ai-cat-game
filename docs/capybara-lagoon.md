# Blue capybara lagoon

The existing `summer` island becomes “Блакитна лагуна капібар”. Its stable save ID,
unlock ownership, level requirement and local coordinates remain intact. The
radius is `11.65 * sqrt(3)`, making its area exactly three times the old meadow.
The map packing keeps a gap between every pair of shores.

Four real swimming basins occupy the main lagoon and three raised jungle
terraces. Ten animated waterfalls, fish, water disturbances, rope bridges,
flowering ground cover and individually movable palms use the same 3D assets in
the world and shop previews. The four permanent capybara rides are available on
unlock; shop copies retain purchase prices and construction timers. All four
rides and all four swimming basins enter the existing physical-object AI and
manual-drag interaction lists.

Capybaras have continuous sculpted skin, short paws, ears, blinking eyes and a
leaf saddle. A ride's analytic seat follows the animal's actual body pivot,
scale, breathing and walking motion. The swimming giant dismounts onto a dry
bank. Idle cats are directed to dry points rather than left standing in water.
The approved Chichi and other cat models and portraits are unchanged.

Existing purchases and moved scenery retain their saved positions, even if the
new main lagoon occupies those coordinates. Timber islets support those objects;
no coins, XP, crops, deadlines or buildings are reset. New placement still checks
water and other solid objects. Default planting leaves a useful building yard.

## Rendering and checks

Shared geometry caches, indexed static batches and five instanced material
surfaces render the ambient capybara family. Expensive construction runs through
the cooperative scene builder. Existing mobile resolution, shadows, landscape
and cat detail are retained. The world movement loop reuses scratch vectors
instead of allocating them for every cat and activity frame.

`test/capybara-lagoon.test.mjs` checks area and shore gaps, physical AI/manual
choices, swimming reservations, real animated seat alignment, closed skin,
waterfall animation, identical cooperative/synchronous scene geometry and 30
save/reload cycles preserving a legacy farm and moved tree inside the new lake.
A further regression checks that omitted legacy visibility flags normalize
without a false cloud conflict, while actual invalid moves remain rejected.
The existing economy, placement, cloud-save and multiplayer tests also apply.

`scripts/check-capybara.mjs` renders the actual island and ride meshes, checks
shader errors and scene budgets and captures a DPR 2 phone viewport. Its timing
output comes from software Chromium and is not a hardware-phone FPS guarantee.

Release validation passed all 272 automated tests. A comparison against release
`355ffe8` found identical authored vertex/index/colour buffers, instanced
decorations and local transforms on all 23 other islands. All 38 cached cat
portraits and the approved cat model sources remain byte-identical. The sculpt
construction allocation optimization also preserves its output buffers exactly.
