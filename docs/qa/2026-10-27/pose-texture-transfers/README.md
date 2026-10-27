# Pose texture transfers and native-driver diagnostics

## Physical evidence and scope

The player's second report is Chrome 155 / ANGLE Metal on a physical Apple M2,
Cat Job City, 64 NPCs, DPR 2. It is paused after the bounded 15-second diagnostic:
eight frames in 14.05 seconds, 0.5 submitted FPS, maximum gap 5.383 seconds.
There are **zero policy refaults** in the window and only 595,824 bytes of new
bufferData transfers. The first cache patch has **not solved the player's
Job City stalls**. The report still has one queued and one active preparation
root, but that does not invalidate the severe observed stalls. Original report:
`m2-before.json`.

Buffer upload counters do not include texture uploads. The colony joint atlas
is a persistent RGBA Float32 DataTexture. Three 0.186.1 submits each dirty row
separately, passing the entire backing view with UNPACK_SKIP_ROWS. The report
cannot attribute its remaining stalls to this operation or to shader preparation.

## Independent resource change

`pose-texture-upload.js` combines adjacent dirty rows into exact rectangles and
passes a Float32 subarray containing only that rectangle. It uploads the same
bytes at the same offsets into the same texture. Sparse untouched rows remain
untouched. Native binding/pixel-store tracking is retained, with no driver state
queries, completion waits, readbacks, new textures per frame or shader changes.
Three owns initial allocation, explicit version updates, restoration and disposal.
Initial allocation initializes the complete CPU image once. Unsupported shapes
and driver exceptions retain the original native upload path. Chichi's native
renderer, all other atlas matrices, geometry, animations, detail, water, lighting,
shadows, DPR, gameplay, save data and paid AI scheduling stay unchanged.

In a real WebGL test, seven dirty rows form three runs. Across six distinct
updates, **seven texture calls become three**, with exactly 7,168 logical pixel
bytes in either path and zero changed framebuffer bytes. Supplied typed-array
views total 114,688 versus 7,168 bytes; this is **not a measurement of physical
CPU/driver/GPU bus traffic**. The browser may internally restrict source copies.

## Complete-frame comparison

Private local SQLite world, twelve adopted cats and existing embedded staff;
64 atlas-registered cats / 63 mobile NPCs. Linux software WebKit, desktop
1100 x 800, DPR 2, the native RAF, full simulation, colour/shadow rendering,
original GPU fences and time-based orbit/zoom input. No raster suppression or
readbacks inside timed samples. Five locations, two passes of each upload mode:
20 samples of ten seconds each. Fixed-pose native/coalesced comparisons have
zero changed framebuffer bytes on all five locations.

| Location | Native rows median submitted FPS | Coalesced median submitted FPS |
| --- | ---: | ---: |
| Job City | 0.806 | 0.883 |
| Capybaras | 1.067 | 1.024 |
| Aquarium | 1.244 | 1.321 |
| Built island | 3.881 | 3.921 |
| Moon garden | 2.931 | 3.086 |

Job City texture API calls per rendered frame fall from approximately 107 to
81. Location activity, pose changes and residency transitions continue during
sampling. Results elsewhere are mixed; atlas sharing is often inactive there.
The second capybara pair is effectively equal (1.037 versus 1.038). These small,
quantized software samples are **not physical M2/iPhone FPS**, do not establish
a universal FPS increase and do not advance the player-approved smooth-world
baseline or common FPS template. Keep this change independently reversible.

## Diagnostic change

Opt-in `profile=1` now reports native texture uploads, draw/multi-draw calls,
shader compilation/link/reflection and fence-poll entry-point durations. These
are main-thread elapsed times inside native GL entry points, **not GPU execution times**.
The report includes at most twenty longest main-thread task durations and
whether the browser supports that observer. No GL arguments, textures, shader
source, player records, keys or network traffic are recorded. Normal play has
no timing wrappers or observer. Pause/resume resets the counters. The bounded
automatic stop, clipboard/fallback copying and existing profile schema remain.

These counters are needed to locate the remaining physical-device stall. A
post-publication M2 report, preferably a resumed warm sample, is still required.

## Checks

- Full suite: **728 passed, zero failures**; build passes.
- Resource/Float32/bounds/fallback/disposal tests pass.
- Comparison browser JS/HTTP errors: zero.
- Construction cache remains `sculpt-v2-a496203fa13a037a7a10a927`.
- Final phone stress world: 64 mobile NPCs, embedded staff (96 initial atlas
  registrations), eight homes, four large slides and sixteen businesses.
  All 17 runtime islands have zero changed framebuffer bytes and equal
  colour/shadow calls and triangles. All 21 native orbit/zoom/return samples
  pass, DPR 2 is retained, no context loss or browser JS/HTTP errors.
  Separate Chromium/SwiftShader proof restores an actual lost WebGL context,
  reinitializes the same textures and retains zero changed framebuffer bytes.
  Both clipboard and textarea copying include the new GL/task fields; browser
  JS/HTTP errors are zero. Publication evidence is recorded separately.
- Production bundle SHA-256:
  `f30fcdc285ca9b68ee11aa2b0ed72b1ee4a9eea79e507a4082ee6c12dfa6e64d`.
  Private QA hooks are absent from that bundle.

A separate cold Chromium experiment disabled successful-shader diagnostic log
reads. The observed stalls largely shifted to uniform/attribute reflection
(`getProgramParameter`); the bounded initial sample stayed approximately 0.4 FPS
on SwiftShader. This does not establish a physical-device improvement. The
change was removed; production keeps its released shader validation. The
experimental report is retained as `rejected-shader-log-profile.json`.
