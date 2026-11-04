# Global water clarity and staged marine improvements

Player reference: the water in the 2026 Assassin's Creed Black Flag remake.
This is an art target for transmission, blue depth, wave reflections, foam and
seabed lighting; do not claim 1:1 game-engine fidelity without evidence.

Preserved production baseline: `a1161c5` (animations, original native models,
water/ride IDs, prices, existing saves, native DPR and rendering cadence).

The first stage upgrades shared water, caustics, depth-aware underwater colour,
all native waterfall streaks, actual aquarium top UVs/volume clarity, zoo glass
and the eight scenery-probe water adventures. A single immutable 128² sand map
adds 65,536 base bytes (about 85 KiB with mipmaps), shared across actual seabeds.
Water surfaces retain two field samples plus one environment lookup. Depth-only
walls use no extra field reads. Eighteen waterfall streaks retain their original
modulo paths in fixed instance buffers with an opacity fade at wraps.

Initial review rejected a flat cyan seabed after excessive caustic suppression;
the candidate adds restrained irregular sand grain, view-path absorption and
soft depth-dependent caustics rather than a dense repeating net. Blue/pink and
real-island comparison captures use identical lighting, native models and camera
poses. Software-renderer diagnostics do not establish physical M2/iPhone FPS.

Required publication order (all requested tasks remain active):
1. Publish the verified global water stage.
2. Expand the mosasaur water surface to four times its current area, with dry
   access, old paid placements, map spacing and stable saving preserved.
3. Add varied detailed coral reefs at real depths.
4. Improve the pond fish's detail, cute faces and varied swimming behavior.

Final reports and publication proof are appended after their checks complete.
