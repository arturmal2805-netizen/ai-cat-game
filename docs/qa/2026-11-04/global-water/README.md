# Global clear-water pass

Preserves the approved native creatures, models, wave field, six wake slots,
DPR and original single-pass optics. Adds softer irregular caustics, filtered
highlights, blue transmission and view-path absorption; retains special pink
palettes. One immutable 128-square sand map adds approximately 85 KiB mipmapped
GPU storage. All eighteen native waterfall streaks now use fixed matrices and a
shader clock with a transparent wrap, rather than eighteen matrix writes per fall
per frame. No runtime reflection targets, scene copies or additional field reads.

Validation: 953/953 tests. All 68 water attractions rendered in normal, grazing,
phone and seated-rider views, including intermediate landings and native static
submission pixel comparisons. 38 actual-island captures cover the released 19
islands before/after (four camera angles each); native triangles/draw counts are
unchanged. The 360-byte geometry increment on the mosasaur island is five fixed
18-float waterfall phase attributes. Actual aquarium pose/normal/picking probes
passed. Eight real 256-square reflection captures regenerated; all 68 real shop
previews refreshed. The private phone path bought eight attractions, exercised
rafting and surf native guests/both cameras and passed three SQLite reloads.

The optional software-renderer timings are diagnostics, not phone/M2 FPS claims.
The 24-sample underwater timing had a noisy tail; native submission/update
medians remain bounded. A 400-ms input-test window aliased its own orbit period;
that run failed and is not counted. The final native map run uses 5-second windows.
The remaining ocean remake, expansion, coral world, fish and submarine are separate
stages and are not claimed as implemented by this release.

Final actual native map run: all 19 islands plus a return to Moon Garden passed
orbit, zoom, completed-frame, full DPR and live-context checks. No browser or
HTTP errors. Uses direct workerd/SQLite after Wrangler ProxyWorker transiently
lost a save connection in the earlier run; no production save code changed.

Publication verified on 2026-11-10: `6a5a5d9d406ba48f3fdb725d486205d1b82a33bc`,
GitHub Actions `41902798241`, test/deploy/pages all successful. Pages serves app
`5920ee5e6ebdb53a`; Worker serves `01208577b32a1cdc`. Their application logic is
identical: the only bundle differences are the configuration cache key and
content-hashed elephant model URL. The Worker elephant metadata has three joint
pivots differing by less than 1e-15 from the local/Pages platform; EVERY vertex,
normal, colour, index and pose buffer is byte-identical. This exception was
investigated explicitly rather than counted as a byte-exact whole-file match.
All materials, catalogue/previews and 22 shared surface/probe files match. The
Worker reports this release and working shared-save capability.
