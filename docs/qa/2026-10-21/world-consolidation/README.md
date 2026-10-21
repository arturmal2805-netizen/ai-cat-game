# World consolidation and last cat positions

User scope: triple the CURRENT homestead area (superseding the earlier 10x
request), remove ten named islands, repack the remaining map and prepare wider
shore roads. The former homestead radius 131.804704 becomes 228.292444. Every
existing homestead building keeps its original local coordinates and scale.

Retired IDs: lotus, crystal, mushrooms, desert, beach, aquapark, rainbow, nature,
bamboo, dusk. The active catalogue has 20 islands. Retired source assets remain
available for saved decorative belongings, but no retired island is instantiated,
offered, reserved for collision or exposed as an innate activity. Decorative
belongings go into storage. Purchased buildings move into disjoint outer districts
of the homestead with the same IDs, deadlines, crop/account and paid-tier keys.
Native cat identities and sex assignments remain intact; their new home is the
homestead. The other twenty themes, sizes and properties remain unchanged, apart
from their explicitly authorized map centres and enlarged homestead radius.

Migration runs on local load, server writes and all three inputs of a cooperative
merge. Cached phones may still send the former 30-island catalogue; they cannot
erase transferred or new outer-land purchases. No new refunds, charges or XP are
introduced. The immutable pre-change catalogue independently verifies every
surviving theme; older snapshots are updated only for the authorized map changes.

Cat coordinates are captured at existing durable saves and on exit, not in RAF
or a new inference/timer loop. Island-local position, height and yaw restore on
entry; transient airborne/swimming rides retain a safe previous point. Manual
destination commands win. Unchanged positions reuse their timestamps and do not
enqueue another exit save. Venue kittens retain their original working/available
status. Older clients omitting coordinates cannot erase them; each cat's newer
position merges atomically.

Validation: full 664-test suite passed; final focused migration/position/camera
checks passed thirteen tests. Private WebKit reloaded 69 cats five times with exact
coordinates. The clean reload test drains the prior save and releases the private
lease before navigation. The first abrupt run also retained all coordinates, but
reported WebKit unload/Blob request cancellation errors and is not counted as a
clean transport pass. Existing durable-outbox/restart tests remain required.

The full private native-WebKit audit completed 24 samples across all 20 islands
plus four returns, with real RAF, orbit/wheel input, GPU backpressure and DPR 2.
No browser errors or context losses occurred. Raw software-renderer timings are
in native-map-frames.json; this fixture changes the map, so these are NOT a
before/after rendering gain or physical MacBook FPS. Final phone overview checks
cover the large homestead, aquarium, moon, whole-world fit and the first wheel
step, without snapping to the old 600-unit limit. The aquarium road reaches its
positive-Z front shore, and no menu/scene node remains for a retired island.
The distant sky shell now encloses the overview camera; the permanently buried
rock top under the homestead lawn no longer causes radial depth stripes.
Publication is CI-gated after the final camera/terrain build. This is a
feature/compatibility verification, not a claimed physical MacBook FPS gain. All accepted rendering optimizations, DPR, water, lighting,
foliage, fish/cat geometry and two-cat sleep animations are preserved.
