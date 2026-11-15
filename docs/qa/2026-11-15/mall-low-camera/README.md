# Low Mall visitor camera

Baseline: published 6b53806, not a URL query claiming an old release.
The matched views select ambient guest0 at F1 and guest1 at F1 after resize.
Both run the actual native game at DPR2 with an isolated SQLite save.

The old Mall override raised the face orbit by 1.6, producing a steep view.
The new opt-in guest profile keeps a 15-degree world-space downward angle,
widens body/action framing and follows the actual scaled head with a small
body-centre offset. Normal face/surf cameras, floor overviews and first-person
control keep their independent contracts.

Lowering the camera alone failed the image review: the sofa back hid the cat.
The authored bench guests were facing the back cushion. Their original carrier
now faces the real open aisle. No mesh, bench, walking radius or collision strip
was removed. Actual source-mesh vertical bounds supplement existing obstacle
footprints for camera-only segment clearance. The resolver tries nearby side
angles and shorter free orbits at the same low elevation. It uses the real
building/pavilion floor footprint, not the wider pavilion roof. If temporarily
occluded, the camera holds its previous free position instead of using a
ceiling fallback. The main cat's navigation still uses its unchanged anatomy.

Native camera audit: all 14 original bench visitors across seven floors have
free views at 15 degrees. Phone resize, repeat avoidance, real runtime-visitor
selection, surface release, World/EXIT and physical reentry passed. Errors0.
The runtime-visitor selection/surface-release subcase explicitly adjusts a
private visit's transient phase to isolate membership; it is not proof of a
complete physical shopping visit. Existing route tests cover real movement.

Initial pre-capture renderer counters belonged to the previous overhead frame,
so they are not used as visitor-frame measurements. The sequential timing runs
record actual submitted frames separately. Initial gap counters can include
intentional QA render pauses; they are excluded from FPS/jank comparisons.
Additional SQLite reload evidence is recorded separately before publication.

## Sequential warm-frame diagnostics

Both runs used the same original guest IDs and phone/landscape viewports with
no simultaneous browser or CPU-heavy test/build during the timing windows.
Each report contains 15 actual submitted frames, not simulated skipped draws.

| View | CPU median before/after ms | Render submission median before/after ms | Calls before/after | Triangles before/after |
| --- | --- | --- | --- | --- |
| Phone | 2.2 / 2.1 | 19.9 / 17.8 | 159 / 162 | 1,352,300 / 1,520,984 |
| Landscape | 1.6 / 1.5 | 13.1 / 14.7 | 143 / 145 | 1,411,624 / 1,533,876 |

Geometry residency remains 97,492,759 bytes; programs158; DPR2 in both runs.
The low body view exposes more native anatomy and background than the old
sofa/top-of-head framing. It is a camera/art correction, not an ocean FPS
optimization. The wider-view software GPU costs more in this small sample;
these diagnostics establish neither hardware FPS nor statistical throughput
parity. No cats, body detail, shadows or pixel ratio were reduced.

Initial profiling gaps include intentional QA render holds and are excluded
from pause/FPS claims. The user's historical5200ms maximum cannot be assigned
to a specific game operation from that one counter. A continuous native ocean
loading/rotation trace remains a separate performance task.

The first timing windows completed, but their subsequent reload probes found
QA harness issues (an early optional-global lookup and a missing ordinary
island-selection step). The timing JSONs are not described as complete reload
passes. Separate corrected reload-only runs verify the actual UI path without
repeating or overwriting those timing windows.

Corrected reload-only runs passed for both versions: ordinary island selection,
Mall entry and visitor camera work after durable private SQLite reload. All
personal wallets, global coins, inventory and placements match exactly. The
candidate additionally asserts the low10–20-degree angle after reload. Neither
run leaves manual submarine control active; JS/HTTP errors are empty.

Final candidate:1026 tests passed with zero failures/skips under Node22 after
the occluded-view exit correction. Node22 build and Wrangler dry-run passed.
Vacation changes are excluded from this release, including its provided clock
and shared-state merge changes.
