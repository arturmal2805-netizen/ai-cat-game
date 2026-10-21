# Reuse fixed street-clearance checks

The job-city simulation runs independently of the currently viewed island.
Its path searches repeatedly sampled the same fixed building-corner segments.
Cache only those directed collision results, keyed by exact anatomy radius and
all current building footprints. Moving cat/goal edges are still tested live.
Bound the cache to eight layouts. Preserve original Dijkstra order, costs,
waypoints and collision rules, with no graphics or save changes.

All 64 reference routes from released `871a709` match exactly across four
repeats and different cat radii, including blocked destinations. Caller-mutated
routes cannot poison the cache. Sixty-four additional sizes verify bounded
residency. Existing work, driving, housing and family checks are also required.

Eight warmed sequential CPU batches, A/B/B/A/A/B/B/A, 320 routes each: median
before 379.5ms, after 78.7ms, about 79% less route-search CPU work (4.8x faster).
The last control batch was slower (846ms) and remains in the raw record. These
are pathfinding timings, not rendered or physical MacBook FPS.
