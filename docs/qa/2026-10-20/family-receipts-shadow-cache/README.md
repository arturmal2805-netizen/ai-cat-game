# Durable evening decisions and exact static shadow depth

AI event reservations previously survived reload, but the application did not
retrieve a completed response after losing its HTTP acknowledgement. An
authenticated read-only receipt now restores the current evening plan once, or
only permanent families from an older day. It never replays old purchases,
shifts or wages. A separate bounded family receipt survives event-cache eviction.
A confirmed persisted clock can realign the ledger without resetting daily
request guards. The family panel displays pending/failed/waiting status.

The renderer reuses one fixed PCF depth target for explicitly stationary opaque
scenery. Moving cats, rides, water and animated shaders retain native rendering.
Changing the light/caster/geometry/material invalidates the cache. Small scenes
keep native drawing; no geometry, DPR, shadow size or fish count is reduced.

Actual full-resolution Chromium GPU comparisons:
- Aquarium: four views, every colour/shadow byte equal; 15 fewer shadow draw
  submissions and 78,356 fewer submitted triangles per steady frame; all 50 fish.
- Built homestead: four views, every byte equal; 181 fewer shadow submissions
  and 303,836 fewer submitted triangles per steady frame.
- Isolated depth probe: identical actual pixels after moving a dynamic caster,
  moving/hiding/removing scenery, changing its material side, orbiting and moving
  the light. No GL error.

The extra fixed render target occupies 8 MiB. These are GPU work/pixel checks in
software browser renderers, not measurements of physical MacBook frame rates.
