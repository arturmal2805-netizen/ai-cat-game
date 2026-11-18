# Independent underwater SPA WIP — 2026-11-18

Base published39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4 unchanged.
Node22.23.5: 4tests PASS (exclusive booking/expiry/cleaning/teardown; all6 real
massage cabinet door sweeps, full radius.571 and height2.15, tables/walls retained,
separate unobstructed therapist contacts). This is CPU geometry/state validation,
not a rendered/native procedure/economy/reload/performance pass.

Model uses six actual furnished cabins, reception, waiting seats, glass roof,
cosmetic shelves, towels and warm materials. Incoming surface maps can be shared
from existing prepared finishes; no claim of rendered resemblance yet.
Rooms are spaced11m, retaining real aisles. Initial test endpoint2.2m from table
centre overlapped its actual1.8m half-length +.571 radius. Door sweep now ends
at2.5m (still beyond contact approach3.6m); explicit table collision remains.
Nav must be root-local: root.y=-165, geometry.y relative0. Passing absolute
negative floor coordinates to primitive capture incorrectly drops all blockers.
Corrected root transform; ground test .01 root-local.

Not integrated into live world. No complete resort model, paid procedure runtime,
84-action choreography, AI routing, stairs/airlock, dedicated camera or SQLite
proof yet. Do not publish this as a completed SPA or replace old SPA/Mall.
Next: construct composed resort geometry/navigation, actual procedure state
machines driven by existing leisure/purchase ledger; native before/after and
private SQLite full scenarios, then fullCI/actual assets before separate release.
