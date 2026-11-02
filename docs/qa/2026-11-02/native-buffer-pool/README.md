# Exact native cat buffer ownership

The renderer, original Float16 vertices, colours, weights, triangles, DPR and shadows are unchanged. Complete byte-identical shape cohorts share immutable BufferAttributes; every rig retains its own geometry/bounds and atlas ownership. GPU-only retirement invalidates resident peer VAOs before shared VBO deletion. True destruction releases each live registration exactly once.

Actual WebGL A/B/B/A, 66 original rigs: 35,926,244 → 5,628,940 resident buffer bytes (84.3% lower), 3,196 → 335 buffers. Both modes submit 999 calls / 2,218,910 triangles. Colour/shadow pixels, returns after retirement and destruction are identical; GL errors remain zero, cleanup returns to 140 ground bytes. Synthetic pressure repeats reduce 80 transfers / 83,886,480 refault bytes to zero. These are resource/cache measurements, not physical-device FPS.

Warm startup CPU median is 1,555.65 ms unpooled / 1,614.70 ms pooled (+3.8%); median longest preparation task is 63.25 / 36.70 ms. No startup-speed claim is made. The full native RAF camera path covers every runtime island (19), then Moon Garden and zoo returns, at DPR 2 with six or more submitted frames per view and no context loss. Initial short software-GPU sampling was insufficient; the recorded run requires input/zoom coverage as well as frames.

872 tests passed before guest-feature work. Retain all prior independently approved improvements. Source geometry/palette and atlas lifetime tests remain required for changes to this pool.
