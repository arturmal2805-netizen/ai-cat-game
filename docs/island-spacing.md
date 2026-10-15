# Island shore stability

The 27-unit authored grid predates the enlarged islands. A radius-16 whale
lagoon overlapped its radius-11.65 neighbours by 0.65 units. Two radius-14.8
islands overlapped by 2.6. Their ground faces occupied the same height, causing
depth fighting as the camera moved. Depth bias would hide the symptom while
leaving overlapping terrain and ambiguous navigation.

`world-layout.js` scales the authored map arrangement once, anchored on the moon
garden. It derives clearance from every pair's radius, a 0.65-unit allowance for
uneven/bevelled shores and a three-unit open gap. The current grid becomes 34
units. Ordinary radii, legendary island area, local scenery, swimming pools,
activities, construction, crop deadlines, player level and currency are unchanged.
The same centres drive rendering, picking, camera focus, cat destinations and
bridges. Bridge ends enter the uneven shore slightly; the star backdrop follows
the derived centre rather than old hard-coded map coordinates.

Save coordinates are island-local, so existing and concurrently edited worlds
require no save migration. Tests reload the game and compare placement/scenery
positions, Chichi's position and currency. Another regression builds the actual
navigation meshes of all 24 islands (including bevels and cliff lips) and checks
their shore envelopes and all pairwise gaps. A before/after comparison against
`8e1448e` found identical mesh counts, triangle counts, vertex/index buffers,
instance matrices and local object transforms in all 24 complete biomes.

The orbit camera's near plane is 0.5 instead of 0.1, with the same far plane and
minimum 21-unit orbit. This improves depth precision for small ground decorations.
During a flight, island preparation uses three-millisecond cooperative slices
with an animation-frame opportunity between slices. The existing complete island
remains interactive until the replacement is prepared and compiled. Unchanged
income text is no longer rewritten each frame; HUD projections reuse a vector.
No resolution, world detail, shadow quality, world object or cat model is reduced.

Validation includes the full 251-test suite, a separate non-home-island saved
position and placed-toy reload, and real touch orbit/swimming in 390×844/DPR 2
Chromium. The actual island buttons settled the camera and loaded complete
scenes for whale lagoon, amber garden, beach, water and moon, with no browser
errors. CPU-only navigation profiling is separate from water GPU profiling;
the latter retains the previous render/geometry budget. Software-browser
timings do not establish FPS on every physical phone.
