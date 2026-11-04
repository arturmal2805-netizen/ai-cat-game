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
samples. Waterfall sheets have fewer regular narrow stripes, footprint-filtered
ribbons and clearer gaps. Actual bottom depth attenuates caustic light using
one additional scalar varying; native projection/refraction stay unchanged.
Elevated river sheets use their actual .23-metre trough thickness rather than
an unrelated world sea level.

Water still uses two field samples plus one scenery lookup; bottom lighting
still uses two original field samples. No new texture/render target, geometry,
per-frame matrix upload or reflection pass is introduced. The refreshed eight
256-square probes total 882,441 download bytes and retain the original 2.67 MiB
mipmapped allocation. Twenty-four focused tests passed. Full gallery, native
phone/SQLite rides, every-island cameras and the complete suite follow before
publication.
