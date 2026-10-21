# Stable path queue

Replace linear minimum scans and array splices in the shared SPA/Chill/housing
A* open list with a stable binary heap. Equal-priority cells retain their exact
insertion order. No route, collision radius, cat, graphic, schedule or save field
changes.

Twenty independent obstacle courses were captured from `54290c7` before editing.
All route hashes, lengths and sampled collision clearances remain exact. The
SPA/Chill/housing targeted run passed all 46 checks.

CPU benchmark: eight sequential batches after warming both implementations,
A/B/B/A/A/B/B/A, twenty routes each. Median total search time fell from about
906ms to 577ms (36%). This is CPU route-search work, not rendered or device FPS.
The saved benchmark script reproduces the comparison without live saves or AI.

Deployment is gated by the complete CI test suite, build and Worker dry run.
