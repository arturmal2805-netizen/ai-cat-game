# Legendary megastructures

Ten complete, buildable attractions are appended to the shop. Existing rides,
cat models and biome records are unchanged. These are large sets (22×24 through
34×30 world units), intended for spacious islands such as the player's blank
plot. Prices range from 6,800 to 24,800 coins; levels 6–14 and construction times
150–360 minutes use the established purchase/construction/save systems.

The collection contains a clear double corkscrew slide, a ballistic launch
slide, a real concave vortex funnel with an open throat, a tropical rock and
waterfall complex, six rainbow wave flumes, a 28-metre transparent drop capsule,
a 10/20/30-metre diving tower, a vertical-loop coaster, a double corkscrew coaster
and a 30-metre dragon coaster. Each has a distinct authored route and palette.

`mega-ride-motion.js` samples arc lengths and rail bases once. Cats and vehicles
use the same frames. Coaster inversions use full quaternions, with level entry
and exit at the station. Water rides include climbing, acceleration, splash and
return phases. The tower includes all three climbs and jumps. Ballistic flights
use gravity 9.81 rather than a floating sine arc. Temporary paw/eye reactions
reuse the approved facial rig. Returning paths are constrained to the reserved
plot and dry ground. Cancelling a megastructure resets orientation and releases
its reservation. Standard approach offsets preserve existing travel behaviour.
Unassigned wanderers are kept outside cached complex footprints, including
their body radius; riders and construction helpers retain their authored routes.

`mega-ride-assets.js` builds the matching geometry: double rails and ties,
spiral stairs, braced towers, coloured acrylic collars, concave bowl, six flumes,
raised pools, canopy, crystal gates, tropical rockwork and the dragon train.
Static solids are merged by material family. Clear acrylic is a single-sided
alpha/Fresnel surface with no transmission, scene copy or reflection render
pass. Animated channel and pool water reuse existing shared field shaders.
Sixty-four instanced droplets are active briefly on occupied water landings;
empty towers do not emit phantom splashes. Per-complex tests bound visible
meshes to 36 and triangles to 160,000 (including instancing).

Rides retain the existing attraction income, XP, upgrades, manual placement,
resident reservations and AI physical-target selection. Construction completion
in a world snapshot uses its explicit `now` argument consistently.

Validation includes all routes at 100 Hz, phase joins, reserved plot bounds,
gravity, three dive heights, concave bowl contact, full coaster inversions,
real hero/tiny/giant seat transforms, cancellation, purchase/deadline/save
reloads and idempotent income. `scripts/check-mega-rides.cjs` runs the actual
mobile world against a private local SQLite save, with all ten models, twenty
manual hero/resident rides, water impacts, screenshots and an exact cloud reload.
Software-rendered browser checks establish correctness, not physical-device FPS.
