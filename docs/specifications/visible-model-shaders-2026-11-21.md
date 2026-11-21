# Prepare deferred models before their first visible shader use

The new M2 report of release6ccec70 still has long stalls: rolling19.04FPS,
worst gap8.6s, renderer867/509ms, native program-log queries1208.5ms total.
The8.6s gap is not explained by those queries or the913ms maximum longtask;
never claim this patch eliminates that unattributed gap or establishes M2FPS.

Native exact-source first-use trace reproduces88 program reflections during
visible renders, including newly attached Mosasaur/bank/court models and venue
cat guests. The async deferred court-model construction path publishes roots
without the warmup already used for islands/SPA/mall. Warm those same roots
before publishing, preserving existing foreground priority/disposal behavior.
Rig/skinned objects were excluded from all warmup, even though shader layout
can be compiled safely without changing their animated bounds. Include their
native colour/depth shaders and retain the bounds/skeleton/pose ownership.
No graphics/material/geometry/DPR/cat/shadow/save changes or disabled shader
error checking. Do not silence GL diagnostics to improve timings.

Verify native same-camera trace and images against source6ccec70, focused
regressions and Node22 build, full main CI/live hashes, all19islands+returns,
phone controls/deep dive/two private reloads. CPU/SwiftShader only establishes
attribution/correctness; a fresh physical M2report is still required.
