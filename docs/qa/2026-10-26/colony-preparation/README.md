# Native cat preparation without temporary full-buffer clones

The released colony builder clones every source geometry, then replaces its
joint indices and adds a view index before `BatchedMesh.addGeometry` copies all
streams into the final batch. The first complete clone is unnecessary: the
pinned copier reads its input synchronously into independent destination data.

The candidate borrows unchanged index/attribute objects through a new, never
rendered staging wrapper. Remapped joints and view indices still have separate
storage. Bounds and final Float16 metadata remain unchanged. Disposing the
wrapper does not dispose the source geometry or its atlas registration. There
are no changes to native Chichi, shaders, poses, final GPU storage, water,
lighting, DPR, gameplay, saves or AI requests.

## Allocation evidence

`scripts/check-colony-preparation.mjs` compares the actual released builder at
`c62a6c3` and candidate in an alternating old/new/new/old Node probe. The stress
fixture creates **all 95 catalogue profiles**, not an assertion that the player
owns 95 cats. Each builder produces 11 batches and 59,080,564 bytes of final
geometry with the exact same SHA-256. Native source hashes are unchanged and
no source geometry is disposed.

Released preparation makes 851 temporary geometry clones and copies
52,702,126 bytes (50.26 MiB) per rebuild. Candidate makes zero such clones.
This is eliminated cumulative allocation/copy work, **not a measured reduction
of 50 MiB in steady RAM or a claimed FPS increase**. Preparation durations are
variable: old 670/781 ms, new 755/384 ms. They include cooperative scheduling
and are not physical-device loading measurements. The accepted saving is
unnecessary buffer allocation, not a promised loading-time multiplier.

The existing lifecycle test now also verifies native attribute identity and
all source bytes before/after preparation, no source disposal, no staging
clones and independent final batch storage. Its existing weighted geometry,
Float16, tint, bounds, picking, rebuild, fallback and disposal checks remain.
Full suite: 716 tests pass; build passes.

## Alternative rendering experiment kept out of production

Private Linux WebKit software graphics, original DPR 2, 24 adopted cats,
eight homes, four giant rides and sixteen businesses. Sixteen full native
camera orbit/zoom samples compare existing colony draws with individual cat
draws. Four same-pose image checks preserve triangle counts. Job City and
homestead differ in 20/28 colour-channel bytes; capybaras and aquarium match
exactly. The tiny differences follow the known Float32 model-view rounding.
No JS/HTTP/context errors occur.

Job City favours individual draws in both software repeats, but aquarium and
homestead results reverse between repeats; the capybara first view already
uses individual rendering automatically. These few GPU-bound software frames,
live poses, residency changes and warmup do not establish a general gain on
M2 or iPhone. **No default renderer switch or new FPS template is published.**
Raw outcomes, including the worse repeats, are retained in this directory.
The physical Safari frame report is still required to locate the player's
remaining severe ordinary-render lag.

The browser preparation proof uses a separate private hook to rebuild from
either the real released clones or candidate staging streams in the same
loaded world. The final frames include native colour and shadows, at original
resolution. Construction may run with GPU draws paused during fixture setup;
no setup duration is reported as FPS or ordinary loading time.
