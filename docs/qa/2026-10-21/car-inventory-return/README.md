# Owned cars return to inventory

After exit, the world removes the car view instead of retaining parked stacks.
The owned inventory item and historical trip/parking receipt remain saved.
The next local trip summons the car at the road nearest the cat's current
position rather than sending it back to historical parking. Shared immutable
car geometry/material templates remain intact; no purchase or balance changes.

The private WebKit browser ran 20 cycles of 32 real car views: every active view
appeared, all 640 returns removed their scene objects, the next summons shared
the original geometry, and the save stayed unchanged. DPR 2, no lost context or
GL errors. The targeted car/work/family/housing suite passed all 69 tests.

This releases local car-view cleanup only. The separately saved cross-island
commute draft is not included; its route/collision problems must be resolved
before release. Removing idle views is established, not a measured FPS claim.
