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

Validation so far: full 664-test suite passed; final focused migration/position
checks passed eight tests. Private WebKit reloaded 69 cats five times with exact
coordinates. The clean reload test drains the prior save and releases the private
lease before navigation. The first abrupt run also retained all coordinates, but
reported WebKit unload/Blob request cancellation errors and is not counted as a
clean transport pass. Existing durable-outbox/restart tests remain required.

The complete native camera/zoom/return audit and publication are recorded after
completion. This is a feature/compatibility verification, not a claimed physical
MacBook FPS gain. All accepted rendering optimizations, DPR, water, lighting,
foliage, fish/cat geometry and two-cat sleep animations are preserved.
