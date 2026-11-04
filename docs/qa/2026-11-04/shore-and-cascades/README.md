# Shore light and continuous cascades

The player approved published `d6fa805` on 2026-11-04. Its immutable saved
reference is `baseline/approved-clear-water-20261104`; the preceding palette,
blue depth, transparency, wave envelope, foliage and all native cat/ride data
remain the starting point. This stage is an appearance revision, not a device
FPS claim.

The original eighteen waterfall streaks now fade through their modulo reset
and keep transparent depth writes disabled. Native GL tested four independent
original phases: the old reset changed 85–100 pixels; the revised reset changes
zero. Instance matrices, geometry and phase buffers remain fixed. Nothing was
removed to achieve this result.

Shore foam uses irregular moving coverage from the same two original wave
samples. Two curtain-pattern trials were rejected on close review; the approved thin
waterfall-sheet pattern and palette are retained. Actual bottom depth attenuates caustic light using
one additional scalar varying; native projection/refraction stay unchanged.
Elevated river sheets use their actual .23-metre trough thickness rather than
an unrelated world sea level.

Water still uses two field samples plus one scenery lookup; bottom lighting
still uses two original field samples. No new texture/render target, geometry,
per-frame matrix upload or reflection pass is introduced. The refreshed eight
256-square probes total 882,441 download bytes and retain the original 2.67 MiB
mipmapped allocation. Twenty-four focused tests passed. The final eight-model gallery passed 32 native seated/landing poses, 16 phone views and 24 exact native/static colour comparisons (zero changed bytes). Draw/triangle/channel/outlet counts are unchanged. All eight 960×640 shop previews and the production build were regenerated. Native phone/SQLite rides, every-island cameras and the complete suite follow before publication.

All eight complete geometry/index/attribute/instance buffers and model framing
match the approved release byte-for-byte. The retained original baseline
images use that same framing; native browser bounds are checked against it
before each new render. The final waterfall material image matches the
retained authored-pattern diagnostic exactly. The broad/fine curtain trials
are excluded from the release; the reset fade, depth light and shore foam remain.

Whole-renderer texture totals after the first candidate rider include four
retained cat textures: they are not a comparable water-only memory metric.
The field/sampler identities are checked directly by focused tests. Geometry
proof can be reproduced with Node 22 and
`scripts/snapshot-showcase-buffers.mjs CHECKOUT OUTPUT.json`.
